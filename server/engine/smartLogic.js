/**
 * Smart Logic Layer:
 * - Dynamic RICE Priority Scoring (Reach * Impact * Confidence / Effort)
 * - Fibonacci Effort Estimation & Hours Mapping
 * - Directed Acyclic Graph (DAG) Dependency Detection & Topological Sorting
 * - Critical Path Analysis
 */

const FIBONACCI = [1, 2, 3, 5, 8, 13];

/**
 * Maps a numeric effort value to the nearest standard Fibonacci story point.
 */
function toFibonacci(val) {
  for (let i = 0; i < FIBONACCI.length; i++) {
    if (val <= FIBONACCI[i]) return FIBONACCI[i];
  }
  return 13;
}

/**
 * Calculates dynamic RICE scores for all tasks and assigns prioritized badges.
 */
function calculateRICEAndPriority(tasks, config = {}, riskProfile = 'Balanced') {
  const reachWeight = parseFloat(config.rice_reach_weight) || 1.0;
  const impactWeight = parseFloat(config.rice_impact_weight) || 1.0;
  const confidenceWeight = parseFloat(config.rice_confidence_weight) || 1.0;
  const effortWeight = parseFloat(config.rice_effort_weight) || 1.0;

  const scoredTasks = tasks.map(task => {
    // Determine adjusted effort based on risk profile
    let effortVal = task.baseEffort || 3;
    if (riskProfile === 'Conservative' && effortVal >= 3) {
      const idx = FIBONACCI.indexOf(effortVal);
      if (idx !== -1 && idx < FIBONACCI.length - 1) {
        effortVal = FIBONACCI[idx + 1];
      }
    } else if (riskProfile === 'Aggressive' && effortVal > 3) {
      const idx = FIBONACCI.indexOf(effortVal);
      if (idx > 0) {
        effortVal = FIBONACCI[idx - 1];
      }
    }

    const storyPoints = toFibonacci(effortVal);
    const estimatedHours = storyPoints * 6; // Standard 6 hrs/point conversion

    // RICE Factors
    const reach = Math.round(500 * (task.reachMultiplier || 1.0) * reachWeight);
    const impact = parseFloat(((task.impactMultiplier || 2.0) * impactWeight).toFixed(2));
    const confidence = parseFloat((Math.min(1.0, (task.confidenceMultiplier || 0.85) * confidenceWeight)).toFixed(2));
    const effectiveEffort = Math.max(1, storyPoints * effortWeight);

    // RICE = (Reach * Impact * Confidence) / Effort
    const rawRICE = (reach * impact * confidence) / effectiveEffort;
    const riceScore = Math.round(rawRICE);

    return {
      ...task,
      storyPoints,
      estimatedHours,
      rice: {
        reach,
        impact,
        confidence: Math.round(confidence * 100), // percentage
        effort: storyPoints,
        score: riceScore
      }
    };
  });

  // Sort by RICE score descending to assign percentile priority buckets
  const sorted = [...scoredTasks].sort((a, b) => b.rice.score - a.rice.score);
  const total = sorted.length;

  return sorted.map((task, index) => {
    let priority = 'P2';
    let priorityLabel = 'Medium';

    // If task is foundational without prerequisites, or in top 25%
    if (index < Math.ceil(total * 0.25) || (task.prerequisites.length === 0 && task.category === 'Database')) {
      priority = 'P0';
      priorityLabel = 'Critical';
    } else if (index < Math.ceil(total * 0.55)) {
      priority = 'P1';
      priorityLabel = 'High';
    } else if (index < Math.ceil(total * 0.85)) {
      priority = 'P2';
      priorityLabel = 'Medium';
    } else {
      priority = 'P3';
      priorityLabel = 'Low';
    }

    return {
      ...task,
      priority,
      priorityLabel
    };
  });
}

/**
 * Builds the Dependency Directed Acyclic Graph (DAG),
 * performs cycle validation, assigns topological layers,
 * and determines the Critical Path.
 */
function analyzeDependencies(tasks) {
  const taskMap = new Map();
  tasks.forEach(t => taskMap.set(t.id, t));

  // Build Adjacency List & In-Degree Map
  const inDegree = new Map();
  const outgoing = new Map(); // task -> list of tasks that depend on it
  const incoming = new Map(); // task -> prerequisites

  tasks.forEach(t => {
    inDegree.set(t.id, 0);
    outgoing.set(t.id, []);
    incoming.set(t.id, [...t.prerequisites]);
  });

  tasks.forEach(t => {
    t.prerequisites.forEach(preId => {
      if (taskMap.has(preId)) {
        outgoing.get(preId).push(t.id);
        inDegree.set(t.id, inDegree.get(t.id) + 1);
      }
    });
  });

  // Kahn's Algorithm for Topological Sort & Layer Computation
  const queue = [];
  const topologicalOrder = [];
  const layerMap = new Map();

  tasks.forEach(t => {
    if (inDegree.get(t.id) === 0) {
      queue.push(t.id);
      layerMap.set(t.id, 0); // Root layer
    }
  });

  while (queue.length > 0) {
    const currentId = queue.shift();
    topologicalOrder.push(currentId);
    const currentLayer = layerMap.get(currentId) || 0;

    const neighbors = outgoing.get(currentId) || [];
    for (const neighborId of neighbors) {
      const newInDegree = inDegree.get(neighborId) - 1;
      inDegree.set(neighborId, newInDegree);

      // Neighbor's layer is at least currentLayer + 1
      const existingLayer = layerMap.get(neighborId) || 0;
      layerMap.set(neighborId, Math.max(existingLayer, currentLayer + 1));

      if (newInDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  // Cycle check
  const hasCycle = topologicalOrder.length !== tasks.length;
  if (hasCycle) {
    console.warn('Warning: Cycle detected in task dependencies, falling back to original order.');
  }

  // Calculate Critical Path (longest path in DAG weighted by story points)
  const maxEffortTo = new Map();
  const parentOf = new Map();

  tasks.forEach(t => {
    maxEffortTo.set(t.id, t.storyPoints);
    parentOf.set(t.id, null);
  });

  for (const id of topologicalOrder) {
    const currentTask = taskMap.get(id);
    const currentWeight = maxEffortTo.get(id);
    const neighbors = outgoing.get(id) || [];

    for (const neighborId of neighbors) {
      const neighborTask = taskMap.get(neighborId);
      const newWeight = currentWeight + neighborTask.storyPoints;
      if (newWeight > maxEffortTo.get(neighborId)) {
        maxEffortTo.set(neighborId, newWeight);
        parentOf.set(neighborId, id);
      }
    }
  }

  // Find end node of critical path
  let endNodeId = null;
  let maxPathEffort = -1;
  for (const [id, weight] of maxEffortTo.entries()) {
    if (weight > maxPathEffort) {
      maxPathEffort = weight;
      endNodeId = id;
    }
  }

  const criticalPath = [];
  let curr = endNodeId;
  while (curr) {
    criticalPath.unshift(curr);
    curr = parentOf.get(curr);
  }

  // Enrich tasks with layer and critical path flag
  const criticalPathSet = new Set(criticalPath);
  const enrichedTasks = tasks.map(t => ({
    ...t,
    layer: layerMap.get(t.id) || 0,
    isCriticalPath: criticalPathSet.has(t.id)
  }));

  return {
    tasks: enrichedTasks,
    topologicalOrder,
    criticalPath,
    maxPathEffort,
    hasCycle,
    totalLayers: Math.max(...Array.from(layerMap.values()), 0) + 1
  };
}

module.exports = {
  toFibonacci,
  calculateRICEAndPriority,
  analyzeDependencies
};
