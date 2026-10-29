import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { RunStateError } from "./run-state.js";
import { workspaceFor } from "./storage.js";
import { featureSpecSlug } from "./document-paths.js";

export interface PrdSpecStatus {
  name: string;
  path: string;
  status: "draft" | "frozen" | "running" | "complete" | "rejected" | "uncertain" | "blocked" | "missing" | "unknown";
  nextAction: string;
}

export interface PrdStatus {
  prd: string;
  specs: PrdSpecStatus[];
}

interface RunInfo { status: string; iteration?: number; maxIterations?: number; }

function relatedSpecs(text: string): Array<{ name: string; target: string }> {
  const heading = /^##\s+\d*\.?\s*Related SPECs\s*$/m.exec(text);
  const section = heading ? text.slice(heading.index + heading[0].length).split(/^##\s/m, 1)[0] : "";
  return [...section.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((match) => ({ name: match[1], target: match[2] }));
}

function specStatus(text: string): "draft" | "frozen" | "unknown" {
  const status = text.match(/^Status:\s*`?(draft|frozen)`?\s*$/m)?.[1];
  return status === "draft" || status === "frozen" ? status : "unknown";
}

function runFor(root: string, slug: string): RunInfo | undefined {
  const workspace = workspaceFor(root).path;
  const path = join(workspace, "runs", `${slug}.json`);
  if (!existsSync(path)) return undefined;
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as { status?: unknown; iteration?: unknown; maxIterations?: unknown };
    return { status: typeof value.status === "string" ? value.status : "unknown", iteration: typeof value.iteration === "number" ? value.iteration : undefined, maxIterations: typeof value.maxIterations === "number" ? value.maxIterations : undefined };
  } catch { return { status: "unknown" }; }
}

function nextAction(status: PrdSpecStatus["status"], atIterationLimit = false): string {
  if (status === "draft") return "resolve open questions";
  if (status === "frozen") return "start run";
  if (status === "running") return "continue run";
  if (status === "complete") return "none";
  if (status === "rejected" || status === "blocked") return atIterationLimit ? "request direction and extend run" : status === "rejected" ? "retry run" : "unblock with direction";
  if (status === "uncertain") return "request direction";
  if (status === "missing") return "fix link or create SPEC";
  return "inspect SPEC";
}

export function prdStatus(root: string, prd: string, specSlugs: string[] = []): PrdStatus {
  const path = resolve(root, prd);
  if (!existsSync(path)) throw new RunStateError(`PRD is missing: ${path}`);
  const specs = relatedSpecs(readFileSync(path, "utf8")).map(({ name, target }) => {
    const specPath = resolve(dirname(path), target);
    const slug = featureSpecSlug(workspaceFor(root).path, specPath);
    if (specSlugs.length && (!slug || !specSlugs.includes(slug))) return undefined;
    if (!existsSync(specPath)) return { name, path: specPath, status: "missing" as const, nextAction: nextAction("missing") };
    const documentStatus = specStatus(readFileSync(specPath, "utf8"));
    const run = slug ? runFor(root, slug) : undefined;
    const status = run && ["running", "complete", "rejected", "uncertain", "blocked"].includes(run.status)
      ? run.status as PrdSpecStatus["status"]
      : run
        ? "unknown" as const
      : documentStatus;
    return { name, path: specPath, status, nextAction: nextAction(status, Boolean(run?.iteration !== undefined && run.maxIterations !== undefined && run.iteration >= run.maxIterations)) };
  }).filter((spec): spec is PrdSpecStatus => spec !== undefined);
  return { prd: path, specs };
}
