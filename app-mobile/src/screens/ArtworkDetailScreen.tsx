import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

import type { Artwork, Hotspot } from "../domain/artwork";
import { PaintingCanvas } from "../components/PaintingCanvas";
import { colors, fonts, radius } from "../theme";
import {
  createRequestId,
  generateAsk,
  generateHotspotBatch,
  speakText,
  transcribe,
  type HotspotStatus,
  type RuntimeLanguage,
  type RuntimeProfile,
  type SpeedChoice,
  type SpeakResponse,
  type ToneChoice,
  type VoiceChoice,
} from "../services/runtime";

type Props = {
  artwork: Artwork;
  language: RuntimeLanguage;
  profile: RuntimeProfile;
  onBack: () => void;
  onLanguageChange: (language: RuntimeLanguage) => void;
};

type HotspotUiState = {
  status: HotspotStatus;
  text?: string | null;
  message?: string | null;
};

type AskStatus = "idle" | "loading" | "ready" | "error";
type SpeakStatus = "idle" | "loading" | "ready" | "error";

const languages: RuntimeLanguage[] = ["fr", "en", "nl"];
const voices: VoiceChoice[] = ["default", "warm", "calm"];
const speeds: SpeedChoice[] = [0.9, 1, 1.1];
const tones: ToneChoice[] = ["neutral", "calm"];

function canSpeak(status: HotspotStatus) {
  return status === "ready" || status === "fallback" || status === "error";
}

function textForHotspot(hotspot: Hotspot, state: HotspotUiState) {
  return state.status === "ready" && state.text
    ? state.text
    : hotspot.narrationText;
}

function loadingStatesFor(artwork: Artwork) {
  const states: Record<string, HotspotUiState> = {};
  for (const hotspot of artwork.hotspots) {
    states[hotspot.id] = { status: "loading" };
  }
  return states;
}

// Audio waveform; bars breathe while playing (design @keyframes wave).
function Waveform({ playing }: { playing: boolean }) {
  return (
    <View style={styles.wave}>
      {Array.from({ length: 14 }).map((_, i) => (
        <WaveBar key={i} index={i} playing={playing} />
      ))}
    </View>
  );
}

function WaveBar({ index, playing }: { index: number; playing: boolean }) {
  const h = useSharedValue(0.3);
  useEffect(() => {
    if (playing) {
      h.value = withRepeat(
        withTiming(1, { duration: 280 + (index % 5) * 70 }),
        -1,
        true,
      );
    } else {
      h.value = withTiming(0.3);
    }
  }, [playing, h, index]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: h.value }] }));
  return <Animated.View style={[styles.waveBar, style]} />;
}

