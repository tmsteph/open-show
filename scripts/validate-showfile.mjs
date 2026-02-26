import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

async function main() {
  const [, , showfilePath = "fixtures/sample-showfile.json", schemaPath = "docs/showfile.schema.json"] = process.argv;

  const schema = JSON.parse(await readFile(resolve(schemaPath), "utf8"));
  const showfile = JSON.parse(await readFile(resolve(showfilePath), "utf8"));

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const valid = validate(showfile);
  if (!valid) {
    console.error("Showfile schema validation failed:");
    for (const err of validate.errors ?? []) {
      console.error(`- ${err.instancePath || "/"} ${err.message}`);
    }
    process.exit(1);
  }

  console.log(`Schema validation passed: ${showfilePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
