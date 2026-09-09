import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadRunState, recordResult, retryRun, RunStateError, startRun, unblockRun } from "./run-state.js";
import { checkEvidence, VerificationError, verifyChanged } from "./verification.js";
import { install } from "./installers.js";

function featureSpec(root: string, slug: string, content = "# Feature SPEC\n") {
  const path = join(root, ".telos", "specs", slug, "SPEC.md");
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

test("keeps runs independent for feature SPEC slugs", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-"));
  featureSpec(root, "first-feature"); featureSpec(root, "second-feature");
  startRun(root, "first-feature", ["testing"], 2);
  startRun(root, "second-feature", ["debugging"], 2);
  recordResult(root, "first-feature", "rejected", "test failed");
  assert.equal(retryRun(root, "first-feature", ["testing"]).iteration, 2);
  assert.equal(loadRunState(root, "second-feature")?.status, "running");
  assert.equal(existsSync(join(root, ".telos", "runs", "first-feature.json")), true);
  assert.equal(existsSync(join(root, ".telos", "runs", "second-feature.json")), true);
});

test("rejects invalid slugs and missing Feature SPECs", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-"));
  assert.throws(() => startRun(root, "Invalid_slug", [], 1), (error: unknown) => error instanceof RunStateError && /slug/.test(error.message));
  assert.throws(() => startRun(root, "missing-spec", [], 1), (error: unknown) => error instanceof RunStateError && /feature SPEC is missing/.test(error.message));
  assert.throws(() => loadRunState(root, "missing-spec"), (error: unknown) => error instanceof RunStateError && /feature SPEC is missing/.test(error.message));
  assert.throws(() => execFileSync(process.execPath, [join(process.cwd(), "dist", "cli.js"), "run", "start", "--project-root", root], { encoding: "utf8", stdio: "pipe" }), (error: unknown) => /--spec <slug> is required/.test((error as { stderr: string }).stderr));
});

test("blocks state transitions when the Feature SPEC changes", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-")); featureSpec(root, "changed-spec", "original");
  startRun(root, "changed-spec", [], 2); writeFileSync(join(root, ".telos", "specs", "changed-spec", "SPEC.md"), "changed");
  assert.throws(() => recordResult(root, "changed-spec", "rejected", "failed"), /SPEC changed/);
  const state = loadRunState(root, "changed-spec")!; state.status = "rejected"; writeFileSync(join(root, ".telos", "runs", "changed-spec.json"), JSON.stringify(state));
  assert.throws(() => retryRun(root, "changed-spec", []), /SPEC changed/);
  state.status = "blocked"; writeFileSync(join(root, ".telos", "runs", "changed-spec.json"), JSON.stringify(state));
  assert.throws(() => unblockRun(root, "changed-spec", "user confirmed"), /SPEC changed/);
});

test("unblocks only a matching blocked run and writes Eval reports", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-")); featureSpec(root, "blocked-feature");
  startRun(root, "blocked-feature", [], 2); recordResult(root, "blocked-feature", "blocked", "waiting for access");
  const report = readFileSync(join(root, ".telos", "evals", "blocked-feature", "1.md"), "utf8");
  assert.match(report, /Slug: blocked-feature/); assert.match(report, /Iteration: 1/); assert.match(report, /Status: blocked/); assert.match(report, /Summary: waiting for access/); assert.match(report, /SPEC hash: [a-f0-9]{64}/); assert.match(report, /Timestamp:/);
  assert.equal(unblockRun(root, "blocked-feature", "access granted").status, "running");
  assert.match(JSON.stringify(loadRunState(root, "blocked-feature")!.history), /access granted/);
  assert.throws(() => unblockRun(root, "blocked-feature", "again"), /blocked Telos run/);
});

test("records the active Feature SPEC and both hooks gate matching module paths", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-hook-"));
  featureSpec(root, "hook-feature", "Status: frozen\nTest strategy: test-after\n");
  mkdirSync(join(root, ".telos"), { recursive: true });
  writeFileSync(join(root, ".telos", "project.yml"), "modules:\n  - name: app\n    paths: [\"src/**\"]\n    verify: [\"npm test\"]\n");
  startRun(root, "hook-feature", [], 1);
  assert.equal(readFileSync(join(root, ".telos", "active"), "utf8"), "hook-feature\n");
  const input = JSON.stringify({ cwd: root, tool_input: { file_path: "src/App.kt" } });
  for (const script of [join(process.cwd(), "resources", "codex", "telos", "scripts", "spec_gate.mjs"), join(process.cwd(), "resources", "claude-marketplace", "plugins", "telos", "scripts", "spec_gate.mjs")]) assert.equal(execFileSync(process.execPath, [script], { input, encoding: "utf8" }), "");
  writeFileSync(join(root, ".telos", "specs", "hook-feature", "SPEC.md"), "Status: draft\nTest strategy: test-after\n");
  for (const script of [join(process.cwd(), "resources", "codex", "telos", "scripts", "spec_gate.mjs"), join(process.cwd(), "resources", "claude-marketplace", "plugins", "telos", "scripts", "spec_gate.mjs")]) assert.match(execFileSync(process.execPath, [script], { input, encoding: "utf8" }), /not frozen/);
  const unrelated = JSON.stringify({ cwd: root, tool_input: { file_path: "docs/readme.md" } });
  for (const script of [join(process.cwd(), "resources", "codex", "telos", "scripts", "spec_gate.mjs"), join(process.cwd(), "resources", "claude-marketplace", "plugins", "telos", "scripts", "spec_gate.mjs")]) assert.equal(execFileSync(process.execPath, [script], { input: unrelated, encoding: "utf8" }), "");
});

