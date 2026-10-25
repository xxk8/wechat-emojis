/**
 * Pixel-level image metrics for the emoji optimization pipeline.
 *
 * Decoding goes through ImageMagick's raw `rgba:` stream so every candidate is
 * measured as straight-alpha RGBA at the original 100x100 size. SSIM is
 * implemented here because ImageMagick's CLI reports a scaled error value that
 * reads 0 for identical images, which is easy to misread as a score.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const SIZE = 100;
const PIXELS = SIZE * SIZE;

export interface Planes {
  readonly r: Float64Array;
  readonly g: Float64Array;
  readonly b: Float64Array;
  readonly a: Uint8Array;
}

export interface AlphaMetrics {
  readonly exactDiffPixels: number;
  readonly maxDiff: number;
  readonly psnr: number | null;
}

export interface VisibleMetrics {
  readonly pixels: number;
  readonly psnr: number | null;
  readonly maxChannelError: number;
}

export interface CompositeMetrics {
  readonly background: number;
  readonly psnr: number | null;
  readonly maxChannelError: number;
}

export interface SsimMetrics {
  readonly onWhite: number;
  readonly onBlack: number;
}

export interface PixelMetrics {
  readonly alpha: AlphaMetrics;
  readonly visible: VisibleMetrics;
  readonly composite: readonly CompositeMetrics[];
  readonly ssim: SsimMetrics;
  readonly hiddenRgbDiffPixels: number;
}

let scratchDir: string | null = null;

function scratch(): string {
  if (scratchDir === null) scratchDir = mkdtempSync(join(tmpdir(), "we-metrics-"));
  return scratchDir;
}

export function cleanupScratch(): void {
  if (scratchDir !== null) {
    rmSync(scratchDir, { recursive: true, force: true });
    scratchDir = null;
  }
}

export function decodeInterleaved(path: string): Buffer {
  const out = join(scratch(), "interleaved.bin");
  execFileSync("magick", [path, "-depth", "8", "-alpha", "on", `rgba:${out}`], { stdio: "pipe" });
  return readFileSync(out);
}

export function decodeMany(paths: readonly string[]): Buffer[] {
  if (paths.length === 0) return [];
  const stride = PIXELS * 4;
  const out = join(scratch(), "batch.rgba");
  const args: string[] = [];
  for (const path of paths) {
    args.push("(", path, "-depth", "8", "-alpha", "on", "-depth", "8", ")");
  }
  args.push("-append", "-depth", "8", `rgba:${out}`);
  execFileSync("magick", args, { stdio: "pipe" });
  const buffer = readFileSync(out);
  if (buffer.length !== stride * paths.length) {
    throw new Error(`Batch decode produced ${buffer.length} bytes for ${paths.length} images`);
  }
  return paths.map((_, index) => buffer.subarray(index * stride, (index + 1) * stride));
}

function channelPlanes(buffer: Buffer): Planes {
  if (buffer.length !== PIXELS * 4) {
    throw new Error(`Unexpected decoded length ${buffer.length}, expected ${PIXELS * 4}`);
  }
  const r = new Float64Array(PIXELS);
  const g = new Float64Array(PIXELS);
  const b = new Float64Array(PIXELS);
  const a = new Uint8Array(PIXELS);
  for (let i = 0; i < PIXELS; i += 1) {
    r[i] = buffer[i * 4] as number;
    g[i] = buffer[i * 4 + 1] as number;
    b[i] = buffer[i * 4 + 2] as number;
    a[i] = buffer[i * 4 + 3] as number;
  }
  return { r, g, b, a };
}

function srgbToLinear(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

type Channel = "r" | "g" | "b";

function compositeChannel(planes: Planes, index: number, channel: Channel, bg: number): number {
  const alpha = planes.a[index] / 255;
  return planes[channel][index] * alpha + bg * (1 - alpha);
}

function psnrFromMse(mse: number): number {
  if (mse === 0) return Number.POSITIVE_INFINITY;
  return 10 * Math.log10((255 * 255) / mse);
}

function round(value: number, digits = 3): number | null {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function compositeLuma(planes: Planes, background: number): Float64Array {
  const out = new Float64Array(PIXELS);
  for (let i = 0; i < PIXELS; i += 1) {
    const r = srgbToLinear(compositeChannel(planes, i, "r", background));
    const g = srgbToLinear(compositeChannel(planes, i, "g", background));
    const b = srgbToLinear(compositeChannel(planes, i, "b", background));
    out[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return out;
}

const GAUSSIAN_RADIUS = 5;
const GAUSSIAN: readonly number[] = (() => {
  const sigma = 1.5;
  const values: number[] = [];
  let sum = 0;
  for (let x = -GAUSSIAN_RADIUS; x <= GAUSSIAN_RADIUS; x += 1) {
    const v = Math.exp(-(x * x) / (2 * sigma * sigma));
    values.push(v);
    sum += v;
  }
  return values.map((v) => v / sum);
})();

function square(plane: Float64Array): Float64Array {
  const out = new Float64Array(plane.length);
  for (let i = 0; i < plane.length; i += 1) out[i] = (plane[i] as number) ** 2;
  return out;
}

function multiply(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = (a[i] as number) * (b[i] as number);
  return out;
}

function blur1d(plane: Float64Array, kernel: readonly number[]): Float64Array {
  const radius = (kernel.length - 1) / 2;
  const horizontal = new Float64Array(plane.length);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let sum = 0;
      let weight = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const xx = x + k;
        if (xx < 0 || xx >= SIZE) continue;
        const w = kernel[k + radius] as number;
        sum += (plane[y * SIZE + xx] as number) * w;
        weight += w;
      }
      horizontal[y * SIZE + x] = sum / weight;
    }
  }
  const out = new Float64Array(plane.length);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let sum = 0;
      let weight = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const yy = y + k;
        if (yy < 0 || yy >= SIZE) continue;
        const w = kernel[k + radius] as number;
        sum += (horizontal[yy * SIZE + x] as number) * w;
        weight += w;
      }
      out[y * SIZE + x] = sum / weight;
    }
  }
  return out;
}

export function ssimLuma(a: Float64Array, b: Float64Array): number {
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  const muA = blur1d(a, GAUSSIAN);
  const muB = blur1d(b, GAUSSIAN);
  const sigmaAA = blur1d(square(a), GAUSSIAN);
  const sigmaBB = blur1d(square(b), GAUSSIAN);
  const sigmaAB = blur1d(multiply(a, b), GAUSSIAN);

  let total = 0;
  for (let i = 0; i < PIXELS; i += 1) {
    const meanA = (muA[i] as number) * 255;
    const meanB = (muB[i] as number) * 255;
    const varA = (sigmaAA[i] as number) * 255 * 255 - meanA * meanA;
    const varB = (sigmaBB[i] as number) * 255 * 255 - meanB * meanB;
    const cov = (sigmaAB[i] as number) * 255 * 255 - meanA * meanB;
    total +=
      ((2 * meanA * meanB + C1) * (2 * cov + C2)) /
      ((meanA * meanA + meanB * meanB + C1) * (varA + varB + C2));
  }
  return total / PIXELS;
}

export function comparePixels(referencePath: string, candidatePath: string): PixelMetrics {
  const [refBuffer, candBuffer] = decodeMany([referencePath, candidatePath]);
  if (!refBuffer || !candBuffer) throw new Error("Failed to decode comparison pair");
  return compareBuffers(refBuffer, candBuffer);
}

/**
 * Colour is only scored where at least one side is visible, after compositing
 * over a background. RGB stored under fully transparent pixels is never
 * rendered, so scoring it would invent errors nobody can see.
 */
