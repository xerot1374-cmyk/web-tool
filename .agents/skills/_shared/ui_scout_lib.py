#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import datetime as dt
import difflib
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import requests
import yaml


ROOT = Path(__file__).resolve().parents[3]
ARCHIVE_ROOT = ROOT / ".agents" / "research" / "ui-inspiration"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
)
TIMEOUT = 20
ITEM_TYPE_TO_DIR = {
    "pattern": "patterns",
    "block": "blocks",
    "design-system": "design-systems",
}
LISTING_FIELDS = [
    "title",
    "source",
    "url",
    "item_type",
    "category",
    "tags",
    "platform",
    "price_type",
    "visual_style",
    "why_it_matches",
    "borrow_patterns",
    "avoid_patterns",
    "captured_at",
]
DESIGN_SYSTEM_SCORE_FIELDS = [
    "completeness",
    "token_theming_support",
    "documentation_quality",
    "enterprise_readiness",
]


@dataclass
class CandidateResult:
    metadata_path: Path
    folder_path: Path
    created: bool
    error: str | None = None


def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT})
    return s


def today_string() -> str:
    return dt.date.today().isoformat()


def run_dir(date_str: str | None = None) -> Path:
    date_value = date_str or today_string()
    path = ARCHIVE_ROOT / date_value
    path.mkdir(parents=True, exist_ok=True)
    return path


def normalize_text(value: str) -> str:
    value = value or ""
    value = re.sub(r"\s+", " ", value.strip().lower())
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def slugify(value: str) -> str:
    slug = normalize_text(value)
    return slug[:80] or "item"


def ensure_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    return [str(value).strip()]


def archive_subdir(date_str: str, item_type: str) -> Path:
    return run_dir(date_str) / ITEM_TYPE_TO_DIR[item_type]


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def request_text(url: str) -> tuple[str | None, str | None]:
    try:
        response = session().get(url, timeout=TIMEOUT)
        response.raise_for_status()
        return response.text, None
    except Exception as exc:
        return None, str(exc)


def extract_page_title(html: str) -> str | None:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    title = re.sub(r"\s+", " ", match.group(1))
    return title.strip()


def extract_meta(html: str, prop: str) -> str | None:
    class MetaParser(HTMLParser):
        def __init__(self, target: str) -> None:
            super().__init__()
            self.target = target.lower()
            self.value: str | None = None

        def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
            if tag.lower() != "meta" or self.value is not None:
                return
            data = {key.lower(): value or "" for key, value in attrs}
            name = data.get("property") or data.get("name")
            if name and name.lower() == self.target and data.get("content"):
                self.value = data["content"].strip()

    parser = MetaParser(prop)
    parser.feed(html)
    return parser.value


def similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()


def all_existing_metadata() -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    if not ARCHIVE_ROOT.exists():
        return results
    for path in ARCHIVE_ROOT.glob("*/**/metadata.json"):
        try:
            payload = read_json(path)
            payload["_path"] = str(path)
            results.append(payload)
        except Exception:
            continue
    return results


def duplicate_of(candidate: dict[str, Any], existing_items: list[dict[str, Any]]) -> dict[str, Any] | None:
    url = candidate.get("url")
    title = candidate.get("title", "")
    for item in existing_items:
        if url and item.get("url") == url:
            return item
        if title and item.get("title") and similarity(title, item["title"]) >= 0.96:
            return item
    return None


def coerce_metadata(raw: dict[str, Any], source_label: str, item_type: str, fetched_title: str | None) -> dict[str, Any]:
    title = raw.get("title") or fetched_title or raw["url"]
    metadata = {
        "title": title,
        "source": source_label,
        "url": raw["url"],
        "item_type": item_type,
        "category": raw.get("category", "uncategorized"),
        "tags": ensure_list(raw.get("tags")),
        "platform": raw.get("platform", "web"),
        "price_type": raw.get("price_type", "unknown"),
        "visual_style": raw.get("visual_style", "unspecified"),
        "why_it_matches": raw.get("why_it_matches", "Official source item matched the requested archive scope."),
        "borrow_patterns": ensure_list(raw.get("borrow_patterns")),
        "avoid_patterns": ensure_list(raw.get("avoid_patterns")),
        "captured_at": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "fetch_status": "ok",
        "preview_status": "pending",
        "notes": raw.get("notes", ""),
    }
    for field in DESIGN_SYSTEM_SCORE_FIELDS:
        if field in raw:
            metadata[field] = raw[field]
    if raw.get("seed_url"):
        metadata["seed_url"] = raw["seed_url"]
    return metadata


