/**
 * SprintForge AI - Main Single Page Application Controller
 */

const PRESETS = [
  {
    title: 'AI Customer Support Copilot',
    prompt: 'AI Customer Support Copilot with real-time sentiment analysis, auto-categorization of tickets, smart response synthesis, and automated escalation to Tier 2 agents.',
    audience: 'Support directors, enterprise service desks, and Tier 1 customer agents',
    stack: 'Node.js, PostgreSQL + pgvector, OpenAI API, Redis, Vanilla JS UI',
    velocity: 30,
    risk: 'Balanced'
  },
  {
    title: 'Real-time Collab Whiteboard',
    prompt: 'Real-time collaborative whiteboard canvas with multiplayer cursor tracking, CRDT shape synchronization, sticky notes, live comments, and version history snapshots.',
    audience: 'Distributed design teams, agile sprint planners, and remote engineering leads',
    stack: 'Node.js, WebSockets, HTML5 Canvas, Redis Pub/Sub, PostgreSQL',
    velocity: 35,
    risk: 'Balanced'
  },
  {
    title: 'Subscription Billing & Invoicing Engine',
    prompt: 'Multi-tenant subscription billing engine with Stripe webhook synchronization, metered usage tracking, tiered seat pricing, automated PDF invoicing, and dunning retry logic.',
    audience: 'SaaS founders, finance controllers, and billing operations leads',
    stack: 'Node.js, Express, PostgreSQL with ACID transactions, Stripe API, Docker',
    velocity: 28,
    risk: 'Conservative'
  },
  {
    title: 'Biometric Zero-Trust Gateway',
    prompt: 'Enterprise biometric authentication gateway supporting FIDO2 WebAuthn, hardware keys, adaptive risk-based step-up authentication, session revocation, and immutable audit logs.',
    audience: 'Enterprise CISOs, security compliance officers, and devsecops teams',
    stack: 'Node.js, WebAuthn API, Redis session store, PostgreSQL, Argon2',
    velocity: 25,
    risk: 'Conservative'
  }
];

