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
import { useVoiceInput } from "../hooks/useVoiceInput";
import type { Lang, Point, Profile, Steering } from "../services/runtime";
import { hasSupabaseConfig } from "../services/supabase";
import { colors, fonts, radii } from "../theme";

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
  const voice = useVoiceInput(lang);
  const [draft, setDraft] = useState("");

  const send = (question: string) => {
    ask(question, { hotspotId, point });
    setDraft("");
  };

  const onMicPress = async () => {
    if (voice.state === "recording") {
      const text = await voice.stop();
      if (text) {
        send(text);
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
              color={colors.accent}
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
    gap: 10
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 19
  },
  bubble: {
    borderRadius: radii.md,
    padding: 12,
    maxWidth: "92%"
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.glass,
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
    backgroundColor: colors.glass
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
    fontSize: 15
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
    letterSpacing: 1
  }
});
