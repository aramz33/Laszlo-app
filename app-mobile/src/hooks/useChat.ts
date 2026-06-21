import { useCallback, useEffect, useRef, useState } from "react";

import {
  useChatSession,
  type ChatMessage,
} from "../context/ChatSessionContext";
import {
  askStream,
  generateFollowups,
  type Lang,
  type Point,
  type Profile,
  type Steering
} from "../services/runtime";

export type { ChatMessage } from "../context/ChatSessionContext";

type Args = {
  artworkId: string;
  lang: Lang;
  profile?: Profile;
  steering?: Steering;
  hotspotId?: string | null;
  onAnswer?: (text: string) => void;
};

export type AskOptions = {
  hotspotId?: string | null;
  point?: Point | null;
};

let counter = 0;
const nextId = () => `m${++counter}`;

/**
 * Drives the chat surface for an artwork: one UI thread per hotspot, one shared
 * visit history for the runtime.
 */
export function useChat({
  artworkId,
  lang,
  profile,
  steering,
  hotspotId,
  onAnswer
}: Args) {
  const session = useChatSession();
  const sessionRef = useRef(session);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);
  const pendingAssistantRef = useRef<{
    artworkId: string;
    hotspotId: string | null;
    assistantId: string;
  } | null>(null);
  const currentThread = session.getThread({ artworkId, hotspotId });

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    setBusy(false);
    return () => {
      abortRef.current?.();
      abortRef.current = null;
      const pending = pendingAssistantRef.current;
      if (pending) {
        sessionRef.current.updateThread(
          { artworkId: pending.artworkId, hotspotId: pending.hotspotId },
          (thread) => ({
            ...thread,
            messages: thread.messages.map((m) =>
              m.id === pending.assistantId ? { ...m, streaming: false } : m
            )
          })
        );
        pendingAssistantRef.current = null;
      }
    };
  }, [artworkId]);

  // Abort any in-flight stream when the active thread switches (hotspot change).
  // Also marks the orphaned streaming message as done so it doesn't show a
  // perpetual loading indicator if the user switches back.
  const prevThreadIdRef = useRef(currentThreadId);
  useEffect(() => {
    if (prevThreadIdRef.current !== currentThreadId) {
      abortRef.current?.();
      abortRef.current = null;
      setBusy(false);
      const oldThread = prevThreadIdRef.current;
      setThreads((prev) => {
        const thread = prev[oldThread];
        if (!thread) return prev;
        const hasStreaming = thread.messages.some((m) => m.streaming);
        if (!hasStreaming) return prev;
        return updateThread(prev, oldThread, (t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.streaming ? { ...m, streaming: false } : m
          )
        }));
      });
      prevThreadIdRef.current = currentThreadId;
    }
  }, [currentThreadId]);

  const refreshFollowups = useCallback(
    (targetHotspotId?: string | null) => {
      const resolvedHotspotId =
        targetHotspotId === undefined ? (hotspotId ?? null) : targetHotspotId;
      const target = { artworkId, hotspotId: resolvedHotspotId };
      generateFollowups({
        artworkId,
        hotspotId: resolvedHotspotId,
        lang,
        profile,
        historySummary: session.getHistorySummary(target)
      })
        .then((nextFollowups) =>
          session.updateThread(target, (thread) => ({
            ...thread,
            followups: nextFollowups
          }))
        )
        .catch(() =>
          session.updateThread(target, (thread) => ({
            ...thread,
            followups: []
          }))
        );
    },
    [artworkId, hotspotId, lang, profile, session]
  );

  const ask = useCallback(
    (question: string, options?: AskOptions) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;

      const targetHotspotId = options?.hotspotId ?? hotspotId ?? null;
      const target = { artworkId, hotspotId: targetHotspotId };
      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: trimmed,
        streaming: false
      };
      const assistantId = nextId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true
      };

      const priorHistory = session.getThreadHistory(target);
      const historySummary = session.getHistorySummary(target);
      let assistantText = "";

      session.updateThread(target, (thread) => ({
        messages: [...thread.messages, userMsg, assistantMsg],
        followups: []
      }));
      setBusy(true);
      pendingAssistantRef.current = {
        artworkId,
        hotspotId: targetHotspotId,
        assistantId
      };

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        session.updateThread(target, (thread) => ({
          ...thread,
          messages: thread.messages.map((m) =>
            m.id === assistantId ? fn(m) : m
          )
        }));

      abortRef.current = askStream(
        {
          artworkId,
          question: trimmed,
          lang,
          hotspotId: targetHotspotId,
          point: options?.point ?? null,
          profile,
          steering,
          history: priorHistory,
          historySummary
        },
        {
          onDelta: (delta) => {
            assistantText += delta;
            patch((m) => ({ ...m, content: m.content + delta }));
          },
          onDone: (text, sources) => {
            const finalText = text || assistantText;
            patch((m) => ({
              ...m,
              content: finalText || m.content,
              streaming: false,
              sources
            }));
            session.appendExchange(target, trimmed, finalText);
            pendingAssistantRef.current = null;
            if (finalText) onAnswer?.(finalText);
            setBusy(false);
            refreshFollowups(targetHotspotId);
          },
          onError: (message) => {
            patch((m) => ({
              ...m,
              content: m.content || message,
              streaming: false,
              error: true
            }));
            pendingAssistantRef.current = null;
            setBusy(false);
          }
        }
      );
    },
    [
      artworkId,
      busy,
      hotspotId,
      lang,
      onAnswer,
      profile,
      steering,
      session,
      refreshFollowups
    ]
  );

  return {
    messages: currentThread.messages,
    followups: currentThread.followups,
    busy,
    ask,
    refreshFollowups
  };
}
