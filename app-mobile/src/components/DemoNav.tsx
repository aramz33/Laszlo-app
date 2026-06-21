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

      <Pressable
        style={[styles.reset, stepIndex === 2 && styles.resetArtwork]}
        onPress={onResetProfile}
        hitSlop={8}
      >
        <Text style={styles.resetText}>⟳ {FLOW_STEPS[stepIndex] ?? "—"}</Text>
      </Pressable>
    </View>
  );
}

const EDGE_BUTTON = {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(8, 6, 4, 0.4)",
  borderWidth: 1,
  borderColor: colors.hairlineStrong,
} as const;

const styles = StyleSheet.create({
  // No bottom bar: transparent edge buttons. ▶ next right-mid, ◀ prev bottom-left.
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 30,
  },
  next: {
    ...EDGE_BUTTON,
    position: "absolute",
    right: 14,
    bottom: 36,
  },
  prev: {
    ...EDGE_BUTTON,
    position: "absolute",
    left: 14,
    bottom: 36,
  },
  arrowDisabled: {
    opacity: 0.25,
  },
  arrowText: {
    color: colors.accent,
    fontSize: 14,
  },
  reset: {
    position: "absolute",
    bottom: 44,
    alignSelf: "center",
  },
  resetArtwork: {
    bottom: 86,
  },
  resetText: {
    color: colors.textFaint,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
  },
});
