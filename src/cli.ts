#!/usr/bin/env node
import { discoverCapabilities, routeCapabilities } from "./capabilities.js";
import { install } from "./installers.js";
import { loadRunState, recordResult, retryRun, RunStateError, startRun } from "./run-state.js";
import { updateStatus } from "./update-status.js";
import { VERSION } from "./version.js";
import { checkEvidence, verifyChanged } from "./verification.js";

const args = process.argv.slice(2); const take = (name: string) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; }; const all = (name: string) => args.flatMap((value, index) => value === name && args[index + 1] ? [args[index + 1]] : []); const root = take("--project-root") ?? "."; const home = take("--home"); const output = (value: unknown) => console.log(JSON.stringify(value, null, 2));
try {
  if (args[0] === "--version") console.log(`telos ${VERSION}`);
  else if (["install", "update"].includes(args[0]) && ["codex", "claude", "all"].includes(args[1])) install(args[1] as "codex" | "claude" | "all", home).forEach((message) => console.log(message));
  else if (args[0] === "update-status" && ["codex", "claude", "all"].includes(args[1])) (args[1] === "all" ? ["codex", "claude"] : [args[1]]).map((target) => updateStatus(target as "codex" | "claude", home)).forEach(output);
  else if (args[0] === "capabilities" && args[1] === "discover") output(discoverCapabilities(root, home));
  else if (args[0] === "capabilities" && args[1] === "route" && take("--need")) output(routeCapabilities(discoverCapabilities(root, home), take("--need")!));
  else if (args[0] === "verify" && args[1] === "--changed") output(verifyChanged(root));
  else if (args[0] === "evidence" && args[1] === "check") output(checkEvidence(root, take("--spec") ?? "SPEC.md"));
  else if (args[0] === "run" && args[1] === "status") output(loadRunState(root) ?? { status: "idle" });
  else if (args[0] === "run" && args[1] === "start") output(startRun(root, all("--capability"), Number(take("--max-iterations") ?? 5)));
  else if (args[0] === "run" && args[1] === "retry") output(retryRun(root, all("--capability")));
  else if (args[0] === "run" && args[1] === "record" && take("--status") && take("--summary")) output(recordResult(root, take("--status") as any, take("--summary")!));
  else throw new Error("usage: telos <install|update|update-status|capabilities|verify|run> ...");
} catch (error) { console.error(`telos: ${(error as Error).message}`); process.exitCode = error instanceof RunStateError ? 1 : 2; }
