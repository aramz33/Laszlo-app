import { Audio } from "expo-av";
import { useCallback, useRef, useState } from "react";

import { transcribe, type Lang } from "../services/runtime";

export type VoiceState = "idle" | "recording" | "transcribing" | "error";

/**
 * Records a short clip with expo-av, uploads it to `/transcribe`, and returns
 * the recognized text. `start()` begins recording; `stop()` ends it and resolves
 * to the transcript (or null on failure / empty input).
 */
export function useVoiceInput(lang: Lang) {
  const [state, setState] = useState<VoiceState>("idle");
  const recordingRef = useRef<Audio.Recording | null>(null);

  const start = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setState("error");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setState("recording");
    } catch {
      setState("error");
    }
  }, []);

  const stop = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) {
      setState("idle");
      return null;
    }
    setState("transcribing");
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) {
        setState("idle");
        return null;
      }
      const { text } = await transcribe({ uri, langHint: lang });
      setState("idle");
      return text?.trim() ? text.trim() : null;
    } catch {
      setState("error");
      return null;
    }
  }, [lang]);

  return { state, start, stop };
}
