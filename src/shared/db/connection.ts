import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type DatabaseClient = BetterSQLite3Database<typeof schema>;

export const createDatabase = (filename: string): DatabaseClient => {
  const sqlite = new Database(filename);
  return drizzle(sqlite, { schema });
};
