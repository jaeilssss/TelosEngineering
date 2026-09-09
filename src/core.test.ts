import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { discoverCapabilities, routeCapabilities } from "./capabilities.js";
import { recordResult, retryRun, startRun } from "./run-state.js";
import { checkEvidence, VerificationError, verifyChanged } from "./verification.js";

test("discovers and routes installed skills without provider allowlists", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-")); const home = join(root, "home"); const skill = join(home, ".codex", "skills", "migration"); mkdirSync(skill, { recursive: true }); writeFileSync(join(skill, "SKILL.md"), '---\nname: migration-review\ndescription: "Review PostgreSQL migration safety"\n---\n');
  const capabilities = discoverCapabilities(join(root, "project"), home);
  assert.equal(capabilities[0].id, "migration-review"); assert.equal(routeCapabilities(capabilities, "PostgreSQL migration")[0].score, 2);
});
test("records an Eval failure and bounded retry loop", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-")); startRun(root, ["testing"], 2); recordResult(root, "rejected", "test failed"); assert.equal(retryRun(root, ["debugging"]).iteration, 2); recordResult(root, "approved", "all AC pass");
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
