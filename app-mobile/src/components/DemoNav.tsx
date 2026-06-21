import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii } from "../theme";

export const FLOW_STEPS = ["Onboarding", "Scanner", "Artwork"] as const;

type Props = {
  stepIndex: number;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onResetProfile: () => void;
};

/**
 * Demo-only flow control: step continuously back and forward across
 * onboarding → scanner → artwork, plus a one-tap profile reset to replay
 * onboarding without reinstalling. Pinned at the bottom, non-blocking.
 */
export function DemoNav({
  stepIndex,
  canBack,
  canForward,
  onBack,
  onForward,
  onResetProfile,
}: Props) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        style={[styles.next, !canForward && styles.arrowDisabled]}
        onPress={onForward}
        disabled={!canForward}
        hitSlop={10}
      >
        <Text style={styles.arrowText}>▶</Text>
      </Pressable>

      <Pressable
        style={[styles.prev, !canBack && styles.arrowDisabled]}
        onPress={onBack}
        disabled={!canBack}
        hitSlop={10}
      >
        <Text style={styles.arrowText}>◀</Text>
      </Pressable>

      <Pressable style={styles.reset} onPress={onResetProfile} hitSlop={8}>
        <Text style={styles.resetText}>⟳ {FLOW_STEPS[stepIndex] ?? "—"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: "center",
    zIndex: 30,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: "rgba(8, 6, 4, 0.78)",
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    color: colors.accent,
    fontSize: 14,
  },
  center: {
    alignItems: "center",
    minWidth: 92,
    gap: 2,
  },
  step: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1,
  },
  reset: {
    color: colors.textFaint,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
  },
});
