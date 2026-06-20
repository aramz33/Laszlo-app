import "react-native-url-polyfill/auto";

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

type LoadState =
  | { status: "loading" }
  | { status: "ready"; artworks: Artwork[] }
  | { status: "error"; message: string };

export default function App() {
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

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {load.status === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color="#8fc7ff" />
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
                Sample mode — set EXPO_PUBLIC_SUPABASE_ANON_KEY to load live data
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
    backgroundColor: "#111111"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24
  },
  centerText: {
    color: "#c5beb4",
    fontSize: 14,
    textAlign: "center"
  },
  errorTitle: {
    color: "#f7f1e7",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  retryButton: {
    marginTop: 8,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  retryText: {
    color: "#f7f1e7",
    fontSize: 14,
    fontWeight: "700"
  },
  sampleBanner: {
    backgroundColor: "#2a2620",
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  sampleBannerText: {
    color: "#d9b35b",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center"
  }
});
