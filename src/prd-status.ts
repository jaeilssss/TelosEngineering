import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { RunStateError } from "./run-state.js";
import { workspaceFor } from "./storage.js";

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

function relatedSpecs(text: string): Array<{ name: string; target: string }> {
  const heading = /^##\s+\d*\.?\s*Related SPECs\s*$/m.exec(text);
  const section = heading ? text.slice(heading.index + heading[0].length).split(/^##\s/m, 1)[0] : "";
  return [...section.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((match) => ({ name: match[1], target: match[2] }));
}

function specStatus(text: string): "draft" | "frozen" | "unknown" {
  const status = text.match(/^Status:\s*`?(draft|frozen)`?\s*$/m)?.[1];
  return status === "draft" || status === "frozen" ? status : "unknown";
}

function runFor(root: string, specPath: string): string | undefined {
  const workspace = workspaceFor(root).path;
  const specRelativePath = relative(workspace, specPath);
  const match = specRelativePath.match(/^specs\/([a-z0-9]+(?:-[a-z0-9]+)*)\/SPEC\.md$/);
  if (!match) return undefined;
  const path = join(workspace, "runs", `${match[1]}.json`);
  if (!existsSync(path)) return undefined;
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as { status?: unknown };
    return typeof value.status === "string" ? value.status : "unknown";
  } catch { return "unknown"; }
}

function nextAction(status: PrdSpecStatus["status"]): string {
  if (status === "draft") return "resolve open questions";
  if (status === "frozen") return "start run";
  if (status === "running") return "continue run";
  if (status === "complete") return "none";
  if (status === "rejected") return "retry run";
  if (status === "uncertain") return "request direction";
  if (status === "blocked") return "unblock with direction";
  if (status === "missing") return "fix link or create SPEC";
  return "inspect SPEC";
}

export function prdStatus(root: string, prd: string): PrdStatus {
  const path = resolve(root, prd);
  if (!existsSync(path)) throw new RunStateError(`PRD is missing: ${path}`);
  const specs = relatedSpecs(readFileSync(path, "utf8")).map(({ name, target }) => {
    const specPath = resolve(dirname(path), target);
    if (!existsSync(specPath)) return { name, path: specPath, status: "missing" as const, nextAction: nextAction("missing") };
    const documentStatus = specStatus(readFileSync(specPath, "utf8"));
    const runStatus = runFor(root, specPath);
    const status = runStatus && ["running", "complete", "rejected", "uncertain", "blocked"].includes(runStatus)
      ? runStatus as PrdSpecStatus["status"]
      : documentStatus;
    return { name, path: specPath, status, nextAction: nextAction(status) };
  });
  return { prd: path, specs };
}
