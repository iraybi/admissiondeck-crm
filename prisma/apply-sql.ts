import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

async function main() {
  const file = process.argv[2] ?? "doc-requirements.sql";
  const sql = readFileSync(join(__dirname, "sql", file), "utf8");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied ${file} successfully.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
