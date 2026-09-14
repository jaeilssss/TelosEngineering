import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, relative, resolve } from "node:path";

let parseYaml;
try { ({ parse: parseYaml } = await import("yaml")); }
catch { ({ parse: parseYaml } = await import("../vendor/yaml/dist/index.js")); }

const input = (() => { try { return JSON.parse(readFileSync(0, "utf8")); } catch { return {}; } })();
const root = resolve(input.cwd ?? process.cwd());
function workspaceFor(projectRoot) {
  const repository = join(projectRoot, ".telos");
  if (existsSync(repository)) return repository;
  let source = projectRoot; let label = basename(projectRoot) || "project";
  try { const remote = execFileSync("git", ["config", "--get", "remote.origin.url"], { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); if (remote) { source = remote; label = basename(remote).replace(/\.git$/, ""); } } catch {}
  const id = `${label.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "project"}-${createHash("sha256").update(source).digest("hex").slice(0, 12)}`;
  return join(process.env.TELOS_HOME || join(homedir(), ".telos"), "projects", id);
}
const workspace = workspaceFor(root);
const toolInput = input.tool_input ?? {};
const direct = toolInput.file_path ?? toolInput.path;
const paths = direct ? [direct] : String(toolInput.command ?? "").split("\n").flatMap((line) => ["*** Add File: ", "*** Update File: ", "*** Delete File: "].filter((prefix) => line.startsWith(prefix)).map((prefix) => line.slice(prefix.length).trim()));
const emit = (message) => console.log(JSON.stringify({ systemMessage: message, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message } }));

function warnOnce(category, message) {
  const session = input.session_id ?? input.sessionId;
  if (!session) { emit(message); return; }
  const directory = join(workspace, "hook-warnings"); mkdirSync(directory, { recursive: true });
  const marker = join(directory, createHash("sha256").update(`${session}:${category}`).digest("hex"));
  try { writeFileSync(marker, "", { flag: "wx" }); emit(message); } catch (error) { if (error.code !== "EEXIST") emit(message); }
}

function globMatches(pattern, path) {
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

function projectPaths() {
  const path = join(workspace, "project.yml");
  if (!existsSync(path)) return { error: "Telos project.yml is missing; run `telos init --project-root .`" };
  let config;
  try { config = parseYaml(readFileSync(path, "utf8")); }
  catch (error) { return { error: `.telos/project.yml is invalid YAML: ${error.message}` }; }
  if (!config || !Array.isArray(config.modules) || config.modules.length === 0) return { error: ".telos/project.yml must define at least one module" };
  const patterns = [];
  for (const module of config.modules) {
    if (!Array.isArray(module?.paths) || module.paths.length === 0 || module.paths.some((item) => typeof item !== "string" || !item.trim())) return { error: `.telos/project.yml module ${module?.name ?? "<unnamed>"} paths must contain non-empty strings` };
    patterns.push(...module.paths);
  }
  return { patterns };
}

if (paths.length === 0) process.exit(0);
const configured = projectPaths();
if (configured.error) { warnOnce("project-config", `spec-first: ${configured.error}`); process.exit(0); }
const changed = paths.map((path) => relative(root, resolve(root, path)).replaceAll("\\", "/")).filter((path) => path && !path.startsWith("../"));
if (!changed.some((path) => configured.patterns.some((pattern) => globMatches(pattern, path)))) process.exit(0);

const activePath = join(workspace, "active");
const slug = existsSync(activePath) ? readFileSync(activePath, "utf8").trim() : "";
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) emit("spec-first: Telos active state must contain the active Feature SPEC slug. Start a run with `telos run start --spec <slug>`. ");
else {
  const specPath = join(workspace, "specs", slug, "SPEC.md");
  if (!existsSync(specPath)) emit(`spec-first: active Feature SPEC is missing: ${specPath}`);
  else {
    const text = readFileSync(specPath, "utf8");
    const status = text.split("\n").find((line) => /^(status|상태):/i.test(line.trim()))?.toLowerCase() ?? "";
    if (!status.includes("frozen") || status.includes("draft")) emit(`spec-first: active Feature SPEC (${slug}) is not frozen.`);
    else if (!text.split("\n").some((line) => /^(test strategy|테스트 전략):/i.test(line.trim()) && line.split(":")[1]?.trim())) emit(`spec-first: active Feature SPEC (${slug}) must record a non-empty Test strategy.`);
  }
}
