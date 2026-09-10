import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadRunState, recordResult, retryRun, RunStateError, startRun, storeVerificationSnapshot, unblockRun } from "./run-state.js";
import { checkEvidence, parseProjectConfig, runConfiguredCommand, VerificationError, verifyChanged } from "./verification.js";
import { doctorProject, initProject } from "./project-setup.js";
import { historySince } from "./history.js";
import { install, uninstall } from "./installers.js";

function featureSpec(root: string, slug: string, content = "# Feature SPEC\n") {
  const path = join(root, ".telos", "specs", slug, "SPEC.md");
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

function verifiedRun(root: string, slug: string, maxIterations = 2) {
  const project = join(root, ".telos", "project.yml");
  if (!existsSync(project)) {
    mkdirSync(join(root, ".telos"), { recursive: true });
    writeFileSync(project, "modules:\n  - name: all\n    paths: [\"**\"]\n    verify: [\"node -e \\\"process.exit(0)\\\"\"]\n");
  }
  featureSpec(root, slug);
  startRun(root, slug, [], maxIterations);
  storeVerificationSnapshot(root, verifyChanged(root));
}

test("keeps runs independent for feature SPEC slugs", () => {
  const root = repository({ "README.md": "initial" }, "modules:\n  - name: all\n    paths: [\"**\"]\n    verify: [\"node -e \\\"process.exit(0)\\\"\"]\n");
  featureSpec(root, "first-feature"); featureSpec(root, "second-feature");
  startRun(root, "first-feature", ["testing"], 2);
  startRun(root, "second-feature", ["debugging"], 2);
  writeFileSync(join(root, ".telos", "active"), "first-feature\n");
  storeVerificationSnapshot(root, verifyChanged(root));
  recordResult(root, "first-feature", "rejected", "AC1 | test failed | npm test | Stage1: yes");
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

test("never overwrites an active running slug", () => {
  const root = repository({ "README.md": "initial" }); featureSpec(root, "active-run"); startRun(root, "active-run", [], 2);
  const before = readFileSync(join(root, ".telos", "runs", "active-run.json"), "utf8");
  assert.throws(() => startRun(root, "active-run", [], 3), /already active/);
  assert.equal(readFileSync(join(root, ".telos", "runs", "active-run.json"), "utf8"), before);
});

test("blocks state transitions when the Feature SPEC changes", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-")); featureSpec(root, "changed-spec", "original");
  startRun(root, "changed-spec", [], 2); writeFileSync(join(root, ".telos", "specs", "changed-spec", "SPEC.md"), "changed");
  assert.throws(() => recordResult(root, "changed-spec", "rejected", "AC1 | failed | npm test | Stage1: yes"), /SPEC changed/);
  const state = loadRunState(root, "changed-spec")!; state.status = "rejected"; writeFileSync(join(root, ".telos", "runs", "changed-spec.json"), JSON.stringify(state));
  assert.throws(() => retryRun(root, "changed-spec", []), /SPEC changed/);
  state.status = "blocked"; writeFileSync(join(root, ".telos", "runs", "changed-spec.json"), JSON.stringify(state));
  assert.throws(() => unblockRun(root, "changed-spec", "user confirmed"), /SPEC changed/);
});

test("unblocks only a matching blocked run and writes Eval reports", () => {
  const root = repository({ "README.md": "initial" }); verifiedRun(root, "blocked-feature");
  recordResult(root, "blocked-feature", "blocked", "waiting for access");
  const report = readFileSync(join(root, ".telos", "evals", "blocked-feature", "1.md"), "utf8");
  assert.match(report, /Slug: blocked-feature/); assert.match(report, /Iteration: 1/); assert.match(report, /Status: blocked/); assert.match(report, /Summary: waiting for access/); assert.match(report, /SPEC hash: [a-f0-9]{64}/); assert.match(report, /Timestamp:/);
  assert.equal(unblockRun(root, "blocked-feature", "access granted").iteration, 2);
  storeVerificationSnapshot(root, verifyChanged(root)); recordResult(root, "blocked-feature", "approved", "complete");
  assert.equal(existsSync(join(root, ".telos", "evals", "blocked-feature", "2.md")), true);
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

test("hooks report project configuration problems once per session", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-hook-config-")); mkdirSync(join(root, "src")); writeFileSync(join(root, "src", "app.ts"), "code");
  const codex = join(process.cwd(), "resources", "codex", "telos", "scripts", "spec_gate.mjs");
  const event = JSON.stringify({ cwd: root, session_id: "session-a", tool_input: { file_path: "src/app.ts" } });
  assert.match(execFileSync(process.execPath, [codex], { input: event, encoding: "utf8" }), /project.yml is missing.*telos init/);
  assert.equal(execFileSync(process.execPath, [codex], { input: event, encoding: "utf8" }), "");
  const withoutSession = JSON.stringify({ cwd: root, tool_input: { file_path: "src/app.ts" } });
  assert.match(execFileSync(process.execPath, [codex], { input: withoutSession, encoding: "utf8" }), /project.yml is missing/);
  mkdirSync(join(root, ".telos"), { recursive: true }); writeFileSync(join(root, ".telos", "project.yml"), "modules: [\n");
  assert.match(execFileSync(process.execPath, [codex], { input: withoutSession, encoding: "utf8" }), /invalid YAML/);
  writeFileSync(join(root, ".telos", "project.yml"), "modules:\n  - name: app\n    paths: []\n    verify: []\n");
  assert.match(execFileSync(process.execPath, [codex], { input: withoutSession, encoding: "utf8" }), /paths must contain/);

  const claudeRoot = join(process.cwd(), "resources", "claude-marketplace", "plugins", "telos");
  const claude = join(claudeRoot, "scripts", "session_context.mjs");
  const sessionEvent = JSON.stringify({ cwd: root, session_id: "claude-a" });
  const first = execFileSync(process.execPath, [claude], { input: sessionEvent, encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_ROOT: claudeRoot } });
  const second = execFileSync(process.execPath, [claude], { input: sessionEvent, encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_ROOT: claudeRoot } });
  assert.match(first, /paths must contain/); assert.doesNotMatch(second, /paths must contain/);
});

function repository(files: Record<string, string>, project = "") {
  const root = mkdtempSync(join(tmpdir(), "telos-verify-"));
  files = { ".gitignore": ".telos/runs/\n.telos/evals/\n.telos/active\n", ...files };
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path); mkdirSync(join(target, ".."), { recursive: true }); writeFileSync(target, content);
  }
  if (project) { mkdirSync(join(root, ".telos"), { recursive: true }); writeFileSync(join(root, ".telos", "project.yml"), project); }
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=Telos", "-c", "user.email=telos@example.test", "commit", "--quiet", "-m", "initial"], { cwd: root });
  return root;
}

