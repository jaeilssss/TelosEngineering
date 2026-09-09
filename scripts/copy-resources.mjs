import { cpSync, rmSync } from "node:fs";

rmSync("dist/resources", { recursive: true, force: true });
cpSync("resources", "dist/resources", { recursive: true });
for (const target of ["dist/resources/codex/telos", "dist/resources/claude-marketplace/plugins/telos"]) cpSync("resources/shared/skills", `${target}/skills`, { recursive: true });
rmSync("dist/resources/shared", { recursive: true, force: true });