def candidate_folder(base_dir: Path, metadata: dict[str, Any]) -> Path:
    base_dir.mkdir(parents=True, exist_ok=True)
    slug = slugify(metadata["title"])
    folder = base_dir / slug
    counter = 2
    while folder.exists():
        try:
            existing = read_json(folder / "metadata.json")
        except Exception:
            existing = {}
        if existing.get("url") == metadata.get("url"):
            return folder
        folder = base_dir / f"{slug}-{counter}"
        counter += 1
    return folder


def write_notes(folder: Path, metadata: dict[str, Any], error: str | None = None) -> None:
    lines = [
        f"# {metadata['title']}",
        "",
        f"- Source: {metadata['source']}",
        f"- URL: {metadata['url']}",
        f"- Type: {metadata['item_type']}",
        f"- Category: {metadata['category']}",
        f"- Platform: {metadata['platform']}",
        f"- Price: {metadata['price_type']}",
        f"- Visual style: {metadata['visual_style']}",
        "",
        "## Why It Matches",
        metadata["why_it_matches"],
        "",
        "## Borrow",
    ]
    borrow = metadata.get("borrow_patterns") or ["No borrow notes captured yet."]
    lines.extend([f"- {item}" for item in borrow])
    lines.extend(["", "## Avoid"])
    avoid = metadata.get("avoid_patterns") or ["No avoid notes captured yet."]
    lines.extend([f"- {item}" for item in avoid])
    if metadata.get("notes"):
        lines.extend(["", "## Notes", metadata["notes"]])
    if error:
        lines.extend(["", "## Failure", error])
    lines.append("")
    (folder / "notes.md").write_text("\n".join(lines), encoding="utf-8")


def save_candidate(date_str: str, metadata: dict[str, Any], error: str | None = None) -> CandidateResult:
    folder = candidate_folder(archive_subdir(date_str, metadata["item_type"]), metadata)
    existed = folder.exists()
    folder.mkdir(parents=True, exist_ok=True)
    metadata_path = folder / "metadata.json"
    write_json(metadata_path, metadata)
    write_notes(folder, metadata, error=error)
    return CandidateResult(metadata_path=metadata_path, folder_path=folder, created=not existed, error=error)


def fetch_candidates(skill_dir: Path, item_type: str, limit: int, date_str: str) -> list[CandidateResult]:
    config = load_yaml(skill_dir / "sources.yaml")
    existing = all_existing_metadata()
    saved: list[CandidateResult] = []
    for group in config.get("sources", []):
        if group.get("item_type") != item_type:
            continue
        source_label = group["label"]
        for raw_item in group.get("items", []):
            if len(saved) >= limit:
                return saved
            html, fetch_error = request_text(raw_item["url"])
            fetched_title = extract_page_title(html or "") if html else None
            metadata = coerce_metadata(raw_item, source_label, item_type, fetched_title)
            duplicate = duplicate_of(metadata, existing)
            if duplicate:
                continue
            if fetch_error:
                metadata["fetch_status"] = "failed"
            result = save_candidate(date_str, metadata, error=fetch_error)
            saved.append(result)
            existing.append(metadata)
    return saved


