const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sprintforge.db');

// ──────────────────────────────────────────────────
// Compatibility wrapper: makes sql.js behave like
// better-sqlite3's synchronous API so the rest of
// the codebase doesn't need any changes.
// ──────────────────────────────────────────────────

class StatementWrapper {
  constructor(sqlDb, sql, dbWrapper) {
    this.sqlDb = sqlDb;
    this.sql = sql;
    this.dbWrapper = dbWrapper;
  }

  run(...params) {
    const bindParams = this._flattenParams(params);
    this.sqlDb.run(this.sql, bindParams);
    this.dbWrapper._save();
    return { changes: this.sqlDb.getRowsModified() };
  }

  get(...params) {
    const bindParams = this._flattenParams(params);
    const stmt = this.sqlDb.prepare(this.sql);
    if (bindParams.length > 0) stmt.bind(bindParams);
    let row = undefined;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  }

  all(...params) {
    const bindParams = this._flattenParams(params);
    const results = [];
    const stmt = this.sqlDb.prepare(this.sql);
    if (bindParams.length > 0) stmt.bind(bindParams);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  _flattenParams(params) {
    if (params.length === 0) return [];
    if (params.length === 1 && Array.isArray(params[0])) return params[0];
    return params;
  }
}

class DatabaseWrapper {
  constructor(sqlDb) {
    this.sqlDb = sqlDb;
  }

  pragma(_pragmaStr) {
    // WAL mode not supported in sql.js, silently ignored
  }

  exec(sql) {
    this.sqlDb.run(sql);
    this._save();
  }

  prepare(sql) {
    return new StatementWrapper(this.sqlDb, sql, this);
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      self.sqlDb.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        self.sqlDb.run('COMMIT');
        self._save();
        return result;
      } catch (e) {
        self.sqlDb.run('ROLLBACK');
        throw e;
      }
    };
  }

  _save() {
    try {
      const data = this.sqlDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {
      console.error('Failed to save database:', e.message);
    }
  }
}

// ──────────────────────────────────────────────────
// Async init + proxy so existing `const db = require('./db')`
// calls continue to work with `db.prepare(...)` etc.
// ──────────────────────────────────────────────────

let realDb = null;

// The proxy forwards all property access and method calls
// to the real DatabaseWrapper once it's initialized.
const dbProxy = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'dbReady') return dbReadyPromise;
    if (!realDb) throw new Error('Database not initialized yet. Await dbReady first.');
    return typeof realDb[prop] === 'function'
      ? realDb[prop].bind(realDb)
      : realDb[prop];
  }
});

const dbReadyPromise = initSqlJs().then((SQL) => {
  let sqlDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  realDb = new DatabaseWrapper(sqlDb);

  realDb.pragma('journal_mode = WAL');

  realDb.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      target_audience TEXT,
      tech_stack TEXT,
      team_velocity INTEGER DEFAULT 30,
      risk_profile TEXT DEFAULT 'Balanced',
      prd_data TEXT NOT NULL,
      stories_data TEXT NOT NULL,
      tasks_data TEXT NOT NULL,
      sprints_data TEXT NOT NULL,
      metrics_data TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS execution_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id TEXT,
      stage TEXT NOT NULL,
      engine TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_execution_logs_wf ON execution_logs(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_execution_logs_created ON execution_logs(created_at DESC);
  `);

  // Seed default configuration if empty
  const count = realDb.prepare('SELECT COUNT(*) as count FROM system_config').get();
  if (count.count === 0) {
    const insertConfig = realDb.prepare(
      'INSERT INTO system_config (key, value, description) VALUES (?, ?, ?)'
    );
    const defaults = [
      ['default_velocity', '30', 'Target story points capacity per sprint'],
      ['rice_reach_weight', '1.0', 'Multiplier weight for Reach score in RICE calculations'],
      ['rice_impact_weight', '1.0', 'Multiplier weight for Impact score in RICE calculations'],
      ['rice_confidence_weight', '1.0', 'Multiplier weight for Confidence score in RICE calculations'],
      ['rice_effort_weight', '1.0', 'Divider weight for Effort score in RICE calculations'],
      ['max_sprints', '4', 'Default maximum sprint bin packing count'],
      ['engine_mode', 'hybrid', 'Active processing engine mode (hybrid, rule_only, llm_only)']
    ];

    const transaction = realDb.transaction((items) => {
      for (const item of items) {
        insertConfig.run(item[0], item[1], item[2]);
      }
    });
    transaction(defaults);
  }

  realDb._save();
  console.log('Database initialized successfully');
  return realDb;
});

module.exports = dbProxy;