const App = {
  currentWorkflow: null,
  activeFilterCategory: 'All',
  activeFilterPriority: 'All',
  taskSearchQuery: '',
  selectedPresetIdx: null,

  async init() {
    this.bindEvents();
    this.renderPresets();
    this.handleRoute();

    // Check if there is an existing workflow to load (without auto-scrolling)
    try {
      const workflows = await API.fetchWorkflows({ limit: 1 });
      if (workflows && workflows.length > 0) {
        await this.loadWorkflowById(workflows[0].id, false, false);
      }
    } catch (e) {
      console.log('No existing workflows loaded initially.');
    }
  },

  bindEvents() {
    // Navigation
    document.getElementById('nav-btn-studio')?.addEventListener('click', () => this.switchView('studio'));
    document.getElementById('nav-btn-admin')?.addEventListener('click', () => this.switchView('admin'));

    // Hash change routing
    window.addEventListener('hashchange', () => this.handleRoute());

    // Window resize debounced re-render
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.location.hash === '#admin') {
          AdminDashboard.loadMetrics();
        } else if (this.currentWorkflow) {
          const activeTab = document.querySelector('.ws-tab-btn.active')?.getAttribute('data-tab');
          if (activeTab === 'dag') {
            this.renderDAGGraph();
          }
        }
      }, 250);
    });

    // Velocity slider
    const velocitySlider = document.getElementById('input-velocity');
    const velocityBadge = document.getElementById('velocity-val-badge');
    if (velocitySlider && velocityBadge) {
      velocitySlider.addEventListener('input', (e) => {
        velocityBadge.textContent = `${e.target.value} pts`;
      });
    }

    // Form submission
    const form = document.getElementById('studio-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleGenerate(e));
    }

    // Workspace tabs
    const wsTabBtns = document.querySelectorAll('.ws-tab-btn');
    wsTabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchWorkspaceTab(tab);
      });
    });

    // Task search & filter
    const searchInput = document.getElementById('task-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.taskSearchQuery = e.target.value.toLowerCase();
        this.renderTaskMatrix();
      });
    }

    const catFilter = document.getElementById('task-category-filter');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        this.activeFilterCategory = e.target.value;
        this.renderTaskMatrix();
      });
    }

    const prioFilter = document.getElementById('task-priority-filter');
    if (prioFilter) {
      prioFilter.addEventListener('change', (e) => {
        this.activeFilterPriority = e.target.value;
        this.renderTaskMatrix();
      });
    }

    // Status change in banner
    const statusSelect = document.getElementById('workflow-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', async (e) => {
        if (!this.currentWorkflow) return;
        try {
          await API.updateWorkflowStatus(this.currentWorkflow.id, e.target.value);
          this.currentWorkflow.status = e.target.value;
          this.showToast(`Updated status to ${e.target.value}`, 'success');
        } catch (err) {
          this.showToast('Failed to update status', 'error');
        }
      });
    }

    // Export buttons
    document.getElementById('export-md-btn')?.addEventListener('click', () => {
      if (this.currentWorkflow) API.downloadExport(this.currentWorkflow.id, 'markdown');
    });
    document.getElementById('export-jira-btn')?.addEventListener('click', () => {
      if (this.currentWorkflow) API.downloadExport(this.currentWorkflow.id, 'jira');
    });
    document.getElementById('export-linear-btn')?.addEventListener('click', () => {
      if (this.currentWorkflow) API.downloadExport(this.currentWorkflow.id, 'linear');
    });
    document.getElementById('export-json-btn')?.addEventListener('click', () => {
      if (this.currentWorkflow) API.downloadExport(this.currentWorkflow.id, 'json');
    });

    // Copy PRD Markdown
    document.getElementById('copy-prd-btn')?.addEventListener('click', async () => {
      if (!this.currentWorkflow) return;
      try {
        const res = await fetch(`/api/workflows/${this.currentWorkflow.id}/export/markdown`);
        if (res.ok) {
          const md = await res.text();
          await navigator.clipboard.writeText(md);
          this.showToast('PRD Markdown copied to clipboard!', 'success');
          return;
        }
      } catch (err) {}

      const text = document.getElementById('prd-content-area')?.innerText;
      if (text) {
        navigator.clipboard.writeText(text);
        this.showToast('PRD content copied to clipboard!', 'success');
      }
    });

    // Modal close
    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
      document.getElementById('task-modal').style.display = 'none';
    });
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('task-modal');
      if (e.target === modal) modal.style.display = 'none';
    });

    // ESC key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('task-modal');
        if (modal) modal.style.display = 'none';
      }
    });

    // Global modal helper for SVG DAG
    window.showTaskDetailsModal = (task) => this.openTaskModal(task);
  },

  handleRoute() {
    if (window.location.hash === '#admin') {
      this.switchView('admin');
    } else {
      this.switchView('studio');
    }
  },

  switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));

    if (viewName === 'admin') {
      document.getElementById('view-admin')?.classList.add('active');
      document.getElementById('nav-btn-admin')?.classList.add('active');
      if (window.location.hash !== '#admin') {
        window.location.hash = '#admin';
      }
      AdminDashboard.init();
    } else {
      document.getElementById('view-studio')?.classList.add('active');
      document.getElementById('nav-btn-studio')?.classList.add('active');
      if (window.location.hash === '#admin') {
        window.location.hash = '#studio';
      }
    }
  },

  renderPresets() {
    const container = document.getElementById('presets-chips-box');
    if (!container) return;

    container.innerHTML = PRESETS.map((p, idx) => `
      <button type="button" class="preset-chip ${this.selectedPresetIdx === idx ? 'active' : ''}" onclick="App.applyPreset(${idx})">
        <span>✨</span> ${p.title}
      </button>
    `).join('');
  },

  applyPreset(idx) {
    this.selectedPresetIdx = idx;
    this.renderPresets();

    const p = PRESETS[idx];
    if (!p) return;

    const elPrompt = document.getElementById('input-prompt');
    const elAudience = document.getElementById('input-audience');
    const elStack = document.getElementById('input-tech-stack');
    const elVelocity = document.getElementById('input-velocity');
    const elBadge = document.getElementById('velocity-val-badge');
    const elRisk = document.getElementById('input-risk');

    if (elPrompt) elPrompt.value = p.prompt;
    if (elAudience) elAudience.value = p.audience;
    if (elStack) elStack.value = p.stack;
    if (elVelocity) elVelocity.value = p.velocity;
    if (elBadge) elBadge.textContent = `${p.velocity} pts`;
    if (elRisk) elRisk.value = p.risk;

    this.showToast(`Applied preset: ${p.title}`, 'success');
  },

  async handleGenerate(e) {
    e.preventDefault();

    const prompt = document.getElementById('input-prompt').value.trim();
    if (!prompt) {
      this.showToast('Please enter a feature idea prompt.', 'error');
      return;
    }

    const payload = {
      prompt,
      targetAudience: document.getElementById('input-audience').value.trim(),
      techStack: document.getElementById('input-tech-stack').value.trim(),
      teamVelocity: parseInt(document.getElementById('input-velocity').value, 10) || 30,
      riskProfile: document.getElementById('input-risk').value
    };

    const submitBtn = document.getElementById('btn-submit-generate');
    const progressBox = document.getElementById('generation-stepper');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⚡</span> Synthesizing Blueprint...';
    progressBox.classList.add('active');

    // Animate Stepper
    const stepIds = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5', 'step-6'];
    stepIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'step-item';
    });

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < stepIds.length) {
        if (currentStep > 0) {
          const prev = document.getElementById(stepIds[currentStep - 1]);
          if (prev) prev.className = 'step-item done';
        }
        const active = document.getElementById(stepIds[currentStep]);
        if (active) active.className = 'step-item active';
        currentStep++;
      }
    }, 280);

    try {
      const workflow = await API.generateWorkflow(payload);
      clearInterval(interval);

      // Mark all done
      stepIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = 'step-item done';
      });

      setTimeout(() => {
        progressBox.classList.remove('active');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>⚡</span> Synthesize PRD & Plan Sprints';
        this.renderWorkflow(workflow, true);
        this.showToast('Workflow synthesized & saved to SQLite!', 'success');
      }, 400);

    } catch (err) {
      clearInterval(interval);
      progressBox.classList.remove('active');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>⚡</span> Synthesize PRD & Plan Sprints';
      this.showToast(`Generation failed: ${err.message}`, 'error');
    }
  },

  async loadWorkflowById(id, shouldSwitchView = false, shouldScroll = true) {
    try {
      const workflow = await API.fetchWorkflowById(id);
      if (shouldSwitchView) {
        this.switchView('studio');
      }
      this.renderWorkflow(workflow, shouldScroll);
    } catch (err) {
      console.error('Failed to load workflow:', err);
    }
  },

  renderWorkflow(workflow, shouldScroll = true) {
    if (!workflow) return;
    this.currentWorkflow = workflow;
    const wrapper = document.getElementById('workspace-wrapper');
    if (!wrapper) return;
    wrapper.classList.add('active');

    // Banner elements
    const prd = workflow.prd || {};
    const metrics = workflow.metrics || {};
    const sprints = Array.isArray(workflow.sprints) ? workflow.sprints : [];

    document.getElementById('banner-domain').textContent = prd.domainCategory || 'Feature Architecture';
    document.getElementById('banner-title').textContent = workflow.title || 'Product Blueprint';
    document.getElementById('banner-target').textContent = `Target: ${workflow.targetAudience || prd.targetAudience || 'General Users'}`;
    document.getElementById('banner-tech').textContent = `Stack: ${workflow.techStack || prd.techStack || 'Node.js, SQLite'}`;

    document.getElementById('stat-total-points').textContent = metrics.totalPoints || 0;
    document.getElementById('stat-sprints-count').textContent = sprints.length;
    document.getElementById('stat-critical-path').textContent = `${metrics.criticalPathPoints || 0} pts`;

    const statusSelect = document.getElementById('workflow-status-select');
    if (statusSelect) {
      statusSelect.value = workflow.status || 'Draft';
    }

    // Render Sub-Views
    this.renderPRD();
    this.renderUserStories();
    this.renderTaskMatrix();
    this.renderSprintBoard();
    this.renderDAGGraph();

    // Scroll smoothly to workspace only when explicitly requested
    if (shouldScroll) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  switchWorkspaceTab(tabId) {
    document.querySelectorAll('.ws-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.ws-tab-content').forEach(content => content.classList.remove('active'));

    const activeBtn = document.querySelector(`.ws-tab-btn[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`tab-content-${tabId}`);

    if (activeBtn) activeBtn.classList.add('active');
    if (activeContent) activeContent.classList.add('active');

    if (tabId === 'dag') {
      // Delay slightly so layout calculates properly
      setTimeout(() => this.renderDAGGraph(), 50);
    }
  },

  renderPRD() {
    if (!this.currentWorkflow || !this.currentWorkflow.prd) return;
    const prd = this.currentWorkflow.prd;

    document.getElementById('prd-exec-summary').textContent = prd.executiveSummary || 'No executive summary provided.';
    document.getElementById('prd-problem-statement').textContent = prd.problemStatement || 'No problem statement provided.';

    // Personas
    const personasContainer = document.getElementById('prd-personas-container');
    const personas = Array.isArray(prd.personas) ? prd.personas : [];
    personasContainer.innerHTML = personas.map(p => `
      <div class="persona-card">
        <div class="persona-name">${p.name}</div>
        <div class="persona-role">${p.role}</div>
        <div class="persona-detail"><strong>Pain:</strong> ${p.pain}</div>
        <div class="persona-detail"><strong>Outcome:</strong> ${p.goal}</div>
      </div>
    `).join('');

    // Functional Requirements Table
    const frTbody = document.getElementById('prd-fr-tbody');
    const reqs = Array.isArray(prd.functionalRequirements) ? prd.functionalRequirements : [];
    frTbody.innerHTML = reqs.map(fr => {
      let badgeClass = 'badge-could';
      if (fr.priority === 'Must Have') badgeClass = 'badge-must';
      else if (fr.priority === 'Should Have') badgeClass = 'badge-should';

      return `
        <tr>
          <td><span style="font-family:JetBrains Mono, monospace; font-weight:700; color:#06B6D4;">${fr.id}</span></td>
          <td style="font-weight:600; color:#fff;">${fr.title}</td>
          <td><span class="badge ${badgeClass}">${fr.priority}</span></td>
          <td style="color:#CBD5E1;">${fr.description}</td>
          <td style="font-size:0.8rem; color:#94A3B8;">${fr.acceptanceCriteria}</td>
        </tr>
      `;
    }).join('');

    // Non-Functional Specs
    const nfrContainer = document.getElementById('prd-nfr-list');
    const nfrs = Array.isArray(prd.nonFunctionalRequirements) ? prd.nonFunctionalRequirements : [];
    nfrContainer.innerHTML = nfrs.map(nfr => `
      <li style="margin-bottom:0.6rem; color:#CBD5E1;">
        <strong style="color:#fff;">${nfr.category}:</strong> ${nfr.spec}
      </li>
    `).join('');

    // KPIs Table
    const kpiTbody = document.getElementById('prd-kpi-tbody');
    const kpis = Array.isArray(prd.kpis) ? prd.kpis : [];
    kpiTbody.innerHTML = kpis.map(k => `
      <tr>
        <td style="font-weight:700; color:#fff;">${k.metric}</td>
        <td style="color:#94A3B8;">${k.baseline}</td>
        <td><strong style="color:#10B981;">${k.target}</strong></td>
        <td><span class="badge" style="background:rgba(16, 185, 129, 0.1); color:#10B981;">${k.impact}</span></td>
      </tr>
    `).join('');

    // Scope boundaries
    const inScopeList = document.getElementById('prd-in-scope-list');
    const inScope = Array.isArray(prd.inScope) ? prd.inScope : [];
    inScopeList.innerHTML = inScope.map(item => `<li>${item}</li>`).join('');

    const outScopeList = document.getElementById('prd-out-scope-list');
    const outScope = Array.isArray(prd.outOfScopeV1) ? prd.outOfScopeV1 : [];
    outScopeList.innerHTML = outScope.map(item => `<li>${item}</li>`).join('');
  },

  renderUserStories() {
    if (!this.currentWorkflow) return;
    const stories = Array.isArray(this.currentWorkflow.stories) ? this.currentWorkflow.stories : [];
    const container = document.getElementById('stories-grid-container');

    const formatGherkin = (criterion) => {
      return criterion.replace(
        /^(Given|When|Then|And|But)\b/i,
        '<span class="gherkin-tag">$1</span>'
      );
    };

    container.innerHTML = stories.map(s => `
      <div class="story-card">
        <div class="story-header">
          <span class="story-id">${s.id}</span>
          <span class="story-value">Value: ${s.businessValue}/10</span>
        </div>
        <div class="story-title">${s.title}</div>
        <div class="story-user-statement">
          <span class="statement-part"><strong>AS A</strong> ${s.role}</span>
          <span class="statement-part"><strong>I WANT TO</strong> ${s.action}</span>
          <span class="statement-part"><strong>SO THAT</strong> ${s.benefit}</span>
        </div>
        <div class="story-criteria-title">Acceptance Criteria (Gherkin):</div>
        <ul class="criteria-list">
          ${(s.acceptanceCriteria || []).map(c => `<li>${formatGherkin(c)}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  },

  renderTaskMatrix() {
    if (!this.currentWorkflow) return;
    const tasks = Array.isArray(this.currentWorkflow.tasks) ? this.currentWorkflow.tasks : [];
    const tbody = document.getElementById('task-matrix-tbody');

    const filtered = tasks.filter(t => {
      const matchesSearch = !this.taskSearchQuery ||
        t.title.toLowerCase().includes(this.taskSearchQuery) ||
        t.description.toLowerCase().includes(this.taskSearchQuery) ||
        t.id.toLowerCase().includes(this.taskSearchQuery);

      const matchesCat = this.activeFilterCategory === 'All' || t.category === this.activeFilterCategory;
      const matchesPrio = this.activeFilterPriority === 'All' || t.priority === this.activeFilterPriority;

      return matchesSearch && matchesCat && matchesPrio;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:#64748B;">No tasks match the selected filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const prioClass = `badge-${t.priority.toLowerCase()}`;
      const deps = t.prerequisites && t.prerequisites.length > 0
        ? t.prerequisites.map(d => `<span style="font-family:JetBrains Mono, monospace; color:#06B6D4; background:rgba(6, 182, 212, 0.1); padding:0.1rem 0.4rem; border-radius:3px; margin-right:3px; font-size:0.75rem;">${d}</span>`).join('')
        : '<span style="color:#64748B; font-size:0.75rem;">None</span>';

      const rice = t.rice || { score: '-', reach: '-', impact: '-', confidence: '-' };

      return `
        <tr onclick="App.openTaskModalById('${t.id}')" style="cursor:pointer;" title="Click to view task details">
          <td>
            <span style="font-family:JetBrains Mono, monospace; font-weight:700; color:#fff;">${t.id}</span>
            ${t.isCriticalPath ? '<span class="badge badge-critical-path" style="margin-left:4px; font-size:0.65rem;">Critical</span>' : ''}
          </td>
          <td>
            <div style="font-weight:600; color:#fff;">${t.title}</div>
            <div style="font-size:0.75rem; color:#94A3B8; margin-top:0.2rem;">${t.description}</div>
          </td>
          <td><span class="badge badge-category">${t.category}</span></td>
          <td><span class="badge ${prioClass}">${t.priority} • ${t.priorityLabel || ''}</span></td>
          <td>
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <strong style="color:#06B6D4; font-family:JetBrains Mono, monospace;">${t.storyPoints} pts</strong>
              <span style="color:#64748B; font-size:0.75rem;">(${t.estimatedHours}h)</span>
            </div>
          </td>
          <td>
            <div style="font-family:JetBrains Mono, monospace; font-size:0.8rem; color:#10B981; font-weight:700;">
              ${rice.score}
            </div>
            <div style="font-size:0.68rem; color:#64748B;">
              R:${rice.reach} | I:${rice.impact} | C:${rice.confidence}%
            </div>
          </td>
          <td>${deps}</td>
          <td><span class="badge" style="background:var(--bg-tertiary); color:#fff;">Sprint ${t.assignedSprint || 1}</span></td>
        </tr>
      `;
    }).join('');
  },

  renderSprintBoard() {
    if (!this.currentWorkflow) return;
    const sprints = Array.isArray(this.currentWorkflow.sprints) ? this.currentWorkflow.sprints : [];
    const container = document.getElementById('sprint-board-container');

    container.innerHTML = sprints.map(sprint => {
      let fillClass = 'fill-safe';
      if (sprint.risk === 'High') fillClass = 'fill-high';
      else if (sprint.risk === 'Moderate') fillClass = 'fill-moderate';

      const sprintTasks = Array.isArray(sprint.tasks) ? sprint.tasks : [];

      return `
        <div class="sprint-column">
          <div class="sprint-col-header">
            <div class="sprint-col-title">
              <span>${sprint.name}</span>
              <span class="badge" style="background:rgba(6, 182, 212, 0.15); color:#06B6D4;">${sprint.taskCount} tasks</span>
            </div>
            <div class="sprint-theme-tag">${sprint.theme}</div>
            <div class="sprint-goal-text">${sprint.goal}</div>

            <div class="capacity-meter-wrap">
              <div class="capacity-meter-labels">
                <span style="color:#94A3B8;">Velocity Capacity</span>
                <span style="color:#fff;">${sprint.allocatedPoints} / ${sprint.capacity} pts (${sprint.utilization}%)</span>
              </div>
              <div class="capacity-progress-bar">
                <div class="capacity-progress-fill ${fillClass}" style="width: ${Math.min(100, sprint.utilization)}%;"></div>
              </div>
            </div>
          </div>

          <div class="sprint-tasks-list" style="display:flex; flex-direction:column; gap:0.75rem;">
            ${sprintTasks.map(t => `
              <div class="sprint-task-card" onclick="App.openTaskModalById('${t.id}')">
                <div class="sprint-task-header">
                  <span style="font-family:JetBrains Mono, monospace; font-size:0.75rem; font-weight:700; color:#06B6D4;">${t.id}</span>
                  <span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span>
                </div>
                <div class="sprint-task-title">${t.title}</div>
                <div class="sprint-task-footer">
                  <span class="badge badge-category">${t.category}</span>
                  <strong style="color:#fff; font-family:JetBrains Mono, monospace;">${t.storyPoints} pts</strong>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  renderDAGGraph() {
    if (!this.currentWorkflow) return;
    const svg = document.getElementById('dag-svg-canvas');
    if (svg) {
      renderDAG(svg, this.currentWorkflow.tasks, this.currentWorkflow.metrics?.criticalPathTasks || []);
    }
  },

  openTaskModalById(taskId) {
    if (!this.currentWorkflow || !Array.isArray(this.currentWorkflow.tasks)) return;
    const task = this.currentWorkflow.tasks.find(t => t.id === taskId);
    if (task) {
      this.openTaskModal(task);
    }
  },

  openTaskModal(task) {
    const modal = document.getElementById('task-modal');
    if (!modal) return;

    document.getElementById('modal-task-id').textContent = task.id;
    document.getElementById('modal-task-title').textContent = task.title;
    document.getElementById('modal-task-desc').textContent = task.description;
    document.getElementById('modal-task-cat').textContent = task.category;
    document.getElementById('modal-task-prio').textContent = `${task.priority} (${task.priorityLabel || ''})`;
    document.getElementById('modal-task-points').textContent = `${task.storyPoints} pts (${task.estimatedHours} hours)`;

    const rice = task.rice || { score: '-', reach: '-', impact: '-', confidence: '-', effort: '-' };
    document.getElementById('modal-task-rice').textContent = `Score: ${rice.score} (Reach: ${rice.reach}, Impact: ${rice.impact}, Confidence: ${rice.confidence}%, Effort: ${rice.effort})`;
    document.getElementById('modal-task-deps').textContent = task.prerequisites && task.prerequisites.length > 0 ? task.prerequisites.join(', ') : 'None (Root Node)';
    document.getElementById('modal-task-critical').textContent = task.isCriticalPath ? 'YES (On Critical Path)' : 'No';

    modal.style.display = 'flex';
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : '⚠️'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
