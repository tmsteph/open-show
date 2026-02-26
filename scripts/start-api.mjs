import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApiServer } from "../src/server/apiServer.mjs";
import { createShowStore } from "../src/server/showStore.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const port = Number(process.env.PORT ?? 4173);
const dbPath = process.env.OPENSHOW_DB_PATH ?? path.join(repoRoot, "data", "shows.db.json");

const store = createShowStore(dbPath);
const server = createApiServer({ store });

server.listen(port, () => {
  console.log(`OpenShow API listening on http://localhost:${port}`);
  console.log(`DB file: ${dbPath}`);
});
