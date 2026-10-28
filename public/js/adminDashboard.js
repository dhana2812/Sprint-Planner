/**
 * SprintForge AI - Admin Dashboard & Monitoring Controller
 */

const AdminDashboard = {
  async init() {
    await Promise.all([
      this.loadMetrics(),
      this.loadWorkflowsTable(),
      this.loadLogs(),
      this.loadConfig()
    ]);
  },

  async loadMetrics() {
    try {
      const data = await API.fetchAdminMetrics();

      const elWf = document.getElementById('m-total-workflows');
      const elPts = document.getElementById('m-total-points');
      const elLat = document.getElementById('m-avg-latency');
      const elUtil = document.getElementById('m-avg-utilization');

      if (elWf) elWf.textContent = data.totalWorkflows || 0;
      if (elPts) elPts.textContent = data.totalStoryPoints || 0;
      if (elLat) elLat.textContent = `${data.avgDurationMs || 0} ms`;
      if (elUtil) elUtil.textContent = `${data.avgUtilization || 0}%`;

      this.renderCategoryChart(data.categoryDistribution || {});
      this.renderPriorityChart(data.priorityDistribution || {});
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    }
  },

  renderCategoryChart(categories) {
    const canvas = document.getElementById('chart-categories');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
    const width = canvas.width = Math.max(280, parentWidth);
    const height = canvas.height = 220;

    ctx.clearRect(0, 0, width, height);

    const labels = Object.keys(categories);
    const values = Object.values(categories);
    const maxVal = Math.max(...values, 1);

    const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E'];
    const barWidth = Math.min(42, Math.max(20, (width - 60) / labels.length - 16));
    const startX = 40;
    const spacing = (width - 60) / Math.max(1, labels.length);

    labels.forEach((label, idx) => {
      const val = values[idx] || 0;
      const barHeight = (val / maxVal) * (height - 70);
      const x = startX + idx * spacing + (spacing - barWidth) / 2;
      const y = height - 40 - barHeight;

      // Draw bar with safe roundRect fallback
      ctx.fillStyle = colors[idx % colors.length];
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, barWidth, Math.max(4, barHeight), 4);
      } else {
        ctx.rect(x, y, barWidth, Math.max(4, barHeight));
      }
      ctx.fill();

      // Value text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val, x + barWidth / 2, y - 6);

      // Label text
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Plus Jakarta Sans, sans-serif';
      const shortLabel = label.split('/')[0];
      ctx.fillText(shortLabel, x + barWidth / 2, height - 14);
    });
  },

  renderPriorityChart(priorities) {
    const canvas = document.getElementById('chart-priorities');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
    const width = canvas.width = Math.max(280, parentWidth);
    const height = canvas.height = 220;

    ctx.clearRect(0, 0, width, height);

    const labels = ['P0', 'P1', 'P2', 'P3'];
    const colors = ['#FF4757', '#FFA502', '#00D2D3', '#747D8C'];
    const values = labels.map(l => priorities[l] || 0);
    const total = values.reduce((a, b) => a + b, 0);

    if (total === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '12px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No task priority data recorded yet', width / 2, height / 2);
      return;
    }

    // Draw Donut Chart
    const centerX = Math.max(70, width / 2 - 55);
    const centerY = height / 2;
    const radius = Math.min(65, height / 2 - 20);
    const innerRadius = Math.max(25, radius * 0.58);

    let startAngle = -Math.PI / 2;

    values.forEach((val, idx) => {
      if (val === 0) return;
      const sliceAngle = (val / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[idx];
      ctx.fill();

      startAngle += sliceAngle;
    });

    // Donut Center Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(total, centerX, centerY + 5);

    // Legend on Right
    const legX = Math.max(centerX + radius + 25, width - 110);
    labels.forEach((label, idx) => {
      const legY = Math.max(30, centerY - 45 + idx * 26);

      ctx.fillStyle = colors[idx];
      ctx.fillRect(legX, legY, 10, 10);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${label}: ${values[idx]}`, legX + 16, legY + 9);
    });
  },

  async loadWorkflowsTable(search = '', status = '') {
    try {
      const tbody = document.getElementById('admin-workflows-tbody');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748B;">Loading workflows...</td></tr>';

      const workflows = await API.fetchWorkflows({ search, status });
      if (workflows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748B;">No workflows found. Generate a new blueprint in the Studio!</td></tr>';
        return;
      }

      tbody.innerHTML = workflows.map(wf => `
        <tr>
          <td><span style="font-family:JetBrains Mono; font-size:0.8rem; color:#06B6D4;">${wf.id}</span></td>
          <td style="font-weight:600; color:#fff;">${wf.title}</td>
          <td><span class="badge badge-category">${wf.risk_profile || 'Balanced'}</span></td>
          <td><strong style="color:#06B6D4;">${wf.metrics ? wf.metrics.totalPoints : '-'}</strong></td>
          <td>
            <select class="status-dropdown" onchange="AdminDashboard.handleStatusChange('${wf.id}', this.value)">
              ${['Draft', 'In Review', 'Approved', 'In Sprint', 'Completed'].map(s => `
                <option value="${s}" ${wf.status === s ? 'selected' : ''}>${s}</option>
              `).join('')}
            </select>
          </td>
          <td style="color:#64748B; font-size:0.75rem;">${new Date(wf.created_at).toLocaleString()}</td>
          <td>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="App.loadWorkflowById('${wf.id}', true)">View</button>
              <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem; color:#F43F5E;" onclick="AdminDashboard.handleDeleteWorkflow('${wf.id}')">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load workflows table:', err);
    }
  },

  async handleStatusChange(id, status) {
    try {
      await API.updateWorkflowStatus(id, status);
      App.showToast(`Updated workflow status to ${status}`, 'success');
      this.loadMetrics();
      if (App.currentWorkflow && App.currentWorkflow.id === id) {
        App.currentWorkflow.status = status;
        const bannerStatus = document.getElementById('workflow-status-select');
        if (bannerStatus) bannerStatus.value = status;
      }
    } catch (err) {
      App.showToast('Failed to update status', 'error');
    }
  },

  async handleDeleteWorkflow(id) {
    if (!confirm('Are you sure you want to delete this workflow blueprint and associated logs?')) return;
    try {
      await API.deleteWorkflow(id);
      App.showToast('Workflow blueprint deleted', 'success');
      if (App.currentWorkflow && App.currentWorkflow.id === id) {
        App.currentWorkflow = null;
        const wrapper = document.getElementById('workspace-wrapper');
        if (wrapper) wrapper.classList.remove('active');
      }
      this.loadWorkflowsTable();
      this.loadMetrics();
      this.loadLogs();
    } catch (err) {
      App.showToast('Failed to delete workflow', 'error');
    }
  },

  async loadLogs() {
    try {
      const tbody = document.getElementById('admin-logs-tbody');
      if (!tbody) return;

      const logs = await API.fetchAdminLogs();
      tbody.innerHTML = logs.map(l => `
        <tr>
          <td><span style="font-family:JetBrains Mono; font-size:0.75rem; color:#06B6D4;">${l.workflow_id}</span></td>
          <td style="font-weight:600; color:#fff;">${l.stage}</td>
          <td><span class="badge badge-category">${l.engine}</span></td>
          <td style="font-family:JetBrains Mono; font-weight:700; color:${l.duration_ms > 200 ? '#F59E0B' : '#10B981'};">${l.duration_ms} ms</td>
          <td><span class="badge" style="background:rgba(16, 185, 129, 0.15); color:#10B981;">${l.status}</span></td>
          <td style="color:#64748B; font-size:0.75rem;">${new Date(l.created_at).toLocaleTimeString()}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load execution logs:', err);
    }
  },

  async loadConfig() {
    try {
      const configs = await API.fetchSystemConfig();
      const container = document.getElementById('rule-config-container');
      if (!container) return;

      container.innerHTML = configs.map(cfg => `
        <div class="rule-item">
          <div class="rule-name">${cfg.key}</div>
          <div class="rule-desc">${cfg.description || ''}</div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <input type="text" class="form-input" id="cfg-input-${cfg.key}" value="${cfg.value}">
            <button class="btn-secondary" style="padding:0.5rem 0.9rem;" onclick="AdminDashboard.saveSingleConfig('${cfg.key}')">Save</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
  },

  async saveSingleConfig(key) {
    const input = document.getElementById(`cfg-input-${key}`);
    if (!input) return;
    const value = input.value.trim();

    try {
      await API.updateSystemConfig(key, value);
      App.showToast(`Saved config rule '${key}'`, 'success');
    } catch (err) {
      App.showToast(`Failed to update config: ${err.message}`, 'error');
    }
  }
};

window.AdminDashboard = AdminDashboard;