test("requires a fresh verification snapshot before recording a result", () => {
  const root = repository({ "src/app.ts": "initial" }, "modules:\n  - name: app\n    paths: [\"src/**\"]\n    verify: [\"node -e \\\"process.exit(0)\\\"\"]\n");
  featureSpec(root, "fresh-proof"); startRun(root, "fresh-proof", [], 2);
  assert.throws(() => recordResult(root, "fresh-proof", "approved", "all good"), /verification snapshot/);
  writeFileSync(join(root, "src", "app.ts"), "changed"); storeVerificationSnapshot(root, verifyChanged(root));
  writeFileSync(join(root, "src", "app.ts"), "changed again");
  assert.throws(() => recordResult(root, "fresh-proof", "approved", "all good"), /worktree changed/);
});

test("persists a failed Stage 1 snapshot so the rejection can be recorded", () => {
  const root = repository({ "src/app.ts": "initial" }, "modules:\n  - name: app\n    paths: [\"src/**\"]\n    verify: [\"node -e \\\"process.exit(3)\\\"\"]\n");
  featureSpec(root, "stage1-failure"); startRun(root, "stage1-failure", [], 2); writeFileSync(join(root, "src", "app.ts"), "changed");
  assert.throws(() => execFileSync(process.execPath, [join(process.cwd(), "dist", "cli.js"), "verify", "--changed", "--project-root", root], { encoding: "utf8", stdio: "pipe" }), /verification command failed/);
  assert.equal(loadRunState(root, "stage1-failure")?.latestVerification?.result.status, "failed");
  assert.equal(recordResult(root, "stage1-failure", "rejected", "AC1 | test failed | npm test | Stage1: yes").status, "rejected");
});

