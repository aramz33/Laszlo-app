import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ManualArtworkList } from "../adapters/manual/ManualArtworkList";
import { ViroArtworkScanner } from "../adapters/viro/ViroArtworkScanner";
import type { Artwork } from "../domain/artwork";
import type { IdentifyArtwork } from "../domain/artworkIdentifier";
import { useVisionIdentify } from "../hooks/useVisionIdentify";
import { colors, fonts, radii } from "../theme";

type Props = {
  artworks: Artwork[];
  onIdentify: IdentifyArtwork;
};

const VISION_HINT: Record<string, string> = {
  no_match: "Couldn't match the photo. Pick it from the list.",
  denied: "Camera access is off. Pick it from the list.",
  error: "Photo match failed. Pick it from the list."
};

export function ScannerScreen({ artworks, onIdentify }: Props) {
  const [arEnabled, setArEnabled] = useState(true);

  const candidateIds = useMemo(() => artworks.map((a) => a.id), [artworks]);
  const { state: visionState, capture } = useVisionIdentify(candidateIds);
  const matching = visionState === "matching";

  const onPhoto = async () => {
    const match = await capture();
    if (!match) {
      setArEnabled(false); // no match / denied / cancelled → manual picker
      return;
    }
    const artwork = artworks.find((a) => a.id === match.artworkId);
    if (artwork) {
      onIdentify({ artwork, source: "vision", confidence: match.confidence });
    } else {
      setArEnabled(false);
    }
  };

  const hint = VISION_HINT[visionState];

  return (
    <View style={styles.root}>
      <View style={styles.cameraSurface}>
        {arEnabled ? (
          <ViroArtworkScanner artworks={artworks} onIdentify={onIdentify} />
        ) : (
          <View style={styles.manualPane}>
            <Text style={styles.manualTitle}>Choose artwork</Text>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            <ManualArtworkList artworks={artworks} onIdentify={onIdentify} />
          </View>
        )}
      </View>

      <View style={styles.controlBar}>
        <View style={styles.copy}>
          <Text style={styles.kicker}>LASZLO</Text>
          <Text style={styles.title}>Point at the artwork</Text>
          <Text style={styles.body}>
            Hold steady until the point appears, or snap a photo if it won't lock
            on.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            style={[styles.secondaryButton, matching && styles.buttonBusy]}
            onPress={onPhoto}
            disabled={matching}
          >
            <Text style={styles.secondaryButtonText}>
              {matching ? "MATCHING\u2026" : "Photo"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setArEnabled((current) => !current)}
          >
            <Text style={styles.secondaryButtonText}>
              {arEnabled ? "Manual" : "Camera"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBottom
  },
  cameraSurface: {
    flex: 1,
    backgroundColor: "#050505"
  },
  manualPane: {
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  manualTitle: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 24,
    marginBottom: 16
  },
  hint: {
    color: colors.accent,
    fontFamily: fonts.serifRegular,
    fontSize: 14,
    marginBottom: 14
  },
  controlBar: {
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface
  },
  copy: {
    flex: 1
  },
  actions: {
    gap: 8
  },
  buttonBusy: {
    opacity: 0.6
  },
  kicker: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 22,
    marginTop: 4
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 4
  },
  secondaryButton: {
    minWidth: 92,
    borderRadius: radii.pill,
    borderColor: colors.hairlineStrong,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1
  }
});
