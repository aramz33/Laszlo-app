import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useChat } from "../hooks/useChat";
import type { Lang, Point, Profile, Steering } from "../services/runtime";

type Props = {
  artworkId: string;
  lang: Lang;
  profile?: Profile;
  steering?: Steering;
  hotspotId?: string | null;
  point?: Point | null;
};

export function ChatPanel({
  artworkId,
  lang,
  profile,
  steering,
  hotspotId,
  point
}: Props) {
  const { messages, followups, busy, ask } = useChat({
    artworkId,
    lang,
    profile,
    steering
  });
  const [draft, setDraft] = useState("");

  const send = (question: string) => {
    ask(question, { hotspotId, point });
    setDraft("");
  };

  return (
    <View style={styles.root}>
      <Text style={styles.sectionTitle}>Ask</Text>

      {messages.map((m) => (
        <View
          key={m.id}
          style={[
            styles.bubble,
            m.role === "user" ? styles.userBubble : styles.assistantBubble
          ]}
        >
          <Text style={m.role === "user" ? styles.userText : styles.assistantText}>
            {m.content || (m.streaming ? "…" : "")}
          </Text>
          {m.streaming ? (
            <ActivityIndicator
              size="small"
              color="#8fc7ff"
              style={styles.streamingDot}
            />
          ) : null}
        </View>
      ))}

      {followups.length > 0 && !busy ? (
        <View style={styles.followups}>
          {followups.map((q) => (
            <Pressable
              key={q}
              style={styles.chip}
              onPress={() => send(q)}
            >
              <Text style={styles.chipText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about this artwork…"
          placeholderTextColor="#7d756a"
          editable={!busy}
          onSubmitEditing={() => send(draft)}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendButton, busy && styles.sendButtonDisabled]}
          onPress={() => send(draft)}
          disabled={busy}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10
  },
  sectionTitle: {
    color: "#f7f1e7",
    fontSize: 18,
    fontWeight: "800"
  },
  bubble: {
    borderRadius: 10,
    padding: 12,
    maxWidth: "92%"
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2f5d8c"
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1
  },
  userText: {
    color: "#f3f7ff",
    fontSize: 14,
    lineHeight: 20
  },
  assistantText: {
    color: "#e4ddd2",
    fontSize: 14,
    lineHeight: 20
  },
  streamingDot: {
    marginTop: 6,
    alignSelf: "flex-start"
  },
  followups: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    borderColor: "rgba(143, 199, 255, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(143, 199, 255, 0.08)"
  },
  chipText: {
    color: "#8fc7ff",
    fontSize: 13
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  input: {
    flex: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f7f1e7",
    fontSize: 14
  },
  sendButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: "#2f8cff"
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  }
});