test("validates rejected summaries without mutating run state", () => {
  const root = repository({ "README.md": "initial" }); verifiedRun(root, "summary-format");
  const before = readFileSync(join(root, ".telos", "runs", "summary-format.json"), "utf8");
  for (const summary of ["tests failed", "AC1 |   | npm test | Stage1: yes", "AC1 | missing |   | Stage1: no", "AC1 | missing | extra | npm test | Stage1: yes"]) {
    assert.throws(() => recordResult(root, "summary-format", "rejected", summary), /rejected summary/);
    assert.equal(readFileSync(join(root, ".telos", "runs", "summary-format.json"), "utf8"), before);
  }
  assert.equal(existsSync(join(root, ".telos", "evals", "summary-format")), false);
});

test("archives an earlier run and its Eval reports before restarting", () => {
  const root = repository({ "README.md": "initial" }); verifiedRun(root, "archive-run");
  recordResult(root, "archive-run", "rejected", "AC1 | incomplete | npm test | Stage1: yes");
  retryRun(root, "archive-run", []); storeVerificationSnapshot(root, verifyChanged(root)); recordResult(root, "archive-run", "approved", "complete");
  startRun(root, "archive-run", [], 3);
  const runArchives = readdirSync(join(root, ".telos", "runs", "archive"));
  const evalArchives = readdirSync(join(root, ".telos", "evals", "archive"));
  assert.equal(runArchives.length, 1); assert.equal(evalArchives.length, 1);
  assert.equal(runArchives[0].replace(/\.json$/, ""), evalArchives[0]);
  assert.deepEqual(readdirSync(join(root, ".telos", "evals", "archive", evalArchives[0])).sort(), ["1.md", "2.md"]);
  assert.equal((JSON.parse(readFileSync(join(root, ".telos", "runs", "archive", runArchives[0]), "utf8")) as { history: unknown[] }).history.length, 4);
  assert.equal(loadRunState(root, "archive-run")?.iteration, 1);
});

test("unblock advances the iteration and respects the run limit", () => {
  const root = repository({ "README.md": "initial" }); verifiedRun(root, "bounded-unblock", 1);
  recordResult(root, "bounded-unblock", "blocked", "waiting");
  assert.throws(() => unblockRun(root, "bounded-unblock", "ready"), /iteration limit/);
});

test("aggregates current and archived rejection history by Stage 1 result", () => {
  const root = repository({ "README.md": "initial" }); verifiedRun(root, "history-run");
  recordResult(root, "history-run", "rejected", "AC1 | behavior missing | npm test | Stage1: yes\nAC2 | evidence missing | manual check | Stage1: no");
  retryRun(root, "history-run", []); storeVerificationSnapshot(root, verifyChanged(root)); recordResult(root, "history-run", "approved", "complete");
  startRun(root, "history-run", [], 2);
  const summary = historySince(root, "7d");
  assert.equal(summary.runs, 2); assert.equal(summary.iterations, 3); assert.equal(summary.rejections, 2);
  assert.equal(summary.stage1Caught[0].ac, "AC1"); assert.equal(summary.stage1Missed[0].verifiedBy, "manual check");
});

test("rejects an invalid history duration before reading the project", () => {
  const missing = join(tmpdir(), "telos-history-does-not-exist");
  assert.throws(() => historySince(missing, "0d"), /positive duration/);
  assert.throws(() => historySince(missing, "seven-days"), /positive duration/);
});

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

test("rejects invalid configuration and returns no-op for no matching module", () => {
  const invalid = repository({ "src/app.ts": "initial" }, "modules:\n  - name: app\n    paths: []\n    verify: []\n");
  writeFileSync(join(invalid, "src", "app.ts"), "changed");
  expectVerificationError(() => verifyChanged(invalid), /paths/);

  const unmatched = repository({ "src/app.ts": "initial" }, "modules:\n  - name: app\n    paths: [\"other/**\"]\n    verify: []\n");
  writeFileSync(join(unmatched, "src", "app.ts"), "changed");
  assert.deepEqual(verifyChanged(unmatched), { status: "no-op", reason: "no-matching-module", changedPaths: ["src/app.ts"], modules: [], commands: [], risks: [] });
});

