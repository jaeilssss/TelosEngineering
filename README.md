# Telos V2

Telos is a spec-driven capability orchestration harness for Codex and Claude Code.

`$spec` / `/telos:spec` defines an approved goal. `$run` / `/telos:run` discovers installed skills, plugins, and agents, selects the relevant capabilities, and loops through implementation, test, Eval, and re-routing until the Spec is verified.

## Install

Node.js 20+ is required.

```bash
npx telos-kit install all
# or
npm install -g telos-kit
telos install all
```

Use `codex` or `claude` instead of `all` to install one integration. Restart the relevant client after installation.

## Workflow

```text
spec → run → eval
```

`run` inventories local `SKILL.md` files, ranks candidates from their declared metadata, and records each iteration in `.telos/run-state.json`. It stops for user direction when the approved Spec conflicts with the repository, scope must expand, a required capability is unavailable, or the iteration limit is reached.

```bash
telos capabilities discover --project-root .
telos capabilities route --project-root . --need "database migration testing"
telos run status --project-root .
```

`$impl` and `/telos:impl` remain compatibility aliases for `run`.

## Development

```bash
npm ci
npm test
npm run check:release
npm pack --dry-run
```

The npm package ships the compiled Node CLI and both Codex and Claude Code plugin bundles. GitHub Actions test Node 20, 22, and 24, then publish releases to npm with provenance.
