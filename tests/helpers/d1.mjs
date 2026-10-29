import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

// Execute the production SQL against SQLite, including batch transaction rollback.
export function createD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(
    readFileSync(new URL('../../worker/migrations/0001_leaderboard.sql', import.meta.url), 'utf8'),
  );
  const api = {
    db,
    failNextBatchAt: null,
    prepare(sql) {
      let args = [];
      const statement = {
        bind(...values) {
          args = values;
          return statement;
        },
        async first() {
          return db.prepare(sql).get(...args) || null;
        },
        async run() {
          const result = db.prepare(sql).run(...args);
          return { success: true, meta: { changes: Number(result.changes) } };
        },
        execute() {
          const rows = db.prepare(sql).all(...args);
          return {
            success: true,
            results: rows,
            meta: {
              changes: /^\s*(INSERT|UPDATE|DELETE)/i.test(sql)
                ? db.prepare('SELECT changes() AS n').get().n
                : 0,
            },
          };
        },
      };
      return statement;
    },
    async batch(statements) {
      db.exec('BEGIN');
      const failure = api.failNextBatchAt;
      api.failNextBatchAt = null;
      try {
        const results = statements.map((statement, index) => {
          if (index === failure) throw Error('Injected batch failure');
          return statement.execute();
        });
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return api;
}
