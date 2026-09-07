import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type EvalStatus = "approved" | "rejected" | "uncertain" | "blocked";
export interface RunState { status: "running" | "complete" | EvalStatus; maxIterations: number; iteration: number; startedAt: string; history: Array<Record<string, unknown>>; }
const now = () => new Date().toISOString();
const pathFor = (root: string) => join(root, ".telos", "run-state.json");
export class RunStateError extends Error {}

export function loadRunState(root: string): RunState | undefined {
  const path = pathFor(root);
  if (!existsSync(path)) return undefined;
  try { return JSON.parse(readFileSync(path, "utf8")) as RunState; } catch { throw new RunStateError("cannot read run state"); }
}
function save(root: string, state: RunState): RunState {
  const path = pathFor(root);
  mkdirSync(join(root, ".telos"), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(temporary, path);
  return state;
}
export function startRun(root: string, capabilities: string[], maxIterations = 5): RunState {
  if (loadRunState(root)?.status === "running") throw new RunStateError("a Telos run is already active");
  if (maxIterations < 1) throw new RunStateError("max iterations must be at least 1");
  const state: RunState = { status: "running", maxIterations, iteration: 1, startedAt: now(), history: [{ iteration: 1, capabilities, status: "started", at: now() }] };
  return save(root, state);
}
export function recordResult(root: string, status: EvalStatus, summary: string): RunState {
  const state = loadRunState(root);
  if (!state || state.status !== "running") throw new RunStateError("no active Telos run");
  state.history.push({ iteration: state.iteration, status, summary, at: now() });
  state.status = status === "approved" ? "complete" : status;
  return save(root, state);
}
export function retryRun(root: string, capabilities: string[]): RunState {
  const state = loadRunState(root);
  if (!state || !["rejected", "uncertain"].includes(state.status)) throw new RunStateError("retry requires a rejected or uncertain Telos run");
  if (state.iteration >= state.maxIterations) throw new RunStateError("iteration limit reached; ask the user for direction");
  state.iteration += 1; state.status = "running"; state.history.push({ iteration: state.iteration, capabilities, status: "started", at: now() });
  return save(root, state);
}
