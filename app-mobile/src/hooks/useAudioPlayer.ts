import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";

import { speak, type Lang } from "../services/runtime";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

export function useAudioPlayer() {
  const [status, setStatus] = useState<Status>("idle");
  const soundRef = useRef<Audio.Sound | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const unload = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.unloadAsync().catch(() => {});
    soundRef.current = null;
  }, []);

  const play = useCallback(
    async (args: { text: string; lang: Lang; speed?: number }) => {
      await unload();
      setStatus("loading");
      try {
        const { audio_url } = await speak(args);
        if (!audio_url || !mountedRef.current) { setStatus("error"); return; }
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: audio_url },
          { shouldPlay: true },
          (s) => {
            if (!mountedRef.current || !s.isLoaded) return;
            if (s.didJustFinish) {
              soundRef.current?.unloadAsync().catch(() => {});
              soundRef.current = null;
              setStatus("idle");
            } else {
              setStatus(s.isPlaying ? "playing" : "paused");
            }
          }
        );
        soundRef.current = sound;
      } catch {
        if (mountedRef.current) setStatus("error");
      }
    },
    [unload]
  );

  const toggle = useCallback(async () => {
    const s = soundRef.current;
    if (!s) return;
    const st = await s.getStatusAsync();
    if (!st.isLoaded) return;
    st.isPlaying ? await s.pauseAsync() : await s.playAsync();
  }, []);

  return { status, play, toggle };
}
