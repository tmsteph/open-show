import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const jsonFiles = [
  "docs/showfile.schema.json",
  "fixtures/sample-showfile.json"
];

const jsFiles = [
  "src/app/playbackSession.mjs",
  "src/server/showStore.mjs",
  "src/server/memoryShowStore.mjs",
  "src/server/runtimeShowStore.mjs",
  "src/server/apiServer.mjs",
  "src/engine/cueState.mjs",
  "src/engine/showfileRuntime.mjs",
  "src/adapters/output/nullOutputAdapter.mjs",
  "mvp/src/app.mjs",
  "mvp/src/cues.mjs",
  "mvp/src/cueState.mjs",
  "mvp/src/hotkeys.mjs",
  "mvp/src/assetImport.mjs",
  "mvp/src/showApiClient.mjs",
  "mvp/src/runStatus.mjs",
  "mvp/src/showfileLoader.mjs",
  "mvp/src/showfileEditor.mjs",
  "scripts/lint.mjs",
  "scripts/start-api.mjs",
  "scripts/validate-showfile.mjs",
  "api/health.js",
  "api/shows/index.js",
  "api/shows/[showId].js",
  "tests/cueState.test.mjs",
  "tests/hotkeys.test.mjs",
  "tests/showfileRuntime.test.mjs",
  "tests/playbackSession.test.mjs",
  "tests/cueListState.test.mjs",
  "tests/showfileLoader.test.mjs",
  "tests/showfileEditor.test.mjs",
  "tests/assetImport.test.mjs",
  "tests/runStatus.test.mjs",
  "tests/showStore.test.mjs",
  "tests/apiServer.test.mjs",
  "tests/showApiClient.test.mjs"
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
