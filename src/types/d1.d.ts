interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta?: unknown;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(stmts: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(sql: string): Promise<D1Result>;
}
