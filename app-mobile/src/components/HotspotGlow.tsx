import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";

import { colors } from "../theme";

type Props = {
  x: number;
  y: number;
  active: boolean;
  onPress: () => void;
};

/** Small, precise tap target; aura is visual only so nearby hotspots don't steal taps. */
export function HotspotGlow({ x, y, active, onPress }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const coreScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.06],
  });
  const innerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.16],
  });
  const outerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1.32],
  });
  const innerOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: active ? [0.65, 0.26] : [0.42, 0.14],
  });
  const outerOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: active ? [0.42, 0.06] : [0.28, 0.04],
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.hit, { left: `${x * 100}%`, top: `${y * 100}%` }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.auraOuter,
          { opacity: outerOpacity, transform: [{ scale: outerScale }] },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.auraInner,
          { opacity: innerOpacity, transform: [{ scale: innerScale }] },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.core,
          active && styles.coreActive,
          { transform: [{ scale: coreScale }] },
        ]}
      />
    </Pressable>
  );
}

const HIT = 24;
const CORE = 8;
const AURA_INNER = 24;
const AURA_OUTER = 42;

const styles = StyleSheet.create({
  hit: {
    position: "absolute",
    width: HIT,
    height: HIT,
    marginLeft: -HIT / 2,
    marginTop: -HIT / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  auraOuter: {
    position: "absolute",
    width: AURA_OUTER,
    height: AURA_OUTER,
    borderRadius: AURA_OUTER / 2,
    borderColor: colors.accent,
    borderStyle: "dashed",
    borderWidth: 1,
  },
  auraInner: {
    position: "absolute",
    width: AURA_INNER,
    height: AURA_INNER,
    borderRadius: AURA_INNER / 2,
    borderColor: colors.text,
    borderStyle: "dashed",
    borderWidth: 1,
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: colors.accent,
    borderColor: colors.text,
    borderWidth: 1,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  coreActive: {
    backgroundColor: colors.text,
    borderColor: colors.accent,
  },
});
