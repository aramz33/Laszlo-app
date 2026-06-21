import { useEffect, useState } from "react";

import { generateOverview, type Lang, type Profile } from "../services/runtime";

type OverviewState =
  | { status: "loading" }
  | { status: "ready"; text: string }
  | { status: "empty" };

/**
 * Fetches the `mode=overview` intro ("✦ the artwork") once on open. Cached for
 * the lifetime of the screen so re-tapping the ✦ card never re-generates.
 */
export function useOverview({
  artworkId,
  lang,
  profile,
  historySummary
}: {
  artworkId: string;
  lang: Lang;
  profile?: Profile;
  historySummary?: string | null;
}) {
  const [state, setState] = useState<OverviewState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    generateOverview({ artworkId, lang, profile, historySummary })
      .then((res) => {
        if (!active) return;
        setState(res.text ? { status: "ready", text: res.text } : { status: "empty" });
      })
      .catch(() => {
        if (active) setState({ status: "empty" });
      });
    return () => {
      active = false;
    };
  }, [artworkId, lang, profile, historySummary]);

  return state;
}
