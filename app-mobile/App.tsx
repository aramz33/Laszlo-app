import "react-native-url-polyfill/auto";

import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import { demoArtworks } from "./src/data/demoArtworks";
import type { Artwork } from "./src/domain/artwork";
import type { ArtworkIdentification } from "./src/domain/artworkIdentifier";
import type { Persona } from "./src/domain/persona";
import { DEFAULT_PERSONA } from "./src/domain/persona";
import type { SessionMemory } from "./src/domain/session";
import { createSessionMemory } from "./src/domain/session";
import { ArtworkDetailScreen } from "./src/screens/ArtworkDetailScreen";
import { NavigationScreen } from "./src/screens/navigation/NavigationScreen";
import { OnboardingScreen } from "./src/screens/onboarding/OnboardingScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";

type AppScreen =
  | { kind: "onboarding" }
  | { kind: "scanner" }
  | { kind: "detail"; artwork: Artwork }
  | { kind: "navigation"; from: Artwork; to: Artwork };

export default function App() {
  const [screen, setScreen] = useState<AppScreen>({ kind: "onboarding" });
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);
  const [memory, setMemory] = useState<SessionMemory>(createSessionMemory());

  const handleOnboardingComplete = (p: Persona) => {
    setPersona(p);
    setScreen({ kind: "scanner" });
  };

  const handleIdentify = (identification: ArtworkIdentification) => {
    setScreen({ kind: "detail", artwork: identification.artwork });
  };

  const handleNavigateNext = (currentArtwork: Artwork) => {
    const nextArtwork = demoArtworks.find((a) => a.id !== currentArtwork.id);
    if (nextArtwork) {
      setScreen({ kind: "navigation", from: currentArtwork, to: nextArtwork });
    }
  };

  const handleArrive = (artwork: Artwork) => {
    setScreen({ kind: "detail", artwork });
  };

  return (
    <SafeAreaView
      style={[styles.root, screen.kind !== "onboarding" && screen.kind !== "detail" && screen.kind !== "navigation" && styles.rootDark]}
    >
      <StatusBar style={screen.kind === "scanner" ? "light" : "dark"} />

      {screen.kind === "onboarding" && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}

      {screen.kind === "scanner" && (
        <ScannerScreen artworks={demoArtworks} onIdentify={handleIdentify} />
      )}

      {screen.kind === "detail" && (
        <ArtworkDetailScreen
          artwork={screen.artwork}
          persona={persona}
          memory={memory}
          onMemoryUpdate={setMemory}
          onBack={() => setScreen({ kind: "scanner" })}
          onNavigateNext={() => handleNavigateNext(screen.artwork)}
        />
      )}

      {screen.kind === "navigation" && (
        <NavigationScreen
          fromArtwork={screen.from}
          toArtwork={screen.to}
          memory={memory}
          onArrive={() => handleArrive(screen.to)}
          onBack={() => setScreen({ kind: "detail", artwork: screen.from })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ece6da"
  },
  rootDark: {
    backgroundColor: "#111111"
  }
});
