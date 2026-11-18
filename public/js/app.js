/* =====================================================================
   MatchPoint - Aplicación SPA
   ===================================================================== */

const state = {
  user: getUser(),
  credits: 0,
  eventFilter: 'all',
  adminTab: 'resumen',
};

/* ------------------------------- Helpers ---------------------------- */
function escapeHtml(t) {
  if (t === null || t === undefined) return '';
  return String(t).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

const STATUS_LABELS = {
  open: 'Abierto', closed: 'Cerrado', settled: 'Liquidado', scheduled: 'Programado',
  pending: 'Pendiente', won: 'Acertado', lost: 'Perdido', active: 'Activo',
  draft: 'Borrador', finished: 'Finalizado'
};

function statusBadge(status) {
  const s = status || 'scheduled';
  return `<span class="status-tag status-${escapeHtml(s)}">${escapeHtml(STATUS_LABELS[s] || s)}</span>`;
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Procesando...';
    btn.disabled = true;
  } else {
    if (btn.dataset.original) btn.innerHTML = btn.dataset.original;
    btn.disabled = false;
  }
}

function optionLabel(event, code) {
  const found = (event.options || []).find(o => o.code === code);
  return found ? found.label : code;
}

/* --------------------------- UI del header -------------------------- */
function updateAuthUI() {
  const authButtons = document.getElementById('auth-buttons');
  const userMenu = document.getElementById('user-menu');
  const greeting = document.getElementById('greeting');
  const adminLink = document.getElementById('admin-link');
  const user = getUser();

  if (user) {
    authButtons.classList.add('hidden');
    userMenu.classList.remove('hidden');
    greeting.textContent = user.name || 'Mi cuenta';
    adminLink.classList.toggle('hidden', user.role !== 'admin');
  } else {
    authButtons.classList.remove('hidden');
    userMenu.classList.add('hidden');
    adminLink.classList.add('hidden');
  }
  const badge = document.getElementById('credits-badge');
  if (badge) badge.textContent = state.credits;
}

async function refreshCredits() {
  if (!getToken()) { state.credits = 0; updateAuthUI(); return; }
  try {
    const data = await credits.summary();
    state.credits = data.balance || 0;
  } catch (e) { state.credits = 0; }
  updateAuthUI();
}

function updateNavActive(path) {
  document.querySelectorAll('.main-nav a').forEach(a => {
    const route = a.dataset.route;
    const active = route === 'home' ? (path === '/' || path === '/home')
      : path.startsWith('/' + route);
    a.classList.toggle('active', !!active);
  });
}

/* -------------------------------- Router ---------------------------- */
const PUBLIC_ROUTES = ['/', '/home', '/tournaments', '/events', '/login', '/register'];

function currentPath() {
  const hash = window.location.hash || '#/';
  return hash.replace(/^#/, '') || '/';
}

function resolveRoute(path) {
  let m;
  if ((m = path.match(/^\/tournaments\/(\d+)$/))) return { name: 'tournament', param: m[1] };
  if ((m = path.match(/^\/events\/(\d+)$/))) return { name: 'event', param: m[1] };
  if (PUBLIC_ROUTES.includes(path)) return { name: path.slice(1) || 'home', param: null };
  if (path === '/credits') return { name: 'credits', param: null };
  if (path === '/predictions') return { name: 'predictions', param: null };
  if (path === '/profile') return { name: 'profile', param: null };
  if (path === '/admin') return { name: 'admin', param: null };
  return { name: 'notfound', param: null };
}

const app = {
  init() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-route]');
      if (!link) return;
      e.preventDefault();
      const route = link.dataset.route;
      if (route === 'logout') { this.logout(); return; }
      this.navigate('/' + route);
    });

    document.addEventListener('change', (e) => {
      if (e.target.id === 'event-filter') {
        state.eventFilter = e.target.value;
        renderEventsPage(document.getElementById('app'));
      }
      if (e.target.dataset.adminTabSelect) {
        state.adminTab = e.target.value;
        renderAdmin(document.getElementById('app'));
      }
    });

    window.addEventListener('hashchange', () => this.render());
    this.render();
  },

  navigate(path) {
    const target = '#' + path;
    if (window.location.hash === target) this.render();
    else window.location.hash = target;
  },

  logout() {
    removeToken(); removeUser();
    state.credits = 0;
    showToast('Sesión cerrada', 'success');
    this.navigate('/');
    setTimeout(() => this.render(), 0);
  },

  async render() {
    const appEl = document.getElementById('app');
    const path = currentPath();
    const { name, param } = resolveRoute(path);
    updateNavActive(path);
    state.user = getUser();

    const isPublic = PUBLIC_ROUTES.includes(path) || path.startsWith('/tournaments/') || path.startsWith('/events/');
    if (!isPublic && !getToken()) {
      showToast('Inicia sesión para continuar', 'error');
      this.navigate('/login');
      return;
    }
    if (path === '/admin' && state.user?.role !== 'admin') {
      showToast('Acceso solo para administradores', 'error');
      this.navigate('/');
      return;
    }

    await refreshCredits();
    appEl.innerHTML = '<div class="empty-state">Cargando...</div>';

    try {
      switch (name) {
        case 'home': await renderHome(appEl); break;
        case 'tournaments': await renderTournaments(appEl); break;
        case 'tournament': await renderTournamentDetail(appEl, param); break;
        case 'events': await renderEventsPage(appEl); break;
        case 'event': await renderEventDetail(appEl, param); break;
        case 'login': renderLogin(appEl); break;
        case 'register': renderRegister(appEl); break;
        case 'credits': await renderCredits(appEl); break;
        case 'predictions': await renderPredictions(appEl); break;
        case 'profile': await renderProfile(appEl); break;
        case 'admin': await renderAdmin(appEl); break;
        default: renderNotFound(appEl);
      }
    } catch (err) {
      console.error(err);
      appEl.innerHTML = '<div class="empty"><h2>Algo salió mal</h2><p>' + escapeHtml(err.message) + '</p>' +
        '<button class="btn btn-primary" onclick="app.navigate(\'/\')">Volver al inicio</button></div>';
    }
  }
};

