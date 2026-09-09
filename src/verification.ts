import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ModuleConfig { name: string; paths: string[]; verify: string[]; }
export interface RiskConfig { id: string; when: string[]; check: string; fail_when: "found" | "nonzero"; }
export interface ProjectConfig { modules: ModuleConfig[]; risks: RiskConfig[]; scopes: string[]; }
export interface VerificationResult { status: "passed"; changedPaths: string[]; modules: string[]; commands: string[]; risks: string[]; }
export class VerificationError extends Error {}

function scalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try { return JSON.parse(trimmed) as string; } catch { throw new VerificationError(`invalid quoted value: ${value}`); }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
  return trimmed;
}

function inlineList(value: string): string[] | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) throw new Error();
    return parsed;
  } catch { throw new VerificationError(`invalid list: ${value}`); }
}

export function parseProjectConfig(text: string): ProjectConfig {
  const riskBlock = text.match(/(?:^|\n)risks:\s*\n([\s\S]*?)(?=\nscopes:|$)/)?.[1] ?? "";
  const scopeValue = text.match(/^scopes:\s*(\[[^\n]*\])\s*$/m)?.[1];
  const moduleText = text.replace(/(?:^|\n)risks:\s*\n[\s\S]*?(?=\nscopes:|$)/, "").replace(/^scopes:.*$/m, "");
  const modules: Array<Partial<ModuleConfig>> = [];
  let current: Partial<ModuleConfig> | undefined;
  let listField: "paths" | "verify" | undefined;
  let sawModules = false;

  for (const rawLine of moduleText.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
    if (/^modules:\s*$/.test(rawLine)) { sawModules = true; continue; }
    const moduleMatch = rawLine.match(/^\s+-\s+name:\s*(.+)$/);
    if (moduleMatch) {
      current = { name: scalar(moduleMatch[1]) }; modules.push(current); listField = undefined; continue;
    }
    const fieldMatch = rawLine.match(/^\s+(paths|verify):\s*(.*)$/);
    if (fieldMatch) {
      if (!current) throw new VerificationError("module field appears before module name");
      const field = fieldMatch[1] as "paths" | "verify";
      const list = inlineList(fieldMatch[2]);
      if (list) { current[field] = list; listField = undefined; } else if (!fieldMatch[2].trim()) { current[field] = []; listField = field; } else { throw new VerificationError(`${field} must be a list`); }
      continue;
    }
    const listMatch = rawLine.match(/^\s+-\s+(.+)$/);
    if (listMatch && current && listField) { current[listField]!.push(scalar(listMatch[1])); continue; }
    throw new VerificationError(`unsupported project.yml syntax: ${rawLine.trim()}`);
  }

  if (!sawModules || modules.length === 0) throw new VerificationError("project.yml must define at least one module");
  const names = new Set<string>();
  const valid = modules.map((module) => {
    if (!module.name?.trim() || names.has(module.name)) throw new VerificationError("module names must be unique and non-empty");
    names.add(module.name);
    if (!module.paths?.length || module.paths.some((path) => !path.trim())) throw new VerificationError(`module ${module.name} must define non-empty paths`);
    if (!module.verify || module.verify.some((command) => !command.trim())) throw new VerificationError(`module ${module.name} must define a verify list of non-empty strings`);
    return { name: module.name, paths: module.paths, verify: module.verify };
  });
  const risks: RiskConfig[] = [];
  const riskNames = new Set<string>();
  for (const block of riskBlock.split(/^\s*-\s+id:\s*/m).slice(1)) {
    const [idLine, ...body] = block.split(/\r?\n/); const fields = body.join("\n");
    const when = fields.match(/^\s+when:\s*(\[[^\n]*\])\s*$/m)?.[1];
    const check = fields.match(/^\s+check:\s*(.+)$/m)?.[1];
    const failWhen = fields.match(/^\s+fail_when:\s*(.+)$/m)?.[1]?.trim();
    const parsedWhen = when ? inlineList(when) : undefined; const id = scalar(idLine);
    if (!id || riskNames.has(id) || !parsedWhen?.length || !check?.trim() || !["found", "nonzero"].includes(failWhen ?? "")) throw new VerificationError(`invalid risk definition: ${id || "unknown"}`);
    riskNames.add(id); risks.push({ id, when: parsedWhen, check: scalar(check), fail_when: failWhen as RiskConfig["fail_when"] });
  }
  const scopes = scopeValue ? inlineList(scopeValue) : [];
  if (!scopes || new Set(scopes).size !== scopes.length || scopes.some((scope) => !scope.trim())) throw new VerificationError("scopes must be unique non-empty strings");
  return { modules: valid, risks, scopes };
}

