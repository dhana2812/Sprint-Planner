const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sprintforge.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Initialize database schema
function initDatabase() {
  db.exec(`
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
  const count = db.prepare('SELECT COUNT(*) as count FROM system_config').get();
  if (count.count === 0) {
    const insertConfig = db.prepare(
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

    const transaction = db.transaction((items) => {
      for (const item of items) {
        insertConfig.run(item[0], item[1], item[2]);
      }
    });
    transaction(defaults);
  }
}

initDatabase();

module.exports = db;
