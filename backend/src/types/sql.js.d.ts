declare module 'sql.js' {
  type SqlValue = unknown;

  export interface Database {
    run(sql: string, params?: SqlValue[]): void;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface Statement {
    bind(params?: SqlValue[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, SqlValue>;
    get(): SqlValue[];
    free(): boolean;
  }

  export interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }

  export interface SqlJsStatic {
    Database: {
      new (data?: ArrayLike<number> | Buffer | null): Database;
    };
  }

  function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
  export default initSqlJs;
}
