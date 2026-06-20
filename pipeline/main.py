"""CLI du pipeline de connaissance Laszlo.

Usage :
    python -m pipeline.main harvest         --set 260214 --limit 30
    python -m pipeline.main enrich          --limit 30
    python -m pipeline.main refine          --limit 30
    python -m pipeline.main transform       --limit 30
    python -m pipeline.main load            --limit 30
    python -m pipeline.main all             --set 260214
    python -m pipeline.main update-hotspots            # met à jour coords+texte en DB sans pipeline complet
"""

from __future__ import annotations

import argparse

from . import refine, transform
from .enrich import run as enrich_run
from .rijks import oai


def _build_and_load(limit):
    from . import load
    load.load(transform.build(limit=limit))


def _update_hotspots() -> None:
    """Met à jour x, y, narration_text des hotspots phares en DB depuis flagships.py.

    N'utilise pas le cache local — lit directement Supabase pour résoudre
    les artwork_id, puis upserte par (artwork_id, ord). Idempotent.
    Utile après un ajustement manuel des coords dans flagships.py.
    """
    from . import load as load_mod
    from .hotspots import flagships

    client = load_mod._client()

    for object_number in flagships.all_flagships():
        # Résoudre l'artwork_id depuis l'object_number.
        res = (
            client.table("artwork")
            .select("id")
            .eq("object_number", object_number)
            .single()
            .execute()
        )
        if not res.data:
            print(f"[update-hotspots] {object_number} introuvable en DB — skipping")
            continue
        artwork_id = res.data["id"]

        seeds = flagships.get(object_number)
        if not seeds:
            print(f"[update-hotspots] pas de hotspots dans flagships.py pour {object_number}")
            continue

        rows = [
            {
                "artwork_id": artwork_id,
                "ord": h.ord,
                "x": h.x,
                "y": h.y,
                "title": h.title,
                "aspect": h.aspect,
                "narration_text": h.narration_text,
            }
            for h in seeds
        ]
        client.table("hotspot").upsert(rows, on_conflict="artwork_id,ord").execute()
        print(f"[update-hotspots] {object_number} — {len(rows)} hotspots mis à jour")

    print("[update-hotspots] done.")


def main() -> None:
    parser = argparse.ArgumentParser(prog="pipeline")
    parser.add_argument("command",
                        choices=["harvest", "enrich", "refine", "transform", "load", "all",
                                 "update-hotspots"])
    parser.add_argument("--set", dest="set_spec", default=None)
    parser.add_argument("--limit", type=int, default=None)
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
    elif args.command == "update-hotspots":
        _update_hotspots()


if __name__ == "__main__":
    main()
