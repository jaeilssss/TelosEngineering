import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const input = (() => { try { return JSON.parse(readFileSync(0, "utf8")); } catch { return {}; } })();
const root = resolve(input.cwd ?? process.cwd());
const toolInput = input.tool_input ?? {};
const direct = toolInput.file_path ?? toolInput.path;
const paths = direct ? [direct] : String(toolInput.command ?? "").split("\n").flatMap((line) => ["*** Add File: ", "*** Update File: ", "*** Delete File: "].filter((prefix) => line.startsWith(prefix)).map((prefix) => line.slice(prefix.length).trim()));
const warn = (message) => console.log(JSON.stringify({ systemMessage: message, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message } }));

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
  const path = join(root, ".telos", "project.yml");
  if (!existsSync(path)) return [];
  const patterns = [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const field = lines[index].match(/^\s+paths:\s*(.*)$/);
    if (!field) continue;
    if (field[1].startsWith("[")) { try { patterns.push(...JSON.parse(field[1])); } catch { return []; } continue; }
    for (index += 1; index < lines.length; index += 1) { const item = lines[index].match(/^\s+-\s+(.+)$/); if (!item) { index -= 1; break; } patterns.push(item[1].trim().replace(/^['"]|['"]$/g, "")); }
  }
  return patterns.filter((pattern) => typeof pattern === "string");
}
const changed = paths.map((path) => relative(root, resolve(root, path)).replaceAll("\\", "/")).filter((path) => path && !path.startsWith("../"));
if (!changed.some((path) => projectPaths().some((pattern) => globMatches(pattern, path)))) process.exit(0);

const activePath = join(root, ".telos", "active");
const slug = existsSync(activePath) ? readFileSync(activePath, "utf8").trim() : "";
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) warn("spec-first: .telos/active must contain the active Feature SPEC slug. Start a run with `telos run start --spec <slug>`.");
else {
  const specPath = join(root, ".telos", "specs", slug, "SPEC.md");
  if (!existsSync(specPath)) warn(`spec-first: active Feature SPEC is missing: .telos/specs/${slug}/SPEC.md`);
  else {
    const text = readFileSync(specPath, "utf8");
    const status = text.split("\n").find((line) => /^(status|상태):/i.test(line.trim()))?.toLowerCase() ?? "";
    if (!status.includes("frozen") || status.includes("draft")) warn(`spec-first: active Feature SPEC (${slug}) is not frozen.`);
    else if (!text.split("\n").some((line) => /^(test strategy|테스트 전략):/i.test(line.trim()) && line.split(":")[1]?.trim())) warn(`spec-first: active Feature SPEC (${slug}) must record a non-empty Test strategy.`);
  }
}
