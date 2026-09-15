import postgres from "postgres";
export interface DB {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
}
const shared = globalThis as typeof globalThis & {
  spunkDatabase?: Promise<DB>;
};
function wrap(client: postgres.Sql | postgres.TransactionSql): DB {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      return (await client.unsafe(
        sql,
        params as postgres.ParameterOrJSON<never>[],
      )) as unknown as T[];
    },
    async transaction<T>(fn: (db: DB) => Promise<T>) {
      return (await (client as postgres.Sql).begin(async (tx) =>
        fn(wrap(tx)),
      )) as T;
    },
  };
}
async function connect(): Promise<DB> {
  if (
    process.env.USE_LOCAL_DB === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite(".local-db");
    return {
      async query<T>(sql: string, params: unknown[] = []) {
        return (await pg.query<T>(sql, params)).rows;
      },
      async transaction<T>(fn: (db: DB) => Promise<T>) {
        return pg.transaction((tx) =>
          fn({
            query: async <R>(q: string, p: unknown[] = []) =>
              (await tx.query<R>(q, p)).rows,
            transaction: async () => {
              throw new Error("Nested transaction");
            },
          }),
        );
      },
    };
  } else {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!databaseUrl) throw new Error("SETUP_REQUIRED");
    return wrap(
      postgres(databaseUrl, {
        ssl: "require",
        prepare: false,
        max: 3,
        idle_timeout: 20,
        connect_timeout: 10,
        types: {
          bigint: { to: 20, from: [20], serialize: String, parse: Number },
        },
      }),
    );
  }
}
export function getDB(): Promise<DB> {
  return (shared.spunkDatabase ??= connect().catch((error) => {
    shared.spunkDatabase = undefined;
    throw error;
  }));
}
