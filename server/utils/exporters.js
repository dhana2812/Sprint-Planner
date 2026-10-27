/**
 * Multi-Format Exporter
 * Exports workflows to Markdown, Jira CSV, Linear CSV, and JSON.
 */

function exportToMarkdown(workflow) {
  const { prd, stories, tasks, sprints, metrics } = workflow;

  let md = `# ${prd.title}\n\n`;
  md += `> **Domain:** ${prd.domainCategory} | **Target Audience:** ${prd.targetAudience}\n`;
  md += `> **Total Story Points:** ${metrics.totalPoints} | **Planned Sprints:** ${sprints.length} | **Critical Path:** ${metrics.criticalPathPoints} pts\n\n`;
  md += `---\n\n`;

  md += `## 1. Executive Summary\n${prd.executiveSummary}\n\n`;
  md += `## 2. Problem Statement\n${prd.problemStatement}\n\n`;

  md += `## 3. Target User Personas\n`;
  prd.personas.forEach(p => {
    md += `### ${p.name} (${p.role})\n`;
    md += `- **Pain Point:** ${p.pain}\n`;
    md += `- **Desired Outcome:** ${p.goal}\n\n`;
  });

  md += `## 4. Functional Requirements\n`;
  prd.functionalRequirements.forEach(fr => {
    md += `### [${fr.id}] ${fr.title} (${fr.priority})\n`;
    md += `${fr.description}\n\n`;
    md += `*Acceptance Criteria:* ${fr.acceptanceCriteria}\n\n`;
  });

  md += `## 5. Non-Functional Specifications\n`;
  prd.nonFunctionalRequirements.forEach(nfr => {
    md += `- **${nfr.category}:** ${nfr.spec}\n`;
  });
  md += `\n`;

  md += `## 6. Success Metrics & KPIs\n`;
  md += `| Metric | Baseline | Target | Impact |\n`;
  md += `| --- | --- | --- | --- |\n`;
  prd.kpis.forEach(k => {
    md += `| ${k.metric} | ${k.baseline} | ${k.target} | ${k.impact} |\n`;
  });
  md += `\n`;

  md += `## 7. Sprint Execution Plan\n`;
  sprints.forEach(s => {
    md += `### ${s.name}: ${s.theme} (${s.allocatedPoints}/${s.capacity} pts - ${s.utilization}% Capacity)\n`;
    md += `*Goal: ${s.goal}*\n\n`;
    md += `| Task ID | Title | Category | Priority | Points | Dependencies |\n`;
    md += `| --- | --- | --- | --- | --- | --- |\n`;
    s.tasks.forEach(t => {
      const deps = t.prerequisites && t.prerequisites.length > 0 ? t.prerequisites.join(', ') : 'None';
      md += `| ${t.id} | ${t.title} | ${t.category} | ${t.priority} | ${t.storyPoints} | ${deps} |\n`;
    });
    md += `\n`;
  });

  return md;
}

function exportToJiraCSV(workflow) {
  const { tasks, sprints } = workflow;
  const headers = ['Issue Type', 'Issue key', 'Summary', 'Description', 'Priority', 'Story Points', 'Sprint', 'Component', 'Dependencies'];

  const rows = tasks.map(t => {
    const sprintObj = sprints.find(s => s.sprintNumber === t.assignedSprint);
    const sprintName = sprintObj ? sprintObj.name : `Sprint ${t.assignedSprint || 1}`;
    const deps = t.prerequisites ? t.prerequisites.join(';') : '';

    return [
      'Story',
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.priorityLabel || t.priority,
      t.storyPoints,
      `"${sprintName}"`,
      `"${t.category}"`,
      `"${deps}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function exportToLinearCSV(workflow) {
  const { tasks } = workflow;
  const headers = ['ID', 'Title', 'Description', 'Priority', 'Estimate', 'Cycle', 'Labels', 'Blocked By'];

  const rows = tasks.map(t => {
    let linearPriority = 3; // 1: Urgent, 2: High, 3: Medium, 4: Low
    if (t.priority === 'P0') linearPriority = 1;
    else if (t.priority === 'P1') linearPriority = 2;
    else if (t.priority === 'P2') linearPriority = 3;
    else if (t.priority === 'P3') linearPriority = 4;

    const deps = t.prerequisites ? t.prerequisites.join(',') : '';

    return [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      linearPriority,
      t.storyPoints,
      `"Sprint ${t.assignedSprint || 1}"`,
      `"${t.category}"`,
      `"${deps}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

module.exports = {
  exportToMarkdown,
  exportToJiraCSV,
  exportToLinearCSV
};
