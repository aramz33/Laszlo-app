import { useEffect, useRef, useState } from "react";

import type { Artwork } from "../domain/artwork";
import {
  HOTSPOT_FALLBACK_MS,
  generateHotspots,
  hotspotIdsOf,
  type HotspotItem,
  type Lang,
  type Profile,
  type Steering
} from "../services/runtime";

export type HotspotTextsState = {
  items: Record<string, HotspotItem>;
  status: "loading" | "ready" | "fallback" | "error";
};

type Args = {
  artwork: Artwork;
  lang: Lang;
  profile?: Profile;
  steering?: Steering;
};

/**
 * Runs the `mode=hotspot` batch when an artwork opens and exposes per-hotspot
 * generated text. If the batch hasn't resolved within HOTSPOT_FALLBACK_MS the
 * status flips to "fallback" so the UI shows the stored `narration_text` seed
 * (ADR 0014). The batch is not re-run while inside the same artwork.
 */
export function useHotspotTexts({
  artwork,
  lang,
  profile,
  steering
}: Args): HotspotTextsState {
  const [state, setState] = useState<HotspotTextsState>({
    items: {},
    status: "loading"
  });
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ items: {}, status: "loading" });

    fallbackTimer.current = setTimeout(() => {
      if (cancelled) return;
      setState((prev) =>
        prev.status === "loading" ? { ...prev, status: "fallback" } : prev
      );
    }, HOTSPOT_FALLBACK_MS);

    generateHotspots({
      artworkId: artwork.id,
      hotspotIds: hotspotIdsOf(artwork),
      lang,
      profile,
      steering
    })
      .then((res) => {
        if (cancelled) return;
        const items: Record<string, HotspotItem> = {};
        for (const item of res.items) {
          items[item.hotspot_id] = item;
        }
        const anyReady = res.items.some(
          (i) => i.status === "ready" && i.text
        );
        setState({ items, status: anyReady ? "ready" : "fallback" });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ items: {}, status: "error" });
      });

    return () => {
      cancelled = true;
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
      }
    };
  }, [artwork, lang, profile, steering]);

  return state;
}