/* =====================================================================
   VISTA: Inicio
   ===================================================================== */
async function renderHome(el) {
  const [tData, eData] = await Promise.all([tournaments.list(), events.list()]);
  const openEvents = eData.events.filter(e => e.effective_status === 'open').slice(0, 3);
  const tournamentCards = tData.tournaments.slice(0, 3).map(t => `
    <a class="card tournament-card" href="#/tournaments/${t.id}">
      <div class="card-head">
        <span class="sport-tag">${escapeHtml(t.sport || 'Deporte')}</span>
        ${statusBadge(t.status)}
      </div>
      <h3 style="margin-top:14px;">${escapeHtml(t.name)}</h3>
      <p>${escapeHtml(t.description || 'Sin descripción')}</p>
      <div class="card-foot">
        <span class="muted small">${t.events_count} eventos</span>
        <span class="btn btn-ghost small">Ver torneo →</span>
      </div>
    </a>
  `).join('');

  const eventCards = openEvents.map(e => eventCardHtml(e)).join('');
  const emptyEvents = openEvents.length === 0 ? '<div class="empty-state">No hay eventos abiertos en este momento.</div>' : '';

  el.innerHTML = `
    <div class="page">
      <section class="hero">
        <span class="hero-badge">Nexo Digital Labs presenta</span>
        <h1>Pronostica. Compite.<br><span style="color:var(--accent);">Gana créditos.</span></h1>
        <p>Administra torneos, registra pronósticos antes del cierre de cada evento y lleva un control verificable de tus créditos virtuales.</p>
        <div class="hero-actions">
          <a href="#/events" class="btn btn-primary">Explorar eventos</a>
          <a href="#/credits" class="btn btn-ghost">Mis créditos</a>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><strong>${tData.tournaments.length}</strong><span>Torneos activos</span></div>
          <div class="hero-stat"><strong>${eData.events.length}</strong><span>Eventos registrados</span></div>
          <div class="hero-stat"><strong>${openEvents.length}</strong><span>Abiertos ahora</span></div>
        </div>
      </section>

      <div class="section-title"><span>Torneos destacados</span></div>
      <div class="grid grid-3">${tournamentCards}</div>

      <div class="section-title"><span>Eventos abiertos</span></div>
      <div class="grid grid-3">${eventCards}</div>
      ${emptyEvents}
    </div>
  `;
}

function eventCardHtml(e) {
  const options = (e.options || []).map(o => {
    const isWinner = e.result_option === o.code;
    return `<span class="option-chip ${isWinner ? 'winner' : ''}">${escapeHtml(o.label)}</span>`;
  }).join('');
  const resultText = e.result_option
    ? `<div class="muted small">Resultado: <strong style="color:var(--accent-2);">${escapeHtml(optionLabel(e, e.result_option))}</strong></div>`
    : '';
  return `
    <a class="card event-card" href="#/events/${e.id}">
      <div class="card-head">
        <span class="sport-tag">${escapeHtml(e.market_type === '1X2' ? '1X2' : 'Ganador')}</span>
        ${statusBadge(e.effective_status)}
      </div>
      <div class="event-title">${escapeHtml(e.name)}</div>
      <div class="event-meta">
        <span>◷ ${fmtDate(e.closes_at)}</span>
        <span>◈ ${e.stake_cost} créditos</span>
      </div>
      <div class="event-options">${options}</div>
      ${resultText}
    </a>
  `;
}

/* =====================================================================
   VISTA: Torneos
   ===================================================================== */
async function renderTournaments(el) {
  const { tournaments: list } = await tournaments.list();
  const cards = list.map(t => `
    <a class="card tournament-card" href="#/tournaments/${t.id}">
      <div class="card-head">
        <span class="sport-tag">${escapeHtml(t.sport || 'Deporte')}</span>
        ${statusBadge(t.status)}
      </div>
      <h3 style="margin-top:14px;">${escapeHtml(t.name)}</h3>
      <p>${escapeHtml(t.description || 'Sin descripción')}</p>
      <div class="card-foot">
        <span class="muted small">${t.events_count} eventos · ${t.settled_count} liquidados</span>
        <span class="btn btn-ghost small">Ver detalles →</span>
      </div>
    </a>
  `).join('');
  el.innerHTML = `
    <div class="page">
      <div class="breadcrumb">Inicio / Torneos</div>
      <h1>Torneos</h1>
      <p class="muted">Consulta los torneos disponibles y sus eventos asociados.</p>
      <div class="section-title"><span>${list.length} torneos</span></div>
      <div class="grid grid-3">${cards || '<div class="empty-state">No hay torneos registrados.</div>'}</div>
    </div>
  `;
}

