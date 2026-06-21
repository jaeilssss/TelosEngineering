from __future__ import annotations

import json
import os
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

from . import __version__

PLUGIN_NAME = "telos"
CLAUDE_MARKETPLACE = "telos-kit"
CLAUDE_MARKER_BEGIN = "<!-- ▼ telos-begin -->"
CLAUDE_MARKER_END = "<!-- ▲ telos-end -->"
RESOURCE_ROOT = Path(__file__).resolve().parent / "resources"


class InstallError(RuntimeError):
    pass


def _read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise InstallError(f"cannot read JSON file {path}: {exc}") from exc


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.telos-tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def _versions() -> dict[str, str]:
    values = _read_json(Path(__file__).with_name("kit_versions.json"), {})
    if values.get("package") != __version__:
        raise InstallError("package version and kit_versions.json are inconsistent")
    return values


def _replace_tree(source: Path, destination: Path) -> None:
    if destination.exists():
        shutil.rmtree(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, destination)


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, check=False)


def _command_failure(command: list[str], result: subprocess.CompletedProcess[str]) -> str:
    detail = (result.stderr or result.stdout).strip()
    rendered = " ".join(shlex.quote(part) for part in command)
    return f"{rendered} failed" + (f": {detail}" if detail else "")


def _write_install_version(destination: Path, target: str, version: str) -> None:
    _write_json(
        destination / ".telos-version.json",
        {"package": __version__, "target": target, "version": version},
    )


def _configure_codex_hook(plugin: Path, python_executable: str) -> None:
    hook_path = plugin / "hooks" / "hooks.json"
    data = _read_json(hook_path, {})
    handler = data["hooks"]["PostToolUse"][0]["hooks"][0]
    handler["command"] = (
        f'{shlex.quote(python_executable)} "${{PLUGIN_ROOT}}/scripts/spec_gate.py"'
    )
    handler["commandWindows"] = subprocess.list2cmdline(
        [python_executable, r"%PLUGIN_ROOT%\scripts\spec_gate.py"]
    )
    _write_json(hook_path, data)


def install_codex(home: Path, python_executable: str) -> list[str]:
    versions = _versions()
    source = RESOURCE_ROOT / "codex" / PLUGIN_NAME
    destination = home / "plugins" / PLUGIN_NAME
    marketplace = home / ".agents" / "plugins" / "marketplace.json"

    _replace_tree(source, destination)
    manifest_path = destination / ".codex-plugin" / "plugin.json"
    manifest = _read_json(manifest_path, {})
    manifest["version"] = versions["codex"]
    _write_json(manifest_path, manifest)
    _configure_codex_hook(destination, python_executable)
    _write_install_version(destination, "codex", versions["codex"])

    catalog = _read_json(
        marketplace,
        {"name": "personal", "interface": {"displayName": "Personal"}, "plugins": []},
    )
    catalog.setdefault("name", "personal")
    catalog.setdefault("interface", {"displayName": "Personal"})
    catalog.setdefault("plugins", [])
    entry = {
        "name": PLUGIN_NAME,
        "source": {"source": "local", "path": f"./plugins/{PLUGIN_NAME}"},
        "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
        "category": "Productivity",
    }
    catalog["plugins"] = [
        plugin for plugin in catalog["plugins"] if plugin.get("name") != PLUGIN_NAME
    ] + [entry]
    _write_json(marketplace, catalog)

    messages = [
        f"Codex plugin copied to {destination}",
        f"Codex marketplace updated at {marketplace}",
    ]
    codex = shutil.which("codex")
    plugin_id = f"{PLUGIN_NAME}@{catalog['name']}"
    if not codex:
        messages.append(f"WARNING: Codex CLI not found; run `codex plugin add {plugin_id}` later.")
        return messages

    command = [codex, "plugin", "add", plugin_id]
    result = _run(command)
    if result.returncode:
        messages.append(f"WARNING: {_command_failure(command, result)}")
    else:
        messages.append(f"Codex plugin installed: {plugin_id}")
    messages.append("Start a new Codex thread and review the Telos hook with /hooks.")
    return messages


def _remove_marker_block(path: Path) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(
        rf"\n?{re.escape(CLAUDE_MARKER_BEGIN)}.*?{re.escape(CLAUDE_MARKER_END)}\n?",
        re.DOTALL,
    )
    updated, count = pattern.subn("\n", text)
    if not count:
        return False
    if updated.strip():
        path.write_text(updated.strip() + "\n", encoding="utf-8")
    else:
        path.unlink()
    return True


def _is_legacy_hook(handler: Any) -> bool:
    if not isinstance(handler, dict) or handler.get("type") != "command":
        return False
    command = str(handler.get("command", ""))
    return "spec_gate.py" in command and ".claude/scripts" in command


def _strip_legacy_hook(path: Path) -> bool:
    if not path.exists():
        return False
    data = _read_json(path, {})
    hooks = data.get("hooks")
    if not isinstance(hooks, dict):
        return False
    groups = hooks.get("PostToolUse")
    if not isinstance(groups, list):
        return False

    changed = False
    retained_groups = []
    for group in groups:
        if not isinstance(group, dict):
            retained_groups.append(group)
            continue
        handlers = group.get("hooks")
        if not isinstance(handlers, list):
            retained_groups.append(group)
            continue
        retained_handlers = [handler for handler in handlers if not _is_legacy_hook(handler)]
        changed = changed or len(retained_handlers) != len(handlers)
        if retained_handlers:
            updated_group = dict(group)
            updated_group["hooks"] = retained_handlers
            retained_groups.append(updated_group)

    if not changed:
        return False
    if retained_groups:
        hooks["PostToolUse"] = retained_groups
    else:
        hooks.pop("PostToolUse", None)
    if not hooks:
        data.pop("hooks", None)
    if data:
        _write_json(path, data)
    else:
        path.unlink()
    return True


