import type { ReactElement } from "react";
import { useEffect, useMemo } from "react";
import {
  ViroARImageMarker,
  ViroARScene,
  ViroARSceneNavigator,
  ViroARTrackingTargets,
  ViroAnimations,
  ViroBox,
  ViroMaterials
} from "@reactvision/react-viro";

import type { Artwork } from "../../domain/artwork";
import type { IdentifyArtwork } from "../../domain/artworkIdentifier";

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

ViroMaterials.createMaterials({
  laszloMarkerBlue: {
    diffuseColor: "#2f8cff"
  }
});

ViroAnimations.registerAnimations({
  markerPulse: [
    {
      properties: {
        scaleX: 1.25,
        scaleY: 1.25,
        scaleZ: 1.25,
        opacity: 0.65
      },
      duration: 620
    },
    {
      properties: {
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        opacity: 1
      },
      duration: 620
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
      {artworks.map((artwork) => (
        <ViroARImageMarker
          key={artwork.objectNumber}
          target={targetNameFor(artwork)}
          pauseUpdates={false}
        >
          <ViroBox
            position={[0, 0, 0.025]}
            scale={[0.035, 0.035, 0.035]}
            materials={["laszloMarkerBlue"]}
            animation={{ name: "markerPulse", run: true, loop: true }}
            onClick={() =>
              onIdentify({ artwork, source: "viro", confidence: 1 })
            }
          />
        </ViroARImageMarker>
      ))}
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
