import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import type { AskOptions, ChatMessage } from "../hooks/useChat";
import { useVoiceInput } from "../hooks/useVoiceInput";
import type { Lang, Point } from "../services/runtime";
import { hasSupabaseConfig } from "../services/supabase";
import { colors, fonts, radii } from "../theme";

type Props = {
  lang: Lang;
  messages: ChatMessage[];
  followups: string[];
  busy: boolean;
  onAsk: (question: string, options?: AskOptions) => void;
  point?: Point | null;
};

export function ChatPanel({
  lang,
  messages,
  followups,
  busy,
  onAsk,
  point
}: Props) {
  const voice = useVoiceInput(lang);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const send = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    onAsk(trimmed, { point });
    setDraft("");
  };

  const onMicPress = async () => {
    if (voice.state === "recording") {
      const text = await voice.stop();
      if (text) {
        setDraft((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
      }
    } else if (voice.state === "idle") {
      await voice.start();
    }
  };

  const micLabel =
    voice.state === "recording"
      ? "■"
      : voice.state === "transcribing"
        ? "…"
        : "●";

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.role === "user" ? styles.userBubble : styles.assistantBubble
            ]}
          >
            {m.role === "assistant" ? (
              (m.content || (m.streaming ? "…" : ""))
                .split(/\n+/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <Text
                    key={`${m.id}-${index}`}
                    style={[
                      styles.assistantText,
                      index > 0 && styles.paragraph
                    ]}
                  >
                    {paragraph.trim()}
                  </Text>
                ))
            ) : (
              <Text style={styles.userText}>{m.content}</Text>
            )}
            {m.streaming ? (
              <ActivityIndicator
                size="small"
                color={colors.accent}
                style={styles.streamingDot}
              />
            ) : null}
          </View>
        ))}

        {followups.length > 0 && !busy ? (
          <View style={styles.followups}>
            {followups.map((q) => (
              <Pressable key={q} style={styles.chip} onPress={() => send(q)}>
                <Text style={styles.chipText}>{q}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about this artwork…"
          placeholderTextColor={colors.textFaint}
          editable={!busy && voice.state === "idle"}
          onSubmitEditing={() => send(draft)}
          returnKeyType="send"
        />
        {hasSupabaseConfig ? (
          <Pressable
            style={[
              styles.micButton,
              voice.state === "recording" && styles.micButtonActive
            ]}
            onPress={onMicPress}
            disabled={busy || voice.state === "transcribing"}
          >
            {voice.state === "transcribing" ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.micText}>{micLabel}</Text>
            )}
          </Pressable>
        ) : null}
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
    flex: 1,
    gap: 10
  },
  messages: {
    flex: 1
  },
  messagesContent: {
    gap: 10,
    paddingBottom: 8
  },
  bubble: {
    borderRadius: radii.md,
    padding: 12,
    maxWidth: "92%"
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(216, 176, 106, 0.2)",
    borderColor: colors.accent,
    borderWidth: 1
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(8, 6, 4, 0.32)",
    borderColor: colors.hairline,
    borderWidth: 1
  },
  userText: {
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
    lineHeight: 22
  },
  assistantText: {
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
    lineHeight: 22
  },
  paragraph: {
    marginTop: 8
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
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: "rgba(8, 6, 4, 0.28)"
  },
  chipText: {
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 14
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  input: {
    flex: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
    backgroundColor: "rgba(8, 6, 4, 0.28)"
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: colors.hairlineStrong,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass
  },
  micButtonActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent
  },
  micText: {
    color: colors.accent,
    fontSize: 14
  },
  sendButton: {
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.accent
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendText: {
    color: colors.onAccent,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0
  }
});
