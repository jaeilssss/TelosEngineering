import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface Capability {
  id: string;
  description: string;
  source: string;
  path: string;
}

function metadata(text: string): Record<string, string> {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end < 0) return {};
  return Object.fromEntries(text.slice(4, end).split("\n").flatMap((line) => {
    const index = line.indexOf(":");
    return index < 0 ? [] : [[line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")]];
  }));
}

function skillFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const walk = (directory: string): string[] => readdirSync(directory).flatMap((entry: string) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : entry === "SKILL.md" ? [path] : [];
  });
  return walk(root);
}

export function discoverCapabilities(projectRoot: string, home = homedir()): Capability[] {
  const roots: Array<[string, string]> = [
    ["project", join(projectRoot, ".codex", "skills")],
    ["project", join(projectRoot, ".agents", "skills")],
    ["codex", join(home, ".codex", "skills")],
    ["codex-plugin", join(home, "plugins")],
    ["claude", join(home, ".claude", "skills")],
    ["claude-plugin", join(home, ".telos", "claude-marketplace", "plugins")]
  ];
  return roots.flatMap(([source, root]) => skillFiles(root).flatMap((path) => {
    try {
      const text = readFileSync(path, "utf8");
      const values = metadata(text);
      const heading = text.match(/^#\s+(.+)$/m)?.[1];
      return [{ id: values.name ?? path.split("/").at(-2) ?? "unknown", description: values.description ?? heading ?? "No description provided.", source, path: resolve(path) }];
    } catch { return []; }
  })).sort((left, right) => left.id.localeCompare(right.id) || left.path.localeCompare(right.path));
}

export function routeCapabilities(capabilities: Capability[], need: string) {
  const terms = [...new Set(need.toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? [])];
  return capabilities.map((capability) => {
    const haystack = `${capability.id} ${capability.description}`.toLowerCase();
    const matches = terms.filter((term) => haystack.includes(term)).sort();
    return { capability, score: matches.length, matches };
  }).filter((result) => result.score > 0).sort((left, right) => right.score - left.score || left.capability.id.localeCompare(right.capability.id));
}