def capture_preview_for_folder(folder: Path, force: bool = False) -> str | None:
    metadata_path = folder / "metadata.json"
    if not metadata_path.exists():
        return "metadata.json missing"
    metadata = read_json(metadata_path)
    preview_path = folder / "preview.png"
    if preview_path.exists() and not force:
        metadata["preview_status"] = "ok"
        write_json(metadata_path, metadata)
        return None
    if preview_path.exists() and force:
        preview_path.unlink()
    script_path = Path(__file__).resolve().parent / "capture_preview.mjs"
    try:
        completed = subprocess.run(
            ["node", str(script_path), metadata["url"], str(preview_path), metadata["item_type"]],
            check=True,
            capture_output=True,
            text=True,
            cwd=str(ROOT),
            timeout=90,
        )
        capture_info = json.loads(completed.stdout)
        metadata["preview_status"] = "ok"
        metadata["preview_source"] = "playwright"
        metadata["preview_capture"] = capture_info
        if capture_info.get("title"):
            metadata["preview_page_title"] = capture_info["title"]
        if capture_info.get("final_url"):
            metadata["preview_final_url"] = capture_info["final_url"]
        write_json(metadata_path, metadata)
        return None
    except Exception as exc:
        metadata["preview_status"] = "failed"
        metadata["preview_error"] = str(exc)
    write_json(metadata_path, metadata)
    write_notes(folder, metadata, error=metadata["preview_error"])
    return metadata["preview_error"]


def gather_metadata(date_str: str) -> list[dict[str, Any]]:
    base = run_dir(date_str)
    items: list[dict[str, Any]] = []
    for path in base.glob("*/**/metadata.json"):
        payload = read_json(path)
        payload["_folder"] = str(path.parent)
        payload["_preview"] = str(path.parent / "preview.png") if (path.parent / "preview.png").exists() else ""
        items.append(payload)
    return items


def score_item(item: dict[str, Any]) -> float:
    base = 1.0
    if item.get("fetch_status") == "ok":
        base += 1.0
    if item.get("preview_status") == "ok":
        base += 0.5
    base += min(len(item.get("borrow_patterns", [])), 3) * 0.3
    if item["item_type"] == "design-system":
        score_values = [float(item.get(field, 0) or 0) for field in DESIGN_SYSTEM_SCORE_FIELDS]
        base += sum(score_values) / max(len(score_values), 1)
    return round(base, 2)


def write_index_csv(base_dir: Path, items: list[dict[str, Any]]) -> Path:
    path = base_dir / "index.csv"
    fieldnames = LISTING_FIELDS + [
        "fetch_status",
        "preview_status",
        "score",
        "folder",
        "preview_path",
    ] + DESIGN_SYSTEM_SCORE_FIELDS
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for item in items:
            row = {field: item.get(field, "") for field in fieldnames}
            row["tags"] = ", ".join(item.get("tags", []))
            row["borrow_patterns"] = " | ".join(item.get("borrow_patterns", []))
            row["avoid_patterns"] = " | ".join(item.get("avoid_patterns", []))
            row["folder"] = item.get("_folder", "")
            row["preview_path"] = item.get("_preview", "")
            row["score"] = score_item(item)
            writer.writerow(row)
    return path


def grouped(items: list[dict[str, Any]]) -> dict[str, dict[str, list[dict[str, Any]]]]:
    result: dict[str, dict[str, list[dict[str, Any]]]] = {}
    for item in sorted(items, key=lambda entry: (entry["item_type"], entry["category"], entry["title"].lower())):
        result.setdefault(item["item_type"], {}).setdefault(item["category"], []).append(item)
    return result


def write_gallery(base_dir: Path, items: list[dict[str, Any]]) -> Path:
    path = base_dir / "gallery.md"
    labels = {
        "pattern": "Patterns",
        "block": "Blocks",
        "design-system": "Design Systems",
    }
    sections = ["# UI Inspiration Gallery", ""]
    for item_type in ("pattern", "block", "design-system"):
        sections.append(f"## {labels[item_type]}")
        sections.append("")
        categories = grouped(items).get(item_type, {})
        for category, entries in categories.items():
            sections.append(f"### {category}")
            sections.append("")
            for item in entries:
                preview = ""
                if item.get("_preview"):
                    rel = Path(item["_preview"]).relative_to(base_dir)
                    preview = f"![{item['title']}]({rel.as_posix()})\n"
                sections.append(
                    f"#### {item['title']}\n"
                    f"{preview}"
                    f"- Source: {item['source']}\n"
                    f"- URL: {item['url']}\n"
                    f"- Tags: {', '.join(item.get('tags', [])) or 'n/a'}\n"
                    f"- Why it matches: {item['why_it_matches']}\n"
                    f"- Borrow: {', '.join(item.get('borrow_patterns', [])) or 'n/a'}\n"
                    f"- Avoid: {', '.join(item.get('avoid_patterns', [])) or 'n/a'}\n"
                    f"- Status: fetch={item.get('fetch_status')} preview={item.get('preview_status')}\n"
                )
                sections.append("")
    path.write_text("\n".join(sections), encoding="utf-8")
    return path


