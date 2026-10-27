/**
 * SprintForge AI - Client API Layer
 */

const API = {
  async generateWorkflow(payload) {
    const res = await fetch('/api/workflows/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || 'Failed to generate workflow');
    }
    return res.json();
  },

  async fetchWorkflows(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/workflows?${qs}`);
    if (!res.ok) throw new Error('Failed to fetch workflows');
    return res.json();
  },

  async fetchWorkflowById(id) {
    const res = await fetch(`/api/workflows/${id}`);
    if (!res.ok) throw new Error('Failed to fetch workflow details');
    return res.json();
  },

  async updateWorkflowStatus(id, status) {
    const res = await fetch(`/api/workflows/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  async deleteWorkflow(id) {
    const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete workflow');
    return res.json();
  },

  async fetchAdminMetrics() {
    const res = await fetch('/api/admin/metrics');
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  },

  async fetchAdminLogs() {
    const res = await fetch('/api/admin/logs');
    if (!res.ok) throw new Error('Failed to fetch logs');
    return res.json();
  },

  async fetchSystemConfig() {
    const res = await fetch('/api/admin/config');
    if (!res.ok) throw new Error('Failed to fetch configuration');
    return res.json();
  },

  async updateSystemConfig(key, value) {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    if (!res.ok) throw new Error('Failed to update configuration');
    return res.json();
  },

  downloadExport(id, format) {
    window.location.href = `/api/workflows/${id}/export/${format}`;
  }
};