function repository(files: Record<string, string>, project = "") {
  const root = mkdtempSync(join(tmpdir(), "telos-verify-"));
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path); mkdirSync(join(target, ".."), { recursive: true }); writeFileSync(target, content);
  }
  if (project) { mkdirSync(join(root, ".telos"), { recursive: true }); writeFileSync(join(root, ".telos", "project.yml"), project); }
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=Telos", "-c", "user.email=telos@example.test", "commit", "--quiet", "-m", "initial"], { cwd: root });
  return root;
}

function expectVerificationError(action: () => unknown, message: RegExp) {
  assert.throws(action, (error: unknown) => error instanceof VerificationError && message.test(error.message));
}

test("verifies each matching module once and in configuration order", () => {
  const root = repository({ "src/app.ts": "initial", "shared/value.ts": "initial" }, `modules:
  - name: app
    paths: ["src/**", "shared/**"]
    verify: ["node -e \\"require('node:fs').appendFileSync('commands.log', 'app\\\\n')\\""]
  - name: shared
    paths: ["shared/**"]
    verify: ["node -e \\"require('node:fs').appendFileSync('commands.log', 'shared\\\\n')\\""]
`);
  writeFileSync(join(root, "shared", "value.ts"), "changed");
  const result = verifyChanged(root);
  assert.deepEqual(result.modules, ["app", "shared"]);
  assert.equal(result.status, "passed");
  assert.equal(readFileSync(join(root, "commands.log"), "utf8"), "app\nshared\n");
});

test("selects only the module matching a single changed path", () => {
  const root = repository({ "src/app.ts": "initial", "docs/readme.md": "initial" }, `modules:
  - name: app
    paths: ["src/**"]
    verify: ["node -e \\"require('node:fs').writeFileSync('app-ran', '')\\""]
  - name: docs
    paths: ["docs/**"]
    verify: ["node -e \\"require('node:fs').writeFileSync('docs-ran', '')\\""]
`);
  writeFileSync(join(root, "src", "app.ts"), "changed");
  assert.deepEqual(verifyChanged(root).modules, ["app"]);
  assert.equal(existsSync(join(root, "app-ran")), true);
  assert.equal(existsSync(join(root, "docs-ran")), false);
});

test("stops at the first failed verification command", () => {
  const root = repository({ "src/app.ts": "initial" }, `modules:
  - name: app
    paths: ["src/**"]
    verify: ["node -e \\"process.exit(3)\\"", "node -e \\"require('node:fs').writeFileSync('should-not-exist', '')\\""]
`);
  writeFileSync(join(root, "src", "app.ts"), "changed");
  expectVerificationError(() => verifyChanged(root), /verification command failed/);
  assert.equal(existsSync(join(root, "should-not-exist")), false);
});

test("requires manual verification for an empty verify list", () => {
  const root = repository({ "infra/schema.sql": "initial" }, `modules:
  - name: infra
    paths: ["infra/**"]
    verify: []
`);
  writeFileSync(join(root, "infra", "schema.sql"), "changed");
  expectVerificationError(() => verifyChanged(root), /manual verification is required/);
});

test("rejects invalid configuration and no matching module", () => {
  const invalid = repository({ "src/app.ts": "initial" }, "modules:\n  - name: app\n    paths: []\n    verify: []\n");
  writeFileSync(join(invalid, "src", "app.ts"), "changed");
  expectVerificationError(() => verifyChanged(invalid), /paths/);

  const unmatched = repository({ "src/app.ts": "initial" }, "modules:\n  - name: app\n    paths: [\"other/**\"]\n    verify: []\n");
  writeFileSync(join(unmatched, "src", "app.ts"), "changed");
  expectVerificationError(() => verifyChanged(unmatched), /no module matches/);
});

