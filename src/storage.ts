import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

export type StorageMode = "global" | "repository";
export interface TelosWorkspace { projectRoot: string; path: string; storage: StorageMode; id: string; }

const telosHome = () => process.env.TELOS_HOME || join(homedir(), ".telos");

function projectIdentity(projectRoot: string): { source: string; label: string } {
  try {
    const remote = execFileSync("git", ["config", "--get", "remote.origin.url"], { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (remote) return { source: remote, label: basename(remote).replace(/\.git$/, "") };
  } catch {}
  return { source: projectRoot, label: basename(projectRoot) || "project" };
}

export function workspaceFor(projectRoot: string, storage?: StorageMode): TelosWorkspace {
  const root = resolve(projectRoot);
  const identity = projectIdentity(root);
  const id = `${identity.label.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "project"}-${createHash("sha256").update(identity.source).digest("hex").slice(0, 12)}`;
  const repositoryPath = join(root, ".telos");
  const selected = storage ?? (existsSync(repositoryPath) ? "repository" : "global");
  return { projectRoot: root, path: selected === "repository" ? repositoryPath : join(telosHome(), "projects", id), storage: selected, id };
}
