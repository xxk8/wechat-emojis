import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WORK_DIR } from "./lib/emoji-source.ts";
import { isMainModule } from "./lib/is-main.ts";

const REPORT = join(WORK_DIR, "report.json");
const OUT_JSON = join(WORK_DIR, "summary.json");
const OUT_MD = join(WORK_DIR, "DETAILS.md");

interface Metrics {
  alpha: { exactDiffPixels: number; maxDiff: number; psnr: number | null };
  visible: { pixels: number; psnr: number | null; maxChannelError: number };
  composite: { background: number; psnr: number | null; maxChannelError: number }[];
  ssim: { onWhite: number; onBlack: number };
}

interface Candidate {
  id: string;
  bytes: number;
  deltaPct: number;
  metrics: Metrics;
  pass: boolean;
}

interface ReportImage {
  key: string;
  category: string;
  name: string;
  sourcePath: string;
  sourceBytes: number;
  candidates: Candidate[];
  chosen: string | null;
  chosenBytes: number | null;
  chosenPath: string | null;
}

interface Gates {
  maxAlphaDiff: number;
  maxCompositeError: number;
  minVisiblePsnr: number;
  minSsimWhite: number;
  minSsimBlack: number;
}

interface Report {
  generatedAt: string;
  gates: Gates;
  ladder: string[];
  images: ReportImage[];
}

const kb = (bytes: number): number => Number((bytes / 1024).toFixed(1));

function fmt(value: number | null | undefined, digits = 3): string {
  return value === null || value === undefined ? "n/a" : Number(value).toFixed(digits);
}

function worstComposite(metrics: Metrics): number {
  return Math.max(...metrics.composite.map((entry) => entry.maxChannelError));
}

