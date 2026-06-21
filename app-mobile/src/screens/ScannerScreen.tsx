import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ManualArtworkList } from "../adapters/manual/ManualArtworkList";
import { ViroArtworkScanner } from "../adapters/viro/ViroArtworkScanner";
import type { Artwork } from "../domain/artwork";
import type { IdentifyArtwork } from "../domain/artworkIdentifier";
import { colors, fonts, radii } from "../theme";

type Props = {
  artworks: Artwork[];
  onIdentify: IdentifyArtwork;
};

const FLAGSHIP_OBJECT_NUMBERS = new Set(["SK-C-5", "SK-A-2344"]);

export function ScannerScreen({ artworks, onIdentify }: Props) {
  const [arEnabled, setArEnabled] = useState(true);

  const orderedArtworks = useMemo(
    () =>
      [...artworks].sort((a, b) => {
        const aFlagship = FLAGSHIP_OBJECT_NUMBERS.has(a.objectNumber) ? 0 : 1;
        const bFlagship = FLAGSHIP_OBJECT_NUMBERS.has(b.objectNumber) ? 0 : 1;
        if (aFlagship !== bFlagship) return aFlagship - bFlagship;
        return a.originalTitle.localeCompare(b.originalTitle);
      }),
    [artworks],
  );

  return (
    <View style={styles.root}>
      <View style={styles.cameraSurface}>
        {arEnabled ? (
          <>
            <ViroArtworkScanner artworks={orderedArtworks} onIdentify={onIdentify} />
            <View style={styles.scanFrame} pointerEvents="none">
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </>
        ) : (
          <View style={styles.manualPane}>
            <View style={styles.manualHead}>
              <Text style={styles.kicker}>MANUAL FALLBACK</Text>
              <Text style={styles.manualTitle}>Flagship works</Text>
            </View>
            <ManualArtworkList
              artworks={orderedArtworks}
              onIdentify={onIdentify}
              flagshipObjectNumbers={FLAGSHIP_OBJECT_NUMBERS}
            />
          </View>
        )}
      </View>

      <View style={styles.controlBar}>
        <View style={styles.copy}>
          <Text style={styles.kicker}>LASZLO AR</Text>
          <Text style={styles.title}>
            {arEnabled ? "Live artwork scan" : "Manual entry"}
          </Text>
          <Text style={styles.body} numberOfLines={1}>
            {arEnabled ? "Point appears on the work." : "Same reveal, same guide."}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setArEnabled((current) => !current)}
          >
            <Text style={styles.secondaryButtonText}>
              {arEnabled ? "Manual" : "AR"}
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
    backgroundColor: "#050505",
    overflow: "hidden"
  },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    margin: 28,
    borderColor: "rgba(216, 176, 106, 0.16)",
    borderWidth: 1
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: colors.accent
  },
  cornerTopLeft: {
    top: -1,
    left: -1,
    borderTopWidth: 2,
    borderLeftWidth: 2
  },
  cornerTopRight: {
    top: -1,
    right: -1,
    borderTopWidth: 2,
    borderRightWidth: 2
  },
  cornerBottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 2,
    borderLeftWidth: 2
  },
  cornerBottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 2,
    borderRightWidth: 2
  },
  manualPane: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 10
  },
  manualHead: {
    marginBottom: 14
  },
  manualTitle: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 26,
    marginTop: 4
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
  kicker: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0
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
    minWidth: 82,
    minHeight: 46,
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
    letterSpacing: 0
  }
});
