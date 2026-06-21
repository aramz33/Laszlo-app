import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder
} from "expo-audio";
import { useCallback, useState } from "react";

import { transcribe, type Lang } from "../services/runtime";

export type VoiceState = "idle" | "recording" | "transcribing" | "error";

/**
 * Records a short clip with expo-audio, uploads it to `/transcribe`, and returns
 * the recognized text. `start()` begins recording; `stop()` ends it and resolves
 * to the transcript (or null on failure / empty input).
 */
export function useVoiceInput(lang: Lang) {
  const [state, setState] = useState<VoiceState>("idle");
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const start = useCallback(async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setState("error");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState("recording");
    } catch {
      setState("error");
    }
  }, [recorder]);

  const stop = useCallback(async (): Promise<string | null> => {
    if (!recorder.isRecording) {
      setState("idle");
      return null;
    }
    setState("transcribing");
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
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
  }, [recorder, lang]);

  return { state, start, stop };
}
