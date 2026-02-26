import path from "node:path";
import { createMemoryShowStore } from "./memoryShowStore.mjs";
import { createShowStore } from "./showStore.mjs";

function shouldUseMemoryStore() {
  if (process.env.OPENSHOW_STORE_MODE === "memory") {
    return true;
  }
  if (process.env.OPENSHOW_STORE_MODE === "file") {
    return false;
  }
  return Boolean(process.env.VERCEL);
}

function getFileDbPath() {
  return process.env.OPENSHOW_DB_PATH ?? path.join(process.cwd(), "data", "shows.db.json");
}

export function getRuntimeShowStore() {
  if (!globalThis.__openShowRuntimeStore) {
    globalThis.__openShowRuntimeStore = shouldUseMemoryStore()
      ? createMemoryShowStore()
      : createShowStore(getFileDbPath());
  }

  return globalThis.__openShowRuntimeStore;
}