def write_shortlist(base_dir: Path, items: list[dict[str, Any]], limit: int = 10) -> Path:
    path = base_dir / "shortlist.json"
    ranked = sorted(items, key=score_item, reverse=True)[:limit]
    payload = []
    for item in ranked:
        reason = item["why_it_matches"]
        if item["item_type"] == "design-system":
            reason += (
                f" Completeness={item.get('completeness', 0)}, "
                f"theming={item.get('token_theming_support', 0)}, "
                f"docs={item.get('documentation_quality', 0)}, "
                f"enterprise={item.get('enterprise_readiness', 0)}."
            )
        payload.append(
            {
                "title": item["title"],
                "url": item["url"],
                "source": item["source"],
                "item_type": item["item_type"],
                "category": item["category"],
                "score": score_item(item),
                "reason": reason,
                "borrow_patterns": item.get("borrow_patterns", []),
                "avoid_patterns": item.get("avoid_patterns", []),
            }
        )
    write_json(path, payload)
    return path


def write_penpot_import(base_dir: Path, items: list[dict[str, Any]], limit: int = 20) -> Path:
    path = base_dir / "penpot_import.json"
    ranked = sorted(items, key=score_item, reverse=True)[:limit]
    payload = {
        "generated_at": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "items": [
            {
                "title": item["title"],
                "url": item["url"],
                "source": item["source"],
                "item_type": item["item_type"],
                "category": item["category"],
                "tags": item.get("tags", []),
                "visual_style": item.get("visual_style", ""),
                "why_it_matches": item["why_it_matches"],
                "borrow_patterns": item.get("borrow_patterns", []),
                "preview_path": str(Path(item["_preview"]).relative_to(base_dir)) if item.get("_preview") else "",
            }
            for item in ranked
        ],
    }
    write_json(path, payload)
    return path


def build_outputs(date_str: str) -> dict[str, str]:
    base_dir = run_dir(date_str)
    items = gather_metadata(date_str)
    items.sort(key=lambda item: score_item(item), reverse=True)
    outputs = {
        "index_csv": str(write_index_csv(base_dir, items)),
        "gallery_md": str(write_gallery(base_dir, items)),
        "shortlist_json": str(write_shortlist(base_dir, items)),
        "penpot_import_json": str(write_penpot_import(base_dir, items)),
    }
    return outputs


def refresh_latest_gallery(date_str: str) -> None:
    latest = ARCHIVE_ROOT / "latest"
    if latest.exists() or latest.is_symlink():
        latest.unlink()
    latest.symlink_to(run_dir(date_str).resolve())


def cli_fetch(default_item_type: str) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=today_string())
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    skill_dir = Path(sys.argv[0]).resolve().parent
    results = fetch_candidates(skill_dir, default_item_type, args.limit, args.date)
    refresh_latest_gallery(args.date)
    payload = {
        "saved": len(results),
        "date": args.date,
        "results": [
            {
                "folder": str(result.folder_path),
                "metadata": str(result.metadata_path),
                "created": result.created,
                "error": result.error,
            }
            for result in results
        ],
    }
    print(json.dumps(payload, indent=2))


def cli_capture(default_item_type: str) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=today_string())
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    base = archive_subdir(args.date, default_item_type)
    payload = {"date": args.date, "item_type": default_item_type, "processed": []}
    for folder in sorted(path for path in base.iterdir() if path.is_dir()):
        error = capture_preview_for_folder(folder, force=args.force)
        payload["processed"].append({"folder": str(folder), "error": error})
    print(json.dumps(payload, indent=2))


def cli_build() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=today_string())
    args = parser.parse_args()
    outputs = build_outputs(args.date)
    refresh_latest_gallery(args.date)
    print(json.dumps(outputs, indent=2))


def copy_schema(skill_dir: Path) -> dict[str, Any]:
    return json.loads((skill_dir / "output_schema.json").read_text(encoding="utf-8"))


def copy_if_missing(source: Path, target: Path) -> None:
    if not target.exists():
        shutil.copy2(source, target)