test("returns no-op when the worktree has no changes", () => {
  const root = repository({ "src/app.ts": "initial" }, "modules:\n  - name: app\n    paths: [\"src/**\"]\n    verify: []\n");
  assert.equal(verifyChanged(root).reason, "no-changes");
  assert.match(execFileSync(process.execPath, [join(process.cwd(), "dist", "cli.js"), "verify", "--changed", "--project-root", root], { encoding: "utf8" }), /no-changes/);
  assert.equal(existsSync(join(root, ".telos", "runs")), false);
});

test("includes untracked files in changed module selection", () => {
  const root = repository({ "README.md": "initial" }, `modules:
  - name: app
    paths: ["src/**"]
    verify:
      - 'node -e ''require("node:fs").writeFileSync("untracked-ran", "")'''
`);
  mkdirSync(join(root, "src")); writeFileSync(join(root, "src", "new.ts"), "new");
  assert.deepEqual(verifyChanged(root).modules, ["app"]); assert.equal(existsSync(join(root, "untracked-ran")), true);
});

test("parses YAML comments and optional risk metadata", () => {
  const config = parseProjectConfig(`modules:
  - name: app
    paths: ["src/**"] # source files
    verify: [] # manual
risks:
  - id: unsafe
    when: ["src/**"]
    check: node -e "process.exit(1)"
    fail_when: found
    added: 2026-09-10
    origin: "AC1 regression"
    caught: 0
scopes: [web, mobile] # platforms
`);
  assert.equal(config.modules[0].verify.length, 0); assert.equal(config.risks[0].origin, "AC1 regression"); assert.deepEqual(config.scopes, ["web", "mobile"]);
});

test("reports command output tails and distinguishes risk checker errors", () => {
  const root = repository({ "src/app.ts": "initial" }, `modules:
  - name: app
    paths: ["src/**"]
    verify:
      - 'node -e "console.error(\"useful failure\"); process.exit(3)"'
`);
  writeFileSync(join(root, "src", "app.ts"), "changed"); expectVerificationError(() => verifyChanged(root), /useful failure/);
  writeFileSync(join(root, ".telos", "project.yml"), `modules:
  - name: app
    paths: ["src/**"]
    verify:
      - 'node -e "process.exit(0)"'
risks:
  - id: broken-checker
    when: ["src/**"]
    check: node -e "console.error('bad regex'); process.exit(2)"
    fail_when: found
`);
  expectVerificationError(() => verifyChanged(root), /risk check errored.*bad regex/s);
});

test("bounds failure output and distinguishes timeout and launch errors", () => {
  const root = repository({ "README.md": "initial" });
  const failed = runConfiguredCommand("node -e \"for(let i=1;i<=45;i++) console.error('line-'+i); process.exit(2)\"", root);
  assert.equal(failed.status, 2); assert.doesNotMatch(failed.detail, /line-5(?:\n|$)/); assert.match(failed.detail, /line-6/); assert.match(failed.detail, /line-45/);
  assert.throws(() => runConfiguredCommand("node -e \"setTimeout(()=>{}, 1000)\"", root, 20), /timed out/);
  assert.throws(() => runConfiguredCommand("telos-command-that-does-not-exist", root), /could not start/);
});

test("applies nonzero risk semantics", () => {
  const root = repository({ "src/app.ts": "initial" }, `modules:
  - name: app
    paths: ["src/**"]
    verify: ["node -e \\"process.exit(0)\\""]
risks:
  - id: nonzero-risk
    when: ["src/**"]
    check: node -e "process.exit(2)"
    fail_when: nonzero
`);
  writeFileSync(join(root, "src", "app.ts"), "changed"); expectVerificationError(() => verifyChanged(root), /risk check failed/);
});

test("initializes and diagnoses project configuration", () => {
  const root = repository({ "package.json": JSON.stringify({ scripts: { test: "node --test" } }) });
  const created = initProject(root); assert.deepEqual(created.verify, ["npm test"]); assert.match(created.config, /paths: \["\*\*"\]/);
  assert.throws(() => initProject(root), /already exists/); const diagnosis = doctorProject(root); assert.equal(diagnosis.status, "passed"); assert.equal(diagnosis.modules[0].commands[0].status, "passed");
});

