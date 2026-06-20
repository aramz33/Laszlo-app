import { useState, type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius } from "../theme";
import { ManualArtworkList } from "../adapters/manual/ManualArtworkList";
import type { Artwork } from "../domain/artwork";
import type { IdentifyArtwork } from "../domain/artworkIdentifier";
import type { ArtworkDataSource } from "../services/artworks";
import type { RuntimeLanguage } from "../services/runtime";

declare const require: <T>(id: string) => T;

type Props = {
  artworks: Artwork[];
  dataSource: ArtworkDataSource;
  language: RuntimeLanguage;
  loading: boolean;
  loadError: string | null;
  onIdentify: IdentifyArtwork;
  onLanguageChange: (language: RuntimeLanguage) => void;
};

type ViroScannerProps = Pick<Props, "artworks" | "onIdentify">;

const languages: RuntimeLanguage[] = ["fr", "en", "nl"];
let ViroScanner: ComponentType<ViroScannerProps> | null | undefined;

function getViroScanner() {
  if (ViroScanner !== undefined) {
    return ViroScanner;
  }

  try {
    ViroScanner = require<
      typeof import("../adapters/viro/ViroArtworkScanner")
    >("../adapters/viro/ViroArtworkScanner").ViroArtworkScanner;
  } catch {
    ViroScanner = null;
  }

  return ViroScanner;
}

export function ScannerScreen({
  artworks,
  dataSource,
  language,
  loading,
  loadError,
  onIdentify,
  onLanguageChange,
}: Props) {
  const [arEnabled, setArEnabled] = useState(false);
  const canScan = artworks.length > 0 && !loading;
  const Scanner = arEnabled ? getViroScanner() : null;

  return (
    <View style={styles.root}>
      <View style={styles.cameraSurface}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Loading artworks</Text>
            <Text style={styles.emptyBody}>
              Preparing the two Rijks phares.
            </Text>
          </View>
        ) : canScan && arEnabled && Scanner ? (
          <Scanner artworks={artworks} onIdentify={onIdentify} />
        ) : canScan && arEnabled ? (
          <View style={styles.manualPane}>
            <Text style={styles.manualTitle}>AR unavailable</Text>
            <Text style={styles.emptyBody}>Use manual mode for this test.</Text>
            <ManualArtworkList artworks={artworks} onIdentify={onIdentify} />
          </View>
        ) : canScan ? (
          <View style={styles.manualPane}>
            <Text style={styles.manualTitle}>Choose artwork</Text>
            <ManualArtworkList artworks={artworks} onIdentify={onIdentify} />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No artworks ready</Text>
            <Text style={styles.emptyBody}>
              Check Supabase or the local demo fixtures.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controlBar}>
        <View style={styles.copy}>
          <View style={styles.brand}>
            <View style={styles.diamond} />
            <Text style={styles.kicker}>Lazlo</Text>
          </View>
          <Text style={styles.title}>Point at the artwork</Text>
          <Text style={styles.body}>
            Hold steady until the blue point appears. Tap it to open the guide.
          </Text>
          <Text style={styles.source}>
            {dataSource === "supabase" ? "Supabase" : "Demo fallback"}
            {loadError ? ` · ${loadError}` : ""}
          </Text>
        </View>
        <View style={styles.languageControl}>
          {languages.map((item) => (
            <Pressable
              key={item}
              style={[
                styles.languageButton,
                item === language && styles.languageButtonActive,
              ]}
              onPress={() => onLanguageChange(item)}
            >
              <Text
                style={[
                  styles.languageText,
                  item === language && styles.languageTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
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
    backgroundColor: colors.bg,
  },
  cameraSurface: {
    flex: 1,
    backgroundColor: "#050505",
  },
  manualPane: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  manualTitle: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: 26,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: 24,
  },
  emptyBody: {
    color: colors.dim62,
    fontFamily: fonts.serifLight,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  controlBar: {
    borderTopColor: colors.dim12,
    borderTopWidth: 1,
    padding: 18,
    paddingBottom: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.sheet,
  },
  copy: {
    flex: 1,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  diamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.accent,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  kicker: {
    color: colors.text,
    fontFamily: fonts.serifMedium,
    fontSize: 20,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: 22,
    marginTop: 6,
  },
  body: {
    color: colors.dim62,
    fontFamily: fonts.serifLight,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  source: {
    color: colors.dim40,
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 8,
  },
  languageControl: {
    flexDirection: "row",
    gap: 6,
  },
  languageButton: {
    minWidth: 34,
    paddingHorizontal: 9,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.dim16,
    alignItems: "center",
  },
  languageButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  languageText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  languageTextActive: {
    color: colors.ink,
  },
  secondaryButton: {
    minWidth: 92,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.ink,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1,
  },
});
