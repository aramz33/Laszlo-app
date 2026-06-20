import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import type { Artwork, Hotspot } from "../domain/artwork";
import { colors, fonts } from "../theme";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const MOVE_THRESHOLD = 4;
const DOUBLE_TAP_MS = 250;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function distance(
  a: { pageX: number; pageY: number },
  b: { pageX: number; pageY: number },
) {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

// Pulsing ring on a hotspot; counter-scaled so it stays a constant size while
// the painting is zoomed.
function HotspotDot({
  hotspot,
  active,
  counterScale,
  onPress,
}: {
  hotspot: Hotspot;
  active: boolean;
  counterScale: Animated.AnimatedInterpolation<number>;
  onPress: () => void;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, [p]);
  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + p.value * 1.7 }],
    opacity: 0.55 * (1 - p.value),
  }));
  return (
    <Animated.View
      style={[
        styles.hotspot,
        {
          left: `${hotspot.x * 100}%`,
          top: `${hotspot.y * 100}%`,
          transform: [{ scale: counterScale }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={styles.hotspotHit}
        accessibilityLabel={hotspot.title}
      >
        <Reanimated.View style={[styles.hotspotRing, ring]} />
        <View style={styles.hotspotCore} />
        <View style={styles.hotspotPin} />
        {active ? (
          <View style={styles.hotspotLabel}>
            <Text style={styles.hotspotLabelText}>{hotspot.title}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

type Props = {
  artwork: Artwork;
  selectedHotspotId: string | null;
  onHotspotPress: (hotspot: Hotspot) => void;
};

// The painting in an infinite 2D canvas: pinch to zoom, drag to pan, double-tap
// to fit. Hotspots live inside the transformed box so they track the painting.
export function PaintingCanvas({
  artwork,
  selectedHotspotId,
  onHotspotPress,
}: Props) {
  const [container, setContainer] = useState({ width: 0, height: 0 });

  const scale = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const base = useRef({ scale: 1, x: 0, y: 0 });
  const current = useRef({ scale: 1, x: 0, y: 0 });
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    const s = scale.addListener(({ value }) => (current.current.scale = value));
    const t = translate.addListener(({ x, y }) => {
      current.current.x = x;
      current.current.y = y;
    });
    return () => {
      scale.removeListener(s);
      translate.removeListener(t);
    };
  }, [scale, translate]);

  const aspect = useMemo(() => {
    const w = artwork.widthCm || 1;
    const h = artwork.heightCm || 1;
    return w / h;
  }, [artwork.widthCm, artwork.heightCm]);

  // Contain-fit box so the whole painting is visible at rest.
  const box = useMemo(() => {
    const { width, height } = container;
    if (!width || !height) return { width: 0, height: 0 };
    const fit = Math.min(width / aspect, height);
    const boxByHeight = { width: fit * aspect, height: fit };
    const boxByWidth = { width, height: width / aspect };
    return boxByWidth.height <= height ? boxByWidth : boxByHeight;
  }, [container, aspect]);

  const clampTranslate = (x: number, y: number, s: number) => {
    const maxX = Math.max(0, (box.width * s - container.width) / 2);
    const maxY = Math.max(0, (box.height * s - container.height) / 2);
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  };

  const fit = () => {
    base.current = { scale: 1, x: 0, y: 0 };
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    Animated.spring(translate, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (e, g) =>
          e.nativeEvent.touches.length === 2 ||
          Math.abs(g.dx) > MOVE_THRESHOLD ||
          Math.abs(g.dy) > MOVE_THRESHOLD,
        onPanResponderGrant: () => {
          base.current = { ...current.current };
          pinchStart.current = null;
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          if (touches.length === 2 && touches[0] && touches[1]) {
            const dist = distance(touches[0], touches[1]);
            if (!pinchStart.current) {
              pinchStart.current = { dist, scale: base.current.scale };
            }
            const next = clamp(
              pinchStart.current.scale * (dist / pinchStart.current.dist),
              MIN_SCALE,
              MAX_SCALE,
            );
            scale.setValue(next);
          } else {
            translate.setValue({
              x: base.current.x + g.dx,
              y: base.current.y + g.dy,
            });
          }
        },
        onPanResponderRelease: () => {
          const s = current.current.scale;
          const clamped = clampTranslate(
            current.current.x,
            current.current.y,
            s,
          );
          base.current = { scale: s, ...clamped };
          pinchStart.current = null;
          Animated.spring(translate, {
            toValue: clamped,
            useNativeDriver: true,
          }).start();
        },
      }),
    // box/container captured via refs at gesture time; recreate when they change.
    [box, container],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainer({ width, height });
  };

  const counterScale = scale.interpolate({
    inputRange: [MIN_SCALE, MAX_SCALE],
    outputRange: [1, 1 / MAX_SCALE],
  });

  const onBackgroundPress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      fit();
    }
    lastTap.current = now;
  };

  return (
    <View style={styles.root} onLayout={onLayout} {...responder.panHandlers}>
      {box.width > 0 ? (
        <Animated.View
          style={[
            styles.box,
            {
              width: box.width,
              height: box.height,
              transform: [
                { translateX: translate.x },
                { translateY: translate.y },
                { scale },
              ],
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onBackgroundPress}
          >
            <Image
              source={{ uri: artwork.refImageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          </Pressable>
          {artwork.hotspots.map((hotspot) => (
            <HotspotDot
              key={hotspot.id}
              hotspot={hotspot}
              active={hotspot.id === selectedHotspotId}
              counterScale={counterScale}
              onPress={() => onHotspotPress(hotspot)}
            />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  box: { position: "relative" },
  hotspot: {
    position: "absolute",
    width: 64,
    height: 64,
    marginLeft: -32,
    marginTop: -32,
    alignItems: "center",
    justifyContent: "center",
  },
  hotspotHit: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  hotspotRing: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  hotspotCore: {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  hotspotPin: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  hotspotLabel: {
    position: "absolute",
    top: -2,
    backgroundColor: colors.accent,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 5,
  },
  hotspotLabelText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.ink,
  },
});
