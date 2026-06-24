# Telos

Spec-first plugins for Codex and Claude Code.

Telos adds a lightweight workflow around a project-root `SPEC.md`:

- define the contract first
- implement against the frozen spec
- evaluate against measurable acceptance criteria

The repository ships:

- a Python CLI package: `telos-kit`
- a Codex plugin
- a Claude Code plugin marketplace bundle

For Korean documentation, see [README_KR.md](README_KR.md).

## What Telos does

Telos is built around three commands/skills:

- `spec`: clarify requirements and write `SPEC.md`
- `impl`: implement strictly from a frozen `SPEC.md`
- `eval`: verify the implementation against the spec

It also installs non-blocking hooks that warn when code is edited without a frozen `SPEC.md`.

## Requirements

- Python 3.10+
- Codex CLI for Codex plugin installation
- Claude CLI / Claude Code for Claude plugin installation

If a CLI is missing, Telos still copies the plugin files and prints the manual next step.

## Installation

Install the package from PyPI:

```bash
python3 -m pip install telos-kit
```

Install plugins:

```bash
telos install codex
telos install claude
telos install all
```

This repository also keeps shell wrappers for GitHub-based installation:

```bash
bash install.sh codex
bash install.sh claude
bash install.sh all
```

Those wrappers install the local package first when possible, then run the same CLI flow.

## Installed plugin locations

### Codex

Telos installs the Codex plugin into:

```text
~/plugins/telos/
~/.agents/plugins/marketplace.json
```

After installation, start a new Codex thread and review the Telos hook with `/hooks`.

Codex command surface:

```text
$spec
$impl
$eval
```

### Claude Code

Telos installs the Claude marketplace bundle into:

```text
~/.telos/claude-marketplace/
```

The user plugin id is:

```text
telos@telos-kit
```

Claude command surface:

```text
/telos:spec
/telos:impl
/telos:eval
```

During installation, Telos removes its own legacy global Claude files and hook entries, but leaves unrelated user settings in place.

## Workflow

### 1. Create or refine the spec

Start with the spec command for feature work:

```text
$spec
/telos:spec
```

The spec flow asks focused questions, fills `SPEC.md`, and only marks the spec as `frozen` after the ambiguity check passes.

### 2. Implement from the frozen spec

```text
$impl
/telos:impl
```

The implementation flow expects:

- `SPEC.md` to exist in the current project root
- the status to be `frozen`
- acceptance criteria to be concrete enough to implement against

### 3. Evaluate against the spec

```text
$eval
/telos:eval
```

The evaluation flow runs:

1. mechanical checks first
2. semantic review against acceptance criteria
3. optional consensus review for high-risk or uncertain cases

## Hooks

Telos installs non-blocking hooks for code edits.

Behavior:

- if `SPEC.md` is missing, warn
- if `SPEC.md` is still `draft`, warn
- if the file edit is not code-like, do nothing

These hooks are advisory. They do not block edits.

## Updating

There are two separate layers to update:

1. the `telos-kit` package
2. the installed plugin files in the user environment

### Reapply plugin files from the current package

Use:

```bash
telos update codex
telos update claude
telos update all
```

`telos update` reuses the install flow. It reapplies the plugin files from the currently installed `telos-kit` package.

### Upgrade the package, then reapply plugins

To move to the latest published package first:

```bash
python3 -m pip install --upgrade telos-kit
telos update all
```

### Check update status

Use:

```bash
telos update-status codex
telos update-status claude
telos update-status all
telos update-status all --json
```

Important: `update-status` compares the installed plugin against the versions recorded in a Telos repository checkout. By default it looks for:

```text
./src/telos_kit/kit_versions.json
```

That means it is most useful when run from this repository, or when `--project-root` points to a Telos checkout:

```bash
telos update-status all --project-root /path/to/telos
```

JSON output uses a per-target status object:

```json
[
  {
    "target": "codex",
    "status": "up-to-date",
    "installed_version": "0.4.0",
    "latest_version": "0.4.0",
    "update_available": false
  }
]
```

Possible status values:

- `up-to-date`
- `update-available`
- `not-installed`
- `unknown`

## Version model

Telos tracks separate versions for:

- the Python package
- the Codex plugin bundle
- the Claude plugin bundle

Installed plugins record their applied version in:

```text
.telos-version.json
```

The source of truth for packaged plugin versions in this repository is:

```text
src/telos_kit/kit_versions.json
```

## Repository layout

```text
src/telos_kit/
  cli.py
  installers.py
  update_status.py
  resources/
    codex/telos/
    claude-marketplace/plugins/telos/
tests/
install.sh
```

## Development

Run the test suite used by the package:

```bash
PYTHONPATH=src python3 -m unittest
```

Or run a narrower set while iterating:

```bash
PYTHONPATH=src python3 -m unittest tests.test_cli tests.test_installers tests.test_update_status tests.test_versions
```

Run the CLI from the repository without installing it globally:

```bash
PYTHONPATH=src python3 -m telos_kit --version
PYTHONPATH=src python3 -m telos_kit install codex
```

## Release notes for maintainers

When publishing a new version, keep these version sources aligned:

- `src/telos_kit/__init__.py`
- `src/telos_kit/kit_versions.json`
- Codex plugin manifest version
- Claude plugin manifest version

The repository also includes release validation helpers under `scripts/`.
