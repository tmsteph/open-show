import path from "node:path";
import { createMemoryShowStore } from "./memoryShowStore.mjs";
import { createSqliteShowStore } from "./sqliteShowStore.mjs";

function getStoreMode() {
  if (process.env.OPENSHOW_STORE_MODE === "memory") {
    return "memory";
  }
  if (process.env.OPENSHOW_STORE_MODE === "sqlite") {
    return "sqlite";
  }
  return process.env.VERCEL ? "memory" : "sqlite";
}

function getSqliteDbPath() {
  return process.env.OPENSHOW_DB_PATH ?? path.join(process.cwd(), "data", "openshow.sqlite");
}

export async function getRuntimeShowStore() {
  if (!globalThis.__openShowRuntimeStore) {
    const mode = getStoreMode();
    globalThis.__openShowRuntimeStore = mode === "memory"
      ? createMemoryShowStore()
      : await createSqliteShowStore(getSqliteDbPath());
  }

  return globalThis.__openShowRuntimeStore;
}
