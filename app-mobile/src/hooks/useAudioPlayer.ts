import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";

import { speak, type Lang, type SpeakResponse } from "../services/runtime";

export type AudioPlayerState = {
  status: "idle" | "loading" | "playing" | "paused" | "error";
  positionMs: number;
  durationMs: number;
};

type PlayArgs = {
  text: string;
  lang: Lang;
  speed?: number;
};

/**
 * Manages TTS audio playback for a single hotspot or chat answer.
 * Call `play({ text, lang })` to synthesize via `/speak` and start playback.
 * `toggle()` pauses/resumes. `stop()` unloads the sound.
 */
export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>({
    status: "idle",
    positionMs: 0,
    durationMs: 0
  });
  const soundRef = useRef<Audio.Sound | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const unloadCurrent = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
    }
  }, []);

  const play = useCallback(
    async (args: PlayArgs) => {
      await unloadCurrent();
      setState({ status: "loading", positionMs: 0, durationMs: 0 });

      let speakResult: SpeakResponse;
      try {
        speakResult = await speak({
          text: args.text,
          lang: args.lang,
          speed: args.speed
        });
      } catch {
        if (mountedRef.current) {
          setState({ status: "error", positionMs: 0, durationMs: 0 });
        }
        return;
      }

      if (!speakResult.audio_url || !mountedRef.current) {
        if (mountedRef.current) {
          setState({ status: "error", positionMs: 0, durationMs: 0 });
        }
        return;
      }

      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: speakResult.audio_url },
          { shouldPlay: true },
          (status) => {
            if (!mountedRef.current) return;
            if (!status.isLoaded) return;
            setState({
              status: status.isPlaying
                ? "playing"
                : status.didJustFinish
                  ? "idle"
                  : "paused",
              positionMs: status.positionMillis,
              durationMs: status.durationMillis ?? 0
            });
            if (status.didJustFinish) {
              soundRef.current?.unloadAsync().catch(() => {});
              soundRef.current = null;
            }
          }
        );
        soundRef.current = sound;
      } catch {
        if (mountedRef.current) {
          setState({ status: "error", positionMs: 0, durationMs: 0 });
        }
      }
    },
    [unloadCurrent]
  );

  const toggle = useCallback(async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, []);

  const stop = useCallback(async () => {
    await unloadCurrent();
    if (mountedRef.current) {
      setState({ status: "idle", positionMs: 0, durationMs: 0 });
    }
  }, [unloadCurrent]);

  return { state, play, toggle, stop };
}