async function renderTournamentDetail(el, id) {
  const { tournament, events: list } = await tournaments.get(id);
  const rows = list.map(e => `
    <a class="card event-card" href="#/events/${e.id}" style="margin-bottom:14px;">
      <div class="card-head">
        <div class="event-title">${escapeHtml(e.name)}</div>
        ${statusBadge(e.effective_status)}
      </div>
      <div class="event-meta">
        <span> Modalidad: ${escapeHtml(e.market_type === '1X2' ? '1X2' : 'Ganador')}</span>
        <span> Cierre: ${fmtDate(e.closes_at)}</span>
        <span> ◈ ${e.stake_cost} créditos</span>
        <span> ${e.predictions_count} pronósticos</span>
      </div>
    </a>
  `).join('');
  el.innerHTML = `
    <div class="page">
      <div class="breadcrumb"><a href="#/tournaments">Torneos</a> / ${escapeHtml(tournament.name)}</div>
      <div class="card" style="margin-bottom:26px;">
        <div class="card-head">
          <h1 style="font-size:2rem;">${escapeHtml(tournament.name)}</h1>
          ${statusBadge(tournament.status)}
        </div>
        <p class="muted">${escapeHtml(tournament.description || 'Sin descripción')}</p>
        <span class="sport-tag">${escapeHtml(tournament.sport || 'Deporte')}</span>
      </div>
      <div class="section-title"><span>Eventos del torneo (${list.length})</span></div>
      ${rows || '<div class="empty-state">Este torneo aún no tiene eventos.</div>'}
    </div>
  `;
}

/* =====================================================================
   VISTA: Eventos
   ===================================================================== */
async function renderEventsPage(el) {
  const { events: list } = await events.list();
  const filtered = state.eventFilter === 'all'
    ? list : list.filter(e => e.effective_status === state.eventFilter);
  const optionsHtml = ['all', 'open', 'closed', 'settled', 'scheduled'].map(v => {
    const label = v === 'all' ? 'Todos' : (STATUS_LABELS[v] || v);
    return `<option value="${v}" ${state.eventFilter === v ? 'selected' : ''}>${label}</option>`;
  }).join('');
  const cards = filtered.map(e => eventCardHtml(e)).join('');

  el.innerHTML = `
    <div class="page">
      <div class="breadcrumb">Inicio / Eventos</div>
      <div class="card-head" style="margin-bottom:8px;">
        <div><h1>Eventos</h1><p class="muted">Selecciona un evento para consultar opciones y registrar tu pronóstico.</p></div>
        <select id="event-filter" style="width:auto;min-width:170px;">${optionsHtml}</select>
      </div>
      <div class="section-title"><span>${filtered.length} eventos</span></div>
      <div class="grid grid-3">${cards || '<div class="empty-state">No hay eventos con este estado.</div>'}</div>
    </div>
  `;
}