export function compareBuffers(refBuffer: Buffer, candBuffer: Buffer): PixelMetrics {
  const ref = channelPlanes(refBuffer);
  const cand = channelPlanes(candBuffer);

  let alphaExactDiff = 0;
  let alphaMaxDiff = 0;
  let alphaSquared = 0;
  let visiblePixels = 0;
  let visibleSquared = 0;
  let visibleMax = 0;
  let hiddenRgbDiff = 0;

  const backgrounds = [255, 0, 128] as const;
  const compositeSquared = backgrounds.map(() => 0);
  const compositeMax = backgrounds.map(() => 0);

  for (let i = 0; i < PIXELS; i += 1) {
    const da = Math.abs((ref.a[i] as number) - (cand.a[i] as number));
    if (da !== 0) alphaExactDiff += 1;
    if (da > alphaMaxDiff) alphaMaxDiff = da;
    alphaSquared += da * da;

    const visible = (ref.a[i] as number) > 0 || (cand.a[i] as number) > 0;
    if (visible) {
      visiblePixels += 1;
      const dr = compositeChannel(ref, i, "r", 255) - compositeChannel(cand, i, "r", 255);
      const dg = compositeChannel(ref, i, "g", 255) - compositeChannel(cand, i, "g", 255);
      const db = compositeChannel(ref, i, "b", 255) - compositeChannel(cand, i, "b", 255);
      visibleSquared += dr * dr + dg * dg + db * db;
      const m = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db));
      if (m > visibleMax) visibleMax = m;
    } else {
      hiddenRgbDiff += 1;
    }

    for (let b = 0; b < backgrounds.length; b += 1) {
      const bg = backgrounds[b] as number;
      const er = compositeChannel(ref, i, "r", bg) - compositeChannel(cand, i, "r", bg);
      const eg = compositeChannel(ref, i, "g", bg) - compositeChannel(cand, i, "g", bg);
      const eb = compositeChannel(ref, i, "b", bg) - compositeChannel(cand, i, "b", bg);
      compositeSquared[b] = (compositeSquared[b] as number) + er * er + eg * eg + eb * eb;
      const m = Math.max(Math.abs(er), Math.abs(eg), Math.abs(eb));
      if (m > (compositeMax[b] as number)) compositeMax[b] = m;
    }
  }

  return {
    alpha: {
      exactDiffPixels: alphaExactDiff,
      maxDiff: alphaMaxDiff,
      psnr: round(psnrFromMse(alphaSquared / PIXELS))
    },
    visible: {
      pixels: visiblePixels,
      psnr: round(psnrFromMse(visibleSquared / (visiblePixels * 3))),
      maxChannelError: visibleMax
    },
    composite: backgrounds.map((bg, index) => ({
      background: bg,
      psnr: round(psnrFromMse((compositeSquared[index] as number) / (PIXELS * 3))),
      maxChannelError: Number((compositeMax[index] as number).toFixed(2))
    })),
    ssim: {
      onWhite: Number(ssimLuma(compositeLuma(ref, 255), compositeLuma(cand, 255)).toFixed(5)),
      onBlack: Number(ssimLuma(compositeLuma(ref, 0), compositeLuma(cand, 0)).toFixed(5))
    },
    hiddenRgbDiffPixels: hiddenRgbDiff
  };
}