test("doctor reports path counts and risk metadata and fails clearly", () => {
  const root = repository({ "src/app.ts": "initial" }, `modules:
  - name: app
    paths: ["src/**"]
    verify: ["node -e \\"process.exit(0)\\""]
risks:
  - id: historical-risk
    when: ["src/**"]
    check: node -e "process.exit(1)"
    fail_when: found
    added: "2026-09-10"
    origin: "AC1"
    caught: 0
`);
  const result = doctorProject(root); assert.equal(result.modules[0].matchedPaths, 1); assert.equal(result.risks[0].origin, "AC1"); assert.equal(result.risks[0].caught, 0);
  writeFileSync(join(root, ".telos", "project.yml"), `modules:
  - name: app
    paths: ["src/**"]
    verify:
      - node -e 'for(let i=1;i<=45;i++) console.error("line-"+i); process.exit(2)'
`);
  assert.throws(() => doctorProject(root), (error: unknown) => { assert.ok(error instanceof VerificationError); assert.doesNotMatch(error.message, /line-5(?:\n|$)/); assert.match(error.message, /line-6/); assert.match(error.message, /line-45/); return true; });
  writeFileSync(join(root, ".telos", "project.yml"), "modules:\n  - name: app\n    paths: [\"src/**\"]\n    verify: [\"node -e \\\"setTimeout(()=>{}, 1000)\\\"\"]\n");
  assert.throws(() => doctorProject(root, 20), /timed out/);
  writeFileSync(join(root, ".telos", "project.yml"), "modules:\n  - name: app\n    paths: [\"src/**\"]\n    verify: [\"missing-doctor-command\"]\n");
  assert.throws(() => doctorProject(root), /could not start/);
});

test("initialization follows toolchain precedence and supports force and manual fallback", () => {
  const root = repository({ "gradlew": "", "mvnw": "", "package.json": JSON.stringify({ scripts: { test: "x" } }), "pyproject.toml": "", "go.mod": "", "Cargo.toml": "" });
  assert.deepEqual(initProject(root).verify, ["./gradlew test"]);
  assert.deepEqual(initProject(root, true).verify, ["./gradlew test"]);
  const empty = repository({ "README.md": "x" }); const result = initProject(empty);
  assert.deepEqual(result.verify, []); assert.match(result.config, /manual verification required/); assert.doesNotMatch(result.config, /risks:|scopes:/);
});

test("initialization detects each supported toolchain marker", () => {
  const cases: Array<[Record<string, string>, string]> = [
    [{ gradlew: "" }, "./gradlew test"],
    [{ mvnw: "" }, "./mvnw test"],
    [{ "package.json": JSON.stringify({ scripts: { test: "x" } }) }, "npm test"],
    [{ "pyproject.toml": "" }, "pytest -q"],
    [{ "go.mod": "" }, "go test ./..."],
    [{ "Cargo.toml": "" }, "cargo test"]
  ];
  for (const [files, command] of cases) assert.deepEqual(initProject(repository(files)).verify, [command]);
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
  expectVerificationError(() => verifyChanged(root), /risk detected/);
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
  writeFileSync(spec, "- [ ] AC1 [scopes: ios] works\n  - Evidence [ios]: TODO\n");
  expectVerificationError(() => checkEvidence(root, spec), /placeholder/);
  for (const value of ["TBD", "N/A", "NA", "없음", "미확인", "-"]) {
    writeFileSync(spec, `- [ ] AC1 [scopes: ios] works\n  - Evidence [ios]: ${value}\n`);
    expectVerificationError(() => checkEvidence(root, spec), /placeholder/);
  }
});

