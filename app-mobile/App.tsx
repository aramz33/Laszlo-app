import "react-native-url-polyfill/auto";

import {
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  useFonts,
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
  View,
} from "react-native";

import { DemoNav } from "./src/components/DemoNav";
import { LanguagePill } from "./src/components/LanguagePill";
import { LanguageProvider } from "./src/context/LanguageContext";
import type { Artwork } from "./src/domain/artwork";
import type { ArtworkIdentification } from "./src/domain/artworkIdentifier";
import { ArtworkDetailScreen } from "./src/screens/ArtworkDetailScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";
import { fetchArtworks } from "./src/services/artworks";
import {
  clearStoredProfile,
  loadStoredProfile,
  saveStoredProfile,
  type StoredProfile,
} from "./src/services/profile";
import { hasSupabaseConfig } from "./src/services/supabase";
import { colors, fonts, radii } from "./src/theme";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; artworks: Artwork[] }
  | { status: "error"; message: string };

type ProfileState =
  | { status: "loading" }
  | { status: "onboarding" }
  | { status: "ready"; stored: StoredProfile };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    JetBrainsMono_500Medium,
  });
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [profileState, setProfileState] = useState<ProfileState>({
    status: "loading",
  });
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  // Last known profile, kept so the demo can step back into onboarding and
  // forward again without losing (or re-typing) the visitor's answers.
  const [rememberedProfile, setRememberedProfile] =
    useState<StoredProfile | null>(null);

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

  useEffect(() => {
    let active = true;
    loadStoredProfile().then((stored) => {
      if (!active) return;
      if (stored) setRememberedProfile(stored);
      setProfileState(
        stored ? { status: "ready", stored } : { status: "onboarding" },
      );
    });
    return () => {
      active = false;
    };
  }, []);

  const handleOnboardingComplete = useCallback((stored: StoredProfile) => {
    saveStoredProfile(stored);
    setRememberedProfile(stored);
    setProfileState({ status: "ready", stored });
  }, []);

  const handleIdentify = (identification: ArtworkIdentification) => {
    setSelectedArtwork(identification.artwork);
  };

  // Demo flow: onboarding (0) → scanner (1) → artwork (2).
  const stepIndex =
    profileState.status !== "ready" ? 0 : selectedArtwork ? 2 : 1;
  const artworks = load.status === "ready" ? load.artworks : [];

  const goBack = useCallback(() => {
    if (selectedArtwork) {
      setSelectedArtwork(null);
    } else if (profileState.status === "ready") {
      setProfileState({ status: "onboarding" });
    }
  }, [selectedArtwork, profileState.status]);

  const goForward = useCallback(() => {
    if (profileState.status !== "ready") {
      // Re-enter the flow with the last answers (or an empty skip) without
      // recomputing — START in onboarding is what recomputes the persona.
      const stored: StoredProfile = rememberedProfile ?? {
        lang: "fr",
        answers: { interets: [] },
        profile: {},
      };
      setProfileState({ status: "ready", stored });
    } else if (!selectedArtwork && artworks[0]) {
      setSelectedArtwork(artworks[0]);
    }
  }, [profileState.status, rememberedProfile, selectedArtwork, artworks]);

  const resetProfile = useCallback(() => {
    clearStoredProfile();
    setRememberedProfile(null);
    setSelectedArtwork(null);
    setProfileState({ status: "onboarding" });
  }, []);

  const canBack = stepIndex > 0;
  const canForward =
    stepIndex === 0 || (stepIndex === 1 && artworks.length > 0);

  // If fonts fail to load (e.g. offline first launch), fall through to system
  // fonts rather than blocking on the spinner forever.
  if ((!fontsLoaded && !fontError) || profileState.status === "loading") {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const profile =
    profileState.status === "ready" ? profileState.stored.profile : undefined;
  const initialLang =
    profileState.status === "ready" ? profileState.stored.lang : "fr";

  return (
    <LanguageProvider initialLang={initialLang}>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        {profileState.status === "onboarding" ? (
          <OnboardingScreen
            onComplete={handleOnboardingComplete}
            initialAnswers={rememberedProfile?.answers}
          />
        ) : (
          <>
            {load.status === "ready" ? (
              <View style={styles.hud} pointerEvents="box-none">
                <LanguagePill />
              </View>
            ) : null}
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
                profile={profile}
              />
            ) : (
              <>
                {!hasSupabaseConfig ? (
                  <View style={styles.sampleBanner}>
                    <Text style={styles.sampleBannerText}>
                      SAMPLE MODE — SET EXPO_PUBLIC_SUPABASE_ANON_KEY FOR LIVE
                      DATA
                    </Text>
                  </View>
                ) : null}
                <ScannerScreen
                  artworks={load.artworks}
                  onIdentify={handleIdentify}
                />
              </>
            )}
          </>
        )}
        <DemoNav
          stepIndex={stepIndex}
          canBack={canBack}
          canForward={canForward}
          onBack={goBack}
          onForward={goForward}
          onResetProfile={resetProfile}
        />
      </SafeAreaView>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBottom,
  },
  hud: {
    position: "absolute",
    top: 10,
    right: 16,
    zIndex: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  centerText: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
    textAlign: "center",
  },
  errorTitle: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 20,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  retryText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1,
  },
  sampleBanner: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sampleBannerText: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    textAlign: "center",
  },
});
