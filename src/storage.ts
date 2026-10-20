import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

export interface TelosWorkspace { projectRoot: string; path: string; }

export function legacyWorkspacePath(projectRoot: string): string {
  let source = projectRoot;
  let label = basename(projectRoot) || "project";
  try {
    const remote = execFileSync("git", ["config", "--get", "remote.origin.url"], { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (remote) { source = remote; label = basename(remote).replace(/\.git$/, ""); }
  } catch {}
  const normalized = label.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "project";
  const id = `${normalized}-${createHash("sha256").update(source).digest("hex").slice(0, 12)}`;
  return join(process.env.TELOS_HOME || join(homedir(), ".telos"), "projects", id);
}

export function workspaceFor(projectRoot: string): TelosWorkspace {
  const root = resolve(projectRoot);
  const path = join(root, ".telos");
  const legacy = legacyWorkspacePath(root);
  if (!existsSync(path) && existsSync(legacy)) cpSync(legacy, path, { recursive: true, errorOnExist: true });
  mkdirSync(path, { recursive: true });
  return { projectRoot: root, path };
}