test("supports an isolated install, reinstall, and uninstall round trip", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-install-")); const home = join(root, "home");
  const legacy = join(home, "plugins", "telos", ".codex-plugin"); mkdirSync(legacy, { recursive: true }); writeFileSync(join(legacy, "plugin.json"), JSON.stringify({ name: "telos" }));
  const marketplace = join(home, ".telos", "claude-marketplace"); mkdirSync(join(marketplace, "plugins", "other"), { recursive: true }); writeFileSync(join(marketplace, "plugins", "other", "keep.txt"), "keep");
  mkdirSync(join(marketplace, ".claude-plugin"), { recursive: true }); writeFileSync(join(marketplace, ".claude-plugin", "marketplace.json"), JSON.stringify({ name: "personal", plugins: [{ name: "other", version: "1.0.0" }] }));
  install("all", home); install("all", home);
  assert.equal(existsSync(join(marketplace, "plugins", "other", "keep.txt")), true);
  assert.equal(existsSync(join(marketplace, "plugins", "telos", "skills", "run", "SKILL.md")), true);
  assert.equal(existsSync(join(marketplace, "plugins", "telos", "skills", "review", "SKILL.md")), true);
  assert.equal(existsSync(join(marketplace, "plugins", "telos", "agents")), false);
  for (const skill of ["spec", "run", "eval", "review"]) assert.equal(
    readFileSync(join(marketplace, "plugins", "telos", "skills", skill, "SKILL.md"), "utf8"),
    readFileSync(join(home, ".telos", "plugins", "telos", "skills", skill, "SKILL.md"), "utf8")
  );
  assert.match(readFileSync(join(marketplace, "plugins", "telos", "hooks", "hooks.json"), "utf8"), /"command": "node"/);
  const codexPlugin = join(home, ".telos", "plugins", "telos");
  assert.equal(existsSync(join(home, "plugins", "telos")), false);
  assert.match(readFileSync(join(codexPlugin, "hooks", "hooks.json"), "utf8"), /"command": "node/);
  const codexCatalog = join(home, ".agents", "plugins", "marketplace.json");
  assert.match(readFileSync(codexCatalog, "utf8"), /\.\.\/\.\.\/\.telos\/plugins\/telos/);
  const project = join(root, "project"); mkdirSync(join(project, "src"), { recursive: true });
  const installedHook = execFileSync(process.execPath, [join(codexPlugin, "scripts", "spec_gate.mjs")], { input: JSON.stringify({ cwd: project, tool_input: { file_path: "src/app.ts" } }), encoding: "utf8" });
  assert.match(installedHook, /project.yml is missing/);
  uninstall("all", home);
  assert.equal(existsSync(codexPlugin), false); assert.equal(existsSync(join(marketplace, "plugins", "telos")), false);
  assert.equal(existsSync(join(marketplace, "plugins", "other", "keep.txt")), true);
  assert.doesNotMatch(readFileSync(codexCatalog, "utf8"), /"name": "telos"/);
  assert.match(readFileSync(join(marketplace, ".claude-plugin", "marketplace.json"), "utf8"), /"name": "other"/);
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

test("shared skills preserve Run and Eval workflow invariants", () => {
  const shared = join(process.cwd(), "resources", "shared", "skills");
  const run = readFileSync(join(shared, "run", "SKILL.md"), "utf8");
  const evalSkill = readFileSync(join(shared, "eval", "SKILL.md"), "utf8");
  const review = readFileSync(join(shared, "review", "SKILL.md"), "utf8");
  assert.match(run, /Ensure `.telos\/project.yml` exists.*run `telos init --project-root \.`/); assert.match(run, /Eval owns `telos verify --changed`/); assert.match(run, /Never retry `uncertain` automatically/); assert.doesNotMatch(run, /rejected or uncertain.*retry/i);
  assert.match(evalSkill, /Run `telos verify --changed --project-root \.` exactly once/); assert.match(evalSkill, /A `no-op` result continues to semantic evaluation/); assert.match(evalSkill, /Ensure `.telos\/project.yml` exists/); assert.match(evalSkill, /another model or profile/);
  assert.match(review, /Never edit `.telos\/project.yml` directly/); assert.match(review, /Never empty a module's `verify` list/);
  const promptText = [run, evalSkill, review, readFileSync(join(shared, "spec", "SKILL.md"), "utf8"), readFileSync(join(shared, "spec", "assets", "SPEC.template.md"), "utf8")].join("\n");
  assert.doesNotMatch(promptText, /gradlew|mvnw|npm (?:test|run)|pytest|go test|cargo test|Gradle|Maven/);
});
