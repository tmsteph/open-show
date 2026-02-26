import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const jsonFiles = [
  "docs/showfile.schema.json",
  "fixtures/sample-showfile.json"
];

const jsFiles = [
  "mvp/src/app.mjs",
  "mvp/src/cues.mjs",
  "mvp/src/cueState.mjs",
  "scripts/lint.mjs",
  "scripts/validate-showfile.mjs",
  "tests/cueState.test.mjs"
];

async function main() {
  for (const file of jsonFiles) {
    const input = await readFile(file, "utf8");
    JSON.parse(input);
  }

  await execFileAsync("node", ["--check", ...jsFiles]);
  console.log("Lint checks passed");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
