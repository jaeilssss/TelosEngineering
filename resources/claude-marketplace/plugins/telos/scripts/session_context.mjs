import { readFileSync } from "node:fs";
import { join } from "node:path";
console.log(readFileSync(join(process.env.CLAUDE_PLUGIN_ROOT ?? new URL("..", import.meta.url).pathname, "rules", "spec-first.md"), "utf8"));
