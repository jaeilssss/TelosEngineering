import { existsSync, readFileSync } from "node:fs";
const codeExtensions = new Set([".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".rb", ".c", ".cpp"]);
const input = (() => { try { return JSON.parse(readFileSync(0, "utf8")); } catch { return {}; } })();
const file = input.tool_input?.file_path ?? input.tool_input?.path ?? "";
if (!codeExtensions.has(`.${file.split(".").pop()?.toLowerCase()}`)) process.exit(0);
const root = input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd(); const specPath = `${root}/SPEC.md`; const warn = (message) => console.log(JSON.stringify({ systemMessage: message }));
if (!existsSync(specPath)) warn("spec-first: SPEC.md가 없습니다. 기능 구현이라면 /telos:spec을 먼저 실행하세요.");
else { const text = readFileSync(specPath, "utf8"); const status = text.split("\n").find((line) => /^(status|상태):/i.test(line.trim()))?.toLowerCase() ?? ""; if (!status.includes("frozen") || status.includes("draft")) warn("spec-first: SPEC.md가 draft입니다. /telos:spec으로 frozen 상태를 확정하세요."); else if (!text.split("\n").some((line) => /^(test strategy|테스트 전략):/i.test(line.trim()) && line.split(":")[1]?.trim())) warn("spec-first: SPEC.md에 비어 있지 않은 Test strategy를 먼저 기록하세요."); }
