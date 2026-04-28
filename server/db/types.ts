export type SqliteValue = string | number | null | Uint8Array;

export interface DatabaseConnection {
  run(sql: string, params?: SqliteValue[]): void;
  runMany(statements: string[]): void;
  query<T extends Record<string, unknown>>(sql: string, params?: SqliteValue[]): T[];
  transaction(run: () => void): void;
}

