import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { CATEGORIES, ROOT, WORK_DIR, type Category } from "./lib/emoji-source.ts";
import { isMainModule } from "./lib/is-main.ts";

const CANDIDATES = join(WORK_DIR, "candidates");

export interface LadderRung {
  readonly id: string;
  readonly flags: readonly string[];
}

export interface SourceImage {
  readonly category: Category;
  readonly name: string;
  readonly path: string;
}

export const LADDER: readonly LadderRung[] = [
  { id: "q80", flags: ["-q", "80", "-alpha_q", "100", "-sharp_yuv", "-m", "6"] },
  { id: "q85", flags: ["-q", "85", "-alpha_q", "100", "-sharp_yuv", "-m", "6"] },
  { id: "q88", flags: ["-q", "88", "-alpha_q", "100", "-sharp_yuv", "-m", "6"] },
  { id: "q90", flags: ["-q", "90", "-alpha_q", "100", "-sharp_yuv", "-m", "6"] },
  { id: "q92", flags: ["-q", "92", "-alpha_q", "100", "-sharp_yuv", "-m", "6"] },
  { id: "q95", flags: ["-q", "95", "-alpha_q", "100", "-sharp_yuv", "-m", "6"] },
  { id: "near-lossless-80", flags: ["-near_lossless", "80", "-z", "9", "-alpha_q", "100"] },
  { id: "lossless", flags: ["-lossless", "-z", "9", "-alpha_q", "100"] }
];

export function listSources(): SourceImage[] {
  const sources: SourceImage[] = [];
  for (const category of CATEGORIES) {
    const dir = join(ROOT, "assets", category);
    for (const file of readdirSync(dir)
      .filter((name) => name.endsWith(".png"))
      .sort()) {
      sources.push({ category, name: basename(file, ".png"), path: join(dir, file) });
    }
  }
  return sources;
}

export function candidatePath(category: Category, name: string, id: string): string {
  return join(CANDIDATES, `${category}__${name}__${id}.webp`);
}

export function main(): void {
  mkdirSync(CANDIDATES, { recursive: true });
  const sources = listSources();
  if (sources.length !== 109) throw new Error(`Expected 109 sources, found ${sources.length}`);

  let encoded = 0;
  let reused = 0;
  const failures: string[] = [];

  for (const source of sources) {
    for (const rung of LADDER) {
      const destination = candidatePath(source.category, source.name, rung.id);
      if (existsSync(destination) && statSync(destination).size > 0) {
        reused += 1;
        continue;
      }
      try {
        execFileSync("cwebp", ["-quiet", ...rung.flags, source.path, "-o", destination], {
          stdio: "pipe"
        });
        encoded += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${source.category}/${source.name} ${rung.id}: ${message.slice(0, 60)}`);
      }
    }
  }

  console.log(`encoded ${encoded}, reused ${reused}, failures ${failures.length}`);
  if (failures.length > 0) {
    console.log(failures.slice(0, 10).join("\n"));
    process.exitCode = 1;
  }
}

if (isMainModule(import.meta.url)) main();
