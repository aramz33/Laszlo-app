import type { ReactElement } from "react";
import { useEffect, useMemo } from "react";
import {
  ViroARImageMarker,
  ViroARScene,
  ViroARSceneNavigator,
  ViroARTrackingTargets,
  ViroAnimations,
  ViroMaterials,
  ViroOmniLight,
  ViroPolyline,
  ViroSphere,
} from "@reactvision/react-viro";

import type { Artwork } from "../../domain/artwork";
import type { IdentifyArtwork } from "../../domain/artworkIdentifier";
import { colors } from "../../theme";

type Props = {
  artworks: Artwork[];
  onIdentify: IdentifyArtwork;
};

type SceneProps = {
  sceneNavigator: {
    viroAppProps: Props;
  };
};

const targetNameFor = (artwork: Artwork) => `artwork-${artwork.objectNumber}`;

type Point3 = [number, number, number];
type RingSegment = [Point3, Point3];

// ponytail: physical-world tuning knob; keep the AR core visible without becoming
// a dinner plate on huge works. Adjust clamp values after device testing.
const coreRadiusFor = (artwork: Artwork) => {
  const widthM = artwork.widthCm / 100;
  return Math.min(Math.max(widthM * 0.018, 0.015), 0.055);
};

function ringSegments(radius: number, count = 14): RingSegment[] {
  return Array.from({ length: count }, (_, index) => {
    const gap = (Math.PI * 2) / count;
    const start = index * gap + gap * 0.16;
    const end = start + gap * 0.48;
    return [
      [Math.cos(start) * radius, Math.sin(start) * radius, 0],
      [Math.cos(end) * radius, Math.sin(end) * radius, 0],
    ];
  });
}

ViroMaterials.createMaterials({
  laszloGlow: {
    lightingModel: "Constant",
    diffuseColor: colors.accent,
    bloomThreshold: 0.35,
  },
  laszloCoreBorder: {
    lightingModel: "Constant",
    diffuseColor: colors.text,
  },
  laszloHalo: {
    lightingModel: "Constant",
    diffuseColor: colors.accentGlow,
    blendMode: "Alpha",
    writesToDepthBuffer: false,
  },
  laszloRing: {
    lightingModel: "Constant",
    diffuseColor: colors.accent,
    blendMode: "Alpha",
    writesToDepthBuffer: false,
  },
  laszloRingSoft: {
    lightingModel: "Constant",
    diffuseColor: colors.text,
    blendMode: "Alpha",
    writesToDepthBuffer: false,
  },
});

ViroAnimations.registerAnimations({
  glowPulse: [
    {
      properties: { scaleX: 1.08, scaleY: 1.08, scaleZ: 1.08, opacity: 0.82 },
      duration: 900,
      easing: "EaseInEaseOut",
    },
    {
      properties: { scaleX: 1, scaleY: 1, scaleZ: 1, opacity: 1 },
      duration: 900,
      easing: "EaseInEaseOut",
    },
  ],
  haloPulse: [
    {
      properties: { scaleX: 1.38, scaleY: 1.38, scaleZ: 1, opacity: 0.05 },
      duration: 1500,
      easing: "EaseOut",
    },
    {
      properties: { scaleX: 0.9, scaleY: 0.9, scaleZ: 1, opacity: 0.42 },
      duration: 0,
    },
  ],
  ringBreathe: [
    {
      properties: { scaleX: 1.12, scaleY: 1.12, scaleZ: 1, opacity: 0.28 },
      duration: 900,
      easing: "EaseInEaseOut",
    },
    {
      properties: { scaleX: 0.96, scaleY: 0.96, scaleZ: 1, opacity: 0.58 },
      duration: 900,
      easing: "EaseInEaseOut",
    },
  ],
});

function registerArtworkTargets(artworks: Artwork[]) {
  const targets = artworks.reduce<Record<string, object>>((acc, artwork) => {
    acc[targetNameFor(artwork)] = {
      source: { uri: artwork.refImageUrl },
      orientation: "Up",
      physicalWidth: artwork.widthCm / 100,
    };
    return acc;
  }, {});

  ViroARTrackingTargets.createTargets(targets);
}

function ArtworkARScene({ sceneNavigator }: SceneProps) {
  const { artworks, onIdentify } = sceneNavigator.viroAppProps;

  return (
    <ViroARScene>
      {artworks.map((artwork) => {
        const radius = coreRadiusFor(artwork);
        const openArtwork = () =>
          onIdentify({ artwork, source: "viro", confidence: 1 });
        const innerRing = ringSegments(radius * 3.1);
        const outerRing = ringSegments(radius * 5.3);
        return (
          <ViroARImageMarker
            key={artwork.objectNumber}
            target={targetNameFor(artwork)}
            pauseUpdates={false}
          >
            <ViroOmniLight
              position={[0, 0, radius * 1.5]}
              color={colors.accent}
              intensity={1600}
              attenuationStartDistance={0}
              attenuationEndDistance={radius * 18}
            />
            <ViroSphere
              position={[0, 0, radius * 0.82]}
              radius={radius * 4.4}
              materials={["laszloHalo"]}
              opacity={0.34}
              animation={{ name: "haloPulse", run: true, loop: true }}
              onClick={openArtwork}
            />
            {outerRing.map((points, index) => (
              <ViroPolyline
                key={`outer-${artwork.id}-${index}`}
                points={points}
                position={[0, 0, radius * 1.12]}
                thickness={radius * 0.08}
                materials={["laszloRing"]}
                opacity={0.5}
                animation={{ name: "haloPulse", run: true, loop: true }}
                onClick={openArtwork}
              />
            ))}
            {innerRing.map((points, index) => (
              <ViroPolyline
                key={`inner-${artwork.id}-${index}`}
                points={points}
                position={[0, 0, radius * 1.16]}
                thickness={radius * 0.1}
                materials={["laszloRingSoft"]}
                opacity={0.58}
                animation={{ name: "ringBreathe", run: true, loop: true }}
                onClick={openArtwork}
              />
            ))}
            <ViroSphere
              position={[0, 0, radius * 1.18]}
              radius={radius * 1.2}
              materials={["laszloCoreBorder"]}
              onClick={openArtwork}
            />
            <ViroSphere
              position={[0, 0, radius * 1.28]}
              radius={radius}
              materials={["laszloGlow"]}
              animation={{ name: "glowPulse", run: true, loop: true }}
              onClick={openArtwork}
            />
          </ViroARImageMarker>
        );
      })}
    </ViroARScene>
  );
}

export function ViroArtworkScanner({ artworks, onIdentify }: Props) {
  const appProps = useMemo(
    () => ({ artworks, onIdentify }),
    [artworks, onIdentify],
  );
  const initialScene = useMemo(
    () => ({ scene: ArtworkARScene as unknown as () => ReactElement }),
    [],
  );

  useEffect(() => {
    registerArtworkTargets(artworks);
  }, [artworks]);

  return (
    <ViroARSceneNavigator
      autofocus
      initialScene={initialScene}
      viroAppProps={appProps}
      style={{ flex: 1 }}
    />
  );
}
