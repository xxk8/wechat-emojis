import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, WORK_DIR } from "./lib/emoji-source.ts";
import { isMainModule } from "./lib/is-main.ts";

const REVIEW = join(WORK_DIR, "review");
const REPORT = join(WORK_DIR, "report.json");
const ZOOM = 4;
const CELL = 100 * ZOOM;
const FONT = "/System/Library/Fonts/Supplemental/Arial.ttf";

interface ReportImage {
  key: string;
  category: string;
  name: string;
  sourcePath: string;
  chosen: string | null;
  chosenPath: string | null;
}

interface Report {
  images: ReportImage[];
}

function magick(args: readonly string[]): void {
  execFileSync("magick", args, { stdio: "pipe" });
}

function label(text: string): string[] {
  return [
    "-background",
    "#f4f1e8",
    "-fill",
    "#161a17",
    "-font",
    FONT,
    "-pointsize",
    "11",
    "-gravity",
    "northwest",
    `label:${text}`
  ];
}

function flatten(source: string, background: string, destination: string): void {
  magick([
    source,
    "-background",
    background,
    "-alpha",
    "remove",
    "-alpha",
    "off",
    "-filter",
    "point",
    "-resize",
    `${CELL}x${CELL}`,
    destination
  ]);
}

function amplifiedDiff(reference: string, candidate: string, destination: string): void {
  magick([
    reference,
    "-background",
    "white",
    "-alpha",
    "remove",
    "-alpha",
    "off",
    "(",
    candidate,
    "-background",
    "white",
    "-alpha",
    "remove",
    "-alpha",
    "off",
    ")",
    "-compose",
    "difference",
    "-composite",
    "-evaluate",
    "multiply",
    "12",
    "-filter",
    "point",
    "-resize",
    `${CELL}x${CELL}`,
    destination
  ]);
}

function busiestCrop(reference: string): { x: number; y: number; size: number } {
  const raw = execFileSync(
    "magick",
    [
      reference,
      "-background",
      "white",
      "-alpha",
      "remove",
      "-alpha",
      "off",
      "-colorspace",
      "Gray",
      "-depth",
      "8",
      "gray:-"
    ],
    { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 4 * 1024 * 1024 }
  );
  const size = 100;
  let bestX = 0;
  let bestY = 0;
  let best = -1;
  const box = 34;
  for (let y = 0; y <= size - box; y += 2) {
    for (let x = 0; x <= size - box; x += 2) {
      let energy = 0;
      for (let yy = y; yy < y + box; yy += 1) {
        for (let xx = x; xx < x + box - 1; xx += 1) {
          const i = yy * size + xx;
          energy +=
            Math.abs((raw[i] as number) - (raw[i + 1] as number)) +
            Math.abs((raw[i] as number) - (raw[i + size] as number));
        }
      }
      if (energy > best) {
        best = energy;
        bestX = x;
        bestY = y;
      }
    }
  }
  return { x: bestX, y: bestY, size: box };
}

function cropZoom(source: string, crop: { x: number; y: number; size: number }, destination: string): void {
  magick([
    source,
    "-background",
    "white",
    "-alpha",
    "remove",
    "-alpha",
    "off",
    "-crop",
    `${crop.size}x${crop.size}+${crop.x}+${crop.y}`,
    "+repage",
    "-filter",
    "point",
    "-resize",
    `${CELL}x${CELL}`,
    destination
  ]);
}

function sheet(images: readonly (readonly string[])[], destination: string): void {
  const args: string[] = [];
  for (const image of images) args.push("(", ...image, ")");
  args.push("-background", "#f4f1e8", "-gravity", "center", "-append", destination);
  magick(args);
}

export function main(): void {
  const report = JSON.parse(readFileSync(REPORT, "utf8")) as Report;
  const requested = process.argv.slice(2);
  const targets =
    requested.length > 0
      ? report.images.filter((image) => requested.includes(image.key))
      : report.images;

  if (!existsSync(REVIEW)) mkdirSync(REVIEW, { recursive: true });

  const manifest: unknown[] = [];
  for (const image of targets) {
    if (!image.chosenPath) {
      manifest.push({ key: image.key, skipped: "no candidate passed the gates" });
      continue;
    }
    const safe = image.key.replace("/", "__");
    const work = join(REVIEW, safe);
    mkdirSync(work, { recursive: true });

    const original = join(ROOT, image.sourcePath);
    const candidate = image.chosenPath;
    const crop = busiestCrop(original);

    flatten(original, "white", join(work, "original-white.png"));
    flatten(candidate, "white", join(work, "candidate-white.png"));
    flatten(candidate, "black", join(work, "candidate-black.png"));
    flatten(candidate, "gray", join(work, "candidate-gray.png"));
    amplifiedDiff(original, candidate, join(work, "diff.png"));
    cropZoom(original, crop, join(work, "zoom-original.png"));
    cropZoom(candidate, crop, join(work, "zoom-candidate.png"));

    sheet(
      [
        [...label("original"), join(work, "original-white.png")],
        [...label(`${image.chosen} candidate`), join(work, "candidate-white.png")],
        [...label("diff x12"), join(work, "diff.png")]
      ],
      join(work, "sheet-white.png")
    );
    sheet(
      [
        [...label("candidate on white"), join(work, "candidate-white.png")],
        [...label("candidate on black"), join(work, "candidate-black.png")],
        [...label("candidate on grey"), join(work, "candidate-gray.png")]
      ],
      join(work, "sheet-backgrounds.png")
    );
    sheet(
      [
        [...label(`zoom original ${crop.x},${crop.y}`), join(work, "zoom-original.png")],
        [...label(`zoom candidate ${image.chosen}`), join(work, "zoom-candidate.png")]
      ],
      join(work, "sheet-zoom.png")
    );

    manifest.push({
      key: image.key,
      chosen: image.chosen,
      crop,
      files: {
        white: join(work, "sheet-white.png"),
        backgrounds: join(work, "sheet-backgrounds.png"),
        zoom: join(work, "sheet-zoom.png")
      }
    });
  }

  writeFileSync(join(REVIEW, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`review sheets: ${REVIEW} (${manifest.length} images)`);
}

if (isMainModule(import.meta.url)) main();