def _remove_legacy_claude_install(home: Path) -> bool:
    claude = home / ".claude"
    manifest = claude / ".telos-manifest"
    marker_found = _remove_marker_block(claude / "CLAUDE.md")
    hook_found = _strip_legacy_hook(claude / "settings.json")
    sidecar_found = _strip_legacy_hook(claude / "settings.json.spec-first")
    legacy_found = manifest.exists() or marker_found or hook_found or sidecar_found

    if manifest.exists():
        for raw_path in manifest.read_text(encoding="utf-8", errors="ignore").splitlines():
            candidate = Path(raw_path).expanduser().resolve()
            try:
                candidate.relative_to(claude.resolve())
            except ValueError:
                continue
            if candidate.is_dir():
                shutil.rmtree(candidate)
            elif candidate.exists():
                candidate.unlink()
        manifest.unlink()

    if legacy_found:
        for relative in (
            "commands/spec.md",
            "commands/impl.md",
            "commands/eval.md",
            "skills/spec",
            "skills/impl",
            "skills/eval",
            "agents/spec-evaluator.md",
            "agents/spec-ambiguity-evaluator.md",
            "scripts/ambiguity_score.py",
            "scripts/spec_gate.py",
            "SPEC.template.md",
        ):
            candidate = claude / relative
            if candidate.is_dir():
                shutil.rmtree(candidate)
            elif candidate.exists():
                candidate.unlink()
    return legacy_found


def _configure_claude_plugin(marketplace_root: Path, python_executable: str) -> None:
    plugin = marketplace_root / "plugins" / PLUGIN_NAME
    hook_path = plugin / "hooks" / "hooks.json"
    hooks = _read_json(hook_path, {})
    for groups in hooks.get("hooks", {}).values():
        for group in groups:
            for handler in group.get("hooks", []):
                if handler.get("type") == "command" and handler.get("args"):
                    handler["command"] = python_executable
    _write_json(hook_path, hooks)


def _install_claude_with_cli(claude: str, marketplace_root: Path) -> list[str]:
    messages = []
    add_command = [claude, "plugin", "marketplace", "add", str(marketplace_root), "--scope", "user"]
    add_result = _run(add_command)
    if add_result.returncode:
        update_command = [claude, "plugin", "marketplace", "update", CLAUDE_MARKETPLACE]
        update_result = _run(update_command)
        if update_result.returncode:
            raise InstallError(
                f"{_command_failure(add_command, add_result)}; "
                f"{_command_failure(update_command, update_result)}"
            )
    messages.append(f"Claude marketplace registered: {CLAUDE_MARKETPLACE}")

    plugin_id = f"{PLUGIN_NAME}@{CLAUDE_MARKETPLACE}"
    install_command = [claude, "plugin", "install", plugin_id, "--scope", "user"]
    install_result = _run(install_command)
    if install_result.returncode:
        update_command = [claude, "plugin", "update", plugin_id, "--scope", "user"]
        update_result = _run(update_command)
        if update_result.returncode:
            raise InstallError(
                f"{_command_failure(install_command, install_result)}; "
                f"{_command_failure(update_command, update_result)}"
            )
    messages.append(f"Claude plugin installed: {plugin_id}")
    return messages


def install_claude(home: Path, python_executable: str) -> list[str]:
    versions = _versions()
    source = RESOURCE_ROOT / "claude-marketplace"
    destination = home / ".telos" / "claude-marketplace"
    legacy_removed = _remove_legacy_claude_install(home)
    _replace_tree(source, destination)

    plugin = destination / "plugins" / PLUGIN_NAME
    plugin_manifest_path = plugin / ".claude-plugin" / "plugin.json"
    plugin_manifest = _read_json(plugin_manifest_path, {})
    plugin_manifest["version"] = versions["claude"]
    _write_json(plugin_manifest_path, plugin_manifest)

    marketplace_path = destination / ".claude-plugin" / "marketplace.json"
    marketplace = _read_json(marketplace_path, {})
    for entry in marketplace.get("plugins", []):
        if entry.get("name") == PLUGIN_NAME:
            entry["version"] = versions["claude"]
    _write_json(marketplace_path, marketplace)
    _configure_claude_plugin(destination, python_executable)
    _write_install_version(plugin, "claude", versions["claude"])

    messages = [f"Claude marketplace copied to {destination}"]
    if legacy_removed:
        messages.append("Legacy Claude Telos files and hook were removed.")
    claude = shutil.which("claude")
    if not claude:
        messages.append(
            "WARNING: Claude CLI not found; add the marketplace and install "
            f"`{PLUGIN_NAME}@{CLAUDE_MARKETPLACE}` later."
        )
        return messages
    messages.extend(_install_claude_with_cli(claude, destination))
    messages.append("Restart Claude Code and use /telos:spec, /telos:impl, or /telos:eval.")
    return messages


def install(
    target: str,
    *,
    home: Path | None = None,
    python_executable: str | None = None,
) -> list[str]:
    selected_home = (home or Path.home()).expanduser().resolve()
    selected_python = python_executable or sys.executable
    messages = []
    if target in ("codex", "all"):
        messages.extend(install_codex(selected_home, selected_python))
    if target in ("claude", "all"):
        messages.extend(install_claude(selected_home, selected_python))
    return messages
