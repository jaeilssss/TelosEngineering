from __future__ import annotations

import json
from pathlib import Path

from .installers import PLUGIN_NAME


def _parse_version(value: str) -> tuple[int, ...]:
    parts = []
    for item in value.split("."):
        if not item.isdigit():
            return ()
        parts.append(int(item))
    return tuple(parts)


def _read_json(path: Path) -> dict[str, str] | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _installed_version_path(home: Path, target: str) -> Path:
    if target == "codex":
        return home / "plugins" / PLUGIN_NAME / ".telos-version.json"
    return home / ".telos" / "claude-marketplace" / "plugins" / PLUGIN_NAME / ".telos-version.json"


def get_update_notice(target: str, *, project_root: Path, home: Path | None = None) -> str | None:
    kit_versions = _read_json(project_root / "src" / "telos_kit" / "kit_versions.json")
    if not kit_versions:
        return None

    latest = kit_versions.get(target)
    if not isinstance(latest, str):
        return None

    installed = _read_json(_installed_version_path((home or Path.home()).expanduser(), target))
    if not installed:
        return None

    current = installed.get("version")
    if not isinstance(current, str):
        return None

    latest_parts = _parse_version(latest)
    current_parts = _parse_version(current)
    if not latest_parts or not current_parts or current_parts >= latest_parts:
        return None

    install_target = "all" if target == "claude" else target
    return (
        f"Update recommended: installed Telos {target} plugin {current} is older than "
        f"this repository's {latest}. Run `python3 -m pip install --upgrade telos-kit` "
        f"and `telos install {install_target}`."
    )
