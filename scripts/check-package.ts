import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT, readEmojiSource } from "./lib/emoji-source.ts";
import { isMainModule } from "./lib/is-main.ts";

const problems: string[] = [];

const ALLOWED_PREFIXES = [
  "dist/index.js",
  "dist/index.d.ts",
  "assets/",
  "docs/API.md",
  "docs/NPM_USAGE.md",
  "docs/REACT_USAGE.md",
  "README.md",
  "package.json",
  "LICENSE"
];

const FORBIDDEN_SEGMENTS = [
  "site/",
  "scripts/",
  "src/",
  "examples/",
  ".github/",
  ".image-optimization/",
  "node_modules/",
  "index.html",
  "design.md",
  "tsconfig",
  "package-lock.json",
  ".nojekyll"
];

function packList(): { dir: string; files: string[] } {
  const dir = mkdtempSync(join(tmpdir(), "we-pack-"));
  execFileSync("npm", ["pack", "--pack-destination", dir, "--silent"], {
    cwd: ROOT,
    stdio: "pipe"
  });
  const tarball = execFileSync("ls", [dir], { stdio: "pipe" }).toString().trim().split("\n")[0];
  if (!tarball) throw new Error("npm pack produced no tarball");
  const output = execFileSync("tar", ["-tzf", join(dir, tarball)], { stdio: "pipe" }).toString();
  const files = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^package\//, ""))
    .filter((line) => !line.endsWith("/"));
  return { dir, files };
}

function listExportTargets(
  exportsField: Record<string, string | Record<string, string>> | undefined
): string[] {
  if (!exportsField) return [];
  const targets: string[] = [];
  for (const value of Object.values(exportsField)) {
    if (typeof value === "string") {
      targets.push(value);
      continue;
    }
    for (const nested of Object.values(value)) targets.push(nested);
  }
  return targets;
}

function main(): void {
  const { dir, files } = packList();
  try {
    for (const file of files) {
      if (!ALLOWED_PREFIXES.some((prefix) => file === prefix || file.startsWith(prefix))) {
        problems.push(`unexpected file in package: ${file}`);
      }
      if (FORBIDDEN_SEGMENTS.some((segment) => file.startsWith(segment) || file.includes(`/${segment}`))) {
        problems.push(`forbidden path shipped: ${file}`);
      }
    }

    const emojis = readEmojiSource();
    const pngs = files.filter((file) => file.startsWith("assets/") && file.endsWith(".png"));
    if (pngs.length !== emojis.length) {
      problems.push(`expected ${emojis.length} PNG assets, package has ${pngs.length}`);
    }
    for (const emoji of emojis) {
      if (!files.includes(`assets/${emoji.category}/${emoji.name}.png`)) {
        problems.push(`missing asset in package: ${emoji.path}`);
      }
    }

    if (!files.includes("dist/index.js")) problems.push("missing dist/index.js");
    if (!files.includes("dist/index.d.ts")) problems.push("missing dist/index.d.ts");
    if (!files.includes("LICENSE")) problems.push("missing LICENSE in package");

    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    const localLinks = [...readme.matchAll(/\]\((\.\/[^)\s]+)\)/g)]
      .map((match) => match[1])
      .filter((link): link is string => Boolean(link));
    for (const link of localLinks) {
      const target = link.replace(/^\.\//, "");
      if (!files.includes(target)) {
        problems.push(`README links to ${link} but it is not published`);
      }
    }

    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      main: string;
      types: string;
      files: string[];
      license: string;
      exports?: Record<string, string | Record<string, string>>;
    };
    if (pkg.license !== "MIT") problems.push(`license field should be MIT, found ${pkg.license}`);
    if (!files.includes(pkg.main)) problems.push(`main ${pkg.main} is not published`);
    if (!files.includes(pkg.types)) problems.push(`types ${pkg.types} is not published`);

    const exported = listExportTargets(pkg.exports);
    if (exported.length === 0) problems.push("package.json has no exports map");
    for (const target of exported) {
      if (!target.includes("*")) {
        const relativePath = target.replace(/^\.\//, "");
        if (!files.includes(relativePath)) {
          problems.push(`exports target ${target} is not published`);
        }
      } else {
        const patternRoot = target.replace(/^(\.\/)?/, "").replace(/\*.*$/, "");
        if (!files.some((file) => file.startsWith(patternRoot))) {
          problems.push(`exports pattern ${target} matches nothing in the package`);
        }
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  if (problems.length > 0) {
    console.error(`check-package: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
    return;
  }

  console.log(`check-package: OK (${files.length} files, assets only, no site/scripts/src)`);
}

if (isMainModule(import.meta.url)) main();
