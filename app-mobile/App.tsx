import "react-native-url-polyfill/auto";

import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import {
  useFonts,
  Newsreader_300Light,
  Newsreader_300Light_Italic,
  Newsreader_400Regular,
  Newsreader_500Medium,
} from "@expo-google-fonts/newsreader";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";

import { colors } from "./src/theme";
import type { Artwork } from "./src/domain/artwork";
import type { ArtworkIdentification } from "./src/domain/artworkIdentifier";
import { ArtworkDetailScreen } from "./src/screens/ArtworkDetailScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";
import {
  loadFeaturedArtworks,
  type ArtworkDataSource,
} from "./src/services/artworks";
import {
  defaultRuntimeProfile,
  type RuntimeLanguage,
} from "./src/services/runtime";

export default function App() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [dataSource, setDataSource] = useState<ArtworkDataSource>("demo");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingArtworks, setLoadingArtworks] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [language, setLanguage] = useState<RuntimeLanguage>("fr");

  const [fontsLoaded] = useFonts({
    Newsreader_300Light,
    Newsreader_300Light_Italic,
    Newsreader_400Regular,
    Newsreader_500Medium,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    let cancelled = false;

    loadFeaturedArtworks().then((result) => {
      if (cancelled) {
        return;
      }

      setArtworks(result.artworks);
      setDataSource(result.source);
      setLoadError(result.error ?? null);
      setLoadingArtworks(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const openArtwork = useCallback((artwork: Artwork) => {
    setSelectedArtwork(artwork);
  }, []);

  const handleIdentify = useCallback(
    (identification: ArtworkIdentification) => {
      openArtwork(identification.artwork);
    },
    [openArtwork],
  );

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {selectedArtwork ? (
        <ArtworkDetailScreen
          artwork={selectedArtwork}
          language={language}
          onLanguageChange={setLanguage}
          profile={defaultRuntimeProfile}
          onBack={() => setSelectedArtwork(null)}
        />
      ) : (
        <ScannerScreen
          artworks={artworks}
          dataSource={dataSource}
          language={language}
          loading={loadingArtworks}
          loadError={loadError}
          onIdentify={handleIdentify}
          onLanguageChange={setLanguage}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