export function ArtworkDetailScreen({
  artwork,
  language,
  profile,
  onBack,
  onLanguageChange,
}: Props) {
  const [hotspotStates, setHotspotStates] = useState<
    Record<string, HotspotUiState>
  >({});
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(
    null,
  );
  const [voice, setVoice] = useState<VoiceChoice>("default");
  const [speed, setSpeed] = useState<SpeedChoice>(1);
  const [tone, setTone] = useState<ToneChoice>("neutral");
  const [speakStatus, setSpeakStatus] = useState<SpeakStatus>("idle");
  const [audio, setAudio] = useState<SpeakResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [askStatus, setAskStatus] = useState<AskStatus>("idle");

  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);
  const isPlaying = playerStatus?.playing ?? false;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = createRequestId();

    setHotspotStates(loadingStatesFor(artwork));
    setSelectedHotspotId(null);
    setAudio(null);
    setSpeakStatus("idle");
    setAnswer("");
    setAskStatus("idle");

    const fallbackTimer = setTimeout(() => {
      if (cancelled) {
        return;
      }
      setHotspotStates((current) => {
        const next = { ...current };
        for (const hotspot of artwork.hotspots) {
          if (next[hotspot.id]?.status === "loading") {
            next[hotspot.id] = { status: "fallback" };
          }
        }
        return next;
      });
    }, 3000);

    generateHotspotBatch({
      request_id: requestId,
      artwork,
      lang: language,
      profile,
    })
      .then((response) => {
        if (cancelled) {
          return;
        }
        clearTimeout(fallbackTimer);
        setHotspotStates((current) => {
          const next = { ...current };
          for (const item of response.items) {
            next[item.hotspot_id] =
              item.status === "ready" && item.text
                ? { status: "ready", text: item.text }
                : {
                    status: "error",
                    message: item.message ?? "Generation failed.",
                  };
          }
          return next;
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        clearTimeout(fallbackTimer);
        const message =
          error instanceof Error ? error.message : "Generation failed.";
        setHotspotStates((current) => {
          const next = { ...current };
          for (const hotspot of artwork.hotspots) {
            next[hotspot.id] = { status: "error", message };
          }
          return next;
        });
      });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [artwork, language, profile]);

  const selectedHotspot = useMemo(
    () =>
      artwork.hotspots.find((hotspot) => hotspot.id === selectedHotspotId) ??
      null,
    [artwork.hotspots, selectedHotspotId],
  );

  const selectedState = selectedHotspot
    ? (hotspotStates[selectedHotspot.id] ?? { status: "idle" as const })
    : null;
  const selectedText =
    selectedHotspot && selectedState
      ? textForHotspot(selectedHotspot, selectedState)
      : "";

  useEffect(() => {
    setAudio(null);
    setSpeakStatus("idle");
    player.pause();
  }, [language, selectedText, speed, tone, voice]);

  const requestSpeech = useCallback(
    async (text: string) => {
      if (!text) {
        return null;
      }
      setSpeakStatus("loading");
      try {
        const response = await speakText({
          text,
          lang: language,
          voice,
          speed,
          tone,
        });
        setAudio(response);
        setSpeakStatus("ready");
        player.replace({ uri: response.audio_url });
        player.play();
        return response;
      } catch {
        setSpeakStatus("error");
        return null;
      }
    },
    [language, speed, tone, voice],
  );

  const handleHotspotPress = useCallback(
    (hotspot: Hotspot) => {
      const state = hotspotStates[hotspot.id] ?? { status: "idle" as const };
      setSelectedHotspotId(hotspot.id);
      if (canSpeak(state.status)) {
        void requestSpeech(textForHotspot(hotspot, state));
      }
    },
    [hotspotStates, requestSpeech],
  );

  const handlePlay = useCallback(() => {
    if (!selectedHotspot || !selectedState || !canSpeak(selectedState.status)) {
      return;
    }
    if (!audio) {
      void requestSpeech(selectedText);
      return;
    }
    isPlaying ? player.pause() : player.play();
  }, [
    audio,
    isPlaying,
    player,
    requestSpeech,
    selectedHotspot,
    selectedState,
    selectedText,
  ]);

  const handleAsk = useCallback(async () => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || askStatus === "loading") {
      return;
    }
    setAnswer("");
    setAskStatus("loading");
    try {
      await generateAsk({
        request_id: createRequestId(),
        artwork,
        hotspot_id: selectedHotspotId,
        question: cleanQuestion,
        lang: language,
        profile,
        onEvent: (event) => {
          if (event.type === "delta") {
            setAnswer((current) => `${current}${event.delta}`);
          }
          if (event.type === "done") {
            setAnswer(event.text);
            setAskStatus("ready");
          }
          if (event.type === "error") {
            setAnswer(event.message);
            setAskStatus("error");
          }
        },
      });
    } catch {
      setAnswer("Question failed.");
      setAskStatus("error");
    }
  }, [artwork, askStatus, language, profile, question, selectedHotspotId]);

  const handleMic = useCallback(async () => {
    if (recording) {
      await recorder.stop();
      setRecording(false);
      try {
        const { text } = await transcribe({
          uri: recorder.uri ?? "",
          lang_hint: language,
        });
        setQuestion(text);
      } catch {
        setQuestion("");
      }
      return;
    }
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  }, [language, recorder, recording]);

  const guideText = selectedHotspot
    ? selectedState?.status === "loading"
      ? "…"
      : selectedText
    : "Tap a point on the work to begin.";

  return (
    <View style={styles.root}>
      <PaintingCanvas
        artwork={artwork}
        selectedHotspotId={selectedHotspotId}
        onHotspotPress={handleHotspotPress}
      />

      {/* Top HUD */}
      <View style={styles.hud}>
        <View style={styles.brand}>
          <View style={styles.diamond} />
          <Text style={styles.brandText}>Lazlo</Text>
        </View>
        <View style={styles.hudRight}>
          {languages.map((item) => (
            <Pressable
              key={item}
              style={[styles.langChip, item === language && styles.langChipOn]}
              onPress={() => onLanguageChange(item)}
            >
              <Text
                style={[
                  styles.langChipText,
                  item === language && styles.langChipTextOn,
                ]}
              >
                {item.toUpperCase()}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.iconBtn} onPress={onBack}>
            <Text style={styles.iconBtnText}>⤿</Text>
          </Pressable>
        </View>
      </View>

      {/* Conversation panel */}
      <View style={styles.panel}>
        <View style={styles.guideBar}>
          <Pressable style={styles.playBtn} onPress={handlePlay}>
            <Text style={styles.playGlyph}>{isPlaying ? "❚❚" : "▶"}</Text>
          </Pressable>
          <View style={{ gap: 4 }}>
            <Text style={styles.guideKicker}>
              LAZLO · {speakStatus === "loading" ? "PREPARING" : "GUIDE"}
            </Text>
            <Waveform playing={isPlaying} />
          </View>
        </View>

        <ScrollView
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
        >
          {selectedHotspot ? (
            <View style={styles.guideMsg}>
              <View style={styles.msgLabel}>
                <Text style={styles.msgLabelText}>
                  {selectedHotspot.title.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.guideMsgText}>{guideText}</Text>
            </View>
          ) : (
            <Text style={styles.hint}>{guideText}</Text>
          )}
          {answer ? (
            <View style={styles.guideMsg}>
              <Text style={styles.guideMsgText}>{answer}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* voice / speed / tone */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {voices.map((item) => (
            <Pressable
              key={item}
              style={[styles.chip, voice === item && styles.chipOn]}
              onPress={() => setVoice(item)}
            >
              <Text
                style={[styles.chipText, voice === item && styles.chipTextOn]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
          {speeds.map((item) => (
            <Pressable
              key={item}
              style={[styles.chip, speed === item && styles.chipOn]}
              onPress={() => setSpeed(item)}
            >
              <Text
                style={[styles.chipText, speed === item && styles.chipTextOn]}
              >
                {item}x
              </Text>
            </Pressable>
          ))}
          {tones.map((item) => (
            <Pressable
              key={item}
              style={[styles.chip, tone === item && styles.chipOn]}
              onPress={() => setTone(item)}
            >
              <Text
                style={[styles.chipText, tone === item && styles.chipTextOn]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* input + mic */}
        <View style={styles.inputRow}>
          <View style={styles.inputField}>
            <Text style={styles.inputPen}>✎</Text>
            <TextInput
              style={styles.input}
              value={question}
              onChangeText={setQuestion}
              onSubmitEditing={handleAsk}
              placeholder={recording ? "Listening…" : "Ask anything"}
              placeholderTextColor={colors.dim40}
            />
            {question ? (
              <Pressable style={styles.sendBtn} onPress={handleAsk}>
                <Text style={styles.sendBtnText}>
                  {askStatus === "loading" ? "…" : "→"}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable
            style={[styles.micBtn, recording && styles.micBtnOn]}
            onPress={handleMic}
          >
            <View style={styles.micPill} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hud: {
    paddingTop: 54,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  diamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.accent,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  brandText: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    color: colors.text,
  },
  hudRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  langChip: {
    height: 30,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.dim16,
    justifyContent: "center",
  },
  langChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  langChipText: { fontFamily: fonts.mono, fontSize: 10, color: colors.text },
  langChipTextOn: { color: colors.ink },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.dim12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { color: colors.dim62, fontFamily: fonts.mono, fontSize: 14 },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "62%",
    paddingBottom: 28,
    backgroundColor: "rgba(11,9,7,0.92)",
  },
  guideBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 8,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(216,176,106,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  playGlyph: { color: colors.accent, fontSize: 11 },
  guideKicker: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.3,
    color: colors.dim55,
  },
  wave: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 11 },
  waveBar: {
    width: 2,
    height: 11,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  thread: { paddingHorizontal: 20 },
  threadContent: { paddingVertical: 6, gap: 12 },
  hint: {
    fontFamily: fonts.serifLight,
    fontSize: 18,
    lineHeight: 26,
    color: colors.dim55,
  },
  guideMsg: { maxWidth: "94%", gap: 6 },
  msgLabel: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  msgLabelText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.2,
    color: colors.bg,
  },
  guideMsgText: {
    fontFamily: fonts.serifLight,
    fontSize: 18.5,
    lineHeight: 27,
    color: colors.text,
  },
  chips: { paddingHorizontal: 18, gap: 8, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.dim16,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.serif, fontSize: 15, color: colors.text },
  chipTextOn: { color: colors.ink },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 18,
  },
  inputField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.fill06,
    borderWidth: 1.5,
    borderColor: "rgba(244,241,234,0.2)",
  },
  inputPen: { color: colors.dim40, fontSize: 14 },
  input: { flex: 1, color: colors.text, fontFamily: fonts.serif, fontSize: 17 },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: { color: colors.ink, fontSize: 13 },
  micBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(216,176,106,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnOn: { backgroundColor: colors.accent },
  micPill: {
    width: 9,
    height: 17,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
});
