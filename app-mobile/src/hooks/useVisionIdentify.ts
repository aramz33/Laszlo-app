import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";

import { identify } from "../services/runtime";

export type VisionState =
  | "idle"
  | "matching"
  | "no_match"
  | "denied"
  | "error";

/**
 * Outcome of a capture attempt. `cancelled` (user backed out of the camera) is
 * distinct from the real failures so the caller can keep the AR view alive
 * instead of dropping to the manual picker.
 */
export type VisionResult =
  | { status: "matched"; artworkId: string; confidence: number }
  | { status: "cancelled" }
  | { status: "denied" }
  | { status: "no_match" }
  | { status: "error" };

/**
 * AR fallback: snap the painting with the camera and let `/identify` pick which
 * of the room's `candidateIds` it shows. Returns a discriminated `VisionResult`;
 * on anything but `matched`/`cancelled` the caller shows the manual picker.
 */
export function useVisionIdentify(candidateIds: string[]) {
  const [state, setState] = useState<VisionState>("idle");

  const capture = useCallback(async (): Promise<VisionResult> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setState("denied");
      return { status: "denied" };
    }

    const shot = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: false
    });
    const asset = shot.canceled ? null : shot.assets?.[0];
    if (!asset) {
      setState("idle");
      return { status: "cancelled" };
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
        return { status: "no_match" };
      }
      setState("idle");
      return {
        status: "matched",
        artworkId: res.artwork_id,
        confidence: res.confidence
      };
    } catch {
      setState("error");
      return { status: "error" };
    }
  }, [candidateIds]);

  return { state, capture };
}
