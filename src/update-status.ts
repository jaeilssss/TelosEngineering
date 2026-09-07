import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { VERSION } from "./version.js";

type Target = "codex" | "claude";
const readJson = (path: string): Record<string, unknown> | undefined => { try { return JSON.parse(readFileSync(path, "utf8")); } catch { return undefined; } };
const versionPath = (home: string, target: Target) => target === "codex" ? join(home, "plugins", "telos", ".telos-version.json") : join(home, ".telos", "claude-marketplace", "plugins", "telos", ".telos-version.json");
export function updateStatus(target: Target, home = homedir()) {
  const installed = readJson(versionPath(home, target));
  const current = installed?.version;
  if (typeof current !== "string") return { target, status: "not-installed", installedVersion: null, latestVersion: VERSION, updateAvailable: false };
  const updateAvailable = current !== VERSION;
  return { target, status: updateAvailable ? "update-available" : "up-to-date", installedVersion: current, latestVersion: VERSION, updateAvailable };
}
