import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { VERSION } from "./version.js";

export type Target = "codex" | "claude" | "all";
const resourceRoot = new URL("./resources", import.meta.url).pathname;
const require = createRequire(import.meta.url);
const readJson = (path: string): Record<string, any> => existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
const writeJson = (path: string, value: unknown) => { mkdirSync(join(path, ".."), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); };
const copyTree = (source: string, destination: string) => { const temporary = `${destination}.tmp-${process.pid}`; rmSync(temporary, { recursive: true, force: true }); mkdirSync(join(destination, ".."), { recursive: true }); cpSync(source, temporary, { recursive: true }); rmSync(destination, { recursive: true, force: true }); renameSync(temporary, destination); };
const installYamlParser = (plugin: string) => copyTree(dirname(require.resolve("yaml/package.json")), join(plugin, "vendor", "yaml"));
const executable = (name: string) => spawnSync(name, ["--version"], { stdio: "ignore" }).status === 0;
const removeLegacyCodex = (home: string) => {
  const legacy = join(home, "plugins", "telos");
  try { if (readJson(join(legacy, ".codex-plugin", "plugin.json")).name === "telos") rmSync(legacy, { recursive: true, force: true }); } catch {}
};

function installedVersion(destination: string, target: Exclude<Target, "all">) { writeJson(join(destination, ".telos-version.json"), { package: VERSION, target, version: VERSION }); }
function installCodex(home: string): string[] {
  const plugin = join(home, ".telos", "plugins", "telos");
  copyTree(join(resourceRoot, "codex", "telos"), plugin);
  installYamlParser(plugin);
  const manifestPath = join(plugin, ".codex-plugin", "plugin.json"); const manifest = readJson(manifestPath); manifest.version = VERSION; writeJson(manifestPath, manifest);
  installedVersion(plugin, "codex");
  removeLegacyCodex(home);
  const catalogPath = join(home, ".agents", "plugins", "marketplace.json"); const catalog = readJson(catalogPath);
  catalog.name ??= "personal"; catalog.interface ??= { displayName: "Personal" }; catalog.plugins ??= [];
  catalog.plugins = catalog.plugins.filter((entry: any) => entry.name !== "telos"); catalog.plugins.push({ name: "telos", source: { source: "local", path: "../../.telos/plugins/telos" }, policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Productivity" }); writeJson(catalogPath, catalog);
  const messages = [`Codex plugin copied to ${plugin}`, `Codex marketplace updated at ${catalogPath}`];
  if (home === homedir() && executable("codex")) { const result = spawnSync("codex", ["plugin", "add", "telos@personal"], { encoding: "utf8" }); messages.push(result.status === 0 ? "Codex plugin installed: telos@personal" : `WARNING: codex plugin add failed: ${(result.stderr || result.stdout || "").trim()}`); } else if (home === homedir()) messages.push("WARNING: Codex CLI not found; run `codex plugin add telos@personal` later.");
  messages.push("Restart Codex completely before using Telos again."); return messages;
}
function installClaude(home: string): string[] {
  const marketplace = join(home, ".telos", "claude-marketplace");
  copyTree(join(resourceRoot, "claude-marketplace", "plugins", "telos"), join(marketplace, "plugins", "telos"));
  const plugin = join(marketplace, "plugins", "telos"); const manifestPath = join(plugin, ".claude-plugin", "plugin.json"); const manifest = readJson(manifestPath); manifest.version = VERSION; writeJson(manifestPath, manifest);
  installYamlParser(plugin);
  const marketplacePath = join(marketplace, ".claude-plugin", "marketplace.json"); const catalog = readJson(marketplacePath); const sourceCatalog = readJson(join(resourceRoot, "claude-marketplace", ".claude-plugin", "marketplace.json"));
  catalog.name ??= sourceCatalog.name; catalog.owner ??= sourceCatalog.owner; catalog.plugins ??= sourceCatalog.plugins ?? []; for (const entry of catalog.plugins) if (entry.name === "telos") entry.version = VERSION; writeJson(marketplacePath, catalog);
  installedVersion(plugin, "claude"); const messages = [`Claude marketplace copied to ${marketplace}`];
  if (home === homedir() && executable("claude")) { spawnSync("claude", ["plugin", "marketplace", "add", marketplace, "--scope", "user"], { encoding: "utf8" }); const result = spawnSync("claude", ["plugin", "install", "telos@telos-kit", "--scope", "user"], { encoding: "utf8" }); messages.push(result.status === 0 ? "Claude plugin installed: telos@telos-kit" : `WARNING: Claude plugin install failed: ${(result.stderr || result.stdout || "").trim()}`); } else if (home === homedir()) messages.push("WARNING: Claude CLI not found; install `telos@telos-kit` later.");
  messages.push("Restart Claude Code and use /telos:spec, /telos:run, or /telos:eval."); return messages;
}
export function install(target: Target, home = homedir()): string[] { return [...(target === "codex" || target === "all" ? installCodex(home) : []), ...(target === "claude" || target === "all" ? installClaude(home) : [])]; }

function removeCatalogEntry(path: string): void {
  if (!existsSync(path)) return;
  const catalog = readJson(path);
  if (Array.isArray(catalog.plugins)) catalog.plugins = catalog.plugins.filter((entry: any) => entry.name !== "telos");
  writeJson(path, catalog);
}

export function uninstall(target: Target, home = homedir()): string[] {
  const messages: string[] = [];
  if (target === "codex" || target === "all") {
    const plugin = join(home, ".telos", "plugins", "telos");
    rmSync(plugin, { recursive: true, force: true });
    removeLegacyCodex(home);
    removeCatalogEntry(join(home, ".agents", "plugins", "marketplace.json"));
    messages.push(`Codex Telos plugin removed from ${plugin}`);
  }
  if (target === "claude" || target === "all") {
    const marketplace = join(home, ".telos", "claude-marketplace");
    rmSync(join(marketplace, "plugins", "telos"), { recursive: true, force: true });
    removeCatalogEntry(join(marketplace, ".claude-plugin", "marketplace.json"));
    messages.push(`Claude Telos plugin removed from ${marketplace}`);
  }
  return messages;
}
