import "react-native-url-polyfill/auto";

import {
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  useFonts
} from "@expo-google-fonts/newsreader";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

import type { Artwork } from "./src/domain/artwork";
import type { ArtworkIdentification } from "./src/domain/artworkIdentifier";
import { ArtworkDetailScreen } from "./src/screens/ArtworkDetailScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";
import { fetchArtworks } from "./src/services/artworks";
import { hasSupabaseConfig } from "./src/services/supabase";
import { colors, fonts, radii } from "./src/theme";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; artworks: Artwork[] }
  | { status: "error"; message: string };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    JetBrainsMono_500Medium
  });
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const loadArtworks = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      const artworks = await fetchArtworks();
      setLoad({ status: "ready", artworks });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setLoad({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    loadArtworks();
  }, [loadArtworks]);

  const handleIdentify = (identification: ArtworkIdentification) => {
    setSelectedArtwork(identification.artwork);
  };

  // If fonts fail to load (e.g. offline first launch), fall through to system
  // fonts rather than blocking on the spinner forever.
  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {load.status === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.centerText}>Loading artworks…</Text>
        </View>
      ) : load.status === "error" ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load artworks</Text>
          <Text style={styles.centerText}>{load.message}</Text>
          <Pressable style={styles.retryButton} onPress={loadArtworks}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : selectedArtwork ? (
        <ArtworkDetailScreen
          artwork={selectedArtwork}
          onBack={() => setSelectedArtwork(null)}
        />
      ) : (
        <>
          {!hasSupabaseConfig ? (
            <View style={styles.sampleBanner}>
              <Text style={styles.sampleBannerText}>
                SAMPLE MODE — SET EXPO_PUBLIC_SUPABASE_ANON_KEY FOR LIVE DATA
              </Text>
            </View>
          ) : null}
          <ScannerScreen artworks={load.artworks} onIdentify={handleIdentify} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBottom
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24
  },
  centerText: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
    textAlign: "center"
  },
  errorTitle: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 20,
    textAlign: "center"
  },
  retryButton: {
    marginTop: 8,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 11
  },
  retryText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1
  },
  sampleBanner: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  sampleBannerText: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    textAlign: "center"
  }
});
