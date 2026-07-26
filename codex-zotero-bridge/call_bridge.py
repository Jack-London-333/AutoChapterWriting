#!/usr/bin/env python3
"""Call codex-zotero-bridge localhost endpoints."""

from __future__ import annotations

import argparse
import json
import urllib.request


BASE = "http://127.0.0.1:23120"


def post(path: str, payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get(path: str) -> dict:
    with urllib.request.urlopen(BASE + path, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("status")

    get_cols = sub.add_parser("get-item-collections")
    get_cols.add_argument("item_keys", nargs="+")

    add = sub.add_parser("add-items-to-collection")
    add.add_argument("--collection-key", required=True)
    add.add_argument("item_keys", nargs="+")

    args = parser.parse_args()
    if args.cmd == "status":
        result = get("/status")
    elif args.cmd == "get-item-collections":
        result = post("/get-item-collections", {"itemKeys": args.item_keys})
    else:
        result = post(
            "/add-items-to-collection",
            {"collectionKey": args.collection_key, "itemKeys": args.item_keys},
        )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())

