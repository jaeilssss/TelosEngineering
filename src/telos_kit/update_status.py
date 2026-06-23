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


def get_update_status(target: str, *, project_root: Path, home: Path | None = None) -> dict[str, str | bool | None]:
    kit_versions = _read_json(project_root / "src" / "telos_kit" / "kit_versions.json")
    if not kit_versions:
        return {
            "target": target,
            "status": "unknown",
            "installed_version": None,
            "latest_version": None,
            "update_available": False,
        }

    latest = kit_versions.get(target)
    if not isinstance(latest, str):
        return {
            "target": target,
            "status": "unknown",
            "installed_version": None,
            "latest_version": None,
            "update_available": False,
        }

    installed = _read_json(_installed_version_path((home or Path.home()).expanduser(), target))
    if not installed:
        return {
            "target": target,
            "status": "not-installed",
            "installed_version": None,
            "latest_version": latest,
            "update_available": False,
        }

    current = installed.get("version")
    if not isinstance(current, str):
        return {
            "target": target,
            "status": "unknown",
            "installed_version": None,
            "latest_version": latest,
            "update_available": False,
        }

    latest_parts = _parse_version(latest)
    current_parts = _parse_version(current)
    if not latest_parts or not current_parts:
        return {
            "target": target,
            "status": "unknown",
            "installed_version": current,
            "latest_version": latest,
            "update_available": False,
        }
    if current_parts >= latest_parts:
        return {
            "target": target,
            "status": "up-to-date",
            "installed_version": current,
            "latest_version": latest,
            "update_available": False,
        }

    return {
        "target": target,
        "status": "update-available",
        "installed_version": current,
        "latest_version": latest,
        "update_available": True,
    }


def get_update_notice(target: str, *, project_root: Path, home: Path | None = None) -> str | None:
    status = get_update_status(target, project_root=project_root, home=home)
    if status["status"] != "update-available":
        return None

    current = status["installed_version"]
    latest = status["latest_version"]
    return (
        f"업데이트 권장: 설치된 Telos {target} 플러그인 버전 {current}은(는) "
        f"현재 저장소 기준 버전 {latest}보다 낮습니다. 먼저 `telos update {target}`로 "
        "현재 telos-kit 패키지의 플러그인을 다시 적용하세요. 패키지까지 최신 배포본으로 "
        "올리려면 `python3 -m pip install --upgrade telos-kit`를 먼저 실행하세요."
    )
