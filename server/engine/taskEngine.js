/**
 * Task & User Story Decomposition Engine
 * Generates user stories with acceptance criteria and granular engineering tasks.
 */

function generateUserStories(analysis, prd) {
  const { title, personas, domainCategory } = analysis;
  const primaryPersona = personas[0] || { name: 'User', role: 'Product User', goal: 'achieve core efficiency' };
  const secondaryPersona = personas[1] || { name: 'Admin', role: 'Team Lead', goal: 'maintain system visibility' };

  return [
    {
      id: 'US-101',
      title: 'Initial Parameter Setup & Input Submission',
      role: primaryPersona.role,
      action: `input my project goals and constraints for ${title}`,
      benefit: 'the platform generates tailored specifications aligned with my technical constraints',
      acceptanceCriteria: [
        'Given a user lands on the input console, When they fill in feature details and click Generate, Then the processing pipeline begins immediately with visual progress.',
        'Given invalid or blank inputs, When the user attempts submission, Then actionable inline error messages indicate missing fields.',
        'Given pre-built sample templates, When the user clicks a preset, Then form fields populate with complete, realistic scenario data.'
      ],
      businessValue: 9
    },
    {
      id: 'US-102',
      title: 'Structured PRD Inspection & Verification',
      role: primaryPersona.role,
      action: 'review the synthesized PRD with functional and non-functional requirements',
      benefit: 'stakeholders can align on clear scope boundaries and success KPIs before engineering starts',
      acceptanceCriteria: [
        'Given the PRD is generated, When viewed in the PRD tab, Then all sections (Executive Summary, Personas, Functional Specs, KPIs) are rendered with clean formatting.',
        'Given the generated PRD, When the user clicks Copy or Export Markdown, Then a sanitized markdown document is copied or downloaded.'
      ],
      businessValue: 8
    },
    {
      id: 'US-103',
      title: 'Engineering Task Prioritization & Dependency Review',
      role: secondaryPersona.role,
      action: 'examine granular engineering tasks with calculated RICE scores and prerequisite dependencies',
      benefit: 'engineers understand the exact technical execution sequence and effort requirements',
      acceptanceCriteria: [
        'Given the task breakdown table, When sorting by Priority or Category, Then tasks dynamically reorder based on the selected criteria.',
        'Given tasks with prerequisites, When inspecting a task card, Then prerequisite task IDs are clearly displayed and linked.'
      ],
      businessValue: 9
    },
    {
      id: 'US-104',
      title: 'Capacity-Balanced Sprint Roadmap Allocation',
      role: secondaryPersona.role,
      action: 'view tasks grouped into multi-sprint buckets bounded by team velocity',
      benefit: 'the engineering team avoids over-commitment and delivers incremental value sprint-by-sprint',
      acceptanceCriteria: [
        'Given a team velocity constraint (e.g. 30 pts), When sprints are calculated, Then total story points per sprint do not exceed capacity.',
        'Given tasks with dependencies, When placed into sprints, Then dependent tasks are always scheduled in the same sprint or later than their prerequisites.'
      ],
      businessValue: 10
    },
    {
      id: 'US-105',
      title: 'System Administration & Workflow Auditing',
      role: 'System Administrator',
      action: 'monitor system usage metrics, historical runs, and fine-tune dynamic logic parameters',
      benefit: 'the organization can track platform throughput, latency, and calibrate estimation accuracy',
      acceptanceCriteria: [
        'Given the Admin Dashboard, When opened, Then real-time aggregate metrics (total workflows, total story points, avg latency) are displayed.',
        'Given the System Rules config, When adjusting sprint velocity or RICE weights, Then future workflow calculations reflect the updated weights.'
      ],
      businessValue: 7
    }
  ];
}