export function main(): void {
  if (!existsSync(REPORT)) throw new Error("No report.json. Run scripts/measure-candidates.ts first.");
  const report = JSON.parse(readFileSync(REPORT, "utf8")) as Report;
  const images = report.images;

  const perLadder = new Map(
    report.ladder.map((id) => [
      id,
      { id, bytes: 0, pass: 0, fail: 0, alphaFail: 0, edgeFail: 0, psnrFail: 0, ssimFail: 0, worst: [] as { key: string; maxErr: number; psnr: number | null; ssim: number; alpha: number }[] }
    ])
  );

  for (const image of images) {
    for (const candidate of image.candidates) {
      const bucket = perLadder.get(candidate.id);
      if (!bucket) continue;
      bucket.bytes += candidate.bytes;
      const m = candidate.metrics;
      const composite = worstComposite(m);
      const alphaBad = m.alpha.maxDiff > report.gates.maxAlphaDiff;
      const edgeBad = composite > report.gates.maxCompositeError;
      const psnrBad = m.visible.psnr !== null && m.visible.psnr < report.gates.minVisiblePsnr;
      const ssimBad = m.ssim.onWhite < report.gates.minSsimWhite || m.ssim.onBlack < report.gates.minSsimBlack;
      if (candidate.pass) bucket.pass += 1;
      else bucket.fail += 1;
      if (alphaBad) bucket.alphaFail += 1;
      if (edgeBad) bucket.edgeFail += 1;
      if (psnrBad) bucket.psnrFail += 1;
      if (ssimBad) bucket.ssimFail += 1;
      if (!candidate.pass) {
        bucket.worst.push({
          key: image.key,
          maxErr: Number(composite.toFixed(2)),
          psnr: m.visible.psnr,
          ssim: m.ssim.onWhite,
          alpha: m.alpha.maxDiff
        });
      }
    }
  }

  const sourceBytes = images.reduce((sum, image) => sum + image.sourceBytes, 0);
  const chosenBytes = images.reduce((sum, image) => sum + (image.chosenBytes ?? image.sourceBytes), 0);
  const chosenCounts: Record<string, number> = {};
  for (const image of images) {
    const id = image.chosen ?? "fallback-png";
    chosenCounts[id] = (chosenCounts[id] ?? 0) + 1;
  }

  const rows = [...perLadder.values()].map((bucket) => ({
    id: bucket.id,
    totalKb: kb(bucket.bytes),
    vsPngPct: Number((((bucket.bytes - sourceBytes) / sourceBytes) * 100).toFixed(1)),
    pass: bucket.pass,
    fail: bucket.fail,
    alphaFail: bucket.alphaFail,
    edgeFail: bucket.edgeFail,
    psnrFail: bucket.psnrFail,
    ssimFail: bucket.ssimFail,
    worst: bucket.worst.sort((a, b) => b.maxErr - a.maxErr).slice(0, 5)
  }));

  const perImage = images.map((image) => {
    const chosen = image.candidates.find((candidate) => candidate.id === image.chosen);
    return {
      key: image.key,
      sourceKb: Number((image.sourceBytes / 1024).toFixed(2)),
      chosen: image.chosen ?? "png (fallback)",
      chosenKb: image.chosenBytes
        ? Number((image.chosenBytes / 1024).toFixed(2))
        : Number((image.sourceBytes / 1024).toFixed(2)),
      savingPct: image.chosenBytes
        ? Number((((image.chosenBytes - image.sourceBytes) / image.sourceBytes) * 100).toFixed(1))
        : 0,
      ssim: chosen?.metrics.ssim.onWhite ?? 1,
      maxErr: chosen ? worstComposite(chosen.metrics) : 0,
      psnr: chosen?.metrics.visible.psnr ?? null
    };
  });

  writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        gates: report.gates,
        imageCount: images.length,
        sourceBytes,
        sourceKb: kb(sourceBytes),
        chosenBytes,
        chosenKb: kb(chosenBytes),
        savingPct: Number((((chosenBytes - sourceBytes) / sourceBytes) * 100).toFixed(1)),
        chosenCounts,
        perLadder: rows,
        perImage
      },
      null,
      2
    )
  );

  const lines: string[] = [];
  lines.push("# WebP 候选评估明细", "");
  lines.push(`- 图片数量：${images.length}`);
  lines.push(`- 原图总体积：${kb(sourceBytes)} KB`);
  lines.push(`- 若按本表选优：${kb(chosenBytes)} KB（${(((chosenBytes - sourceBytes) / sourceBytes) * 100).toFixed(1)}%）`);
  lines.push("");
  lines.push("> 本表是 WebP 候选的评估记录，**未采用**。最终方案为 PNG 无损重压缩，见 REPORT.md。");
  lines.push("");
  lines.push("## 质量闸门", "");
  lines.push("| 指标 | 阈值 |");
  lines.push("| --- | --- |");
  lines.push(`| Alpha 最大误差 | ${report.gates.maxAlphaDiff} |`);
  lines.push(`| 可见像素最大通道误差（合成后） | ${report.gates.maxCompositeError} |`);
  lines.push(`| 可见像素 PSNR | ≥ ${report.gates.minVisiblePsnr} dB |`);
  lines.push(`| SSIM（白底 / 黑底） | ≥ ${report.gates.minSsimWhite} |`);
  lines.push("");
  lines.push("## 各档位通过情况", "");
  lines.push("| 档位 | 总体积 KB | 相对 PNG | 通过 | 未通过 | Alpha 失败 | 边缘失败 | PSNR 失败 | SSIM 失败 |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of rows) {
    lines.push(
      `| ${row.id} | ${row.totalKb} | ${row.vsPngPct}% | ${row.pass} | ${row.fail} | ${row.alphaFail} | ${row.edgeFail} | ${row.psnrFail} | ${row.ssimFail} |`
    );
  }
  lines.push("");
  lines.push("## 逐图选择分布", "");
  lines.push("| 方案 | 图片数 |");
  lines.push("| --- | --- |");
  for (const [id, count] of Object.entries(chosenCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${id} | ${count} |`);
  }
  lines.push("");
  lines.push("## 未通过样例（每档最差 5 张）", "");
  for (const row of rows) {
    if (row.worst.length === 0) continue;
    lines.push(`### ${row.id}`, "");
    lines.push("| 图片 | maxErr | PSNR | SSIM | alpha |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const w of row.worst) {
      lines.push(`| ${w.key} | ${w.maxErr} | ${fmt(w.psnr, 2)} | ${fmt(w.ssim, 4)} | ${w.alpha} |`);
    }
    lines.push("");
  }
  lines.push("## 逐图明细", "");
  lines.push("| 图片 | 原图 KB | 选用 | 结果 KB | 节省 | SSIM | maxErr | PSNR |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of perImage) {
    lines.push(
      `| ${row.key} | ${row.sourceKb} | ${row.chosen} | ${row.chosenKb} | ${row.savingPct}% | ${fmt(row.ssim, 4)} | ${row.maxErr} | ${fmt(row.psnr, 2)} |`
    );
  }
  writeFileSync(OUT_MD, lines.join("\n"));

  console.log(`details: ${OUT_MD}`);
  console.log(`summary: ${OUT_JSON}`);
  console.log(
    `chosen total ${kb(chosenBytes)} KB vs source ${kb(sourceBytes)} KB (${(((chosenBytes - sourceBytes) / sourceBytes) * 100).toFixed(1)}%)`
  );
  console.log("choices:", chosenCounts);
}

if (isMainModule(import.meta.url)) main();
