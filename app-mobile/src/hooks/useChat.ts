import { useCallback, useEffect, useRef, useState } from "react";

import {
  HISTORY_CAP,
  askStream,
  generateFollowups,
  type HistoryMessage,
  type Lang,
  type Point,
  type Profile,
  type Source,
  type Steering
} from "../services/runtime";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
  sources?: Source[];
  error?: boolean;
};

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

type ChatThread = {
  messages: ChatMessage[];
  followups: string[];
};

let counter = 0;
const nextId = () => `m${++counter}`;
const ARTWORK_THREAD_ID = "__artwork__";

function threadIdOf(hotspotId?: string | null) {
  return hotspotId ?? ARTWORK_THREAD_ID;
}

function emptyThread(): ChatThread {
  return { messages: [], followups: [] };
}

function updateThread(
  threads: Record<string, ChatThread>,
  threadId: string,
  update: (thread: ChatThread) => ChatThread
) {
  return {
    ...threads,
    [threadId]: update(threads[threadId] ?? emptyThread())
  };
}

function summarizeOlderHistory(history: HistoryMessage[]) {
  const older = history.slice(0, -HISTORY_CAP);
  if (older.length === 0) return null;
  return older
    .slice(-6)
    .map((m) => `${m.role}: ${m.content.slice(0, 180)}`)
    .join("\n");
}

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
  const currentThreadId = threadIdOf(hotspotId);
  const [threads, setThreads] = useState<Record<string, ChatThread>>({});
  const [busy, setBusy] = useState(false);
  const historyRef = useRef<HistoryMessage[]>([]);
  const abortRef = useRef<(() => void) | null>(null);
  const currentThread = threads[currentThreadId] ?? emptyThread();

  useEffect(() => {
    setThreads({});
    historyRef.current = [];
    setBusy(false);
    return () => {
      abortRef.current?.();
    };
  }, [artworkId]);

  const refreshFollowups = useCallback(
    (targetHotspotId?: string | null) => {
      const resolvedHotspotId =
        targetHotspotId === undefined ? (hotspotId ?? null) : targetHotspotId;
      const targetThreadId = threadIdOf(resolvedHotspotId);
      generateFollowups({
        artworkId,
        hotspotId: resolvedHotspotId,
        lang,
        profile,
        historySummary: summarizeOlderHistory(historyRef.current)
      })
        .then((nextFollowups) =>
          setThreads((prev) =>
            updateThread(prev, targetThreadId, (thread) => ({
              ...thread,
              followups: nextFollowups
            }))
          )
        )
        .catch(() =>
          setThreads((prev) =>
            updateThread(prev, targetThreadId, (thread) => ({
              ...thread,
              followups: []
            }))
          )
        );
    },
    [artworkId, hotspotId, lang, profile]
  );

  const ask = useCallback(
    (question: string, options?: AskOptions) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;

      const targetHotspotId = options?.hotspotId ?? hotspotId ?? null;
      const targetThreadId = threadIdOf(targetHotspotId);
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

      const priorHistory = historyRef.current;
      let assistantText = "";

      setThreads((prev) =>
        updateThread(prev, targetThreadId, (thread) => ({
          messages: [...thread.messages, userMsg, assistantMsg],
          followups: []
        }))
      );
      setBusy(true);

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setThreads((prev) =>
          updateThread(prev, targetThreadId, (thread) => ({
            ...thread,
            messages: thread.messages.map((m) =>
              m.id === assistantId ? fn(m) : m
            )
          }))
        );

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
          historySummary: summarizeOlderHistory(priorHistory)
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
            historyRef.current = [
              ...historyRef.current,
              { role: "user", content: trimmed, artwork_id: artworkId },
              {
                role: "assistant",
                content: finalText,
                artwork_id: artworkId
              }
            ];
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
