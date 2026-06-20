import { useCallback, useEffect, useRef, useState } from "react";

import {
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
};

type AskOptions = {
  hotspotId?: string | null;
  point?: Point | null;
};

let counter = 0;
const nextId = () => `m${++counter}`;

/**
 * Drives the chat surface for an artwork: holds the message list, streams the
 * assistant answer via `mode=ask`, keeps a capped history for the runtime, and
 * fetches 3 follow-up suggestions after each turn (and on demand).
 */
export function useChat({ artworkId, lang, profile, steering }: Args) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [followups, setFollowups] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMessages([]);
    setFollowups([]);
    return () => {
      abortRef.current?.();
    };
  }, [artworkId]);

  const refreshFollowups = useCallback(
    (hotspotId?: string | null) => {
      generateFollowups({ artworkId, hotspotId: hotspotId ?? null, lang, profile })
        .then(setFollowups)
        .catch(() => setFollowups([]));
    },
    [artworkId, lang, profile]
  );

  const ask = useCallback(
    (question: string, options?: AskOptions) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;

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

      const priorHistory: HistoryMessage[] = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
        artwork_id: artworkId
      }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setFollowups([]);
      setBusy(true);

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? fn(m) : m))
        );

      abortRef.current = askStream(
        {
          artworkId,
          question: trimmed,
          lang,
          hotspotId: options?.hotspotId ?? null,
          point: options?.point ?? null,
          profile,
          steering,
          history: priorHistory
        },
        {
          onDelta: (delta) =>
            patch((m) => ({ ...m, content: m.content + delta })),
          onDone: (text, sources) => {
            patch((m) => ({
              ...m,
              content: text || m.content,
              streaming: false,
              sources
            }));
            setBusy(false);
            refreshFollowups(options?.hotspotId ?? null);
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
    [artworkId, busy, lang, messages, profile, steering, refreshFollowups]
  );

  return { messages, followups, busy, ask, refreshFollowups };
}