function generateEngineeringTasks(analysis, prd, stories) {
  const { title, techStack, detectedDomainKey } = analysis;

  const tasks = [
    {
      id: 'TASK-01',
      title: 'Design Relational Schema & Migration Scripts',
      category: 'Database',
      description: `Define persistent relational models for ${title}, including workflows, execution logs, system settings, and relational indexes.`,
      prerequisites: [],
      baseEffort: 3, // points
      reachMultiplier: 1.0,
      impactMultiplier: 2.0,
      confidenceMultiplier: 0.9
    },
    {
      id: 'TASK-02',
      title: 'Implement Database Connection Pool & Access Layer',
      category: 'Database',
      description: 'Setup SQLite / better-sqlite3 connection pooling, WAL mode, transaction support, and error retry handlers.',
      prerequisites: ['TASK-01'],
      baseEffort: 2,
      reachMultiplier: 0.9,
      impactMultiplier: 1.5,
      confidenceMultiplier: 0.95
    },
    {
      id: 'TASK-03',
      title: 'Build Core REST API Endpoints & Request Validation',
      category: 'Backend',
      description: `Develop Express endpoints (/api/workflows) supporting CRUD operations, input sanitization, and structured HTTP error responses.`,
      prerequisites: ['TASK-02'],
      baseEffort: 5,
      reachMultiplier: 1.2,
      impactMultiplier: 2.5,
      confidenceMultiplier: 0.85
    },
    {
      id: 'TASK-04',
      title: 'Develop Multi-Stage Processing Pipeline Engine',
      category: 'Backend',
      description: `Implement the domain analyzer, PRD generator, user story decomposition, and telemetry logger for ${title}.`,
      prerequisites: ['TASK-03'],
      baseEffort: 5,
      reachMultiplier: 1.3,
      impactMultiplier: 3.0,
      confidenceMultiplier: 0.85
    },
    {
      id: 'TASK-05',
      title: 'Build Smart RICE Priority & Heuristic Effort Engine',
      category: 'Backend',
      description: 'Implement dynamic RICE mathematical scoring with customizable weights and Fibonacci effort point estimators.',
      prerequisites: ['TASK-04'],
      baseEffort: 3,
      reachMultiplier: 1.1,
      impactMultiplier: 2.0,
      confidenceMultiplier: 0.9
    },
    {
      id: 'TASK-06',
      title: 'Construct Dependency DAG & Cycle Detection Engine',
      category: 'Backend',
      description: 'Build directed acyclic graph data structure, prerequisite validator, cycle detection, and critical path identifier.',
      prerequisites: ['TASK-05'],
      baseEffort: 5,
      reachMultiplier: 1.0,
      impactMultiplier: 2.5,
      confidenceMultiplier: 0.8
    },
    {
      id: 'TASK-07',
      title: 'Implement Capacity-Constrained Sprint Bin-Packing',
      category: 'Backend',
      description: 'Algorithmic bin-packing balancing tasks into sequential sprint buckets respecting team velocity and topological order.',
      prerequisites: ['TASK-06'],
      baseEffort: 5,
      reachMultiplier: 1.0,
      impactMultiplier: 2.5,
      confidenceMultiplier: 0.85
    },
    {
      id: 'TASK-08',
      title: 'Craft Modern Dark-Mode UI Design System & Layout',
      category: 'Frontend',
      description: 'Develop responsive glassmorphic shell, typography hierarchy, custom CSS variables, and navigation header.',
      prerequisites: [],
      baseEffort: 3,
      reachMultiplier: 1.5,
      impactMultiplier: 1.5,
      confidenceMultiplier: 0.95
    },
    {
      id: 'TASK-09',
      title: 'Build Interactive Workflow Input Studio & Presets',
      category: 'Frontend',
      description: 'Create responsive input form with validation, preset demo loaders, velocity sliders, and generation state indicator.',
      prerequisites: ['TASK-08', 'TASK-03'],
      baseEffort: 3,
      reachMultiplier: 1.4,
      impactMultiplier: 2.0,
      confidenceMultiplier: 0.9
    },
    {
      id: 'TASK-10',
      title: 'Build PRD Viewer & User Story Accordion View',
      category: 'Frontend',
      description: 'Implement structured PRD document renderer with section anchors, copy-to-clipboard, and interactive Gherkin acceptance story cards.',
      prerequisites: ['TASK-08', 'TASK-04'],
      baseEffort: 3,
      reachMultiplier: 1.3,
      impactMultiplier: 2.0,
      confidenceMultiplier: 0.9
    },
    {
      id: 'TASK-11',
      title: 'Develop Filterable Engineering Task Matrix Component',
      category: 'Frontend',
      description: 'Build searchable and sortable table with category badges, priority color coding, story point pills, and dependency chips.',
      prerequisites: ['TASK-08', 'TASK-05'],
      baseEffort: 3,
      reachMultiplier: 1.2,
      impactMultiplier: 2.0,
      confidenceMultiplier: 0.9
    },
    {
      id: 'TASK-12',
      title: 'Build Interactive Sprint Board & Capacity Meters',
      category: 'Frontend',
      description: 'Create Kanban-style sprint columns with capacity progress meters (allocated vs velocity) and task status indicators.',
      prerequisites: ['TASK-07', 'TASK-08'],
      baseEffort: 5,
      reachMultiplier: 1.3,
      impactMultiplier: 2.5,
      confidenceMultiplier: 0.85
    },
    {
      id: 'TASK-13',
      title: 'Render Interactive SVG Dependency DAG Graph',
      category: 'Frontend',
      description: 'Implement dynamic SVG node-link graph displaying task prerequisite flows, topological layers, and critical path highlights.',
      prerequisites: ['TASK-06', 'TASK-08'],
      baseEffort: 5,
      reachMultiplier: 1.1,
      impactMultiplier: 2.0,
      confidenceMultiplier: 0.8
    },
    {
      id: 'TASK-14',
      title: 'Implement Multi-Format Export Engine (MD, Jira, CSV)',
      category: 'Backend',
      description: 'Create utilities to format workflow data into Jira CSV, Linear CSV, PRD Markdown, and raw JSON export downloads.',
      prerequisites: ['TASK-03', 'TASK-07'],
      baseEffort: 2,
      reachMultiplier: 1.1,
      impactMultiplier: 1.5,
      confidenceMultiplier: 0.95
    },
    {
      id: 'TASK-15',
      title: 'Build Admin Monitoring Dashboard & Metrics Charts',
      category: 'Frontend',
      description: 'Develop analytics overview with stat cards, execution latency logs, workflow history table, and live rule tuner.',
      prerequisites: ['TASK-08', 'TASK-03'],
      baseEffort: 5,
      reachMultiplier: 1.0,
      impactMultiplier: 2.0,
      confidenceMultiplier: 0.9
    },
    {
      id: 'TASK-16',
      title: 'Automated Test Suite & End-to-End Pipeline Verification',
      category: 'QA/Testing',
      description: 'Build automated verification suite covering API endpoints, RICE scoring edge cases, DAG cycle detection, and UI responsiveness.',
      prerequisites: ['TASK-07', 'TASK-12', 'TASK-15'],
      baseEffort: 3,
      reachMultiplier: 1.0,
      impactMultiplier: 2.0,
      confidenceMultiplier: 0.9
    }
  ];

  return tasks;
}

module.exports = {
  generateUserStories,
  generateEngineeringTasks
};
