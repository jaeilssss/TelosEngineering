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


def _codex_cache_versions(home: Path) -> list[str]:
    root = home / ".codex" / "plugins" / "cache" / "personal" / PLUGIN_NAME
    if not root.exists():
        return []
    return sorted(
        child.name
        for child in root.iterdir()
        if child.is_dir()
    )


def _codex_cache_has_skill(home: Path, version: str) -> bool:
    skill = (
        home
        / ".codex"
        / "plugins"
        / "cache"
        / "personal"
        / PLUGIN_NAME
        / version
        / "skills"
        / "spec"
        / "SKILL.md"
    )
    return skill.exists()


def get_update_status(target: str, *, project_root: Path, home: Path | None = None) -> dict[str, object]:
    selected_home = (home or Path.home()).expanduser()
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

    cache_versions = _codex_cache_versions(selected_home) if target == "codex" else []
    installed = _read_json(_installed_version_path(selected_home, target))
    if not installed:
        if target == "codex" and cache_versions:
            return {
                "target": target,
                "status": "cache-only",
                "installed_version": None,
                "latest_version": latest,
                "update_available": False,
                "cache_versions": cache_versions,
            }
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
    cache_status = None
    if target == "codex" and cache_versions and not _codex_cache_has_skill(selected_home, current):
        cache_status = "cache-stale"

    if current_parts >= latest_parts:
        if cache_status:
            return {
                "target": target,
                "status": cache_status,
                "installed_version": current,
                "latest_version": latest,
                "update_available": False,
                "cache_versions": cache_versions,
            }
        return {
            "target": target,
            "status": "up-to-date",
            "installed_version": current,
            "latest_version": latest,
            "update_available": False,
        }

    result = {
        "target": target,
        "status": "update-available",
        "installed_version": current,
        "latest_version": latest,
        "update_available": True,
    }
    if cache_status:
        result["cache_status"] = cache_status
        result["cache_versions"] = cache_versions
    return result


def get_update_notice(target: str, *, project_root: Path, home: Path | None = None) -> str | None:
    status = get_update_status(target, project_root=project_root, home=home)
    if status["status"] == "cache-only":
        versions = ", ".join(status["cache_versions"])
        return (
            f"점검 필요: Codex가 Telos 캐시 버전 {versions}을(를) 가지고 있지만 "
            "설치 기록 파일은 찾지 못했습니다. 이전 설치 흔적이나 stale session일 수 있습니다. "
            "`telos update codex`를 실행하고 Codex를 완전히 재시작하세요."
        )
    if status["status"] == "cache-stale":
        current = status["installed_version"]
        return (
            f"점검 필요: 설치된 Telos codex 플러그인 버전 {current}의 Codex 캐시가 없거나 "
            "불완전합니다. `telos update codex`를 실행하고 Codex를 완전히 재시작하세요."
        )
    if status["status"] != "update-available":
        return None

    current = status["installed_version"]
    latest = status["latest_version"]
    message = (
        f"업데이트 권장: 설치된 Telos {target} 플러그인 버전 {current}은(는) "
        f"현재 저장소 기준 버전 {latest}보다 낮습니다. 먼저 `telos update {target}`로 "
        "현재 telos-kit 패키지의 플러그인을 다시 적용하세요. 패키지까지 최신 배포본으로 "
        "올리려면 `python3 -m pip install --upgrade telos-kit`를 먼저 실행하세요."
    )
    if status.get("cache_status") == "cache-stale":
        return (
            message + " 또한 Codex 캐시가 없거나 불완전하므로 업데이트 후 Codex를 완전히 재시작하세요."
        )
    return message
