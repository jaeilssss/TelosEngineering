import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface ModuleConfig { name: string; paths: string[]; verify: string[]; }
export interface RiskConfig { id: string; when: string[]; check: string; fail_when: "found" | "nonzero"; added?: string; origin?: string; caught?: number; }
export interface ProjectConfig { modules: ModuleConfig[]; risks: RiskConfig[]; scopes: string[]; }
export interface VerificationResult { status: "passed" | "no-op"; reason?: "no-changes" | "no-matching-module"; changedPaths: string[]; modules: string[]; commands: string[]; risks: string[]; }
export interface FailedVerificationResult { status: "failed"; error: string; changedPaths: string[]; modules: string[]; commands: string[]; risks: string[]; }
export type VerificationAttempt = VerificationResult | FailedVerificationResult;
export class VerificationError extends Error { constructor(message: string, public attempt?: FailedVerificationResult) { super(message); } }

const strings = (value: unknown, field: string, allowEmpty = false): string[] => {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.some((item) => typeof item !== "string" || !item.trim())) throw new VerificationError(`${field} must be ${allowEmpty ? "a" : "a non-empty"} list of non-empty strings`);
  return value as string[];
};

export function parseProjectConfig(text: string): ProjectConfig {
  let value: any;
  try { value = parse(text); } catch (error) { throw new VerificationError(`cannot parse .telos/project.yml: ${(error as Error).message}`); }
  if (!value || typeof value !== "object" || !Array.isArray(value.modules) || value.modules.length === 0) throw new VerificationError("project.yml must define at least one module\n\n  modules:\n    - name: all\n      paths: [\"**\"]\n      verify: [\"npm test\"]");
  const moduleNames = new Set<string>();
  const modules = value.modules.map((item: any): ModuleConfig => {
    if (!item || typeof item !== "object" || typeof item.name !== "string" || !item.name.trim() || moduleNames.has(item.name)) throw new VerificationError("module names must be unique and non-empty");
    moduleNames.add(item.name);
    return { name: item.name, paths: strings(item.paths, `module ${item.name} paths`), verify: strings(item.verify, `module ${item.name} verify`, true) };
  });
  const riskNames = new Set<string>();
  const risks = (value.risks ?? []).map((item: any): RiskConfig => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id.trim() || riskNames.has(item.id)) throw new VerificationError("risk ids must be unique and non-empty");
    riskNames.add(item.id);
    if (typeof item.check !== "string" || !item.check.trim() || !["found", "nonzero"].includes(item.fail_when)) throw new VerificationError(`invalid risk definition: ${item.id}`);
    if (item.added !== undefined && typeof item.added !== "string") throw new VerificationError(`risk ${item.id} added must be a string`);
    if (item.origin !== undefined && (typeof item.origin !== "string" || !item.origin.trim())) throw new VerificationError(`risk ${item.id} origin must be a non-empty string`);
    if (item.caught !== undefined && (!Number.isInteger(item.caught) || item.caught < 0)) throw new VerificationError(`risk ${item.id} caught must be a non-negative integer`);
    return { id: item.id, when: strings(item.when, `risk ${item.id} when`), check: item.check, fail_when: item.fail_when, ...(item.added === undefined ? {} : { added: item.added }), ...(item.origin === undefined ? {} : { origin: item.origin }), ...(item.caught === undefined ? {} : { caught: item.caught }) };
  });
  const scopes = value.scopes === undefined ? [] : strings(value.scopes, "scopes", true);
  if (new Set(scopes).size !== scopes.length) throw new VerificationError("scopes must be unique non-empty strings");
  return { modules, risks, scopes };
}

export function loadProjectConfig(root: string): ProjectConfig {
  const path = join(root, ".telos", "project.yml");
  if (!existsSync(path)) throw new VerificationError(".telos/project.yml is missing; run `telos init --project-root .`");
  return parseProjectConfig(readFileSync(path, "utf8"));
}

export function globMatches(pattern: string, path: string): boolean {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") { index += 1; if (pattern[index + 1] === "/") { expression += "(?:.*/)?"; index += 1; } else expression += ".*"; }
    else if (character === "*") expression += "[^/]*";
    else if (character === "?") expression += "[^/]";
    else expression += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
  }
  return new RegExp(`${expression}$`).test(path);
}

const gitLines = (root: string, args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split(/\r?\n/).filter(Boolean);
export function changedPaths(root: string): string[] {
  try { return [...new Set([...gitLines(root, ["diff", "--name-only", "HEAD"]), ...gitLines(root, ["ls-files", "--others", "--exclude-standard"])])].sort(); }
  catch { throw new VerificationError("telos verify requires a Git worktree with HEAD"); }
}

export function worktreeFingerprint(root: string): string {
  try {
    const hash = createHash("sha256"); hash.update(execFileSync("git", ["diff", "--binary", "HEAD"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] }));
    for (const path of gitLines(root, ["ls-files", "--others", "--exclude-standard"]).sort()) { hash.update(`\0${path}\0`); hash.update(readFileSync(join(root, path))); }
    return hash.digest("hex");
  } catch { throw new VerificationError("cannot fingerprint Git worktree"); }
}

function tail(stdout: string | null | undefined, stderr: string | null | undefined): string {
  return `${stdout ?? ""}\n${stderr ?? ""}`.split(/\r?\n/).filter(Boolean).slice(-40).join("\n");
}

function splitCommand(command: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;
  const push = () => { if (current) args.push(current); current = ""; };
  for (const character of command.trim()) {
    if (escaped) { current += character; escaped = false; continue; }
    if (character === "\\" && quote === '"') { escaped = true; continue; }
    if (quote) { if (character === quote) quote = null; else current += character; continue; }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (/\s/.test(character)) push(); else current += character;
  }
  if (escaped) current += "\\";
  push();
  return args;
}

