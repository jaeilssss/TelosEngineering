import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const tag = process.argv[2];
if (tag && tag !== `v${packageJson.version}`) {
  console.error(`release tag ${tag} must equal v${packageJson.version}`);
  process.exit(1);
}
for (const path of ["resources/codex/telos/.codex-plugin/plugin.json", "resources/claude-marketplace/plugins/telos/.claude-plugin/plugin.json"]) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (manifest.version !== packageJson.version) {
    console.error(`${path} version must equal package.json`);
    process.exit(1);
  }
}
console.log(`versions valid: ${packageJson.version}`);
