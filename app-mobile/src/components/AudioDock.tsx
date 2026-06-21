import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

type Props = {
  status: Status;
  rate: number;
  onToggle: () => void;
  onRate: (rate: number) => void;
};

const RATES = [0.75, 1, 1.25, 1.5];

/** Fixed control column on the left: play/pause + vertical speed selector,
 * anchored independently of which hotspot is active. */
export function AudioDock({ status, rate, onToggle, onRate }: Props) {
  const playLabel =
    status === "loading" ? "…" : status === "playing" ? "❚❚" : "▶";

  return (
    <View style={styles.dock}>
      <Pressable
        style={[styles.play, status === "playing" && styles.playActive]}
        onPress={onToggle}
        disabled={status === "loading" || status === "error"}
      >
        <Text style={styles.playText}>{playLabel}</Text>
      </Pressable>

      <View style={styles.rates}>
        {RATES.map((r) => (
          <Pressable
            key={r}
            style={[styles.rate, r === rate && styles.rateActive]}
            onPress={() => onRate(r)}
          >
            <Text style={[styles.rateText, r === rate && styles.rateTextActive]}>
              {r === 1 ? "1×" : `${r}×`}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: 14,
    top: "38%",
    alignItems: "center",
    gap: 12,
    zIndex: 15
  },
  play: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderColor: colors.accent,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 6, 4, 0.6)"
  },
  playActive: {
    backgroundColor: colors.accentSoft
  },
  playText: {
    color: colors.accent,
    fontSize: 18
  },
  rates: {
    gap: 6,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: "rgba(8, 6, 4, 0.5)",
    borderWidth: 1,
    borderColor: colors.hairline
  },
  rate: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  rateActive: {
    backgroundColor: colors.accent
  },
  rateText: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11
  },
  rateTextActive: {
    color: colors.onAccent
  }
});
