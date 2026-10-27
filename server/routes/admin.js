const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/admin/metrics
 * Aggregated analytics for platform administration
 */
router.get('/metrics', (req, res) => {
  try {
    const totalWorkflows = db.prepare('SELECT COUNT(*) as count FROM workflows').get().count;

    const allWfs = db.prepare('SELECT status, metrics_data, tasks_data FROM workflows').all();

    let totalStoryPoints = 0;
    let totalTasksCount = 0;
    let totalDurationSum = 0;
    let validDurationCount = 0;
    let totalUtilizationSum = 0;

    const statusCounts = {
      Draft: 0,
      'In Review': 0,
      Approved: 0,
      'In Sprint': 0,
      Completed: 0
    };

    const categoryDistribution = {
      Database: 0,
      Backend: 0,
      Frontend: 0,
      'DevOps/Infra': 0,
      'QA/Testing': 0
    };

    const priorityDistribution = {
      P0: 0,
      P1: 0,
      P2: 0,
      P3: 0
    };

    allWfs.forEach(wf => {
      if (statusCounts[wf.status] !== undefined) {
        statusCounts[wf.status]++;
      }

      if (wf.metrics_data) {
        try {
          const m = JSON.parse(wf.metrics_data);
          totalStoryPoints += m.totalPoints || 0;
          totalTasksCount += m.totalTasks || 0;
          if (m.totalDurationMs) {
            totalDurationSum += m.totalDurationMs;
            validDurationCount++;
          }
          if (m.averageUtilization) {
            totalUtilizationSum += m.averageUtilization;
          }
        } catch (e) {}
      }

      if (wf.tasks_data) {
        try {
          const tasks = JSON.parse(wf.tasks_data);
          tasks.forEach(t => {
            if (categoryDistribution[t.category] !== undefined) {
              categoryDistribution[t.category]++;
            }
            if (priorityDistribution[t.priority] !== undefined) {
              priorityDistribution[t.priority]++;
            }
          });
        } catch (e) {}
      }
    });

    const avgDurationMs = validDurationCount > 0 ? Math.round(totalDurationSum / validDurationCount) : 0;
    const avgUtilization = allWfs.length > 0 ? Math.round(totalUtilizationSum / allWfs.length) : 0;

    // Execution stage breakdown from logs
    const stageStats = db.prepare(`
      SELECT stage, AVG(duration_ms) as avg_duration, COUNT(*) as call_count
      FROM execution_logs
      GROUP BY stage
    `).all();

    res.json({
      totalWorkflows,
      totalStoryPoints,
      totalTasksCount,
      avgDurationMs,
      avgUtilization,
      statusCounts,
      categoryDistribution,
      priorityDistribution,
      stageStats
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    res.status(500).json({ error: 'Failed to compute admin metrics.' });
  }
});

/**
 * GET /api/admin/logs
 * Retrieve recent pipeline execution logs
 */
router.get('/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 30, 10);
    const logs = db.prepare(`
      SELECT l.*, w.title as workflow_title
      FROM execution_logs l
      LEFT JOIN workflows w ON l.workflow_id = w.id
      ORDER BY l.created_at DESC
      LIMIT ?
    `).all(limit);

    res.json(logs);
  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({ error: 'Failed to fetch execution logs.' });
  }
});

/**
 * GET /api/admin/config
 * Retrieve all system configuration parameters
 */
router.get('/config', (req, res) => {
  try {
    const configs = db.prepare('SELECT * FROM system_config').all();
    res.json(configs);
  } catch (error) {
    console.error('Admin get config error:', error);
    res.status(500).json({ error: 'Failed to fetch system config.' });
  }
});

/**
 * PUT /api/admin/config
 * Update a specific system config value
 */
router.put('/config', (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'key and value are required.' });
    }

    const info = db.prepare(`
      UPDATE system_config SET value = ?, updated_at = datetime('now') WHERE key = ?
    `).run(String(value), key);

    if (info.changes === 0) {
      return res.status(404).json({ error: `Config key '${key}' not found.` });
    }

    res.json({ success: true, key, value });
  } catch (error) {
    console.error('Admin update config error:', error);
    res.status(500).json({ error: 'Failed to update system config.' });
  }
});

module.exports = router;