async function renderEventDetail(el, id) {
  const [{ event, tournament, recent_predictions }, myPrediction] = await Promise.all([
    events.get(id),
    getToken() ? credits.predictions().catch(() => ({ predictions: [] })) : Promise.resolve({ predictions: [] })
  ]);
  const mine = myPrediction.predictions.find(p => String(p.event_id) === String(id));
  const status = event.effective_status;
  const canPredict = status === 'open' && !mine && !!getToken();
  const closingSoon = status === 'open';

  let actionHtml = '';
  if (mine) {
    const statusText = STATUS_LABELS[mine.status] || mine.status;
    actionHtml = `
      <div class="alert alert-info">
        <strong>Tu pronóstico:</strong> ${escapeHtml(optionLabel(event, mine.selected_option))}
        · Estado: <strong>${statusText}</strong> · Apuesta: ${mine.stake} créditos
      </div>
    `;
  } else if (canPredict) {
    const optionInputs = (event.options || []).map((o, idx) => `
      <label class="pred-option" data-option="${escapeHtml(o.code)}">
        <input type="radio" name="prediction_option" value="${escapeHtml(o.code)}" ${idx === 0 ? 'checked' : ''}>
        <span class="label">${escapeHtml(o.label)}</span>
        <span class="code">${escapeHtml(o.code)}</span>
      </label>
    `).join('');
    actionHtml = `
      <form id="prediction-form">
        <h3>Registra tu pronóstico</h3>
        <p class="muted small">El costo de participación es de <strong>${event.stake_cost} créditos</strong>. No podrás modificarlo después.</p>
        <div class="prediction-options">${optionInputs}</div>
        <button type="submit" class="btn btn-primary btn-submit" id="btn-predict">Confirmar pronóstico</button>
      </form>
    `;
  } else if (!getToken()) {
    actionHtml = `
      <div class="alert alert-warn">
        Inicia sesión para registrar tu pronóstico.
        <a href="#/login" class="btn btn-primary small" style="margin-left:10px;">Ingresar</a>
      </div>
    `;
  } else {
    actionHtml = `<div class="alert alert-info">Este evento no admite pronósticos en este momento (${escapeHtml(STATUS_LABELS[status] || status)}).</div>`;
  }

  const resultHtml = event.result_option
    ? `<div class="balance-hero" style="padding:18px;"><div><strong>Resultado oficial</strong><div class="muted small">Publicado el ${fmtDate(event.settled_at)}</div></div><div class="value" style="font-size:1.4rem;">${escapeHtml(optionLabel(event, event.result_option))}</div></div>`
    : '';
  const recentRows = recent_predictions.map(p => `
    <tr><td>${escapeHtml(p.user_name)}</td><td>${escapeHtml(optionLabel(event, p.selected_option))}</td><td>${statusBadge(p.status)}</td></tr>
  `).join('');

  el.innerHTML = `
    <div class="page">
      <div class="breadcrumb"><a href="#/events">Eventos</a> / ${escapeHtml(event.name)}</div>
      <div class="grid grid-2">
        <div>
          <div class="card">
            <div class="card-head">
              <span class="sport-tag">${escapeHtml(tournament ? tournament.name : 'Torneo')}</span>
              ${statusBadge(status)}
            </div>
            <h1 style="font-size:1.9rem;margin-top:16px;">${escapeHtml(event.name)}</h1>
            <div class="event-meta" style="margin-top:18px;">
              <span> Modalidad: ${escapeHtml(event.market_type === '1X2' ? 'Resultado 1X2' : 'Ganador')}</span>
              <span> Apertura: ${fmtDate(event.opens_at)}</span>
              <span> Cierre: ${fmtDate(event.closes_at)}</span>
              <span> Inicio: ${fmtDate(event.starts_at)}</span>
              <span> ◈ ${event.stake_cost} créditos · ×${event.prize_multiplier}</span>
            </div>
            ${closingSoon ? '<div class="alert alert-info" style="margin-top:18px;">Los pronósticos se cierran el ' + fmtDate(event.closes_at) + '.</div>' : ''}
          </div>
          ${resultHtml}
        </div>
        <div class="card">${actionHtml}</div>
      </div>

      <div class="section-title"><span>Participaciones recientes</span></div>
      <div class="table-wrap">
        <table><thead><tr><th>Usuario</th><th>Pronóstico</th><th>Estado</th></tr></thead>
          <tbody>${recentRows || '<tr><td colspan="3" class="muted">Aún no hay pronósticos.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;

  document.querySelectorAll('.pred-option').forEach(label => {
    label.addEventListener('click', () => {
      document.querySelectorAll('.pred-option').forEach(l => l.classList.remove('selected'));
      label.classList.add('selected');
    });
  });

  const form = el.querySelector('#prediction-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const checked = form.querySelector('input[name="prediction_option"]:checked');
      const btn = el.querySelector('#btn-predict');
      setLoading(btn, true);
      try {
        const res = await events.predict(event.id, checked.value);
        showToast(res.duplicate ? res.message : '¡Pronóstico registrado!', 'success');
        await app.render();
      } catch (err) {
        showToast(err.message, 'error');
        setLoading(btn, false);
      }
    });
  }
}

/* =====================================================================
   VISTA: Login / Registro
   ===================================================================== */
function renderLogin(el) {
  el.innerHTML = `
    <div class="page">
      <div class="form-card">
        <span class="hero-badge">Bienvenido de nuevo</span>
        <h1 style="font-size:2rem;margin-top:14px;">Iniciar sesión</h1>
        <p class="muted">Accede para pronosticar y consultar tus créditos.</p>
        <form id="login-form">
          <div class="form-group"><label>Email</label><input type="email" name="email" value="laura@email.com" required></div>
          <div class="form-group"><label>Contraseña</label><input type="password" name="password" value="usuario123" required></div>
          <button type="submit" class="btn btn-primary btn-submit" id="btn-login">Ingresar</button>
        </form>
        <div class="divider">— o —</div>
        <p class="muted" style="text-align:center;">¿No tienes cuenta? <a href="#/register" style="color:var(--accent);">Regístrate aquí</a></p>
        <div class="hint" style="margin-top:18px;">
          <strong>Pruebas:</strong><br>
          Admin: admin@matchpoint.com / admin123<br>
          Usuario: laura@email.com / usuario123
        </div>
      </div>
    </div>
  `;
  el.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = el.querySelector('#btn-login');
    setLoading(btn, true);
    try {
      const data = await auth.login({ email: fd.get('email'), password: fd.get('password') });
      setToken(data.token); setUser(data.user);
      state.user = data.user;
      showToast('¡Bienvenido, ' + data.user.name + '!', 'success');
      app.navigate(data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  });
}

function renderRegister(el) {
  el.innerHTML = `
    <div class="page">
      <div class="form-card">
        <span class="hero-badge">Únete a MatchPoint</span>
        <h1 style="font-size:2rem;margin-top:14px;">Crear cuenta</h1>
        <p class="muted">Regístrate y comienza a participar en los torneos.</p>
        <form id="register-form">
          <div class="form-group"><label>Nombre</label><input type="text" name="name" required></div>
          <div class="form-group"><label>Email</label><input type="email" name="email" required></div>
          <div class="form-group"><label>Contraseña (mín. 6 caracteres)</label><input type="password" name="password" minlength="6" required></div>
          <button type="submit" class="btn btn-primary btn-submit" id="btn-register">Crear cuenta</button>
        </form>
        <div class="divider">— o —</div>
        <p class="muted" style="text-align:center;">¿Ya tienes cuenta? <a href="#/login" style="color:var(--accent);">Ingresa aquí</a></p>
      </div>
    </div>
  `;
  el.querySelector('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = el.querySelector('#btn-register');
    setLoading(btn, true);
    try {
      const data = await auth.register({
        name: fd.get('name'), email: fd.get('email'), password: fd.get('password')
      });
      setToken(data.token); setUser(data.user);
      state.user = data.user;
      showToast('Cuenta creada. Solicita créditos al administrador para participar.', 'success');
      app.navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  });
}

/* =====================================================================
   VISTA: Mis créditos
   ===================================================================== */
async function renderCredits(el) {
  const data = await credits.mine();
  const rows = data.movements.map(m => {
    const positive = m.amount > 0;
    return `
      <tr>
        <td>${fmtDate(m.created_at)}</td>
        <td>${escapeHtml(m.type)}</td>
        <td>${escapeHtml(m.description || '—')}</td>
        <td class="${positive ? 'amount-pos' : 'amount-neg'}">${positive ? '+' : ''}${m.amount}</td>
        <td>${m.balance_after}</td>
      </tr>
    `;
  }).join('');

  el.innerHTML = `
    <div class="page">
      <div class="breadcrumb">Inicio / Mis créditos</div>
      <h1>Mis créditos virtuales</h1>
      <div class="balance-hero" style="margin:22px 0;">
        <div><div class="muted">Saldo disponible</div><div class="value">◈ ${data.balance}</div></div>
        <div style="text-align:right;">
          <div class="muted small">Verificado a partir de movimientos</div>
          <div style="font-family:var(--display);font-size:1.2rem;color:var(--accent-2);">◈ ${data.derived_balance}</div>
          ${data.consistent ? '<span class="status-tag status-settled">Conciliado</span>' : '<span class="status-tag status-lost">Inconsistente</span>'}
        </div>
      </div>
      <div class="alert alert-info">Los créditos son virtuales, no tienen valor monetario y no pueden retirarse ni convertirse a dinero real.</div>
      <div class="section-title"><span>Historial de movimientos (${data.movements.length})</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Movimiento</th><th>Saldo</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" class="muted">No hay movimientos registrados.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* =====================================================================
   VISTA: Mis pronósticos
   ===================================================================== */
async function renderPredictions(el) {
  const data = await credits.predictions();
  const rows = data.predictions.map(p => {
    const result = p.result_option ? optionLabel(p, p.result_option) : 'Pendiente';
    return `
      <tr>
        <td><a href="#/events/${p.event_id}" style="color:var(--accent);">${escapeHtml(p.event_name)}</a></td>
        <td class="muted small">${escapeHtml(p.tournament_name)}</td>
        <td>${escapeHtml(optionLabel(p, p.selected_option))}</td>
        <td>${p.stake}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${escapeHtml(result)}</td>
        <td>${fmtDate(p.created_at)}</td>
      </tr>
    `;
  }).join('');

  el.innerHTML = `
    <div class="page">
      <div class="breadcrumb">Inicio / Mis pronósticos</div>
      <h1>Mis pronósticos</h1>
      <p class="muted">Consulta tus participaciones, su estado y el resultado del evento.</p>
      <div class="section-title"><span>${data.count} pronósticos</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Evento</th><th>Torneo</th><th>Tu pronóstico</th><th>Apuesta</th><th>Estado</th><th>Resultado</th><th>Fecha</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" class="muted">Aún no tienes pronósticos. <a href="#/events" style="color:var(--accent);">Explora los eventos</a>.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* =====================================================================
   VISTA: Perfil
   ===================================================================== */
async function renderProfile(el) {
  const { user } = await auth.me();
  el.innerHTML = `
    <div class="page">
      <div class="breadcrumb">Inicio / Mi perfil</div>
      <h1>Mi perfil</h1>
      <div class="form-card">
        <div class="balance-hero" style="padding:18px;margin-bottom:22px;">
          <div><div class="muted">Saldo de créditos</div><div class="value" style="font-size:2rem;">◈ ${user.credits_balance}</div></div>
          ${statusBadge(user.role)}
        </div>
        <form id="profile-form">
          <div class="form-group"><label>Nombre</label><input type="text" name="name" value="${escapeHtml(user.name)}" required></div>
          <div class="form-group"><label>Email</label><input type="email" value="${escapeHtml(user.email)}" disabled></div>
          <button type="submit" class="btn btn-primary btn-submit" id="btn-profile">Guardar cambios</button>
        </form>
      </div>
    </div>
  `;
  el.querySelector('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = el.querySelector('#btn-profile');
    setLoading(btn, true);
    try {
      const data = await auth.update({ name: new FormData(e.target).get('name') });
      setUser(Object.assign({}, getUser(), data.user));
      showToast('Perfil actualizado', 'success');
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(btn, false); }
  });
}

/* =====================================================================
   VISTA: Administración
   ===================================================================== */
async function renderAdmin(el) {
  const [stats, recon, eventsData, usersData, txData, correctionsData, opData, tourData] = await Promise.all([
    admin.stats(), admin.reconciliation(), admin.events(), admin.users(),
    admin.transactions(), admin.corrections(), admin.operations(), tournaments.list()
  ]);

  const tabs = [
    ['resumen', 'Resumen'], ['estructura', 'Torneos y eventos'],
    ['liquidacion', 'Liquidación'], ['movimientos', 'Movimientos y trazabilidad']
  ].map(t => `<option value="${t[0]}" ${state.adminTab === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('');

  let content = '';
  if (state.adminTab === 'resumen') {
    content = adminResumenHtml(stats, recon);
  } else if (state.adminTab === 'estructura') {
    content = adminEstructuraHtml(tourData.tournaments, eventsData.events);
  } else if (state.adminTab === 'liquidacion') {
    content = adminLiquidacionHtml(eventsData.events, correctionsData.corrections);
  } else {
    content = adminMovimientosHtml(txData.transactions, opData.operations, usersData.users);
  }

  el.innerHTML = `
    <div class="page">
      <div class="breadcrumb">Inicio / Administración</div>
      <div class="card-head">
        <div><h1>Administración</h1><p class="muted">Panel de control de MatchPoint.</p></div>
        <select id="admin-tab-select" style="width:auto;min-width:230px;">${tabs}</select>
      </div>
      ${content}
    </div>
  `;
  bindAdminActions(el, eventsData.events, usersData.users);
}

function adminResumenHtml(stats, recon) {
  const cards = [
    ['Usuarios', stats.users, ''], ['Torneos', stats.tournaments, ''],
    ['Eventos', stats.events, ''], ['Eventos abiertos', stats.open_events, 'alt'],
    ['Pronósticos', stats.predictions, 'alt'], ['Movimientos', stats.transactions, ''],
    ['Créditos en circulación', stats.total_credits, ''], ['Premios pagados', stats.total_prizes, 'alt'],
  ].map(c => `<div class="card stat-card"><span class="label">${c[0]}</span><span class="value ${c[2]}">${c[1]}</span></div>`).join('');

  const reconRows = recon.rows.map(r => `
    <tr>
      <td>${escapeHtml(r.name)}</td><td>${r.credits_balance}</td><td>${r.movements_sum}</td>
      <td>${r.predictions_count}</td><td>${r.stake_movements}</td>
      <td>${r.consistent ? statusBadge('settled') : statusBadge('lost')}</td>
    </tr>
  `).join('');

  return `
    <div class="section-title"><span>Indicadores</span></div>
    <div class="grid grid-4">${cards}</div>
    <div class="section-title"><span>Conciliación de saldos</span></div>
    ${recon.consistent
      ? '<div class="alert alert-info">✓ Todos los saldos coinciden con el historial de movimientos.</div>'
      : '<div class="alert alert-warn">⚠ Se detectaron inconsistencias entre saldos y movimientos.</div>'}
    <div class="table-wrap">
      <table><thead><tr><th>Usuario</th><th>Saldo</th><th>Suma mov.</th><th>Pronósticos</th><th>Mov. apuesta</th><th>Estado</th></tr></thead>
        <tbody>${reconRows}</tbody>
      </table>
    </div>
  `;
}

function adminEstructuraHtml(tournamentsList, eventList) {
  const options = tournamentsList.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  const eventRows = eventList.map(e => `
    <tr>
      <td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.tournament_name)}</td>
      <td>${escapeHtml(e.market_type)}</td><td>${e.stake_cost}</td>
      <td>${statusBadge(e.effective_status)}</td><td>${e.predictions_count}</td>
    </tr>
  `).join('');

  return `
    <div class="grid grid-2" style="margin-top:24px;">
      <div class="admin-form">
        <h3>Nuevo torneo</h3>
        <form id="admin-tournament-form">
          <div class="form-group"><label>Nombre</label><input name="name" required></div>
          <div class="form-group"><label>Slug</label><input name="slug" placeholder="mi-torneo-2026" required></div>
          <div class="form-group"><label>Deporte</label><input name="sport" placeholder="Fútbol"></div>
          <div class="form-group"><label>Descripción</label><textarea name="description" rows="2"></textarea></div>
          <button class="btn btn-primary" type="submit">Crear torneo</button>
        </form>
      </div>
      <div class="admin-form">
        <h3>Nuevo evento</h3>
        <form id="admin-event-form">
          <div class="form-group"><label>Torneo</label><select name="tournament_id">${options}</select></div>
          <div class="form-group"><label>Nombre del evento</label><input name="name" required></div>
          <div class="form-row">
            <div class="form-group"><label>Modalidad</label><select name="market_type"><option value="1X2">1X2</option><option value="winner">Ganador</option></select></div>
            <div class="form-group"><label>Opciones (separadas por coma)</label><input name="options" placeholder="Local, Empate, Visitante" required></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Costo (créditos)</label><input name="stake_cost" type="number" value="10" min="1"></div>
            <div class="form-group"><label>Multiplicador</label><input name="prize_multiplier" type="number" step="0.1" value="2"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Apertura</label><input name="opens_at" type="datetime-local"></div>
            <div class="form-group"><label>Cierre</label><input name="closes_at" type="datetime-local"></div>
          </div>
          <div class="form-group"><label>Inicio</label><input name="starts_at" type="datetime-local"></div>
          <button class="btn btn-primary" type="submit">Crear evento</button>
        </form>
      </div>
    </div>
    <div class="section-title"><span>Eventos registrados (${eventList.length})</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Evento</th><th>Torneo</th><th>Modalidad</th><th>Costo</th><th>Estado</th><th>Pronósticos</th></tr></thead>
      <tbody>${eventRows}</tbody>
    </table></div>
  `;
}

function adminLiquidacionHtml(eventList, corrections) {
  const rows = eventList.map(e => {
    const status = e.effective_status;
    let action = '<span class="muted small">—</span>';
    if (status === 'open' || status === 'scheduled' || status === 'closed') {
      const control = status === 'closed'
        ? resultControls(e)
        : `<button class="btn btn-ghost small" data-event-status="${e.id}" data-status="${status === 'open' ? 'closed' : 'open'}">${status === 'open' ? 'Cerrar' : 'Abrir'}</button>`;
      action = control;
    } else if (status === 'settled') {
      action = correctionControls(e);
    }
    return `
      <tr>
        <td>${escapeHtml(e.name)}</td>
        <td>${statusBadge(status)}</td>
        <td>${e.result_option ? escapeHtml(optionLabel(e, e.result_option)) : '—'}</td>
        <td>v${e.settlement_version}</td>
        <td>${e.predictions_count}</td>
        <td>${action}</td>
      </tr>
    `;
  }).join('');

  const corrRows = corrections.map(c => `
    <tr>
      <td>${escapeHtml(c.event_name)}</td>
      <td>${escapeHtml(c.previous_result || '—')} → ${escapeHtml(c.new_result)}</td>
      <td>${escapeHtml(c.reason || '—')}</td>
      <td>${escapeHtml(c.corrected_by_name || '—')}</td>
      <td>${fmtDate(c.created_at)}</td>
    </tr>
  `).join('');

  return `
    <div class="section-title"><span>Liquidación de eventos</span></div>
    <div class="alert alert-info">La liquidación es idempotente: repetirla no genera premios duplicados. Las correcciones reversan premios anteriores y conservan el historial.</div>
    <div class="table-wrap"><table>
      <thead><tr><th>Evento</th><th>Estado</th><th>Resultado</th><th>Versión</th><th>Pronósticos</th><th>Acción</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div class="section-title"><span>Correcciones de resultado (${corrections.length})</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Evento</th><th>Cambio</th><th>Motivo</th><th>Responsable</th><th>Fecha</th></tr></thead>
      <tbody>${corrRows || '<tr><td colspan="5" class="muted">No hay correcciones registradas.</td></tr>'}</tbody>
    </table></div>
  `;
}

function resultControls(e) {
  const opts = (e.options || []).map(o => `<option value="${escapeHtml(o.code)}">${escapeHtml(o.label)}</option>`).join('');
  return `
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <select data-result-select="${e.id}" style="width:auto;min-width:120px;padding:7px;">${opts}</select>
      <button class="btn btn-success small" data-publish="${e.id}">Publicar y liquidar</button>
    </div>
  `;
}

function correctionControls(e) {
  const opts = (e.options || []).map(o => `<option value="${escapeHtml(o.code)}">${escapeHtml(o.label)}</option>`).join('');
  return `
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <select data-correction-select="${e.id}" style="width:auto;min-width:120px;padding:7px;">${opts}</select>
      <input data-correction-reason="${e.id}" placeholder="Motivo" style="width:130px;padding:7px;">
      <button class="btn btn-danger small" data-correct="${e.id}">Corregir</button>
    </div>
  `;
}

function adminMovimientosHtml(transactionsList, operations, usersList) {
  const txRows = transactionsList.slice(0, 60).map(t => `
    <tr>
      <td>${fmtDate(t.created_at)}</td>
      <td>${escapeHtml(t.user_name)}</td>
      <td>${escapeHtml(t.type)}</td>
      <td class="${t.amount > 0 ? 'amount-pos' : 'amount-neg'}">${t.amount > 0 ? '+' : ''}${t.amount}</td>
      <td>${t.balance_after}</td>
      <td class="muted small">${escapeHtml(t.description || '—')}</td>
    </tr>
  `).join('');

  const opRows = operations.slice(0, 40).map(o => `
    <tr>
      <td>${fmtDate(o.created_at)}</td>
      <td>${escapeHtml(o.operation)}</td>
      <td>${statusBadge(o.status === 'success' ? 'settled' : o.status === 'duplicate' ? 'pending' : 'lost')}</td>
      <td class="muted small">${escapeHtml(o.detail || '—')}</td>
    </tr>
  `).join('');

  const userOptions = usersList.map(u => `<option value="${u.id}">${escapeHtml(u.name)} (◈ ${u.credits_balance})</option>`).join('');

  return `
    <div class="section-title"><span>Ajuste manual de créditos</span></div>
    <div class="admin-form">
      <form id="admin-credits-form" class="form-row" style="align-items:end;">
        <div class="form-group" style="margin:0;"><label>Usuario</label><select name="user_id">${userOptions}</select></div>
        <div class="form-group" style="margin:0;"><label>Tipo</label><select name="type"><option value="allocation">Asignación</option><option value="adjustment">Ajuste</option><option value="reversal">Reversión</option></select></div>
        <div class="form-group" style="margin:0;"><label>Cantidad</label><input name="amount" type="number" required></div>
        <div class="form-group" style="margin:0;"><label>Motivo</label><input name="reason" placeholder="Motivo del ajuste"></div>
        <button class="btn btn-primary" type="submit" style="margin-bottom:16px;">Aplicar</button>
      </form>
    </div>
    <div class="section-title"><span>Movimientos recientes</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Usuario</th><th>Tipo</th><th>Movimiento</th><th>Saldo</th><th>Descripción</th></tr></thead>
      <tbody>${txRows}</tbody>
    </table></div>
    <div class="section-title"><span>Registro de operaciones (idempotencia y fallos)</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Operación</th><th>Resultado</th><th>Detalle</th></tr></thead>
      <tbody>${opRows || '<tr><td colspan="4" class="muted">Sin operaciones registradas.</td></tr>'}</tbody>
    </table></div>
  `;
}

function bindAdminActions(el, eventList, usersList) {
  const tabSelect = el.querySelector('#admin-tab-select');
  if (tabSelect) tabSelect.dataset.adminTabSelect = '1';

  const tForm = el.querySelector('#admin-tournament-form');
  if (tForm) tForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await admin.createTournament({
        name: fd.get('name'), slug: fd.get('slug'),
        sport: fd.get('sport'), description: fd.get('description')
      });
      showToast('Torneo creado', 'success');
      renderAdmin(el);
    } catch (err) { showToast(err.message, 'error'); }
  });

  const eForm = el.querySelector('#admin-event-form');
  if (eForm) eForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const toIso = v => v ? new Date(v).toISOString() : null;
    try {
      await admin.createEvent({
        tournament_id: fd.get('tournament_id'), name: fd.get('name'),
        market_type: fd.get('market_type'),
        options: fd.get('options').split(',').map(s => s.trim()).filter(Boolean),
        stake_cost: Number(fd.get('stake_cost')), prize_multiplier: Number(fd.get('prize_multiplier')),
        opens_at: toIso(fd.get('opens_at')), closes_at: toIso(fd.get('closes_at')),
        starts_at: toIso(fd.get('starts_at')), status: 'scheduled'
      });
      showToast('Evento creado', 'success');
      renderAdmin(el);
    } catch (err) { showToast(err.message, 'error'); }
  });

  el.querySelectorAll('[data-event-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await admin.setEventStatus(btn.dataset.eventStatus, btn.dataset.status);
        showToast('Estado actualizado', 'success');
        renderAdmin(el);
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  el.querySelectorAll('[data-publish]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.publish;
      const select = el.querySelector(`[data-result-select="${id}"]`);
      setLoading(btn, true);
      try {
        const res = await admin.publishResult(id, select.value);
        showToast(res.duplicate ? 'El evento ya estaba liquidado' : `Liquidado: ${res.winners} ganadores`, 'success');
        renderAdmin(el);
      } catch (err) { showToast(err.message, 'error'); setLoading(btn, false); }
    });
  });

  el.querySelectorAll('[data-correct]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.correct;
      const select = el.querySelector(`[data-correction-select="${id}"]`);
      const reason = el.querySelector(`[data-correction-reason="${id}"]`);
      if (!confirm('¿Corregir el resultado y volver a liquidar? Se conservará el historial.')) return;
      setLoading(btn, true);
      try {
        await admin.correctResult(id, select.value, reason.value);
        showToast('Resultado corregido', 'success');
        renderAdmin(el);
      } catch (err) { showToast(err.message, 'error'); setLoading(btn, false); }
    });
  });

  const cForm = el.querySelector('#admin-credits-form');
  if (cForm) cForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await admin.adjustCredits(fd.get('user_id'), Number(fd.get('amount')), fd.get('type'), fd.get('reason'));
      showToast('Saldo actualizado', 'success');
      renderAdmin(el);
      refreshCredits();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

/* =====================================================================
   VISTA: No encontrada
   ===================================================================== */
function renderNotFound(el) {
  el.innerHTML = '<div class="empty"><h2>Página no encontrada</h2><p>La ruta que buscas no existe.</p>' +
    '<button class="btn btn-primary" onclick="app.navigate(\'/\')">Volver al inicio</button></div>';
}

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
