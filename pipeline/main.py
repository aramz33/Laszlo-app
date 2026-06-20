"""CLI du pipeline de connaissance Laszlo.

Usage :
    python -m pipeline.main harvest        --set 260214 --limit 30
    python -m pipeline.main enrich         --limit 30
    python -m pipeline.main refine         --limit 30
    python -m pipeline.main transform      --limit 30
    python -m pipeline.main load           --limit 30
    python -m pipeline.main all            --set 260214
    python -m pipeline.main place-hotspots            # vision auto-placement
"""

from __future__ import annotations

import argparse

from . import refine, transform
from .enrich import run as enrich_run
from .rijks import oai


def _build_and_load(limit):
    from . import load
    load.load(transform.build(limit=limit))


def _place_hotspots(backend: str) -> None:
    """Use a vision model to auto-place hotspot coordinates for all flagships.

    Reads artwork + hotspot data from Supabase, calls the selected backend for
    each hotspot, upserts updated x/y to Supabase, and prints a diff so you
    can update flagships.py for persistence across future `load` runs.

    backend: "moondream" | "pixtral-grid" | "pixtral"
    """
    from . import load as load_mod
    from .hotspots import flagships, vision_placer

    if backend not in vision_placer.BACKENDS:
        raise SystemExit(f"Unknown backend '{backend}'. Choose from: {vision_placer.BACKENDS}")

    client = load_mod._client()

    for object_number in flagships.all_flagships():
        # Fetch artwork row (need title, image_url, artist name).
        art_res = (
            client.table("artwork")
            .select("id, title_en, title_nl, image_url, artist(name)")
            .eq("object_number", object_number)
            .single()
            .execute()
        )
        if not art_res.data:
            print(f"[place-hotspots] {object_number} not found in DB — skipping")
            continue

        art = art_res.data
        title = art.get("title_en") or art.get("title_nl") or object_number
        artist = (art.get("artist") or {}).get("name") or "unknown"
        image_url = art["image_url"]
        artwork_id = art["id"]

        # Fetch current hotspots — include narration_text for richer prompts.
        hs_res = (
            client.table("hotspot")
            .select("id, title, aspect, narration_text, x, y, ord")
            .eq("artwork_id", artwork_id)
            .order("ord")
            .execute()
        )
        hotspots = hs_res.data or []
        if not hotspots:
            print(f"[place-hotspots] no hotspots for {object_number} — skipping")
            continue

        print(f"\n[place-hotspots] {object_number} — {title} ({len(hotspots)} hotspots) [{backend}]")

        # Call vision model for each hotspot.
        updated = vision_placer.place(title, artist, image_url, hotspots, backend=backend)

        # Upsert updated coordinates to Supabase.
        for h in updated:
            client.table("hotspot").update({"x": h["x"], "y": h["y"]}).eq("id", h["id"]).execute()

        # Print the diff so flagships.py can be updated manually for persistence.
        print(f"\n[place-hotspots] ✅ {object_number} updated in Supabase.")
        print("  To make permanent (survives future `load` runs), update flagships.py:")
        for orig, new in zip(hotspots, updated):
            if orig["x"] != new["x"] or orig["y"] != new["y"]:
                print(f"    '{new['title']}': ({orig['x']}, {orig['y']}) → ({new['x']}, {new['y']})")


def main() -> None:
    parser = argparse.ArgumentParser(prog="pipeline")
    parser.add_argument("command",
                        choices=["harvest", "enrich", "refine", "transform",
                                 "load", "all", "place-hotspots"])
    parser.add_argument("--set", dest="set_spec", default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument(
        "--backend",
        default="moondream",
        choices=["moondream", "pixtral-grid", "pixtral"],
        help="Vision backend for place-hotspots (default: moondream)",
    )
    args = parser.parse_args()

    if args.command == "harvest":
        oai.harvest(set_spec=args.set_spec, limit=args.limit)
    elif args.command == "enrich":
        enrich_run.run(limit=args.limit)
    elif args.command == "refine":
        refine.run(limit=args.limit)
    elif args.command == "transform":
        transform.build(limit=args.limit)
    elif args.command == "load":
        _build_and_load(args.limit)
    elif args.command == "all":
        oai.harvest(set_spec=args.set_spec, limit=args.limit)
        enrich_run.run(limit=args.limit)
        refine.run(limit=args.limit)
        _build_and_load(args.limit)
    elif args.command == "place-hotspots":
        _place_hotspots(args.backend)


if __name__ == "__main__":
    main()
