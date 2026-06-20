"""CLI du pipeline de connaissance Laszlo.

Usage :
    python -m pipeline.main harvest   --set 26121 --limit 30
    python -m pipeline.main enrich    --limit 30
    python -m pipeline.main refine    --limit 30
    python -m pipeline.main transform --limit 30
    python -m pipeline.main load      --limit 30
    python -m pipeline.main all       --set 26121
"""

from __future__ import annotations

import argparse

from . import refine, transform
from .enrich import run as enrich_run
from .rijks import oai


def _build_and_load(limit):
    from . import load
    load.load(transform.build(limit=limit))


def main() -> None:
    parser = argparse.ArgumentParser(prog="pipeline")
    parser.add_argument("command",
                        choices=["harvest", "enrich", "refine", "transform", "load", "all"])
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


if __name__ == "__main__":
    main()
