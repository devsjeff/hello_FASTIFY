import postgres from "postgres";
import { env } from "../config/env.ts";

export const sql = postgres(env.databaseUrl);

export async function closeDatabase() {
  await sql.end();
}