function windowsExecutable(file: string, root: string): string {
  if (/\.(?:cmd|bat|exe)$/i.test(file)) return file;
  for (const suffix of [".cmd", ".bat"]) {
    if (existsSync(join(root, `${file}${suffix}`))) return `${file}${suffix}`;
  }
  if (["npm", "npx", "pnpm", "yarn", "bun"].includes(file)) return `${file}.cmd`;
  return file;
}

export function runConfiguredCommand(command: string, root: string, timeout = 600_000) {
  const result = process.platform === "win32"
    ? (() => { const [file, ...args] = splitCommand(command); return spawnSync(windowsExecutable(file, root), args, { cwd: root, encoding: "utf8", timeout }); })()
    : spawnSync(command, { cwd: root, shell: true, encoding: "utf8", timeout });
  const detail = tail(result.stdout, result.stderr);
  if (result.error) {
    const timedOut = (result.error as NodeJS.ErrnoException).code === "ETIMEDOUT" || result.signal === "SIGTERM";
    throw new VerificationError(`${timedOut ? "verification command timed out" : "verification command could not start"}: ${command}${detail ? `\n--- output (tail) ---\n${detail}` : ""}`);
  }
  if (result.status === 126 || result.status === 127) throw new VerificationError(`verification command could not start: ${command}${detail ? `\n--- output (tail) ---\n${detail}` : ""}`);
  return { ...result, detail };
}

export function verifyChanged(root: string): VerificationResult {
  const config = loadProjectConfig(root); const changed = changedPaths(root);
  if (changed.length === 0) return { status: "no-op", reason: "no-changes", changedPaths: [], modules: [], commands: [], risks: [] };
  const modules = config.modules.filter((module) => changed.some((path) => module.paths.some((pattern) => globMatches(pattern, path))));
  if (!modules.length) return { status: "no-op", reason: "no-matching-module", changedPaths: changed, modules: [], commands: [], risks: [] };
  const commands: string[] = []; const risks: string[] = [];
  const failed = (error: string): FailedVerificationResult => ({ status: "failed", error, changedPaths: changed, modules: modules.map((module) => module.name), commands: [...commands], risks: [...risks] });
  const manual = modules.find((module) => module.verify.length === 0);
  if (manual) { const message = `manual verification is required for module ${manual.name}`; throw new VerificationError(message, failed(message)); }
  for (const module of modules) for (const command of module.verify) {
    commands.push(command);
    let result;
    try { result = runConfiguredCommand(command, root); }
    catch (error) { const message = (error as Error).message; throw new VerificationError(message, failed(message)); }
    if (result.status !== 0) { const message = `verification command failed for module ${module.name}: ${command}${result.detail ? `\n--- output (tail) ---\n${result.detail}` : ""}`; throw new VerificationError(message, failed(message)); }
  }
  for (const risk of config.risks.filter((risk) => changed.some((path) => risk.when.some((pattern) => globMatches(pattern, path))))) {
    risks.push(risk.id);
    let result;
    try { result = runConfiguredCommand(risk.check, root); }
    catch (error) { const message = (error as Error).message; throw new VerificationError(message, failed(message)); }
    const detail = result.detail ? `\n--- output (tail) ---\n${result.detail}` : "";
    if (result.status === null) { const message = `risk check did not complete: ${risk.id}${detail}`; throw new VerificationError(message, failed(message)); }
    if (risk.fail_when === "found") {
      if (result.status === 0) { const message = `risk detected: ${risk.id}${detail}`; throw new VerificationError(message, failed(message)); }
      if (result.status !== 1) { const message = `risk check errored (exit ${result.status}): ${risk.id}${detail}`; throw new VerificationError(message, failed(message)); }
    } else if (result.status !== 0) { const message = `risk check failed: ${risk.id}${detail}`; throw new VerificationError(message, failed(message)); }
  }
  return { status: "passed", changedPaths: changed, modules: modules.map((module) => module.name), commands, risks };
}

export function checkEvidence(root: string, specPath: string): { status: "passed"; scopes: string[] } {
  const scopes = loadProjectConfig(root).scopes; const text = readFileSync(specPath, "utf8"); const lines = text.split(/\r?\n/); const placeholder = /^(todo|tbd|n\/?a|없음|미확인|-)$/i;
  for (let index = 0; index < lines.length; index += 1) {
    const isAc = /^\s*- \[[ x]\] AC\d+/.test(lines[index]); const match = lines[index].match(/^\s*- \[[ x]\] AC\d+.*\[scopes:\s*([^\]]+)\]/i);
    if (isAc && /\[scopes?:/i.test(lines[index]) && !match) throw new VerificationError("malformed scope tag");
    if (!match) continue;
    const tags = match[1].split(",").map((tag) => tag.trim());
    if (!tags.length || new Set(tags).size !== tags.length || tags.some((tag) => !scopes.includes(tag))) throw new VerificationError("invalid or undeclared scope tag");
    const evidence = new Map<string, string>();
    for (let cursor = index + 1; cursor < lines.length && !/^\s*- \[[ x]\] AC\d+/.test(lines[cursor]); cursor += 1) { const item = lines[cursor].match(/^\s*- Evidence \[([^\]]+)\]:\s*(.*)$/); if (item) evidence.set(item[1], item[2].trim()); }
    if (tags.some((tag) => !evidence.has(tag))) throw new VerificationError("scope evidence is missing");
    if (tags.some((tag) => !evidence.get(tag) || placeholder.test(evidence.get(tag)!))) throw new VerificationError("scope evidence contains a blank or placeholder value");
  }
  return { status: "passed", scopes };
}
