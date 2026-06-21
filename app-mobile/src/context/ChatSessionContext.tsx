import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  HISTORY_CAP,
  type HistoryMessage,
  type Source,
} from "../services/runtime";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
  sources?: Source[];
  error?: boolean;
};

export type ChatThread = {
  messages: ChatMessage[];
  followups: string[];
};

type ThreadTarget = {
  artworkId: string;
  hotspotId?: string | null;
};

type SessionTurn = HistoryMessage & {
  threadKey: string;
  threadId: string;
  hotspotId: string | null;
};

type ChatSessionContextValue = {
  getThread: (target: ThreadTarget) => ChatThread;
  updateThread: (
    target: ThreadTarget,
    update: (thread: ChatThread) => ChatThread,
  ) => void;
  getThreadHistory: (target: ThreadTarget) => HistoryMessage[];
  getHistorySummary: (target: ThreadTarget) => string | null;
  getSessionSummary: () => string | null;
  appendExchange: (
    target: ThreadTarget,
    userContent: string,
    assistantContent: string,
  ) => void;
};

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

const ARTWORK_THREAD_ID = "__artwork__";
const SUMMARY_LIMIT = 6;
const SUMMARY_CHARS = 180;

export function threadIdOf(hotspotId?: string | null) {
  return hotspotId ?? ARTWORK_THREAD_ID;
}

function threadKeyOf({ artworkId, hotspotId }: ThreadTarget) {
  return `${artworkId}:${threadIdOf(hotspotId)}`;
}

function emptyThread(): ChatThread {
  return { messages: [], followups: [] };
}

function summarizeTurn(turn: SessionTurn) {
  const scope =
    turn.threadId === ARTWORK_THREAD_ID ? "artwork" : `detail ${turn.threadId}`;
  return `${scope} ${turn.role}: ${turn.content.slice(0, SUMMARY_CHARS)}`;
}

function summarizeTurns(turns: SessionTurn[]) {
  if (turns.length === 0) return null;
  return turns.slice(-SUMMARY_LIMIT).map(summarizeTurn).join("\n");
}

function buildHistorySummary(turns: SessionTurn[], target: ThreadTarget) {
  const targetKey = threadKeyOf(target);
  const sameThread = turns.filter((turn) => turn.threadKey === targetKey);
  const olderSameThread = sameThread.slice(0, -HISTORY_CAP);
  const otherThreads = turns.filter((turn) => turn.threadKey !== targetKey);

  const parts: string[] = [];
  const olderSummary = summarizeTurns(olderSameThread);
  if (olderSummary) {
    parts.push(`Earlier in this thread:\n${olderSummary}`);
  }

  const otherSummary = summarizeTurns(otherThreads);
  if (otherSummary) {
    parts.push(`Elsewhere in this visit:\n${otherSummary}`);
  }

  return parts.length ? parts.join("\n\n") : null;
}

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Record<string, ChatThread>>({});
  const [turns, setTurns] = useState<SessionTurn[]>([]);

  const value = useMemo<ChatSessionContextValue>(
    () => ({
      getThread: (target) => threads[threadKeyOf(target)] ?? emptyThread(),
      updateThread: (target, update) => {
        const key = threadKeyOf(target);
        setThreads((prev) => ({
          ...prev,
          [key]: update(prev[key] ?? emptyThread()),
        }));
      },
      getThreadHistory: (target) => {
        const key = threadKeyOf(target);
        return turns
          .filter((turn) => turn.threadKey === key)
          .map(({ role, content, artwork_id }) => ({
            role,
            content,
            artwork_id,
          }));
      },
      getHistorySummary: (target) => buildHistorySummary(turns, target),
      getSessionSummary: () => summarizeTurns(turns),
      appendExchange: (target, userContent, assistantContent) => {
        const threadId = threadIdOf(target.hotspotId);
        const threadKey = threadKeyOf(target);
        const base = {
          threadKey,
          threadId,
          hotspotId: target.hotspotId ?? null,
          artwork_id: target.artworkId,
        };
        setTurns((prev) => [
          ...prev,
          { ...base, role: "user", content: userContent },
          { ...base, role: "assistant", content: assistantContent },
        ]);
      },
    }),
    [threads, turns],
  );

  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  );
}

export function useChatSession(): ChatSessionContextValue {
  const ctx = useContext(ChatSessionContext);
  if (!ctx) {
    throw new Error("useChatSession must be used within ChatSessionProvider");
  }
  return ctx;
}
