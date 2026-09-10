import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

let parseYaml;
try { ({ parse: parseYaml } = await import("yaml")); }
catch { ({ parse: parseYaml } = await import("../vendor/yaml/dist/index.js")); }

const input = (() => { try { return JSON.parse(readFileSync(0, "utf8")); } catch { return {}; } })();
const root = resolve(input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const configPath = join(root, ".telos", "project.yml");
let problem;
if (!existsSync(configPath)) problem = ".telos/project.yml is missing; run `telos init --project-root .`";
else {
  try {
    const config = parseYaml(readFileSync(configPath, "utf8"));
    if (!config || !Array.isArray(config.modules) || config.modules.length === 0) problem = ".telos/project.yml must define at least one module";
    else {
      const invalid = config.modules.find((module) => !Array.isArray(module?.paths) || module.paths.length === 0 || module.paths.some((item) => typeof item !== "string" || !item.trim()));
      if (invalid) problem = `.telos/project.yml module ${invalid.name ?? "<unnamed>"} paths must contain non-empty strings`;
    }
  } catch (error) { problem = `.telos/project.yml is invalid YAML: ${error.message}`; }
}
if (problem) {
  const session = input.session_id ?? input.sessionId;
  let shouldWarn = true;
  if (session) {
    const directory = join(root, ".telos", "hook-warnings"); mkdirSync(directory, { recursive: true });
    const marker = join(directory, createHash("sha256").update(`${session}:project-config`).digest("hex"));
    try { writeFileSync(marker, "", { flag: "wx" }); } catch (error) { if (error.code === "EEXIST") shouldWarn = false; }
  }
  if (shouldWarn) console.log(`spec-first: ${problem}`);
}
console.log(`Telos spec-first context:
- Feature contracts live at .telos/specs/<slug>/SPEC.md; .telos/active selects the local active slug.
- Use /telos:spec to freeze a contract, /telos:run for the bounded loop, /telos:eval for evidence-based judgment, and /telos:review for report-only history proposals.
- The current harness selects implementation capabilities. Eval owns mechanical verification and runs it once per iteration.`);
