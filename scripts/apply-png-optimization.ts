import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORIES, ROOT, WORK_DIR, formatKb } from "./lib/emoji-source.ts";
import { isMainModule } from "./lib/is-main.ts";

const PNG_CANDIDATES = join(WORK_DIR, "png-candidates");
const BACKUPS = join(WORK_DIR, "backups");

interface ManifestFile {
  path: string;
  beforeBytes: number;
  afterBytes: number;
}

interface Manifest {
  createdAt: string;
  method: string;
  files: ManifestFile[];
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function revert(backupDir: string): void {
  const manifestPath = join(backupDir, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`No manifest in ${backupDir}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  for (const entry of manifest.files) {
    const backup = join(backupDir, "originals", entry.path);
    if (!existsSync(backup)) throw new Error(`Missing backup for ${entry.path}`);
    copyFileSync(backup, join(ROOT, entry.path));
  }
  console.log(`reverted ${manifest.files.length} files from ${backupDir}`);
}

export function main(): void {
  const args = process.argv.slice(2);
  const revertIndex = args.indexOf("--revert");
  if (revertIndex !== -1) {
    const target = args[revertIndex + 1];
    if (!target) throw new Error("--revert needs a backup directory");
    revert(target);
    return;
  }

  const write = args.includes("--write");
  const files: ManifestFile[] = [];

  for (const category of CATEGORIES) {
    const sourceDir = join(ROOT, "assets", category);
    const candidateDir = join(PNG_CANDIDATES, category);
    if (!existsSync(candidateDir)) throw new Error(`Missing candidates for ${category}`);
    for (const file of readdirSync(sourceDir)
      .filter((name) => name.endsWith(".png"))
      .sort()) {
      const candidate = join(candidateDir, file);
      if (!existsSync(candidate)) throw new Error(`Missing candidate ${category}/${file}`);
      files.push({
        path: `assets/${category}/${file}`,
        beforeBytes: statSync(join(sourceDir, file)).size,
        afterBytes: statSync(candidate).size
      });
    }
  }

  const before = files.reduce((sum, file) => sum + file.beforeBytes, 0);
  const after = files.reduce((sum, file) => sum + file.afterBytes, 0);

  if (!write) {
    console.log(`dry run: ${files.length} PNG files would be replaced`);
    console.log(`size ${formatKb(before)} KB -> ${formatKb(after)} KB`);
    console.log("re-run with --write to apply");
    return;
  }

  const backupDir = join(BACKUPS, `png-${stamp()}`);
  for (const file of files) {
    const backup = join(backupDir, "originals", file.path);
    mkdirSync(join(backup, ".."), { recursive: true });
    copyFileSync(join(ROOT, file.path), backup);
  }

  for (const file of files) {
    copyFileSync(join(PNG_CANDIDATES, file.path.replace(/^assets\//, "")), join(ROOT, file.path));
  }

  const manifest: Manifest = {
    createdAt: new Date().toISOString(),
    method: "oxipng -o max --strip safe",
    files
  };
  writeFileSync(join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`replaced ${files.length} PNG files`);
  console.log(`size ${formatKb(before)} KB -> ${formatKb(after)} KB`);
  console.log(`originals backed up to ${backupDir}`);
  console.log(`to undo: node scripts/apply-png-optimization.ts --revert ${backupDir}`);
}

if (isMainModule(import.meta.url)) main();
