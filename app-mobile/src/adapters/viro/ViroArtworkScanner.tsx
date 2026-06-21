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
  ViroSphere
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

// Glow radius proportional to the artwork width so it stays a small point of
// light whatever the AR tracking scale (an absolute size looked like a giant
// cube on small reference images).
const glowRadiusFor = (artwork: Artwork) => (artwork.widthCm / 100) * 0.05;

ViroMaterials.createMaterials({
  laszloGlow: {
    lightingModel: "Constant",
    diffuseColor: colors.accent
  }
});

ViroAnimations.registerAnimations({
  glowPulse: [
    {
      properties: { scaleX: 1.18, scaleY: 1.18, scaleZ: 1.18, opacity: 0.55 },
      duration: 900,
      easing: "EaseInEaseOut"
    },
    {
      properties: { scaleX: 1, scaleY: 1, scaleZ: 1, opacity: 1 },
      duration: 900,
      easing: "EaseInEaseOut"
    }
  ]
});

function registerArtworkTargets(artworks: Artwork[]) {
  const targets = artworks.reduce<Record<string, object>>((acc, artwork) => {
    acc[targetNameFor(artwork)] = {
      source: { uri: artwork.refImageUrl },
      orientation: "Up",
      physicalWidth: artwork.widthCm / 100
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
        const radius = glowRadiusFor(artwork);
        return (
          <ViroARImageMarker
            key={artwork.objectNumber}
            target={targetNameFor(artwork)}
            pauseUpdates={false}
          >
            <ViroOmniLight
              position={[0, 0, radius * 1.5]}
              color={colors.accent}
              intensity={900}
              attenuationStartDistance={0}
              attenuationEndDistance={radius * 12}
            />
            <ViroSphere
              position={[0, 0, radius]}
              radius={radius}
              materials={["laszloGlow"]}
              animation={{ name: "glowPulse", run: true, loop: true }}
              onClick={() =>
                onIdentify({ artwork, source: "viro", confidence: 1 })
              }
            />
          </ViroARImageMarker>
        );
      })}
    </ViroARScene>
  );
}

export function ViroArtworkScanner({ artworks, onIdentify }: Props) {
  const appProps = useMemo(() => ({ artworks, onIdentify }), [artworks, onIdentify]);
  const initialScene = useMemo(
    () => ({ scene: ArtworkARScene as unknown as () => ReactElement }),
    []
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
