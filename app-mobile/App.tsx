import "react-native-url-polyfill/auto";

import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import { demoArtworks } from "./src/data/demoArtworks";
import type { Artwork } from "./src/domain/artwork";
import type { ArtworkIdentification } from "./src/domain/artworkIdentifier";
import { ArtworkDetailScreen } from "./src/screens/ArtworkDetailScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";

export default function App() {
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const handleIdentify = (identification: ArtworkIdentification) => {
    setSelectedArtwork(identification.artwork);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {selectedArtwork ? (
        <ArtworkDetailScreen
          artwork={selectedArtwork}
          onBack={() => setSelectedArtwork(null)}
        />
      ) : (
        <ScannerScreen artworks={demoArtworks} onIdentify={handleIdentify} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#111111"
  }
});
