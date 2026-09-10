import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { RunState, RunStateError } from "./run-state.js";

export interface RejectionRecord { slug: string; iteration: number; ac: string; missing: string; verifiedBy: string; }
export interface HistorySummary {
  since: string;
  cutoff: string;
  runs: number;
  iterations: number;
  rejections: number;
  stage1Caught: RejectionRecord[];
  stage1Missed: RejectionRecord[];
}

function cutoffFor(duration: string): Date {
  const match = duration.match(/^([1-9][0-9]*)(h|d|w)$/);
  if (!match) throw new RunStateError("--since must be a positive duration such as 24h, 7d, or 2w");
  const units = { h: 3_600_000, d: 86_400_000, w: 604_800_000 } as const;
  return new Date(Date.now() - Number(match[1]) * units[match[2] as keyof typeof units]);
}

function stateFiles(root: string): Array<{ slug: string; path: string }> {
  const runs = join(root, ".telos", "runs");
  if (!existsSync(runs)) return [];
  const current = readdirSync(runs, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => ({ slug: entry.name.slice(0, -5), path: join(runs, entry.name) }));
  const archive = join(runs, "archive");
  const archived = existsSync(archive) ? readdirSync(archive, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => ({ slug: entry.name.replace(/-\d{4}-\d{2}-\d{2}T.*\.json$/, ""), path: join(archive, entry.name) })) : [];
  return [...current, ...archived];
}

export function historySince(root: string, duration: string): HistorySummary {
  const cutoff = cutoffFor(duration);
  const output: HistorySummary = { since: duration, cutoff: cutoff.toISOString(), runs: 0, iterations: 0, rejections: 0, stage1Caught: [], stage1Missed: [] };
  for (const file of stateFiles(root)) {
    let state: RunState;
    try { state = JSON.parse(readFileSync(file.path, "utf8")) as RunState; }
    catch { throw new RunStateError(`cannot read run history: ${file.path}`); }
    if (new Date(state.startedAt) >= cutoff) output.runs += 1;
    for (const event of state.history) {
      if (typeof event.at !== "string" || new Date(event.at) < cutoff) continue;
      if (event.status === "started" || event.status === "unblocked") output.iterations += 1;
      if (event.status !== "rejected" || typeof event.summary !== "string") continue;
      for (const line of event.summary.split(/\r?\n/).filter(Boolean)) {
        const match = line.match(/^(AC\d+) \| ([^|\s](?:[^|]*[^|\s])?) \| ([^|\s](?:[^|]*[^|\s])?) \| Stage1: (yes|no)$/);
        if (!match) continue;
        const record = { slug: file.slug, iteration: Number(event.iteration), ac: match[1], missing: match[2], verifiedBy: match[3] };
        (match[4] === "yes" ? output.stage1Caught : output.stage1Missed).push(record);
        output.rejections += 1;
      }
    }
  }
  return output;
}