export function loadProjectConfig(root: string): ProjectConfig {
  const path = join(root, ".telos", "project.yml");
  if (!existsSync(path)) throw new VerificationError(".telos/project.yml is missing");
  return parseProjectConfig(readFileSync(path, "utf8"));
}

function globMatches(pattern: string, path: string): boolean {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      index += 1;
      if (pattern[index + 1] === "/") { expression += "(?:.*/)?"; index += 1; } else expression += ".*";
    } else if (character === "*") expression += "[^/]*";
    else if (character === "?") expression += "[^/]";
    else expression += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
  }
  return new RegExp(`${expression}$`).test(path);
}

function changedPaths(root: string): string[] {
  try {
    return execFileSync("git", ["diff", "--name-only", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split(/\r?\n/).filter(Boolean);
  } catch { throw new VerificationError("telos verify requires a Git worktree with HEAD"); }
}

export function verifyChanged(root: string): VerificationResult {
  const config = loadProjectConfig(root);
  const changed = changedPaths(root);
  const modules = config.modules.filter((module) => changed.some((path) => module.paths.some((pattern) => globMatches(pattern, path))));
  if (!modules.length) throw new VerificationError("no module matches changed paths");
  const manual = modules.find((module) => module.verify.length === 0);
  if (manual) throw new VerificationError(`manual verification is required for module ${manual.name}`);

  const commands: string[] = [];
  for (const module of modules) for (const command of module.verify) {
    commands.push(command);
    const result = spawnSync(command, { cwd: root, shell: true, encoding: "utf8" });
    if (result.status !== 0) throw new VerificationError(`verification command failed for module ${module.name}: ${command}`);
  }
  const risks: string[] = [];
  for (const risk of config.risks.filter((risk) => changed.some((path) => risk.when.some((pattern) => globMatches(pattern, path))))) {
    risks.push(risk.id); const result = spawnSync(risk.check, { cwd: root, shell: true, encoding: "utf8" });
    const status = result.status;
    if ((risk.fail_when === "found" && status !== 1) || (risk.fail_when === "nonzero" && status !== 0)) throw new VerificationError(`risk check failed for ${risk.id}`);
  }
  return { status: "passed", changedPaths: changed, modules: modules.map((module) => module.name), commands, risks };
}

export function checkEvidence(root: string, specPath: string): { status: "passed"; scopes: string[] } {
  const scopes = loadProjectConfig(root).scopes; const text = readFileSync(specPath, "utf8"); const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const isAc = /^\s*- \[[ x]\] AC\d+/.test(lines[index]);
    const match = lines[index].match(/^\s*- \[[ x]\] AC\d+.*\[scopes:\s*([^\]]+)\]/i);
    if (isAc && /\[scopes?:/i.test(lines[index]) && !match) throw new VerificationError("malformed scope tag");
    if (!match) continue;
    const tags = match[1].split(",").map((tag) => tag.trim());
    if (!tags.length || new Set(tags).size !== tags.length || tags.some((tag) => !scopes.includes(tag))) throw new VerificationError("invalid or undeclared scope tag");
    const evidence = new Set<string>();
    for (let cursor = index + 1; cursor < lines.length && !/^\s*- \[[ x]\] AC\d+/.test(lines[cursor]); cursor += 1) {
      const item = lines[cursor].match(/^\s*- Evidence \[([^\]]+)\]:\s*(.+)$/); if (item) evidence.add(item[1]);
    }
    if (tags.some((tag) => !evidence.has(tag))) throw new VerificationError("scope evidence is missing");
  }
  return { status: "passed", scopes };
}
