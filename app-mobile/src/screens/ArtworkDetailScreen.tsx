import { useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { AudioDock } from "../components/AudioDock";
import { ChatPanel } from "../components/ChatPanel";
import { HotspotGlow } from "../components/HotspotGlow";
import { SubtitleOverlay } from "../components/SubtitleOverlay";
import { useLanguage } from "../context/LanguageContext";
import type { Artwork } from "../domain/artwork";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { useHotspotTexts } from "../hooks/useHotspotTexts";
import { useOverview } from "../hooks/useOverview";
import { resolveHotspotText, type Profile } from "../services/runtime";
import { colors, fonts, radii } from "../theme";

type Props = {
  artwork: Artwork;
  onBack: () => void;
  profile?: Profile;
};

const OVERVIEW_ID = "__overview__";

/** Contain-fit the artwork into the screen so it occupies the majority of it
 * while keeping its real aspect ratio (hotspot x/y stay accurate). */
function useFittedRect(artwork: Artwork) {
  return useMemo(() => {
    const { width: sw, height: sh } = Dimensions.get("window");
    const ar =
      artwork.widthCm > 0 && artwork.heightCm > 0
        ? artwork.widthCm / artwork.heightCm
        : 1;
    let w = sw;
    let h = w / ar;
    if (h > sh) {
      h = sh;
      w = h * ar;
    }
    return { w, h };
  }, [artwork]);
}

export function ArtworkDetailScreen({ artwork, onBack, profile }: Props) {
  const { lang } = useLanguage();
  const hotspotTexts = useHotspotTexts({ artwork, lang, profile });
  const overview = useOverview({ artworkId: artwork.id, lang, profile });
  const audio = useAudioPlayer();
  const rect = useFittedRect(artwork);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const activeText = useMemo(() => {
    if (activeId === OVERVIEW_ID) {
      return overview.status === "ready" ? overview.text : "";
    }
    const hotspot = artwork.hotspots.find((h) => h.id === activeId);
    if (!hotspot) return "";
    return resolveHotspotText(hotspot, hotspotTexts.items[hotspot.id]);
  }, [activeId, artwork.hotspots, hotspotTexts.items, overview]);

  const activate = (id: string, text: string) => {
    if (activeId === id) {
      setActiveId(null);
      audio.stop();
      return;
    }
    setActiveId(id);
    if (text) {
      audio.play({ text, lang });
    } else {
      audio.stop();
    }
  };

  const handleBack = () => {
    audio.stop();
    onBack();
  };

  const subtitleVisible = activeId !== null && audio.status !== "idle";
  const activeHotspotId =
    activeId && activeId !== OVERVIEW_ID ? activeId : null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: rect.w, height: rect.h }}>
          <Image source={{ uri: artwork.imageUrl }} style={styles.image} />
          {artwork.hotspots.map((hotspot) => (
            <HotspotGlow
              key={hotspot.id}
              x={hotspot.x}
              y={hotspot.y}
              active={activeId === hotspot.id}
              onPress={() =>
                activate(
                  hotspot.id,
                  resolveHotspotText(hotspot, hotspotTexts.items[hotspot.id])
                )
              }
            />
          ))}
        </View>
      </ScrollView>

      <SubtitleOverlay
        text={activeText}
        progress={audio.progress}
        visible={subtitleVisible}
      />

      {activeId !== null ? (
        <AudioDock
          status={audio.status}
          rate={audio.rate}
          onToggle={audio.toggle}
          onRate={audio.setRate}
        />
      ) : null}

      <View style={styles.topBar} pointerEvents="box-none">
        <Pressable style={styles.pill} onPress={handleBack}>
          <Text style={styles.pillText}>← BACK</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, activeId === OVERVIEW_ID && styles.pillActive]}
          onPress={() =>
            activate(
              OVERVIEW_ID,
              overview.status === "ready" ? overview.text : ""
            )
          }
        >
          <Text style={styles.pillText}>✦ THE ARTWORK</Text>
        </Pressable>
      </View>

      <View style={styles.caption} pointerEvents="none">
        <Text style={styles.title}>{artwork.title}</Text>
        <Text style={styles.subtitle}>{artwork.subtitle}</Text>
      </View>

      <Pressable style={styles.askButton} onPress={() => setChatOpen(true)}>
        <Text style={styles.askText}>ASK ?</Text>
      </Pressable>

      <Modal
        visible={chatOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setChatOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Pressable
              style={styles.modalClose}
              onPress={() => setChatOpen(false)}
            >
              <Text style={styles.pillText}>CLOSE ✕</Text>
            </Pressable>
            <ChatPanel
              artworkId={artwork.id}
              lang={lang}
              profile={profile}
              hotspotId={activeHotspotId}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBottom
  },
  canvas: {
    flex: 1
  },
  canvasContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface
  },
  topBar: {
    position: "absolute",
    top: 52,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 25
  },
  pill: {
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(8, 6, 4, 0.55)"
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft
  },
  pillText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1
  },
  caption: {
    position: "absolute",
    bottom: 92,
    left: 18,
    right: 18,
    zIndex: 10
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 26,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 12
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 12
  },
  askButton: {
    position: "absolute",
    bottom: 28,
    right: 18,
    borderRadius: radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: colors.accent,
    zIndex: 25
  },
  askText: {
    color: colors.onAccent,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  modalSheet: {
    backgroundColor: colors.bgMid,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: 18,
    paddingBottom: 36,
    gap: 12,
    maxHeight: "80%"
  },
  modalClose: {
    alignSelf: "flex-end",
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  }
});
