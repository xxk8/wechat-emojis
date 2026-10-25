import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WORK_DIR } from "./lib/emoji-source.ts";
import { cleanupScratch, compareBuffers, decodeMany } from "./lib/image-metrics.ts";
import { LADDER, candidatePath, listSources } from "./encode-candidates.ts";
import { isMainModule } from "./lib/is-main.ts";

const REPORT = join(WORK_DIR, "report.json");

export interface Gates {
  readonly maxAlphaDiff: number;
  readonly maxCompositeError: number;
  readonly minVisiblePsnr: number;
  readonly minSsimWhite: number;
  readonly minSsimBlack: number;
}

export const GATES: Gates = {
  maxAlphaDiff: 1,
  maxCompositeError: 8,
  minVisiblePsnr: 40,
  minSsimWhite: 0.995,
  minSsimBlack: 0.995
};

export const MIN_LOSSY_GAIN = 0.1;

export function passes(metrics: {
  alpha: { maxDiff: number };
  visible: { psnr: number | null };
  composite: readonly { maxChannelError: number }[];
  ssim: { onWhite: number; onBlack: number };
}): boolean {
  const worstComposite = Math.max(...metrics.composite.map((entry) => entry.maxChannelError));
  return (
    metrics.alpha.maxDiff <= GATES.maxAlphaDiff &&
    worstComposite <= GATES.maxCompositeError &&
    (metrics.visible.psnr === null || metrics.visible.psnr >= GATES.minVisiblePsnr) &&
    metrics.ssim.onWhite >= GATES.minSsimWhite &&
    metrics.ssim.onBlack >= GATES.minSsimBlack
  );
}

interface ScoredCandidate {
  id: string;
  bytes: number;
  deltaPct: number;
  metrics: ReturnType<typeof compareBuffers>;
  pass: boolean;
}

interface ReportImage {
  key: string;
  category: string;
  name: string;
  sourcePath: string;
  sourceBytes: number;
  candidates: ScoredCandidate[];
  chosen: string | null;
  chosenBytes: number | null;
  chosenPath: string | null;
}

interface Report {
  generatedAt: string;
  gates: Gates;
  ladder: string[];
  totals: { sourceBytes: number };
  images: ReportImage[];
}

function emptyReport(): Report {
  return {
    generatedAt: new Date().toISOString(),
    gates: GATES,
    ladder: LADDER.map((rung) => rung.id),
    totals: { sourceBytes: 0 },
    images: []
  };
}

function loadCheckpoint(): Report {
  if (!existsSync(REPORT)) return emptyReport();
  return JSON.parse(readFileSync(REPORT, "utf8")) as Report;
}

function pick(scored: readonly ScoredCandidate[]): ScoredCandidate | null {
  const passing = scored.filter((candidate) => candidate.pass);
  if (passing.length === 0) return null;

  const losslessFamily = passing.filter(
    (candidate) => candidate.id === "near-lossless-80" || candidate.id === "lossless"
  );
  const cheapestOverall = passing.reduce((best, current) =>
    current.bytes < best.bytes ? current : best
  );
  const cheapestLossless = losslessFamily.length
    ? losslessFamily.reduce((best, current) => (current.bytes < best.bytes ? current : best))
    : null;

  if (!cheapestLossless) return cheapestOverall;
  const gain = 1 - cheapestOverall.bytes / cheapestLossless.bytes;
  const isLossy = !losslessFamily.includes(cheapestOverall);
  return !isLossy || gain >= MIN_LOSSY_GAIN ? cheapestOverall : cheapestLossless;
}

export function main(): void {
  const report = loadCheckpoint();
  const done = new Set(report.images.map((image) => image.key));
  const sources = listSources();
  if (sources.length !== 109) throw new Error(`Expected 109 sources, found ${sources.length}`);

  let processed = 0;
  for (const source of sources) {
    const key = `${source.category}/${source.name}`;
    if (done.has(key)) continue;

    const sourceBytes = statSync(source.path).size;
    const candidates = LADDER.map((rung) => ({
      id: rung.id,
      path: candidatePath(source.category, source.name, rung.id)
    })).filter((candidate) => existsSync(candidate.path));

    if (candidates.length !== LADDER.length) {
      throw new Error(`${key}: expected ${LADDER.length} candidates, found ${candidates.length}`);
    }

    const buffers = decodeMany([source.path, ...candidates.map((candidate) => candidate.path)]);
    const reference = buffers[0];
    if (!reference) throw new Error(`${key}: failed to decode original`);

    const scored: ScoredCandidate[] = candidates.map((candidate, index) => {
      const buffer = buffers[index + 1];
      if (!buffer) throw new Error(`${key}: failed to decode ${candidate.id}`);
      const bytes = statSync(candidate.path).size;
      const metrics = compareBuffers(reference, buffer);
      return {
        id: candidate.id,
        bytes,
        deltaPct: Number((((bytes - sourceBytes) / sourceBytes) * 100).toFixed(2)),
        metrics,
        pass: passes(metrics)
      };
    });

    const chosen = pick(scored);
    report.images.push({
      key,
      category: source.category,
      name: source.name,
      sourcePath: `assets/${source.category}/${source.name}.png`,
      sourceBytes,
      candidates: scored,
      chosen: chosen ? chosen.id : null,
      chosenBytes: chosen ? chosen.bytes : null,
      chosenPath: chosen ? candidatePath(source.category, source.name, chosen.id) : null
    });
    report.totals.sourceBytes += sourceBytes;

    processed += 1;
    writeFileSync(REPORT, JSON.stringify(report, null, 2));
    if (processed % 5 === 0) console.log(`  measured ${report.images.length}/${sources.length}`);
  }

  cleanupScratch();
  console.log(`\nreport: ${REPORT}`);
  console.log(`images: ${report.images.length}/${sources.length}`);
}

if (isMainModule(import.meta.url)) main();
