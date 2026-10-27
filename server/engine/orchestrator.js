/**
 * End-to-End Workflow Orchestrator
 * Coordinates the multi-stage pipeline:
 * Analysis -> PRD -> Stories & Tasks -> Smart Logic (RICE & DAG) -> Sprint Allocator -> DB Persistence
 */

const crypto = require('crypto');
const db = require('../db');
const { analyzeFeaturePrompt } = require('./analyzer');
const { generatePRD } = require('./prdGenerator');
const { generateUserStories, generateEngineeringTasks } = require('./taskEngine');
const { calculateRICEAndPriority, analyzeDependencies } = require('./smartLogic');
const { allocateSprints } = require('./sprintAllocator');

async function executeWorkflow(prompt, options = {}) {
  const workflowId = 'wf_' + crypto.randomBytes(6).toString('hex');
  const startTime = Date.now();
  const stageLogs = [];

  function logStage(stage, stageStart, status = 'SUCCESS', details = null) {
    const duration = Date.now() - stageStart;
    const engine = options.apiKey ? 'AI_Augmented' : 'Rule_Hybrid';
    try {
      db.prepare(`
        INSERT INTO execution_logs (workflow_id, stage, engine, duration_ms, status, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(workflowId, stage, engine, duration, status, details ? JSON.stringify(details) : null);
    } catch (err) {
      console.error('Failed to log stage:', err);
    }
    stageLogs.push({ stage, duration, status });
  }

  // Stage 1: Analysis
  let t0 = Date.now();
  const analysis = analyzeFeaturePrompt(prompt, options);
  logStage('Concept Analysis', t0, 'SUCCESS', { domain: analysis.domainCategory });

  // Stage 2: PRD Synthesis
  t0 = Date.now();
  const prd = generatePRD(analysis);
  logStage('PRD Synthesis', t0, 'SUCCESS', { title: prd.title, kpis: prd.kpis.length });

  // Stage 3: Task & Story Decomposition
  t0 = Date.now();
  const stories = generateUserStories(analysis, prd);
  const rawTasks = generateEngineeringTasks(analysis, prd, stories);
  logStage('Task Decomposition', t0, 'SUCCESS', { stories: stories.length, tasks: rawTasks.length });

  // Stage 4: Smart Logic (RICE Scoring & DAG Dependency Analysis)
  t0 = Date.now();
  // Fetch system config for dynamic weights
  const configRows = db.prepare('SELECT key, value FROM system_config').all();
  const config = {};
  configRows.forEach(row => { config[row.key] = row.value; });

  const scoredTasks = calculateRICEAndPriority(rawTasks, config, analysis.riskProfile);
  const dagAnalysis = analyzeDependencies(scoredTasks);
  logStage('Smart Logic Scoring & DAG', t0, 'SUCCESS', {
    criticalPathLength: dagAnalysis.criticalPath.length,
    totalLayers: dagAnalysis.totalLayers
  });

  // Stage 5: Sprint Capacity Bin Packing
  t0 = Date.now();
  const sprintAllocation = allocateSprints(dagAnalysis.tasks, analysis.velocity, parseInt(config.max_sprints || 4, 10));
  logStage('Sprint Bin Packing', t0, 'SUCCESS', {
    sprintCount: sprintAllocation.sprints.length,
    totalPoints: sprintAllocation.totalPoints
  });

  // Stage 6: Database Persistence
  t0 = Date.now();
  const totalDuration = Date.now() - startTime;
  const metrics = {
    totalPoints: sprintAllocation.totalPoints,
    totalTasks: sprintAllocation.totalTasks,
    totalStories: stories.length,
    averageUtilization: sprintAllocation.averageUtilization,
    criticalPathPoints: dagAnalysis.maxPathEffort,
    criticalPathTasks: dagAnalysis.criticalPath,
    totalDurationMs: totalDuration,
    engine: options.apiKey ? 'AI_Augmented' : 'Rule_Hybrid',
    stageLogs
  };

  const insertWorkflow = db.prepare(`
    INSERT INTO workflows (
      id, title, prompt, target_audience, tech_stack, team_velocity,
      risk_profile, prd_data, stories_data, tasks_data, sprints_data,
      metrics_data, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertWorkflow.run(
    workflowId,
    analysis.title,
    prompt,
    analysis.targetAudience,
    analysis.techStack,
    analysis.velocity,
    analysis.riskProfile,
    JSON.stringify(prd),
    JSON.stringify(stories),
    JSON.stringify(dagAnalysis.tasks),
    JSON.stringify(sprintAllocation.sprints),
    JSON.stringify(metrics),
    'Draft'
  );
  logStage('Database Persistence', t0, 'SUCCESS', { workflowId });

  return {
    id: workflowId,
    title: analysis.title,
    prompt,
    analysis,
    prd,
    stories,
    tasks: dagAnalysis.tasks,
    sprints: sprintAllocation.sprints,
    metrics,
    status: 'Draft',
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  executeWorkflow
};
