import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

type Props = {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
};

/**
 * Demo-only flow control: step continuously back and forward across
 * onboarding → scanner → artwork. ◀ ▶ are the only controls. Pinned at the
 * bottom corners, non-blocking.
 */
export function DemoNav({ canBack, canForward, onBack, onForward }: Props) {
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
});
