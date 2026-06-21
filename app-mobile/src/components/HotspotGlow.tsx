import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";

import { colors } from "../theme";

type Props = {
  x: number;
  y: number;
  active: boolean;
  onPress: () => void;
};

/** A small point of light over the artwork. Pulses gently; the active one glows
 * brighter and larger. Pure Animated core — no native gesture/SVG dependency. */
export function HotspotGlow({ x, y, active, onPress }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: active ? [1, 1.5] : [0.85, 1.15]
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: active ? [0.45, 0.12] : [0.28, 0.06]
  });

  return (
    <Pressable
      onPress={onPress}
      hitSlop={16}
      style={[styles.hit, { left: `${x * 100}%`, top: `${y * 100}%` }]}
    >
      <Animated.View
        style={[
          styles.halo,
          active && styles.haloActive,
          { opacity: haloOpacity, transform: [{ scale }] }
        ]}
      />
      <Animated.View
        style={[styles.core, active && styles.coreActive, { transform: [{ scale }] }]}
      />
    </Pressable>
  );
}

const HIT = 44;
const CORE = 14;
const HALO = 40;

const styles = StyleSheet.create({
  hit: {
    position: "absolute",
    width: HIT,
    height: HIT,
    marginLeft: -HIT / 2,
    marginTop: -HIT / 2,
    alignItems: "center",
    justifyContent: "center"
  },
  halo: {
    position: "absolute",
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: colors.accent
  },
  haloActive: {
    width: HALO * 1.3,
    height: HALO * 1.3,
    borderRadius: (HALO * 1.3) / 2
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 }
  },
  coreActive: {
    width: CORE + 4,
    height: CORE + 4,
    borderRadius: (CORE + 4) / 2,
    backgroundColor: colors.text
  }
});
