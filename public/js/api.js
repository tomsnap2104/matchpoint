/* =====================================================================
   MatchPoint - Cliente API (script clásico, sin módulos)
   ===================================================================== */
const API_BASE = '';

function getToken() { return localStorage.getItem('mp_token'); }
function setToken(t) { localStorage.setItem('mp_token', t); }
function removeToken() { localStorage.removeItem('mp_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('mp_user') || 'null'); } catch (e) { return null; }
}
function setUser(u) { localStorage.setItem('mp_user', JSON.stringify(u)); }
function removeUser() { localStorage.removeItem('mp_user'); }

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + '/api' + path, { ...opts, headers });
  let data = {};
  try { data = await res.json(); } catch (e) { data = {}; }

  if (res.status === 401) {
    removeToken(); removeUser();
    throw new Error(data.error || 'Sesión expirada');
  }
  if (!res.ok) {
    const err = new Error(data.error || 'Error en la solicitud');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const auth = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  update: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
};

const tournaments = {
  list: () => request('/tournaments'),
  get: (id) => request(`/tournaments/${id}`),
};

const events = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events?${qs}`);
  },
  get: (id) => request(`/events/${id}`),
  predict: (id, selectedOption, key) => request(`/events/${id}/predictions`, {
    method: 'POST',
    body: JSON.stringify({
      selected_option: selectedOption,
      idempotency_key: key || `web:${id}:${Date.now()}:${Math.random().toString(36).slice(2)}`
    })
  }),
};

const credits = {
  mine: () => request('/me/credits'),
  predictions: () => request('/me/predictions'),
  summary: () => request('/me/summary'),
};

const admin = {
  stats: () => request('/admin/stats'),
  reconciliation: () => request('/admin/reconciliation'),
  users: () => request('/admin/users'),
  transactions: (limit = 100) => request(`/admin/transactions?limit=${limit}`),
  operations: () => request('/admin/operations'),
  events: () => request('/admin/events'),
  corrections: () => request('/admin/corrections'),
  createTournament: (data) => request('/admin/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  createEvent: (data) => request('/admin/events', { method: 'POST', body: JSON.stringify(data) }),
  setEventStatus: (id, status) => request(`/admin/events/${id}/status`, {
    method: 'PUT', body: JSON.stringify({ status })
  }),
  publishResult: (id, result_option) => request(`/admin/events/${id}/result`, {
    method: 'POST', body: JSON.stringify({ result_option })
  }),
  correctResult: (id, result_option, reason) => request(`/admin/events/${id}/correct-result`, {
    method: 'POST', body: JSON.stringify({ result_option, reason })
  }),
  adjustCredits: (id, amount, type, reason) => request(`/admin/users/${id}/credits`, {
    method: 'POST', body: JSON.stringify({ amount, type, reason })
  }),
};
