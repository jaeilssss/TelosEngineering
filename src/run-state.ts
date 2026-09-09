import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type EvalStatus = "approved" | "rejected" | "uncertain" | "blocked";
export interface RunState { status: "running" | "complete" | EvalStatus; maxIterations: number; iteration: number; startedAt: string; specHash: string; history: Array<Record<string, unknown>>; }
const now = () => new Date().toISOString();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pathFor = (root: string, slug: string) => join(root, ".telos", "runs", `${slug}.json`);
const specPathFor = (root: string, slug: string) => join(root, ".telos", "specs", slug, "SPEC.md");
const reportPathFor = (root: string, slug: string, iteration: number) => join(root, ".telos", "evals", slug, `${iteration}.md`);
const activePathFor = (root: string) => join(root, ".telos", "active");
export class RunStateError extends Error {}

function requireSlug(slug: string): void {
  if (!slugPattern.test(slug)) throw new RunStateError("spec slug must contain lowercase letters, numbers, and hyphens only");
}
function currentSpecHash(root: string, slug: string): string {
  const path = specPathFor(root, slug);
  if (!existsSync(path)) throw new RunStateError(`feature SPEC is missing: .telos/specs/${slug}/SPEC.md`);
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
function ensureMatchingSpec(root: string, slug: string, state: RunState): void {
  if (state.specHash !== currentSpecHash(root, slug)) throw new RunStateError("feature SPEC changed since this run started; start a new run");
}
export function loadRunState(root: string, slug: string): RunState | undefined {
  requireSlug(slug);
  currentSpecHash(root, slug);
  const path = pathFor(root, slug);
  if (!existsSync(path)) return undefined;
  try { return JSON.parse(readFileSync(path, "utf8")) as RunState; } catch { throw new RunStateError("cannot read run state"); }
}
function save(root: string, slug: string, state: RunState): RunState {
  const path = pathFor(root, slug);
  mkdirSync(join(root, ".telos", "runs"), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(temporary, path);
  return state;
}
export function startRun(root: string, slug: string, capabilities: string[], maxIterations = 5): RunState {
  requireSlug(slug);
  if (loadRunState(root, slug)?.status === "running") throw new RunStateError("a Telos run is already active for this spec");
  if (!Number.isInteger(maxIterations) || maxIterations < 1) throw new RunStateError("max iterations must be at least 1");
  const timestamp = now();
  const state: RunState = { status: "running", maxIterations, iteration: 1, startedAt: timestamp, specHash: currentSpecHash(root, slug), history: [{ iteration: 1, capabilities, status: "started", at: timestamp }] };
  save(root, slug, state);
  writeFileSync(activePathFor(root), `${slug}\n`);
  return state;
}
function writeReport(root: string, slug: string, state: RunState, status: EvalStatus, summary: string, timestamp: string): void {
  const content = `# Telos Eval Report\n\n- Slug: ${slug}\n- Iteration: ${state.iteration}\n- Status: ${status}\n- Summary: ${summary}\n- SPEC hash: ${state.specHash}\n- Timestamp: ${timestamp}\n`;
  const path = reportPathFor(root, slug, state.iteration);
  mkdirSync(join(root, ".telos", "evals", slug), { recursive: true });
  writeFileSync(path, content);
}
export function recordResult(root: string, slug: string, status: EvalStatus, summary: string): RunState {
  if (!["approved", "rejected", "uncertain", "blocked"].includes(status)) throw new RunStateError("invalid Eval status");
  const state = loadRunState(root, slug);
  if (!state || state.status !== "running") throw new RunStateError("no active Telos run for this spec");
  ensureMatchingSpec(root, slug, state);
  const timestamp = now();
  state.history.push({ iteration: state.iteration, status, summary, at: timestamp });
  state.status = status === "approved" ? "complete" : status;
  save(root, slug, state);
  writeReport(root, slug, state, status, summary, timestamp);
  return state;
}
export function retryRun(root: string, slug: string, capabilities: string[]): RunState {
  const state = loadRunState(root, slug);
  if (!state || !["rejected", "uncertain"].includes(state.status)) throw new RunStateError("retry requires a rejected or uncertain Telos run");
  ensureMatchingSpec(root, slug, state);
  if (state.iteration >= state.maxIterations) throw new RunStateError("iteration limit reached; ask the user for direction");
  const timestamp = now();
  state.iteration += 1; state.status = "running"; state.history.push({ iteration: state.iteration, capabilities, status: "started", at: timestamp });
  return save(root, slug, state);
}
export function unblockRun(root: string, slug: string, summary: string): RunState {
  const state = loadRunState(root, slug);
  if (!state || state.status !== "blocked") throw new RunStateError("unblock requires a blocked Telos run");
  ensureMatchingSpec(root, slug, state);
  const timestamp = now();
  state.status = "running";
  state.history.push({ iteration: state.iteration, status: "unblocked", summary, at: timestamp });
  return save(root, slug, state);
}
