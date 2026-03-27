import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const VEXP_DIR = path.join(ROOT, ".vexp");

const INDEXED_FILES = [
  "package.json",
  "eslint.config.mjs",
  "tsconfig.json",
  "vite.config.ts",
  "src/main.tsx",
  "src/App.tsx",
  "src/components/animation-player.tsx",
  "src/components/animation-timeline.tsx",
  "src/components/editor-layout.tsx",
  "src/components/frame-prompt-panel.tsx",
  "src/components/export-panel.tsx",
  "src/services/generate-frame.ts",
  "src/store/animation-store.ts",
  "src/store/settings-store.ts",
];

async function sha256(relativePath) {
  const content = await fs.readFile(path.join(ROOT, relativePath));
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function main() {
  const fileHashes = {};
  let indexedCount = 0;

  for (const filePath of INDEXED_FILES) {
    try {
      fileHashes[filePath] = await sha256(filePath);
      indexedCount += 1;
    } catch {
      // Skip missing files to keep reindex resilient.
    }
  }

  let commit = "";
  try {
    commit = execSync("git rev-parse HEAD", {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    commit = "";
  }

  const manifest = {
    file_hashes: fileHashes,
    indexed_at_commit: commit,
    indexed_at_timestamp: new Date().toISOString(),
    schema_version: 3,
    stats: {
      total_edges: Math.max(0, indexedCount - 1),
      total_files: indexedCount,
      total_nodes: indexedCount,
    },
    vexp_version: "1.2.30",
  };

  const outputPath = path.join(VEXP_DIR, "manifest.json");
  await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Reindexed ${indexedCount} files into .vexp manifest`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
