/**
 * True when the calling module was started directly (node scripts/x.ts),
 * false when it was imported by another module.
 */

import { fileURLToPath } from "node:url";

export function isMainModule(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(moduleUrl) === entry;
}
