import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  isSteer?: boolean;
};

type Props = {
  messages: ChatMessage[];
  currentLens: string | null;
  onSend: (text: string) => void;
  onSteer: (lens: string) => void;
};

export function ChatInterface({ messages, currentLens, onSend, onSteer }: Props) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubble,
              msg.role === "user" ? styles.userBubble : styles.assistantBubble,
              msg.isSteer && styles.steerBubble
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                msg.role === "user"
                  ? styles.userText
                  : styles.assistantText
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {currentLens && (
        <View style={styles.lensRow}>
          <Text style={styles.lensLabel}>LENS</Text>
          <Text style={styles.lensValue}>{currentLens}</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask about this artwork…"
          placeholderTextColor="#b0a895"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable style={styles.sendButton} onPress={handleSend}>
          <View style={styles.sendIcon} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8
  },
  messages: {
    maxHeight: 200
  },
  messagesContent: {
    gap: 6,
    paddingVertical: 4
  },
  bubble: {
    maxWidth: "88%",
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 14
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#c98a3c",
    borderBottomRightRadius: 4
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0d8c8",
    borderBottomLeftRadius: 4
  },
  steerBubble: {
    backgroundColor: "#211d18"
  },
  bubbleText: {
    fontFamily: "System",
    fontSize: 14,
    lineHeight: 20
  },
  userText: {
    color: "#fff",
    fontWeight: "600"
  },
  assistantText: {
    color: "#3f392f"
  },
  lensRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  lensLabel: {
    fontFamily: "System",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
    color: "#8a8073"
  },
  lensValue: {
    fontFamily: "System",
    fontSize: 11,
    fontWeight: "500",
    color: "#c98a3c"
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#211d18",
    backgroundColor: "#fff"
  },
  input: {
    flex: 1,
    fontFamily: "System",
    fontSize: 14,
    color: "#211d18"
  },
  sendButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#c98a3c",
    alignItems: "center",
    justifyContent: "center"
  },
  sendIcon: {
    width: 8,
    height: 14,
    borderRadius: 5,
    backgroundColor: "#fff"
  }
});
