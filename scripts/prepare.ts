import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT } from "./lib/emoji-source.ts";

const tscBin = join(ROOT, "node_modules", "typescript", "bin", "tsc");

if (!existsSync(tscBin)) {
  console.log("未安装 typescript，跳过构建。");
  process.exit(0);
}

const result = spawnSync(process.execPath, [tscBin], { cwd: ROOT, stdio: "inherit" });
process.exit(result.status === null ? 1 : result.status);
