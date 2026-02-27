import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const API_PORT = 4273;
const WEB_PORT = 4274;
const API_BASE = `http://127.0.0.1:${API_PORT}`;
const WEB_BASE = `http://127.0.0.1:${WEB_PORT}`;
const REPO_ROOT = process.cwd();

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    stdio: "ignore",
    env: {
      ...process.env,
      ...(options.env ?? {})
    }
  });
}

async function stopProcess(processRef) {
  if (!processRef || processRef.killed || processRef.exitCode !== null) {
    return;
  }

  processRef.kill("SIGTERM");
  const startedAt = Date.now();
  while (processRef.exitCode === null && Date.now() - startedAt < 3000) {
    await delay(50);
  }

  if (processRef.exitCode === null) {
    processRef.kill("SIGKILL");
  }
}

async function waitForHttp(url, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Retry while service boots.
    }
    await delay(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForStatusContains(page, text, timeoutMs = 15000) {
  await page.waitForFunction(
    (needle) => {
      const element = document.getElementById("status-label");
      return String(element?.textContent ?? "").includes(needle);
    },
    text,
    { timeout: timeoutMs }
  );
}

async function waitForSaveState(page, text, timeoutMs = 15000) {
  await page.waitForFunction(
    (needle) => {
      const element = document.getElementById("save-state-pill");
      return String(element?.textContent ?? "").includes(needle);
    },
    text,
    { timeout: timeoutMs }
  );
}

async function assertInputValue(page, selector, expectedValue, timeoutMs = 10000) {
  await page.waitForFunction(
    ({ inputSelector, expected }) => {
      const input = document.querySelector(inputSelector);
      return input && "value" in input ? String(input.value) === expected : false;
    },
    { inputSelector: selector, expected: expectedValue },
    { timeout: timeoutMs }
  );
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "openshow-e2e-"));
const dbPath = path.join(tempRoot, "openshow.sqlite");
const apiProcess = spawnProcess("node", ["scripts/start-api.mjs"], {
  env: {
    PORT: String(API_PORT),
    OPENSHOW_DB_PATH: dbPath
  }
});
const webProcess = spawnProcess("python3", ["-m", "http.server", String(WEB_PORT), "--bind", "127.0.0.1"]);

let browser;
let failed = false;

try {
  await waitForHttp(`${API_BASE}/api/health`);
  await waitForHttp(`${WEB_BASE}/mvp/index.html`);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const showId = `playwright-refresh-${Date.now()}`;
  const editedCueName = `Edited Cue ${Date.now()}`;
  const cueNameSelector = '#cue-editor-form input[name="name"]';

  await page.goto(`${WEB_BASE}/mvp/index.html`);
  await page.fill("#api-base-input", API_BASE);
  await page.dispatchEvent("#api-base-input", "input");
  await page.dispatchEvent("#api-base-input", "change");

  await page.fill("#show-id-input", showId);
  await page.click("#save-to-db");
  await waitForStatusContains(page, "Saved show to DB");

  await page.fill(cueNameSelector, editedCueName);
  await page.reload();
  await assertInputValue(page, cueNameSelector, editedCueName);

  await waitForSaveState(page, "saved");
  await page.reload();
  await assertInputValue(page, cueNameSelector, editedCueName);

  console.log("PASS: cue edit survives immediate refresh and remains after autosave");
} catch (error) {
  failed = true;
  console.error(error.message || error);
} finally {
  await browser?.close().catch(() => {});
  await stopProcess(apiProcess);
  await stopProcess(webProcess);
  await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
}

if (failed) {
  process.exit(1);
}
