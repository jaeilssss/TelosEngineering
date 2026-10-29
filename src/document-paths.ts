import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { workspaceFor } from "./storage.js";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const featureSpecFilename = (slug: string): string => `${slug}.spec.md`;
export const legacyFeatureSpecFilename = "SPEC.md";
export const discoveryPrdFilename = (slug: string): string => `${slug}.prd.md`;
export const legacyDiscoveryPrdFilename = "PRD.md";

export function featureSpecPaths(root: string, slug: string): { preferred: string; legacy: string } {
  const directory = join(workspaceFor(root).path, "specs", slug);
  return { preferred: join(directory, featureSpecFilename(slug)), legacy: join(directory, legacyFeatureSpecFilename) };
}

export function featureSpecPath(root: string, slug: string): string {
  const paths = featureSpecPaths(root, slug);
  return existsSync(paths.preferred) || !existsSync(paths.legacy) ? paths.preferred : paths.legacy;
}

export function featureSpecSlug(workspace: string, path: string): string | undefined {
  const segments = relative(workspace, path).split(/[\\/]/);
  if (segments.length !== 3 || segments[0] !== "specs" || !slugPattern.test(segments[1])) return undefined;
  return segments[2] === featureSpecFilename(segments[1]) || segments[2] === legacyFeatureSpecFilename ? segments[1] : undefined;
}
