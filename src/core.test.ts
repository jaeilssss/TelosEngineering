import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { discoverCapabilities, routeCapabilities } from "./capabilities.js";
import { recordResult, retryRun, startRun } from "./run-state.js";

test("discovers and routes installed skills without provider allowlists", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-")); const home = join(root, "home"); const skill = join(home, ".codex", "skills", "migration"); mkdirSync(skill, { recursive: true }); writeFileSync(join(skill, "SKILL.md"), '---\nname: migration-review\ndescription: "Review PostgreSQL migration safety"\n---\n');
  const capabilities = discoverCapabilities(join(root, "project"), home);
  assert.equal(capabilities[0].id, "migration-review"); assert.equal(routeCapabilities(capabilities, "PostgreSQL migration")[0].score, 2);
});
test("records an Eval failure and bounded retry loop", () => {
  const root = mkdtempSync(join(tmpdir(), "telos-")); startRun(root, ["testing"], 2); recordResult(root, "rejected", "test failed"); assert.equal(retryRun(root, ["debugging"]).iteration, 2); recordResult(root, "approved", "all AC pass");
});