test("requires a Git worktree with HEAD", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-no-git-"));
  mkdirSync(join(root, ".telos"), { recursive: true });
  writeFileSync(join(root, ".telos", "project.yml"), "modules:\n  - name: app\n    paths: [\"src/**\"]\n    verify: []\n");
  expectVerificationError(() => verifyChanged(root), /Git worktree/);
});

test("requires project configuration", () => {
  const root = repository({ "src/app.ts": "initial" });
  writeFileSync(join(root, "src", "app.ts"), "changed");
  expectVerificationError(() => verifyChanged(root), /project.yml is missing/);
});

test("runs only matching risks and applies found semantics", () => {
  const root = repository({ "src/app.ts": "initial", "docs/a.md": "initial" }, `modules:
  - name: app
    paths: ["src/**", "docs/**"]
    verify: ["node -e \\"process.exit(0)\\""]
risks:
  - id: source-risk
    when: ["src/**"]
    check: node -e "process.exit(1)"
    fail_when: found
  - id: docs-risk
    when: ["docs/**"]
    check: node -e "process.exit(0)"
    fail_when: found
`);
  writeFileSync(join(root, "src", "app.ts"), "changed");
  assert.deepEqual(verifyChanged(root).risks, ["source-risk"]);
  writeFileSync(join(root, "docs", "a.md"), "changed");
  expectVerificationError(() => verifyChanged(root), /risk check failed/);
});

test("requires evidence for every declared scope", () => {
  const root = repository({ "src/app.ts": "initial" }, "modules:\n  - name: app\n    paths: [\"src/**\"]\n    verify: []\nscopes: [\"ios\", \"android\"]\n");
  const spec = join(root, "feature.md");
  writeFileSync(spec, "- [ ] AC1 [scopes: ios, android] works\n  - Evidence [ios]: test passed\n  - Evidence [android]: test passed\n");
  assert.equal(checkEvidence(root, spec).status, "passed");
  writeFileSync(spec, "- [ ] AC1 [scopes: ios, android] works\n  - Evidence [ios]: test passed\n");
  expectVerificationError(() => checkEvidence(root, spec), /scope evidence is missing/);
  writeFileSync(spec, "- [ ] AC1 [scopes: ios, ios] works\n  - Evidence [ios]: test passed\n");
  expectVerificationError(() => checkEvidence(root, spec), /invalid or undeclared/);
  writeFileSync(spec, "- [ ] AC1 [scopes: web] works\n  - Evidence [web]: test passed\n");
  expectVerificationError(() => checkEvidence(root, spec), /invalid or undeclared/);
  writeFileSync(spec, "- [ ] AC1 [scopes: ios works\n");
  expectVerificationError(() => checkEvidence(root, spec), /malformed scope tag/);
});

test("installs Telos without replacing an existing Claude marketplace", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-install-")); const home = join(root, "home");
  const marketplace = join(home, ".telos", "claude-marketplace"); mkdirSync(join(marketplace, "plugins", "other"), { recursive: true }); writeFileSync(join(marketplace, "plugins", "other", "keep.txt"), "keep");
  mkdirSync(join(marketplace, ".claude-plugin"), { recursive: true }); writeFileSync(join(marketplace, ".claude-plugin", "marketplace.json"), JSON.stringify({ name: "personal", plugins: [{ name: "other", version: "1.0.0" }] }));
  install("claude", home); install("codex", home);
  assert.equal(existsSync(join(marketplace, "plugins", "other", "keep.txt")), true);
  assert.equal(existsSync(join(marketplace, "plugins", "telos", "skills", "run", "SKILL.md")), true);
  assert.match(readFileSync(join(marketplace, "plugins", "telos", "hooks", "hooks.json"), "utf8"), /"command": "node"/);
  assert.match(readFileSync(join(home, "plugins", "telos", "hooks", "hooks.json"), "utf8"), /node \\"\$\{PLUGIN_ROOT\}/);
});

test("uses project configuration for distinct frontend and JVM-style module paths", () => {
  const root = repository({ "web/App.tsx": "initial", "core/App.kt": "initial" }, `modules:
  - name: web
    paths: ["web/**"]
    verify: ["node -e \\"require('node:fs').appendFileSync('commands.log', 'web\\\\n')\\""]
  - name: core
    paths: ["core/**"]
    verify: ["node -e \\"require('node:fs').appendFileSync('commands.log', 'core\\\\n')\\""]
`);
  writeFileSync(join(root, "web", "App.tsx"), "changed"); assert.deepEqual(verifyChanged(root).modules, ["web"]);
  writeFileSync(join(root, "core", "App.kt"), "changed"); assert.deepEqual(verifyChanged(root).modules, ["web", "core"]);
});
