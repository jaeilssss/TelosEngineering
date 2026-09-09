import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { VERSION } from "./version.js";

export type Target = "codex" | "claude" | "all";
const resourceRoot = new URL("./resources", import.meta.url).pathname;
const readJson = (path: string): Record<string, any> => existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
const writeJson = (path: string, value: unknown) => { mkdirSync(join(path, ".."), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); };
const copyTree = (source: string, destination: string) => { const temporary = `${destination}.tmp-${process.pid}`; rmSync(temporary, { recursive: true, force: true }); mkdirSync(join(destination, ".."), { recursive: true }); cpSync(source, temporary, { recursive: true }); rmSync(destination, { recursive: true, force: true }); renameSync(temporary, destination); };
const executable = (name: string) => spawnSync(name, ["--version"], { stdio: "ignore" }).status === 0;

function installedVersion(destination: string, target: Exclude<Target, "all">) { writeJson(join(destination, ".telos-version.json"), { package: VERSION, target, version: VERSION }); }
function installCodex(home: string): string[] {
  const plugin = join(home, "plugins", "telos");
  copyTree(join(resourceRoot, "codex", "telos"), plugin);
  const manifestPath = join(plugin, ".codex-plugin", "plugin.json"); const manifest = readJson(manifestPath); manifest.version = VERSION; writeJson(manifestPath, manifest);
  installedVersion(plugin, "codex");
  const catalogPath = join(home, ".agents", "plugins", "marketplace.json"); const catalog = readJson(catalogPath);
  catalog.name ??= "personal"; catalog.interface ??= { displayName: "Personal" }; catalog.plugins ??= [];
  catalog.plugins = catalog.plugins.filter((entry: any) => entry.name !== "telos"); catalog.plugins.push({ name: "telos", source: { source: "local", path: "./plugins/telos" }, policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Productivity" }); writeJson(catalogPath, catalog);
  const messages = [`Codex plugin copied to ${plugin}`, `Codex marketplace updated at ${catalogPath}`];
  if (executable("codex")) { const result = spawnSync("codex", ["plugin", "add", "telos@personal"], { encoding: "utf8" }); messages.push(result.status === 0 ? "Codex plugin installed: telos@personal" : `WARNING: codex plugin add failed: ${(result.stderr || result.stdout || "").trim()}`); } else messages.push("WARNING: Codex CLI not found; run `codex plugin add telos@personal` later.");
  messages.push("Restart Codex completely before using Telos again."); return messages;
}
function installClaude(home: string): string[] {
  const marketplace = join(home, ".telos", "claude-marketplace");
  copyTree(join(resourceRoot, "claude-marketplace", "plugins", "telos"), join(marketplace, "plugins", "telos"));
  const plugin = join(marketplace, "plugins", "telos"); const manifestPath = join(plugin, ".claude-plugin", "plugin.json"); const manifest = readJson(manifestPath); manifest.version = VERSION; writeJson(manifestPath, manifest);
  const marketplacePath = join(marketplace, ".claude-plugin", "marketplace.json"); const catalog = readJson(marketplacePath); const sourceCatalog = readJson(join(resourceRoot, "claude-marketplace", ".claude-plugin", "marketplace.json"));
  catalog.name ??= sourceCatalog.name; catalog.owner ??= sourceCatalog.owner; catalog.plugins ??= sourceCatalog.plugins ?? []; for (const entry of catalog.plugins) if (entry.name === "telos") entry.version = VERSION; writeJson(marketplacePath, catalog);
  installedVersion(plugin, "claude"); const messages = [`Claude marketplace copied to ${marketplace}`];
  if (executable("claude")) { spawnSync("claude", ["plugin", "marketplace", "add", marketplace, "--scope", "user"], { encoding: "utf8" }); const result = spawnSync("claude", ["plugin", "install", "telos@telos-kit", "--scope", "user"], { encoding: "utf8" }); messages.push(result.status === 0 ? "Claude plugin installed: telos@telos-kit" : `WARNING: Claude plugin install failed: ${(result.stderr || result.stdout || "").trim()}`); } else messages.push("WARNING: Claude CLI not found; install `telos@telos-kit` later.");
  messages.push("Restart Claude Code and use /telos:spec, /telos:run, or /telos:eval."); return messages;
}
export function install(target: Target, home = homedir()): string[] { return [...(target === "codex" || target === "all" ? installCodex(home) : []), ...(target === "claude" || target === "all" ? installClaude(home) : [])]; }
