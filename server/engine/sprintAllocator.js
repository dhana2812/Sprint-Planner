/**
 * Sprint Allocation & Bin-Packing Engine
 * Allocates tasks into capacity-constrained sprints obeying topological dependencies.
 */

const SPRINT_THEMES = [
  {
    name: 'Sprint 1',
    theme: 'Foundations & Data Architecture',
    goal: 'Establish persistence layer, schema migrations, core API scaffolding, and basic design system.'
  },
  {
    name: 'Sprint 2',
    theme: 'Core Domain Logic & Orchestration',
    goal: 'Implement primary business workflows, pipeline execution logic, and main interface components.'
  },
  {
    name: 'Sprint 3',
    theme: 'Interactive Workspaces & System Integrations',
    goal: 'Deliver dynamic visualizations, filterable matrices, export utilities, and administrative hooks.'
  },
  {
    name: 'Sprint 4',
    theme: 'Hardening, Observability & Production Readiness',
    goal: 'Execute automated regression testing, end-to-end verification, security audits, and deployment sign-off.'
  }
];

function allocateSprints(tasks, velocity = 30, maxSprints = 4) {
  const taskMap = new Map();
  tasks.forEach(t => taskMap.set(t.id, t));

  // Determine sprint assignment for each task
  // Rule 1: A task cannot be scheduled earlier than any of its prerequisite tasks.
  // Rule 2: A sprint's total points should not exceed velocity by more than a reasonable buffer (e.g. 1-2 points) unless a single task is larger.
  const taskSprintMap = new Map();
  const sprints = [];

  for (let s = 0; s < maxSprints; s++) {
    const meta = SPRINT_THEMES[s] || {
      name: `Sprint ${s + 1}`,
      theme: `Execution Phase ${s + 1}`,
      goal: `Advance milestone deliverables for phase ${s + 1}.`
    };

    sprints.push({
      sprintNumber: s + 1,
      name: meta.name,
      theme: meta.theme,
      goal: meta.goal,
      capacity: velocity,
      allocatedPoints: 0,
      tasks: []
    });
  }

  // Sort tasks by topological layer ascending, then by RICE score descending
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.layer !== b.layer) {
      return a.layer - b.layer;
    }
    return b.rice.score - a.rice.score;
  });

  for (const task of sortedTasks) {
    // 1. Find the earliest possible sprint index this task can be placed in
    let minSprintIdx = 0;
    for (const preId of task.prerequisites) {
      if (taskSprintMap.has(preId)) {
        const preSprintIdx = taskSprintMap.get(preId);
        // Dependent task can either be in same sprint (if capacity permits) or next sprint
        minSprintIdx = Math.max(minSprintIdx, preSprintIdx);
      }
    }

    // 2. Find a sprint starting from minSprintIdx that can accommodate the task
    let targetSprintIdx = minSprintIdx;
    let placed = false;

    while (targetSprintIdx < sprints.length) {
      const sprint = sprints[targetSprintIdx];
      // Check capacity
      if (sprint.allocatedPoints + task.storyPoints <= velocity) {
        sprint.tasks.push(task);
        sprint.allocatedPoints += task.storyPoints;
        taskSprintMap.set(task.id, targetSprintIdx);
        placed = true;
        break;
      } else {
        targetSprintIdx++;
      }
    }

    // If still not placed (all existing sprints full), append to the last sprint or create overflow sprint
    if (!placed) {
      const lastSprint = sprints[sprints.length - 1];
      lastSprint.tasks.push(task);
      lastSprint.allocatedPoints += task.storyPoints;
      taskSprintMap.set(task.id, sprints.length - 1);
    }
  }

  // Post-process sprints: calculate utilization and risk
  const finalSprints = sprints.map(sprint => {
    const utilization = Math.round((sprint.allocatedPoints / sprint.capacity) * 100);
    let risk = 'Low';
    if (utilization > 100) risk = 'High';
    else if (utilization >= 85) risk = 'Moderate';

    // Tag tasks with sprint number
    const taggedTasks = sprint.tasks.map(t => ({
      ...t,
      assignedSprint: sprint.sprintNumber
    }));

    return {
      ...sprint,
      tasks: taggedTasks,
      taskCount: sprint.tasks.length,
      utilization,
      risk
    };
  });

  return {
    sprints: finalSprints,
    totalPoints: tasks.reduce((sum, t) => sum + t.storyPoints, 0),
    totalTasks: tasks.length,
    averageUtilization: Math.round(
      finalSprints.reduce((sum, s) => sum + s.utilization, 0) / finalSprints.length
    )
  };
}

module.exports = {
  allocateSprints,
  SPRINT_THEMES
};
