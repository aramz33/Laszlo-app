import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AudioDock } from "../components/AudioDock";
import { ChatPanel } from "../components/ChatPanel";
import { HotspotGlow } from "../components/HotspotGlow";
import { SubtitleOverlay } from "../components/SubtitleOverlay";
import { useChatSession } from "../context/ChatSessionContext";
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
  const { width: sw, height: sh } = useWindowDimensions();

  return useMemo(() => {
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
  }, [artwork, sw, sh]);
}

export function ArtworkDetailScreen({ artwork, onBack, profile }: Props) {
  const { lang } = useLanguage();
  const chatSession = useChatSession();
  // Capture visit memory at artwork-open time; later chat turns should not
  // re-run the hotspot/overview generation while the visitor is on this work.
  const openingHistorySummary = useMemo(
    () => chatSession.getSessionSummary(),
    [artwork.id, lang, profile],
  );
  const hotspotTexts = useHotspotTexts({
    artwork,
    lang,
    profile,
    historySummary: openingHistorySummary,
  });
  const overview = useOverview({
    artworkId: artwork.id,
    lang,
    profile,
    historySummary: openingHistorySummary,
  });
  const audio = useAudioPlayer();
  const rect = useFittedRect(artwork);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHotspotId, setChatHotspotId] = useState<string | null>(null);
  const [spokenText, setSpokenText] = useState("");
  const [pendingSpeechId, setPendingSpeechId] = useState<string | null>(null);
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
  const canUseSeedFallback =
    hotspotTexts.status === "fallback" || hotspotTexts.status === "error";
  const contextLabel = activeHotspot?.title ?? "Whole artwork";
  const generationLabel =
    hotspotTexts.status === "ready"
      ? "Hotspots ready"
      : hotspotTexts.status === "loading"
        ? "Preparing"
        : "Seed fallback";

  const textForHotspot = useCallback(
    (hotspot: Artwork["hotspots"][number]) =>
      resolveHotspotText(
        hotspot,
        hotspotTexts.items[hotspot.id],
        lang,
        canUseSeedFallback,
      ),
    [canUseSeedFallback, hotspotTexts.items, lang],
  );

  useEffect(() => {
    setActiveId(null);
    setPendingSpeechId(null);
    setSpokenText("");
    audio.stop();
  }, [audio.stop, lang]);

  useEffect(() => {
    if (!pendingSpeechId || activeId !== pendingSpeechId) return;
    const hotspot = artwork.hotspots.find((h) => h.id === pendingSpeechId);
    if (!hotspot) return;
    const text = textForHotspot(hotspot);
    if (!text) return;
    setPendingSpeechId(null);
    speakText(text);
  }, [activeId, artwork.hotspots, pendingSpeechId, speakText, textForHotspot]);

  const clearSpeech = () => {
    setSpokenText("");
    setPendingSpeechId(null);
    audio.stop();
  };

  const activateHotspot = (hotspot: Artwork["hotspots"][number]) => {
    if (activeId === hotspot.id) {
      setActiveId(null);
      clearSpeech();
      return;
    }
    setActiveId(hotspot.id);
    if (chatOpen) {
      setChatHotspotId(hotspot.id);
      chat.refreshFollowups(hotspot.id);
    }
    const text = textForHotspot(hotspot);
    if (text) {
      setPendingSpeechId(null);
      speakText(text);
    } else {
      setPendingSpeechId(hotspot.id);
      setSpokenText("");
      audio.stop();
    }
  };

  const activateOverview = () => {
    if (activeId === OVERVIEW_ID) {
      setActiveId(null);
      clearSpeech();
      return;
    }
    setActiveId(OVERVIEW_ID);
    setPendingSpeechId(null);
    if (overview.status === "ready") {
      speakText(overview.text);
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
        <View style={[styles.artworkFrame, { width: rect.w, height: rect.h }]}>
          <Image source={{ uri: artwork.imageUrl }} style={styles.image} />
          {artwork.hotspots.map((hotspot) => (
            <HotspotGlow
              key={hotspot.id}
              x={hotspot.x}
              y={hotspot.y}
              active={activeId === hotspot.id}
              onPress={() => activateHotspot(hotspot)}
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
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.topContext} pointerEvents="none">
          <Text style={styles.contextKicker}>{generationLabel}</Text>
          <Text style={styles.contextTitle} numberOfLines={1}>
            {contextLabel}
          </Text>
        </View>
      </View>

      <View style={styles.capabilityRail} pointerEvents="box-none">
        <RailButton
          label="✦"
          detail={overview.status === "loading" ? "..." : "Intro"}
          active={activeId === OVERVIEW_ID}
          onPress={activateOverview}
        />
        <RailButton
          label="?"
          detail="Ask"
          active={chatOpen}
          onPress={openChat}
        />
        <RailButton
          label={
            audio.status === "loading"
              ? "…"
              : audio.status === "playing"
                ? "❚❚"
                : "▶"
          }
          detail={audio.status === "idle" ? "Audio" : audio.status}
          active={audio.status === "playing"}
          disabled={audio.status === "idle" || audio.status === "loading"}
          onPress={audio.toggle}
        />
      </View>

      <View style={styles.caption} pointerEvents="none">
        <Text style={styles.title}>{artwork.originalTitle}</Text>
        {artwork.englishTitle ? (
          <Text style={styles.englishTitle}>{artwork.englishTitle}</Text>
        ) : null}
        <Text style={styles.subtitle}>{artwork.subtitle}</Text>
        {activeHotspot ? (
          <Text style={styles.activeDetail} numberOfLines={1}>
            Detail: {activeHotspot.title}
          </Text>
        ) : null}
      </View>

      {!chatOpen ? (
        <View style={styles.askDock} pointerEvents="box-none">
          <Pressable style={styles.askButton} onPress={openChat}>
            <Text style={styles.askMark}>?</Text>
            <View style={styles.askCopy}>
              <Text style={styles.askText}>
                {activeHotspot ? "Ask this detail" : "Ask the artwork"}
              </Text>
              <Text style={styles.askContext} numberOfLines={1}>
                {activeHotspot
                  ? activeHotspot.title
                  : "Type or dictate a question"}
              </Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {chatOpen ? (
        <View style={styles.chatSheet}>
          <View style={styles.chatHeader}>
            <View style={styles.chatHeading}>
              <Text style={styles.chatEyebrow}>
                {chatHotspot ? "Hotspot thread" : "Artwork thread"}
              </Text>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {chatHotspot ? chatHotspot.title : artwork.originalTitle}
              </Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={closeChat}
            >
              <Text style={styles.closeText}>×</Text>
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

function RailButton({
  label,
  detail,
  active,
  disabled,
  onPress,
}: {
  label: string;
  detail: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.railButton,
        active && styles.railButtonActive,
        disabled && styles.railButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.railLabel, active && styles.railLabelActive]}>
        {label}
      </Text>
      <Text style={styles.railDetail} numberOfLines={1}>
        {detail}
      </Text>
    </Pressable>
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
  artworkFrame: {
    shadowColor: "#000",
    shadowOpacity: 0.48,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
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
    right: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 25,
  },
  backButton: {
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 6, 4, 0.55)",
  },
  backText: {
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 30,
    lineHeight: 34,
    marginTop: -3,
  },
  topContext: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderColor: colors.hairline,
    borderWidth: 1,
    backgroundColor: "rgba(8, 6, 4, 0.42)",
  },
  contextKicker: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  contextTitle: {
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
    marginTop: 1,
  },
  capabilityRail: {
    position: "absolute",
    top: 126,
    right: 14,
    gap: 8,
    zIndex: 24,
  },
  railButton: {
    width: 58,
    minHeight: 48,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    backgroundColor: "rgba(8, 6, 4, 0.48)",
  },
  railButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  railButtonDisabled: {
    opacity: 0.55,
  },
  railLabel: {
    color: colors.accent,
    fontSize: 17,
    lineHeight: 19,
  },
  railLabelActive: {
    color: colors.text,
  },
  railDetail: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0,
    marginTop: 2,
    maxWidth: 50,
  },
  caption: {
    position: "absolute",
    bottom: 106,
    left: 18,
    right: 84,
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
  englishTitle: {
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 17,
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 12,
  },
  activeDetail: {
    alignSelf: "flex-start",
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderColor: colors.hairlineStrong,
    borderWidth: 1,
    backgroundColor: "rgba(8, 6, 4, 0.5)",
    maxWidth: "100%",
  },
  askDock: {
    position: "absolute",
    left: 64,
    right: 64,
    bottom: 28,
    alignItems: "center",
    zIndex: 25,
  },
  askButton: {
    borderRadius: radii.pill,
    borderColor: colors.hairlineStrong,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(8, 6, 4, 0.62)",
    minHeight: 52,
    maxWidth: 330,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  askMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: colors.accent,
    color: colors.onAccent,
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 30,
    textAlign: "center",
  },
  askCopy: {
    flex: 1,
    minWidth: 0,
  },
  askText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  askContext: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 14,
    marginTop: 1,
  },
  chatSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 92,
    height: "52%",
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
  chatHeading: {
    flex: 1,
    minWidth: 0,
  },
  chatEyebrow: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  chatTitle: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 20,
    marginTop: 1,
  },
  closeButton: {
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 24,
    lineHeight: 27,
  },
});
