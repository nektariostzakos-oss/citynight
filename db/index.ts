// Drizzle handle bound to the WAL-enabled SQLite from db/client.ts.
// Phase 1 sets up the binding; phases 3+ import { db } and use it from server code.

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { getRawSqlite } from './client';
import * as schema from './schema';

// `getRawSqlite()` returns either a better-sqlite3 Database or a node:sqlite shim
// shaped like one. Drizzle's better-sqlite3 driver only depends on the prepare/exec
// surface we ensure both provide.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = drizzle((getRawSqlite() as any), { schema });

export type DB = typeof db;
export * from './schema';
