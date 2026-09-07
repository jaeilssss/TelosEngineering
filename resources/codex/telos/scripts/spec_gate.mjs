import { existsSync, readFileSync } from "node:fs";
const codeExtensions = new Set([".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".rb", ".c", ".cpp"]);
const input = (() => { try { return JSON.parse(readFileSync(0, "utf8")); } catch { return {}; } })();
const toolInput = input.tool_input ?? {}; const direct = toolInput.file_path ?? toolInput.path;
const paths = direct ? [direct] : String(toolInput.command ?? "").split("\n").flatMap((line) => ["*** Add File: ", "*** Update File: ", "*** Delete File: "].filter((prefix) => line.startsWith(prefix)).map((prefix) => line.slice(prefix.length).trim()));
if (!paths.some((path) => codeExtensions.has(`.${path.split(".").pop()?.toLowerCase()}`))) process.exit(0);
const specPath = `${input.cwd ?? process.cwd()}/SPEC.md`;
const warn = (message) => console.log(JSON.stringify({ systemMessage: message, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message } }));
if (!existsSync(specPath)) warn("spec-first: SPEC.md is missing. For feature work, define $spec first.");
else { const text = readFileSync(specPath, "utf8"); const status = text.split("\n").find((line) => /^(status|상태):/i.test(line.trim()))?.toLowerCase() ?? ""; if (!status.includes("frozen") || status.includes("draft")) warn("spec-first: SPEC.md is not frozen. Resolve open questions before implementation."); else if (!text.split("\n").some((line) => /^(test strategy|테스트 전략):/i.test(line.trim()) && line.split(":")[1]?.trim())) warn("spec-first: SPEC.md must record a non-empty Test strategy before implementation."); }
