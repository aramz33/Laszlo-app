import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ManualArtworkList } from "../adapters/manual/ManualArtworkList";
import { ViroArtworkScanner } from "../adapters/viro/ViroArtworkScanner";
import type { Artwork } from "../domain/artwork";
import type { IdentifyArtwork } from "../domain/artworkIdentifier";

type Props = {
  artworks: Artwork[];
  onIdentify: IdentifyArtwork;
};

export function ScannerScreen({ artworks, onIdentify }: Props) {
  const [arEnabled, setArEnabled] = useState(true);

  return (
    <View style={styles.root}>
      <View style={styles.cameraSurface}>
        {arEnabled ? (
          <ViroArtworkScanner artworks={artworks} onIdentify={onIdentify} />
        ) : (
          <View style={styles.manualPane}>
            <Text style={styles.manualTitle}>Choose artwork</Text>
            <ManualArtworkList artworks={artworks} onIdentify={onIdentify} />
          </View>
        )}
      </View>

      <View style={styles.controlBar}>
        <View style={styles.copy}>
          <Text style={styles.kicker}>Laszlo</Text>
          <Text style={styles.title}>Point at the artwork</Text>
          <Text style={styles.body}>
            Hold steady until the blue point appears. Tap it to open the guide.
          </Text>
        </View>
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
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#111111"
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
    color: "#f7f1e7",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16
  },
  controlBar: {
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    borderTopWidth: 1,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#181715"
  },
  copy: {
    flex: 1
  },
  kicker: {
    color: "#8fc7ff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#f7f1e7",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4
  },
  body: {
    color: "#c5beb4",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  secondaryButton: {
    minWidth: 92,
    borderRadius: 8,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#f7f1e7",
    fontSize: 14,
    fontWeight: "700"
  }
});
