import { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AudioDock } from "../components/AudioDock";
import { ChatPanel } from "../components/ChatPanel";
import { HotspotGlow } from "../components/HotspotGlow";
import { SubtitleOverlay } from "../components/SubtitleOverlay";
import { useLanguage } from "../context/LanguageContext";
import type { Artwork } from "../domain/artwork";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { useChat } from "../hooks/useChat";
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
  const [chatHotspotId, setChatHotspotId] = useState<string | null>(null);
  const [spokenText, setSpokenText] = useState("");
  const activeHotspotId =
    activeId && activeId !== OVERVIEW_ID ? activeId : null;

  const speakText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setSpokenText(trimmed);
      audio.play({ text: trimmed, lang });
    },
    [audio.play, lang],
  );

  const chat = useChat({
    artworkId: artwork.id,
    lang,
    profile,
    hotspotId: chatHotspotId,
    onAnswer: speakText,
  });

  const activeHotspot = artwork.hotspots.find((h) => h.id === activeHotspotId);
  const chatHotspot = artwork.hotspots.find((h) => h.id === chatHotspotId);

  const activate = (id: string, text: string) => {
    if (activeId === id) {
      setActiveId(null);
      setSpokenText("");
      audio.stop();
      return;
    }
    setActiveId(id);
    if (text) {
      speakText(text);
    } else {
      setSpokenText("");
      audio.stop();
    }
  };

  const handleBack = () => {
    audio.stop();
    setSpokenText("");
    onBack();
  };

  const subtitleVisible = spokenText.trim().length > 0 && audio.status !== "idle";

  const openChat = () => {
    setChatHotspotId(activeHotspotId);
    chat.refreshFollowups(activeHotspotId);
    setChatOpen(true);
  };

  const closeChat = () => setChatOpen(false);

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
                  resolveHotspotText(hotspot, hotspotTexts.items[hotspot.id]),
                )
              }
            />
          ))}
        </View>
      </ScrollView>

      <SubtitleOverlay
        text={spokenText}
        progress={audio.progress}
        visible={subtitleVisible}
      />

      {audio.status !== "idle" ? (
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
              overview.status === "ready" ? overview.text : "",
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

      {!chatOpen ? (
        <View style={styles.askDock} pointerEvents="box-none">
          <Pressable style={styles.askButton} onPress={openChat}>
            <Text style={styles.askText}>
              {activeHotspot ? "ASK DETAIL" : "ASK ARTWORK"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {chatOpen ? (
        <View style={styles.chatSheet}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>
              {chatHotspot
                ? `Ask this detail: ${chatHotspot.title}`
                : "Ask the artwork"}
            </Text>
            <Pressable
              style={styles.closeButton}
              onPress={closeChat}
            >
              <Text style={styles.pillText}>CLOSE</Text>
            </Pressable>
          </View>
          <ChatPanel
            lang={lang}
            messages={chat.messages}
            followups={chat.followups}
            busy={chat.busy}
            onAsk={(question, options) =>
              chat.ask(question, { ...options, hotspotId: chatHotspotId })
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBottom,
  },
  canvas: {
    flex: 1,
  },
  canvasContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface,
  },
  topBar: {
    position: "absolute",
    top: 52,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 25,
  },
  pill: {
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(8, 6, 4, 0.55)",
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  pillText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
  },
  caption: {
    position: "absolute",
    bottom: 118,
    left: 18,
    right: 18,
    zIndex: 10,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 26,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 12,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 12,
  },
  askDock: {
    position: "absolute",
    left: 72,
    right: 72,
    bottom: 34,
    alignItems: "center",
    zIndex: 25,
  },
  askButton: {
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: colors.accent,
    minWidth: 136,
    alignItems: "center",
  },
  askText: {
    color: colors.onAccent,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1,
  },
  chatSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 92,
    height: "56%",
    backgroundColor: "rgba(8, 6, 4, 0.34)",
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 14,
    gap: 12,
    zIndex: 24,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  chatTitle: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.serifSemibold,
    fontSize: 20,
  },
  closeButton: {
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
