import { cpSync, rmSync } from "node:fs";

rmSync("dist/resources", { recursive: true, force: true });
cpSync("resources", "dist/resources", { recursive: true });
