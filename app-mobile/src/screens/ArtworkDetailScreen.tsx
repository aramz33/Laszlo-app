import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { ChatPanel } from "../components/ChatPanel";
import { useLanguage } from "../context/LanguageContext";
import type { Artwork, Hotspot } from "../domain/artwork";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { useHotspotTexts } from "../hooks/useHotspotTexts";
import { resolveHotspotText, type Lang, type Profile } from "../services/runtime";
import { hasSupabaseConfig } from "../services/supabase";
import { colors, fonts, radii } from "../theme";

type Props = {
  artwork: Artwork;
  onBack: () => void;
  profile?: Profile;
};

function HotspotRow({
  hotspot,
  text,
  usingSeed,
  isLoading,
  lang
}: {
  hotspot: Hotspot;
  text: string;
  usingSeed: boolean;
  isLoading: boolean;
  lang: Lang;
}) {
  const { status, play, toggle } = useAudioPlayer();

  const handlePlay = () => {
    if (status === "playing" || status === "paused") {
      toggle();
    } else {
      play({ text, lang });
    }
  };

  const playLabel = status === "loading" ? "…" : status === "playing" ? "⏸" : "▶";

  return (
    <View style={styles.hotspotRow}>
      <View style={styles.hotspotHeader}>
        <View style={styles.hotspotTitleGroup}>
          <Text style={styles.hotspotTitle}>{hotspot.title}</Text>
          <Text style={styles.hotspotAspect}>{hotspot.aspect}</Text>
        </View>
        {hasSupabaseConfig ? (
          <Pressable
            style={[
              styles.playButton,
              status === "playing" && styles.playButtonActive
            ]}
            onPress={handlePlay}
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.playButtonText}>{playLabel}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.hotspotText}>{text}</Text>
      {status === "error" ? (
        <Text style={styles.errorBadge}>audio unavailable</Text>
      ) : null}
      {usingSeed && !isLoading ? (
        <Text style={styles.seedBadge}>seed text</Text>
      ) : null}
    </View>
  );
}

export function ArtworkDetailScreen({ artwork, onBack, profile }: Props) {
  const { lang } = useLanguage();
  const hotspotTexts = useHotspotTexts({ artwork, lang, profile });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>

      <Image source={{ uri: artwork.imageUrl }} style={styles.image} />

      <View style={styles.header}>
        <Text style={styles.title}>{artwork.title}</Text>
        <Text style={styles.subtitle}>{artwork.subtitle}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hotspots</Text>
          {hotspotTexts.status === "loading" ? (
            <View style={styles.personalizing}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.personalizingText}>PERSONALIZING…</Text>
            </View>
          ) : null}
        </View>
        {artwork.hotspots.map((hotspot) => {
          const item = hotspotTexts.items[hotspot.id];
          const text = resolveHotspotText(hotspot, item);
          const usingSeed = !(item && item.status === "ready" && item.text);
          return (
            <HotspotRow
              key={hotspot.id}
              hotspot={hotspot}
              text={text}
              usingSeed={usingSeed}
              isLoading={hotspotTexts.status === "loading"}
              lang={lang}
            />
          );
        })}
      </View>

      <View style={styles.section}>
        <ChatPanel artworkId={artwork.id} lang={lang} profile={profile} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBottom
  },
  content: {
    padding: 18,
    gap: 18
  },
  backButton: {
    alignSelf: "flex-start",
    borderColor: colors.hairline,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  backText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface
  },
  header: {
    gap: 6
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 30
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 16
  },
  section: {
    gap: 10
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 19
  },
  personalizing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  personalizingText: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1
  },
  hotspotRow: {
    borderColor: colors.hairline,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    backgroundColor: colors.glass
  },
  hotspotHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  hotspotTitleGroup: {
    flex: 1,
    marginRight: 12
  },
  hotspotTitle: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 17
  },
  hotspotAspect: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
    textTransform: "uppercase"
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderColor: colors.accent,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass
  },
  playButtonActive: {
    backgroundColor: colors.accentSoft
  },
  playButtonText: {
    color: colors.accent,
    fontSize: 16
  },
  hotspotText: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8
  },
  errorBadge: {
    color: "#e06050",
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 8,
    textTransform: "uppercase"
  },
  seedBadge: {
    color: colors.textFaint,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 8,
    textTransform: "uppercase"
  }
});
