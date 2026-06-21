import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Progress } from "../hooks/useAudioPlayer";
import { colors, fonts, radii } from "../theme";

type Props = {
  text: string;
  progress: Progress;
  visible: boolean;
};

/** Split into subtitle-sized segments (sentence boundaries, then ~64-char wraps). */
function toSegments(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .match(/[^.!?…]+[.!?…]*/g)
    ?.map((s) => s.trim())
    .filter(Boolean);
  if (!sentences) return [];

  const out: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= 64) {
      out.push(sentence);
      continue;
    }
    const words = sentence.split(" ");
    let line = "";
    for (const word of words) {
      if ((line + " " + word).trim().length > 64) {
        out.push(line.trim());
        line = word;
      } else {
        line = (line + " " + word).trim();
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/**
 * Subtitles pinned to the top, revealed in step with the audio. `/speak` gives no
 * word-level timings, so the active segment is picked from currentTime/duration —
 * close enough to read as film-style subtitles advancing with the voice.
 */
export function SubtitleOverlay({ text, progress, visible }: Props) {
  const segments = useMemo(() => toSegments(text), [text]);

  if (!visible || segments.length === 0) {
    return null;
  }

  const ratio =
    progress.duration > 0
      ? Math.min(0.999, progress.currentTime / progress.duration)
      : 0;
  const index = Math.min(
    segments.length - 1,
    Math.floor(ratio * segments.length),
  );
  const previous = index > 0 ? segments[index - 1] : null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.glass}>
        {previous ? <Text style={styles.previous}>{previous}</Text> : null}
        <Text style={styles.current}>{segments[index]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 108,
    paddingHorizontal: 18,
    alignItems: "center",
    zIndex: 20,
  },
  // ponytail: rgba + shadow = glass approché ; vrai flou = expo-blur, prochain rebuild (handoff)
  glass: {
    maxWidth: 520,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radii.lg,
    backgroundColor: "rgba(8, 6, 4, 0.55)",
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  previous: {
    color: colors.textFaint,
    fontFamily: fonts.serifRegular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 4,
  },
  current: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 26,
    textAlign: "center",
  },
});
