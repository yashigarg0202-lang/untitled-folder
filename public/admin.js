/**
 * SoulSync Admin Portal — Pooja Garg Master Registry Logic
 */

let currentAuthToken = localStorage.getItem('soulsync_admin_token') || null;

document.addEventListener('DOMContentLoaded', () => {
  if (currentAuthToken) {
    showDashboard();
  } else {
    showLogin();
  }

  initAdminAuth();
  initDashboardControls();
});

function showLogin() {
  document.getElementById('loginView').style.display = 'block';
  document.getElementById('dashboardView').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('dashboardView').style.display = 'block';
  loadDashboardData();
}

function initAdminAuth() {
  const loginForm = document.getElementById('adminLoginForm');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.textContent = '';

      const username = document.getElementById('adminUser').value.trim();
      const password = document.getElementById('adminPass').value.trim();

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          currentAuthToken = data.token;
          localStorage.setItem('soulsync_admin_token', currentAuthToken);
          showDashboard();
        } else {
          loginError.textContent = data.error || 'Invalid credentials. Please verify your admin key.';
        }
      } catch (err) {
        console.error('Login error:', err);
        loginError.textContent = 'Server connection error. Please try again.';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentAuthToken}` }
        });
      } catch (e) {}
      currentAuthToken = null;
      localStorage.removeItem('soulsync_admin_token');
      showLogin();
    });
  }
}

function initDashboardControls() {
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadRegistrations();
      }, 300);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      loadRegistrations();
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      window.location.href = `/api/admin/export?token=${currentAuthToken}`;
    });
  }
}

async function loadDashboardData() {
  await Promise.all([loadStats(), loadRegistrations()]);
}

async function loadStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${currentAuthToken}` }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    const res = await response.json();
    if (res.success && res.stats) {
      document.getElementById('statTotal').textContent = res.stats.total || 0;
      document.getElementById('statNew').textContent = res.stats.new_leads || 0;
      document.getElementById('statActive').textContent = res.stats.active_sessions || 0;
      document.getElementById('statCompleted').textContent = res.stats.completed || 0;
    }
  } catch (err) {
    console.error('Stats loading error:', err);
  }
}

async function loadRegistrations() {
  const tbody = document.getElementById('registrationsTableBody');
  const search = document.getElementById('searchInput')?.value.trim() || '';
  const status = document.getElementById('statusFilter')?.value.trim() || '';

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const response = await fetch(`/api/admin/registrations?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${currentAuthToken}` }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    const res = await response.json();
    if (res.success) {
      renderTable(res.data);
    }
  } catch (err) {
    console.error('Registrations load error:', err);
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">Error loading registrations.</td></tr>`;
  }
}

function renderTable(data) {
  const tbody = document.getElementById('registrationsTableBody');
  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🍃</div>
          <p>No manifestation registrations match your filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const cleanPhone = (item.phone || '').replace(/\D/g, '');
    const dialCode = (item.country_code || '+91').replace('+', '');
    const fullPhone = dialCode + cleanPhone;

    const waText = encodeURIComponent(
      `Hello ${item.full_name},\n\nThis is Pooja Garg from SoulSync.\nI have received your manifestation intent: "${item.manifestation_goal.substring(0, 70)}...".\n\nI would love to guide your ${item.timeline} journey. Shall we align on the session fee and onboarding steps?`
    );

    const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—';

    return `
      <tr data-id="${item.id}">
        <td><strong>#${item.id}</strong></td>
        <td class="applicant-cell">
          <span class="applicant-name">${escapeHtml(item.full_name)}</span>
          <span class="applicant-phone">
            <span>📱</span> ${escapeHtml(item.country_code || '')} ${escapeHtml(item.phone)}
          </span>
        </td>
        <td class="intent-cell">${escapeHtml(item.manifestation_goal)}</td>
        <td>
          <span class="timeline-badge">${escapeHtml(item.timeline)}</span>
        </td>
        <td>
          <select class="status-select" onchange="updateRegistrationStatus(${item.id}, this.value)">
            <option value="New Intent Received" ${item.status === 'New Intent Received' ? 'selected' : ''}>✨ New Intent Received</option>
            <option value="Contacted / Payment Details Sent" ${item.status === 'Contacted / Payment Details Sent' ? 'selected' : ''}>💬 Contacted / Payment Sent</option>
            <option value="Payment Received" ${item.status === 'Payment Received' ? 'selected' : ''}>💳 Payment Received</option>
            <option value="Session Scheduled" ${item.status === 'Session Scheduled' ? 'selected' : ''}>📅 Session Scheduled</option>
            <option value="Completed" ${item.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
            <option value="Archived" ${item.status === 'Archived' ? 'selected' : ''}>📁 Archived</option>
          </select>
        </td>
        <td>
          <textarea class="notes-textarea" placeholder="Add notes (e.g. fee, astrology chart)..." onblur="updateRegistrationNotes(${item.id}, this.value)">${escapeHtml(item.admin_notes || '')}</textarea>
        </td>
        <td>
          <div class="action-btn-group">
            <a href="https://wa.me/${fullPhone}?text=${waText}" target="_blank" class="btn-action-wa" title="Open WhatsApp chat with client">
              <span>💬 Message</span>
            </a>
            <a href="tel:${item.country_code || ''}${item.phone}" class="btn btn-outline-light" style="font-size: 0.72rem; padding: 0.3rem 0.5rem;" title="Call Phone">
              <span>📞 Call</span>
            </a>
          </div>
        </td>
        <td>
          <span class="date-text">${dateStr}</span>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateRegistrationStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/admin/registrations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAuthToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      loadStats();
    } else if (res.status === 401) {
      handleUnauthorized();
    }
  } catch (err) {
    console.error('Error updating status:', err);
  }
}

async function updateRegistrationNotes(id, newNotes) {
  try {
    const res = await fetch(`/api/admin/registrations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAuthToken}`
      },
      body: JSON.stringify({ admin_notes: newNotes })
    });

    if (res.status === 401) {
      handleUnauthorized();
    }
  } catch (err) {
    console.error('Error updating notes:', err);
  }
}

function handleUnauthorized() {
  currentAuthToken = null;
  localStorage.removeItem('soulsync_admin_token');
  showLogin();
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
