import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

import type { Artwork } from "../domain/artwork";
import { colors } from "../theme";

type Props = {
  artwork: Artwork | null;
  onDone: () => void;
};

const DURATION = 520;

/** Plays a one-shot bloom + zoom-in when a new artwork is identified: an accent
 * flash blooms, the artwork image scales up from center, then fades to reveal
 * the detail screen underneath. Pure Animated core, draws over everything. */
export function ArtworkRevealOverlay({ artwork, onDone }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const lastId = useRef<string | null>(null);
  const [revealing, setRevealing] = useState<Artwork | null>(null);

  useEffect(() => {
    if (!artwork) {
      // Back-navigation: forget so re-selecting the same artwork replays.
      lastId.current = null;
      return;
    }
    if (artwork.id === lastId.current) return;
    lastId.current = artwork.id;

    setRevealing(artwork);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setRevealing(null);
        onDone();
      }
    });
  }, [artwork, progress, onDone]);

  if (!revealing) return null;

  const flashOpacity = progress.interpolate({
    inputRange: [0, 0.25, 0.6],
    outputRange: [0, 0.8, 0],
  });
  const imageScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  });
  const imageOpacity = progress.interpolate({
    inputRange: [0, 0.3, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View style={styles.fill} pointerEvents="none">
      <Animated.Image
        source={{ uri: revealing.imageUrl }}
        resizeMode="contain"
        style={[
          styles.fill,
          { opacity: imageOpacity, transform: [{ scale: imageScale }] },
        ]}
      />
      <Animated.View style={[styles.flash, { opacity: flashOpacity }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accent,
    zIndex: 51,
  },
});
