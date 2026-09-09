# Telos V2

> A spec-driven harness that orchestrates the right capabilities until an approved goal is verified.

Telos is an open-source development harness for Codex and Claude Code. It turns a human goal into a concrete contract, discovers the capabilities available in the current environment, and manages implementation, testing, and evaluation until the contract is verified.

Telos does not try to replace every specialist skill. Its role is to decide **what capability is needed now**, provide the right context, and keep the final decision tied to the approved Spec.

## Why Telos

Generated code alone is not a completed change. A completed change needs a clear goal, bounded scope, tests, evidence, and a reliable decision about whether it is actually done.

```text
Human goal → Spec → Capability routing → Implement → Test → Eval
                                              ↑                 │
                                              └── Re-route ─────┘
```

The user owns the goal. Telos owns the workflow, state, and final evaluation.

## Capability-first by design

Installed skills, plugins, and agents are optional, replaceable capabilities. Telos does not depend on a specific provider.

- One clearly suitable skill is selected and used.
- Overlapping skills are chosen from the Spec, repository context, current iteration, and failure evidence.
- Without a suitable external skill, Telos continues with the current Codex or Claude Code session and its built-in tools.
- A failed Eval can select a different capability for the next iteration.

## Install

Node.js 20+ is required.

```bash
npx telos-kit install all
# or
npm install -g telos-kit
telos install all
```

Use `codex` or `claude` instead of `all` to install one integration. Restart the relevant client after installation.

## Update

```bash
# npx
npx telos-kit@latest update all

# global installation
npm update -g telos-kit
telos update all
```

## Workflow

```text
spec → run → eval
```

1. `$spec` / `/telos:spec` creates a frozen `SPEC.md` with measurable acceptance criteria.
2. `$run` / `/telos:run` discovers local capabilities and manages the implementation → test → evaluation loop.
3. `$eval` / `/telos:eval` approves, rejects, or marks the result uncertain using evidence from the frozen Spec.

`run` records iterations in `.telos/run-state.json`. It stops for user direction when scope must expand, the Spec conflicts with the repository, no suitable capability is available, or the iteration limit is reached.

## Project verification and scope evidence

`.telos/project.yml` keeps repository-specific checks out of prompts. Optional `risks` run only for matching changed paths; `scopes` declares coverage dimensions used by acceptance criteria.

```yaml
modules:
  - name: web
    paths: ["src/**"]
    verify: ["npm test"]
risks:
  - id: secret-literal
    when: ["src/**"]
    check: grep -rnE '(token|secret)=' src/
    fail_when: found
scopes: ["ios", "android"]
```

For a scoped criterion, provide evidence for every scope, then validate its presence. Telos Eval still decides whether that evidence is sufficient.

```markdown
- [ ] AC1 [scopes: ios, android] Login succeeds.
  - Evidence [ios]: iOS end-to-end test passed.
  - Evidence [android]: Android end-to-end test passed.
```

```bash
telos verify --changed --project-root .
telos evidence check --spec SPEC.md --project-root .
```

Projects can make mechanical verification deterministic with a committed `.telos/project.yml`. `telos verify --changed` selects every module whose paths match tracked changes from `HEAD`, then runs only that module's declared commands. An empty `verify` list requires manual verification and cannot pass automatically.

```yaml
modules:
  - name: web
    paths: ["src/**"]
    verify: ["npm test", "npm run lint"]
```

```bash
telos capabilities discover --project-root .
telos capabilities route --project-root . --need "database migration testing"
telos verify --changed --project-root .
telos run status --project-root .
```

`$impl` and `/telos:impl` remain compatibility aliases for `run`.

## Principles

- **Spec before execution** — work begins with an explicit completion contract.
- **Capabilities over providers** — choose skills by what they can do, not their name or installation order.
- **Evidence over intent** — implementation is complete only when evaluation evidence supports the acceptance criteria.
- **Safe, bounded loops** — do not retry blindly; stop when user judgment or a new capability is required.
- **Codex and Claude Code together** — the same V2 workflow ships for both environments.

## Development

```bash
npm ci
npm test
npm run check:release
npm pack --dry-run
```

The npm package ships the Node CLI and both plugin bundles. GitHub Actions tests Node 20, 22, and 24; GitHub Releases can publish verified versions to npm through Trusted Publishing.
