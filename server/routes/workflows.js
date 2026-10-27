const express = require('express');
const router = express.Router();
const db = require('../db');
const { executeWorkflow } = require('../engine/orchestrator');
const { exportToMarkdown, exportToJiraCSV, exportToLinearCSV } = require('../utils/exporters');

/**
 * POST /api/workflows/generate
 * Main endpoint to process a feature idea into PRD & Sprint Plan
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, targetAudience, techStack, teamVelocity, riskProfile, apiKey } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'Feature idea prompt is required.' });
    }

    const workflow = await executeWorkflow(prompt, {
      targetAudience,
      techStack,
      teamVelocity,
      riskProfile,
      apiKey
    });

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Workflow execution error:', error);
    res.status(500).json({ error: 'Failed to process workflow: ' + error.message });
  }
});

/**
 * GET /api/workflows
 * List past workflows with optional search and status filter
 */
router.get('/', (req, res) => {
  try {
    const { search, status, limit = 50 } = req.query;
    let query = 'SELECT id, title, prompt, target_audience, tech_stack, team_velocity, risk_profile, status, created_at, metrics_data FROM workflows';
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(title LIKE ? OR prompt LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const rows = db.prepare(query).all(...params);
    const workflows = rows.map(r => ({
      ...r,
      metrics: JSON.parse(r.metrics_data || '{}')
    }));

    res.json(workflows);
  } catch (error) {
    console.error('List workflows error:', error);
    res.status(500).json({ error: 'Failed to fetch workflows.' });
  }
});

/**
 * GET /api/workflows/:id
 * Retrieve a specific workflow with full PRD, stories, tasks, and sprint data
 */
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Workflow not found.' });
    }

    res.json({
      id: row.id,
      title: row.title,
      prompt: row.prompt,
      targetAudience: row.target_audience,
      techStack: row.tech_stack,
      teamVelocity: row.team_velocity,
      riskProfile: row.risk_profile,
      prd: JSON.parse(row.prd_data),
      stories: JSON.parse(row.stories_data),
      tasks: JSON.parse(row.tasks_data),
      sprints: JSON.parse(row.sprints_data),
      metrics: JSON.parse(row.metrics_data),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({ error: 'Failed to fetch workflow.' });
  }
});

/**
 * PATCH /api/workflows/:id/status
 * Update workflow approval status
 */
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Draft', 'In Review', 'Approved', 'In Sprint', 'Completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }

    const info = db.prepare(`
      UPDATE workflows SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, req.params.id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Workflow not found.' });
    }

    res.json({ success: true, id: req.params.id, status });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update workflow status.' });
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow and associated execution logs
 */
router.delete('/:id', (req, res) => {
  try {
    const deleteWf = db.prepare('DELETE FROM workflows WHERE id = ?');
    const deleteLogs = db.prepare('DELETE FROM execution_logs WHERE workflow_id = ?');

    const transaction = db.transaction((id) => {
      deleteLogs.run(id);
      return deleteWf.run(id);
    });

    const info = transaction(req.params.id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Workflow not found.' });
    }

    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({ error: 'Failed to delete workflow.' });
  }
});

/**
 * GET /api/workflows/:id/export/:format
 * Export workflow as markdown, jira CSV, linear CSV, or json
 */
router.get('/:id/export/:format', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Workflow not found.' });
    }

    const workflow = {
      id: row.id,
      title: row.title,
      prompt: row.prompt,
      prd: JSON.parse(row.prd_data),
      stories: JSON.parse(row.stories_data),
      tasks: JSON.parse(row.tasks_data),
      sprints: JSON.parse(row.sprints_data),
      metrics: JSON.parse(row.metrics_data)
    };

    const format = req.params.format.toLowerCase();
    const safeTitle = row.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();

    if (format === 'markdown' || format === 'md') {
      const md = exportToMarkdown(workflow);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_prd.md"`);
      return res.send(md);
    } else if (format === 'jira') {
      const csv = exportToJiraCSV(workflow);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_jira.csv"`);
      return res.send(csv);
    } else if (format === 'linear') {
      const csv = exportToLinearCSV(workflow);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_linear.csv"`);
      return res.send(csv);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.json"`);
      return res.json(workflow);
    } else {
      return res.status(400).json({ error: 'Unsupported format. Allowed: markdown, jira, linear, json' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export workflow.' });
  }
});

module.exports = router;
