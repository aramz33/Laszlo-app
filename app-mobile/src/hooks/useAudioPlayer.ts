import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";

import { speak, type Lang } from "../services/runtime";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

export type Progress = { currentTime: number; duration: number };

const ZERO_PROGRESS: Progress = { currentTime: 0, duration: 0 };

export function useAudioPlayer() {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<Progress>(ZERO_PROGRESS);
  const [rate, setRateState] = useState(1);
  const playerRef = useRef<AudioPlayer | null>(null);
  const rateRef = useRef(1);
  const mountedRef = useRef(true);
  // Bumped on every play/stop so a slower in-flight speak() from an earlier tap
  // is discarded — only the last-tapped audio survives (no stacking).
  const seqRef = useRef(0);

  const release = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      // pause before remove: remove() alone can leave the sound playing.
      try {
        player.pause();
      } catch {
        // player already gone
      }
      player.remove();
    }
    playerRef.current = null;
    setProgress(ZERO_PROGRESS);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      seqRef.current++;
      release();
    };
  }, [release]);

  const play = useCallback(
    async (args: { text: string; lang: Lang; speed?: number }) => {
      const seq = ++seqRef.current;
      release();
      setStatus("loading");
      try {
        const { audio_url } = await speak(args);
        if (seq !== seqRef.current) return;
        if (!audio_url || !mountedRef.current) {
          setStatus("error");
          return;
        }
        await setAudioModeAsync({ playsInSilentMode: true });
        if (seq !== seqRef.current) return;
        const player = createAudioPlayer({ uri: audio_url });
        player.shouldCorrectPitch = true;
        player.setPlaybackRate(rateRef.current, "high");
        player.addListener("playbackStatusUpdate", (s) => {
          if (!mountedRef.current) return;
          if (s.isLoaded) {
            setProgress({
              currentTime: s.currentTime ?? 0,
              duration: s.duration ?? 0,
            });
          }
          if (s.didJustFinish) {
            release();
            setStatus("idle");
          } else if (s.isLoaded) {
            setStatus(s.playing ? "playing" : "paused");
          }
        });
        playerRef.current = player;
        player.play();
      } catch {
        if (mountedRef.current) setStatus("error");
      }
    },
    [release],
  );

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, []);

  const stop = useCallback(() => {
    seqRef.current++;
    release();
    setStatus("idle");
  }, [release]);

  const setRate = useCallback((next: number) => {
    rateRef.current = next;
    setRateState(next);
    playerRef.current?.setPlaybackRate(next, "high");
  }, []);

  return { status, progress, rate, play, toggle, stop, setRate };
}
