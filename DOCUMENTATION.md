# SprintForge AI — PRD → Sprint Planner
## Full-Stack Workflow Automation Platform — Comprehensive Documentation

---

## Executive Summary & Deliverables Sheet

| Deliverable | Details / Link |
| :--- | :--- |
| **Product Track** | Tech / Product — PRD → Sprint Planner |
| **GitHub Repository** | [https://github.com/dhana2812/Sprint-Planner](https://github.com/dhana2812/Sprint-Planner) |
| **Application Type** | Full-Stack SPA + Node.js Express REST API + SQLite Database |
| **Live Local Instance** | `http://localhost:3000` (Studio) \| `http://localhost:3000#admin` (Telemetry) |
| **Commit History** | 8 Milestones (exceeds minimum 6 staged commits) |

---

# 1. System Architecture (System Thinking — 30%)

SprintForge AI is an autonomous, full-stack decision-making pipeline designed to convert unstructured product feature prompts into production-grade **Product Requirement Documents (PRDs)**, atomic **User Stories** with Gherkin acceptance criteria, granular **Engineering Tasks**, and **Capacity-Balanced Sprint Roadmaps** with topological dependency resolution.

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND STUDIO & WORKSPACE (SPA)                    │
│   • Obsidian Glassmorphism UI (HTML5, Vanilla CSS3, ES6+ JavaScript)   │
│   • 4 Architectural Quick-Presets                                       │
│   • Interactive Workspace: PRD | Stories | Tasks | Sprints | SVG DAG    │
│   • Admin Observability & Dynamic Rule Calibrator                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP REST (JSON)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   BACKEND GATEWAY (Node.js & Express)                   │
│   • 10 RESTful Endpoints (/api/workflows/*, /api/admin/*)              │
│   • Input Validation & Error Boundaries                                 │
│   • Export Engine (Markdown, Jira CSV, Linear CSV, JSON)               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 6-STAGE MULTI-PIPELINE ORCHESTRATOR                     │
│                                                                         │
│  [Stage 1] Domain & Concept Analysis Engine (analyzer.js)               │
│  [Stage 2] PRD Synthesis Engine (prdGenerator.js)                       │
│  [Stage 3] Story & Task Decomposition Engine (taskEngine.js)            │
│  [Stage 4] Smart Logic Layer: RICE Scoring & DAG Sort (smartLogic.js)   │
│  [Stage 5] Capacity-Constrained Bin-Packing Allocator (sprintAlloc.js)  │
│  [Stage 6] Persistent Relational Storage & Telemetry (orchestrator.js) │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ SQL Queries
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PERSISTENT RELATIONAL DATABASE                      │
│   • SQLite Engine (sql.js pure WebAssembly, WAL mode emulation)         │
│   • Tables: workflows | execution_logs | system_config                 │
│   • File: data/sprintforge.db                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Pipeline Execution Flow
1. **User Submission**: The user inputs a raw feature prompt, selecting audience, tech stack, team velocity (15–60 pts), and risk profile (Balanced, Conservative, Aggressive).
2. **Analysis**: Keyword frequency scoring maps the idea into one of 5 technical domains (`AI/ML`, `FinTech`, `Collaboration`, `Security/Auth`, `SaaS`).
3. **Decomposition**: Generates 6 functional requirements (MoSCoW), 4 non-functional benchmarks, 4 business KPIs, 5 Gherkin user stories, and 16 engineering tasks.
4. **Smart Logic Processing**: Tasks undergo mathematical RICE scoring and Kahn's topological sort for prerequisite ordering and critical path determination.
5. **Sprint Bin-Packing**: Tasks are sequentially packed into 4 thematic sprint buckets adhering to team velocity constraints.
6. **Relational Persistence**: Complete workflow state and per-stage latency telemetry are committed into SQLite.
7. **Structured Output**: Result is rendered into a 5-tab workspace without raw JSON.

---

# 2. Frontend Implementation (Integration — 20%)

The frontend is a bespoke Single Page Application (SPA) built with vanilla HTML5, CSS3, and modern ES6+ JavaScript, with zero bulky external framework overhead.

### 2.1 Core Modules & Views
- **Studio Hero & Input Form**:
  - 4 one-click architectural presets (*AI Customer Support Copilot*, *Real-time Collaborative Whiteboard*, *Subscription Billing Engine*, *Biometric Zero-Trust Gateway*).
  - Dynamic velocity capacity range slider with real-time story point readout.
  - Animated 6-stage pipeline progress stepper.
- **Top Summary Banner**:
  - Displays domain tag, title, tech stack, total points, sprint count, and critical path effort.
  - Interactive lifecycle workflow status dropdown (`Draft` → `In Review` → `Approved` → `In Sprint` → `Completed`).
  - 4 Export buttons: **Markdown**, **Jira CSV**, **Linear CSV**, and **JSON**.
- **5-in-1 Output Workspace**:
  1. **PRD Document**: Formatted spec document featuring Executive Summary, Problem Statement, Personas (Pain vs Desired Outcome), Functional Requirements (Must/Should/Could), Non-Functional Specs, KPIs, and Scope Boundaries.
  2. **User Stories**: Kanban cards formatted with `AS A`, `I WANT TO`, `SO THAT` and highlighted Gherkin acceptance criteria (`Given`, `When`, `Then`, `And`).
  3. **Engineering Task Matrix**: Live searchable and filterable table (by category and P0–P3 priority) showing points, hours, RICE metrics, and dependency chips.
  4. **Sprint Execution Board**: Kanban columns featuring capacity progress meters with risk state coloring (Safe Green, Moderate Amber, High Red).
  5. **Dependency DAG Canvas**: SVG canvas rendering directed prerequisite Bézier arrows, category node coloring, phase divider lines, and glowing critical path indicators.
- **Task Detail Inspection Modal**:
  - Accessible by clicking any task row in the matrix, sprint card, or DAG node. Displays complete RICE formula components.

---

# 3. Backend Logic & Smart Logic Layer (Logic Layer — 15%)

The platform differentiates itself from generic AI chatbots by embedding an explicit **algorithmic decision-making pipeline**:

### 3.1 RICE Priority Scoring Engine
Every decomposed engineering task is scored mathematically:

$$\text{RICE Score} = \frac{\text{Reach} \times \text{Impact} \times \text{Confidence}}{\text{Effort}}$$

- **Reach (1–10)**: Estimated user and system touchpoints.
- **Impact (1–10)**: Business value leverage.
- **Confidence (50%–100%)**: Technical certainty.
- **Effort (Fibonacci)**: Story points mapped to $\{1, 2, 3, 5, 8, 13\}$ and converted to hours ($6\text{ hrs/pt}$).
- **Risk Profile Buffering**:
  - *Conservative*: Multiplies effort by $1.3\times$ (+30% testing buffer).
  - *Aggressive*: Multiplies effort by $0.8\times$ (lean fast prototype).
  - *Balanced*: Standard factor ($1.0\times$).
- **Priority Tiering**: Tasks are automatically grouped into quartiles: `P0 (Critical)`, `P1 (High)`, `P2 (Medium)`, `P3 (Low)`.

### 3.2 Topological DAG Dependency & Critical Path Analysis
SprintForge AI prevents circular dependencies using **Kahn's Topological Sorting Algorithm**:
1. Builds adjacency lists for incoming prerequisites and outgoing dependents.
2. Identifies root nodes ($\text{in-degree} = 0$) and calculates topological layers.
3. Detects circular dependencies to guarantee a Directed Acyclic Graph (DAG).
4. Computes the **Critical Path** (the longest path through the project weighted by story points) to identify bottleneck tasks.

### 3.3 Capacity-Constrained Sprint Bin-Packing
Tasks are allocated into 4 sequential thematic sprints:
- **Sprint 1: Foundations** (Data schema & infrastructure)
- **Sprint 2: Core Logic** (Backend API & business rules)
- **Sprint 3: Interactive Workspaces** (Frontend UI & client state)
- **Sprint 4: Hardening** (QA, security audit & end-to-end testing)

Tasks are prioritized by topological layer first, then RICE score. The allocator verifies that no task is scheduled before its prerequisites and respects team velocity capacity.

---

# 4. Database Design (Database & Admin — 20%)

The system uses an embedded relational SQLite database with persistent disk storage at `data/sprintforge.db`.

### 4.1 Schema Definition

#### Table 1: `workflows`
Stores complete synthesized product blueprints and metadata.
- `id` (TEXT, PK): Unique workflow ID (e.g., `wf_a1b2c3d4e5f6`).
- `title` (TEXT): Synthesized blueprint name.
- `prompt` (TEXT): Raw input concept.
- `target_audience`, `tech_stack` (TEXT): Operational context.
- `team_velocity` (INTEGER): Sprint capacity in story points.
- `risk_profile` (TEXT): Risk tolerance profile.
- `prd_data`, `stories_data`, `tasks_data`, `sprints_data`, `metrics_data` (TEXT JSON): Serialized structured models.
- `status` (TEXT): Workflow lifecycle state.
- `created_at`, `updated_at` (TEXT): Timestamps.

#### Table 2: `execution_logs`
Fine-grained telemetry tracking each pipeline stage duration in milliseconds.
- `id` (INTEGER, PK AUTOINCREMENT)
- `workflow_id` (TEXT, FK)
- `stage` (TEXT): Stage name (e.g., `PRD Synthesis`, `Smart Logic Scoring & DAG`).
- `engine` (TEXT): Engine mode (`Rule_Hybrid` or `AI_Augmented`).
- `duration_ms` (INTEGER): Stage latency.
- `status` (TEXT): `SUCCESS` or `ERROR`.
- `details` (TEXT JSON): Diagnostic metadata.
- `created_at` (TEXT): Execution timestamp.

#### Table 3: `system_config`
Dynamic configuration table supporting live scoring weight calibration without server restart.
- Keys: `default_velocity`, `rice_reach_weight`, `rice_impact_weight`, `rice_confidence_weight`, `rice_effort_weight`, `max_sprints`, `engine_mode`.

---

# 5. Admin Dashboard & Monitoring

Navigating to `http://localhost:3000#admin` reveals the enterprise monitoring suite:
- **Real-Time Metric Cards**: Total Workflows, Total Story Points Planned, Average Pipeline Latency (ms), and Sprint Capacity Utilization (%).
- **HTML5 Canvas Visualizations**:
  - *Tasks by Category*: Bar chart grouping Database, Backend, Frontend, DevOps, and QA.
  - *Priority Breakdown*: Donut chart depicting P0 through P3 proportions.
- **Dynamic Rule Calibrator**: Live inputs allowing administrators to modify RICE multipliers or sprint counts on the fly.
- **Workflow Lifecycle Management**: Table listing past blueprints with live search, status updates, and delete actions.
- **Execution Telemetry Feed**: Audit trail tracking individual pipeline stage durations in milliseconds.

---

# 6. Git Commit Progression (Version Control — 10%)

The repository tracks full development progression across 8 distinct commits:

| Commit Hash | Commit Message | Development Scope |
| :--- | :--- | :--- |
| `7327646` | `feat(stage-1): initialize project structure and SQLite persistent storage layer` | Schema setup, database initialization, package scaffolding |
| `a9eb0c8` | `feat(stage-2): implement AI/rule engine, RICE scoring, DAG dependency detection, sprint bin packing, and REST API` | Core logic engines, topological sort, RICE calculator, API routes |
| `c5de311` | `feat(stage-3): build modern dark-mode frontend, PRD viewer, stories, task matrix, and interactive sprint board` | UI studio, forms, 4 output tabs, styles and responsive layout |
| `8704569` | `feat(stage-4): implement interactive SVG dependency DAG, admin monitoring dashboard, canvas charts, and telemetry` | SVG DAG canvas, Canvas charts, admin dashboard controllers |
| `bd780eb` | `feat(stage-5): end-to-end integration, dynamic rule tuner, and comprehensive documentation` | Exporter engine, documentation, configuration tuner |
| `3e4d034` | `feat(stage-6): production hardening with zero-dependency sql.js engine and cloud deployment config` | WebAssembly sql.js compatibility layer, render.yaml |
| `61babc0` | `fix(ui): polish UI glitches, fix DAG graph scrolling, canvas fallback, and table interactivity` | DAG scroll container, table click inspect, canvas dimensions |
| `6ab0a03` | `style(ui): elevate design system with deep obsidian aesthetic, sleek glassmorphism, and Gherkin syntax tags` | Obsidian UI polish, Gherkin syntax highlighting, GitHub pill |

---

# 7. Local Setup & Verification

```bash
# Clone the repository
git clone https://github.com/dhana2812/Sprint-Planner.git
cd Sprint-Planner

# Install dependencies (Pure JS - zero C++ compiler dependencies)
npm install

# Start the full-stack server
npm start
```

Access Points:
- **Studio & Workspace**: `http://localhost:3000`
- **Admin Dashboard**: `http://localhost:3000#admin`
- **Health Check**: `http://localhost:3000/api/health`
