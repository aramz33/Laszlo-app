import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";

import { identify } from "../services/runtime";

export type VisionState =
  | "idle"
  | "matching"
  | "no_match"
  | "denied"
  | "error";

export type VisionMatch = { artworkId: string; confidence: number };

/**
 * AR fallback: snap the painting with the camera and let `/identify` pick which
 * of the room's `candidateIds` it shows. Returns the matched id (or null, when
 * the user cancels, permission is denied, or the model finds no match — the
 * caller then shows the manual picker).
 */
export function useVisionIdentify(candidateIds: string[]) {
  const [state, setState] = useState<VisionState>("idle");

  const capture = useCallback(async (): Promise<VisionMatch | null> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setState("denied");
      return null;
    }

    const shot = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: false
    });
    const asset = shot.canceled ? null : shot.assets?.[0];
    if (!asset) {
      setState("idle");
      return null;
    }

    setState("matching");
    try {
      const res = await identify({
        uri: asset.uri,
        candidateIds,
        mime: asset.mimeType,
        name: asset.fileName ?? "p.jpg"
      });
      if (!res.artwork_id) {
        setState("no_match");
        return null;
      }
      setState("idle");
      return { artworkId: res.artwork_id, confidence: res.confidence };
    } catch {
      setState("error");
      return null;
    }
  }, [candidateIds]);

  return { state, capture };
}
