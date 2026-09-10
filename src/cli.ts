#!/usr/bin/env node
import { install, uninstall } from "./installers.js";
import { historySince } from "./history.js";
import { doctorProject, initProject } from "./project-setup.js";
import { loadRunState, recordResult, retryRun, RunStateError, startRun, storeVerificationSnapshot, unblockRun } from "./run-state.js";
import { updateStatus } from "./update-status.js";
import { VERSION } from "./version.js";
import { checkEvidence, VerificationError, verifyChanged } from "./verification.js";

const args = process.argv.slice(2); const take = (name: string) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; }; const all = (name: string) => args.flatMap((value, index) => value === name && args[index + 1] ? [args[index + 1]] : []); const root = take("--project-root") ?? "."; const home = take("--home"); const output = (value: unknown) => console.log(JSON.stringify(value, null, 2));
try {
  if (args[0] === "--version") console.log(`telos ${VERSION}`);
  else if (["install", "update"].includes(args[0]) && ["codex", "claude", "all"].includes(args[1])) install(args[1] as "codex" | "claude" | "all", home).forEach((message) => console.log(message));
  else if (args[0] === "uninstall" && ["codex", "claude", "all"].includes(args[1])) uninstall(args[1] as "codex" | "claude" | "all", home).forEach((message) => console.log(message));
  else if (args[0] === "update-status" && ["codex", "claude", "all"].includes(args[1])) (args[1] === "all" ? ["codex", "claude"] : [args[1]]).map((target) => updateStatus(target as "codex" | "claude", home)).forEach(output);
  else if (args[0] === "init") output(initProject(root, args.includes("--force")));
  else if (args[0] === "doctor") output(doctorProject(root));
  else if (args[0] === "history" && take("--since")) output(historySince(root, take("--since")!));
  else if (args[0] === "verify" && args[1] === "--changed") {
    try { const result = verifyChanged(root); storeVerificationSnapshot(root, result); output(result); }
    catch (error) {
      if (error instanceof VerificationError) storeVerificationSnapshot(root, error.attempt ?? { status: "failed", error: error.message, changedPaths: [], modules: [], commands: [], risks: [] });
      throw error;
    }
  }
  else if (args[0] === "evidence" && args[1] === "check") output(checkEvidence(root, take("--spec") ?? "SPEC.md"));
  else if (args[0] === "run" && !take("--spec")) throw new RunStateError("--spec <slug> is required for telos run");
  else if (args[0] === "run" && args[1] === "status" && take("--spec")) output(loadRunState(root, take("--spec")!) ?? { status: "idle" });
  else if (args[0] === "run" && args[1] === "start" && take("--spec")) output(startRun(root, take("--spec")!, all("--capability"), Number(take("--max-iterations") ?? 5)));
  else if (args[0] === "run" && args[1] === "retry" && take("--spec")) output(retryRun(root, take("--spec")!, all("--capability")));
  else if (args[0] === "run" && args[1] === "record" && take("--spec") && take("--status") && take("--summary")) output(recordResult(root, take("--spec")!, take("--status") as any, take("--summary")!));
  else if (args[0] === "run" && args[1] === "unblock" && take("--spec") && take("--summary")) output(unblockRun(root, take("--spec")!, take("--summary")!));
  else throw new Error("usage: telos <install|update|uninstall|update-status|init|doctor|history|verify|run> ...");
} catch (error) { console.error(`telos: ${(error as Error).message}`); process.exitCode = error instanceof RunStateError ? 1 : 2; }
