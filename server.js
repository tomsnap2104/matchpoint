/* =====================================================================
   MatchPoint - API REST
   Torneos, pronósticos, créditos virtuales y liquidación verificable
   ===================================================================== */
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const {
  run, get, all, saveToDisk, withTransaction, init: initDb
} = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'matchpoint-secreto-cambiar-en-produccion';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------------------- Utilidades ---------------------------- */
function lastInsertId() {
  const row = get('SELECT last_insert_rowid() AS id');
  return row ? row.id : null;
}

function nowIso() { return new Date().toISOString(); }

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token de acceso requerido' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  next();
}

function logOperation(key, userId, operation, status, detail) {
  run(
    `INSERT INTO operation_log (idempotency_key,user_id,operation,status,detail) VALUES (?,?,?,?,?)`,
    [key || null, userId || null, operation, status, detail || null]
  );
}

/** Estado efectivo de un evento: respeta la ventana horaria aunque el admin lo haya abierto. */
function effectiveStatus(event) {
  if (event.status === 'settled' || event.status === 'closed' || event.status === 'scheduled') {
    return event.status;
  }
  const now = Date.now();
  if (now < new Date(event.opens_at).getTime()) return 'scheduled';
  if (now > new Date(event.closes_at).getTime()) return 'closed';
  return 'open';
}

function serializeEvent(event) {
  let options = [];
  try { options = JSON.parse(event.options || '[]'); } catch (e) { options = []; }
  return {
    ...event,
    options,
    effective_status: effectiveStatus(event),
    predictions_count: get('SELECT COUNT(*) AS c FROM predictions WHERE event_id = ?', [event.id]).c
  };
}

/** Aplica un movimiento al saldo. Nunca permite saldo negativo. */
function moveCredits(userId, amount, type, referenceType, referenceId, description, idempotencyKey) {
  if (!idempotencyKey) throw new Error('Se requiere clave de idempotencia para el movimiento');
  const existing = get('SELECT * FROM transactions WHERE idempotency_key = ?', [idempotencyKey]);
  if (existing) return { transaction: existing, duplicate: true };

  const user = get('SELECT id, credits_balance FROM users WHERE id = ?', [userId]);
  if (!user) throw new Error('Usuario no encontrado');
  const newBalance = user.credits_balance + amount;
  if (newBalance < 0) throw new Error('Saldo insuficiente de créditos');

  run('UPDATE users SET credits_balance = ? WHERE id = ?', [newBalance, userId]);
  run(
    `INSERT INTO transactions
      (user_id,type,amount,balance_after,reference_type,reference_id,description,idempotency_key)
     VALUES (?,?,?,?,?,?,?,?)`,
    [userId, type, amount, newBalance, referenceType || null, referenceId || null,
     description || null, idempotencyKey]
  );
  return {
    transaction: get('SELECT * FROM transactions WHERE idempotency_key = ?', [idempotencyKey]),
    duplicate: false
  };
}

/** Liquidación idempotente de un evento. */
function settleEvent(eventId, adminId) {
  return withTransaction(() => {
    const event = get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!event) throw new Error('Evento no encontrado');
    if (event.status === 'settled') {
      return { duplicate: true, event: serializeEvent(event), winners: 0, totalPrize: 0 };
    }
    if (!event.result_option) throw new Error('El evento no tiene un resultado publicado');

    const validCodes = parseOptions(event.options).map(o => o.code);
    if (!validCodes.includes(event.result_option)) {
      throw new Error('El resultado publicado no es una opción válida');
    }

    const version = event.settlement_version + 1;
    run(
      `INSERT INTO settlement_runs (event_id,version,result_option,settled_by) VALUES (?,?,?,?)`,
      [eventId, version, event.result_option, adminId || null]
    );
    const runId = lastInsertId();

    const predictions = all('SELECT * FROM predictions WHERE event_id = ?', [eventId]);
    let winners = 0;
    let totalPrize = 0;

    for (const p of predictions) {
      const won = p.selected_option === event.result_option;
      run('UPDATE predictions SET status = ?, updated_at = ? WHERE id = ?',
        [won ? 'won' : 'lost', nowIso(), p.id]);

      if (won) {
        const prize = Math.round(p.stake * Number(event.prize_multiplier));
        const key = `prize:${p.id}:v${version}`;
        const res = moveCredits(
          p.user_id, prize, 'prize', 'settlement', runId,
          `Premio por pronóstico acertado (${event.name})`, key
        );
        if (!res.duplicate) {
          winners++;
          totalPrize += prize;
        }
      }
    }

    run('UPDATE settlement_runs SET winners_count = ?, total_prize = ? WHERE id = ?',
      [winners, totalPrize, runId]);
    run(
      `UPDATE events SET status = 'settled', settlement_version = ?, settled_at = ? WHERE id = ?`,
      [version, nowIso(), eventId]
    );
    logOperation(`settle:${eventId}:v${version}`, adminId, 'settle_event', 'success',
      `Ganadores: ${winners}, premios: ${totalPrize}`);

    return { duplicate: false, event: serializeEvent(get('SELECT * FROM events WHERE id = ?', [eventId])), winners, totalPrize };
  });
}

function parseOptions(raw) {
  try { return JSON.parse(raw || '[]'); } catch (e) { return []; }
}

/* ==================== SALUD ==================== */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'matchpoint-api', timestamp: nowIso() });
});

/* ==================== AUTENTICACIÓN ==================== */
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (get('SELECT id FROM users WHERE email = ?', [email])) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    withTransaction(() => {
      run(
        `INSERT INTO users (name,email,password_hash,role,credits_balance) VALUES (?,?,?,?,?)`,
        [name, email, bcrypt.hashSync(password, 10), 'user', 0]
      );
      const userId = lastInsertId();
      moveCredits(userId, 0, 'allocation', 'admin', null,
        'Cuenta creada sin créditos iniciales', `alloc:${userId}:register`);
      logOperation(`register:${userId}`, userId, 'register', 'success', 'Usuario registrado');
    });
    saveToDisk();

    const user = get('SELECT id,name,email,role,credits_balance,created_at FROM users WHERE email = ?', [email]);
    res.status(201).json({ message: 'Usuario registrado', token: generateToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    const user = get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const { password_hash, ...safe } = user;
    res.json({ message: 'Inicio de sesión exitoso', token: generateToken(safe), user: safe });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = get('SELECT id,name,email,role,credits_balance,created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user });
});

app.put('/api/auth/me', authenticateToken, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  run('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
  saveToDisk();
  const user = get('SELECT id,name,email,role,credits_balance,created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ message: 'Perfil actualizado', user });
});

/* ==================== TORNEOS ==================== */
app.get('/api/tournaments', (req, res) => {
  const tournaments = all(`
    SELECT t.*,
      (SELECT COUNT(*) FROM events e WHERE e.tournament_id = t.id) AS events_count,
      (SELECT COUNT(*) FROM events e WHERE e.tournament_id = t.id AND e.status = 'settled') AS settled_count
    FROM tournaments t
    ORDER BY t.created_at DESC
  `);
  res.json({ tournaments });
});

app.get('/api/tournaments/:id', (req, res) => {
  const tournament = get('SELECT * FROM tournaments WHERE id = ?', [req.params.id]);
  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });
  const events = all('SELECT * FROM events WHERE tournament_id = ? ORDER BY starts_at', [req.params.id])
    .map(serializeEvent);
  res.json({ tournament, events });
});

/* ==================== EVENTOS ==================== */
app.get('/api/events', (req, res) => {
  const { tournament, status } = req.query;
  let sql = 'SELECT * FROM events WHERE 1=1';
  const params = [];
  if (tournament) { sql += ' AND tournament_id = ?'; params.push(tournament); }
  const events = all(sql + ' ORDER BY starts_at', params).map(serializeEvent);
  const filtered = status ? events.filter(e => e.effective_status === status) : events;
  res.json({ events: filtered, count: filtered.length });
});

app.get('/api/events/:id', (req, res) => {
  const event = get('SELECT * FROM events WHERE id = ?', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
  const tournament = get('SELECT * FROM tournaments WHERE id = ?', [event.tournament_id]);
  const recent = all(`
    SELECT p.id, p.status, p.selected_option, u.name AS user_name
    FROM predictions p JOIN users u ON p.user_id = u.id
    WHERE p.event_id = ? ORDER BY p.created_at DESC LIMIT 8
  `, [event.id]);
  res.json({ event: serializeEvent(event), tournament, recent_predictions: recent });
});

/* ==================== PRONÓSTICOS ==================== */
app.post('/api/events/:id/predictions', authenticateToken, (req, res) => {
  try {
    const { selected_option, idempotency_key } = req.body || {};
    const event = get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    // Idempotencia: repetir la misma solicitud devuelve el pronóstico original
    if (idempotency_key) {
      const byKey = get('SELECT * FROM predictions WHERE idempotency_key = ?', [idempotency_key]);
      if (byKey) {
        logOperation(idempotency_key, req.user.id, 'create_prediction', 'duplicate', 'Solicitud repetida');
        return res.json({ prediction: byKey, duplicate: true, message: 'Pronóstico ya registrado' });
      }
    }
    const existing = get('SELECT * FROM predictions WHERE user_id = ? AND event_id = ?',
      [req.user.id, event.id]);
    if (existing) {
      return res.json({ prediction: existing, duplicate: true, message: 'Ya tienes un pronóstico en este evento' });
    }

    if (effectiveStatus(event) !== 'open') {
      return res.status(400).json({ error: 'El evento no admite pronósticos en este momento' });
    }

    const validCodes = parseOptions(event.options).map(o => o.code);
    if (!selected_option || !validCodes.includes(selected_option)) {
      return res.status(400).json({ error: 'Selecciona una opción válida para este evento' });
    }

    const key = idempotency_key || `prediction:${req.user.id}:${event.id}`;
    const stake = event.stake_cost;
    const user = get('SELECT credits_balance FROM users WHERE id = ?', [req.user.id]);
    if (user.credits_balance < stake) {
      logOperation(key, req.user.id, 'create_prediction', 'failed', 'Saldo insuficiente');
      saveToDisk();
      return res.status(400).json({ error: 'Saldo insuficiente de créditos' });
    }

    let prediction;
    withTransaction(() => {
      // Revalidación dentro de la transacción contra ejecuciones simultáneas
      const fresh = get('SELECT credits_balance FROM users WHERE id = ?', [req.user.id]);
      if (fresh.credits_balance < stake) throw new Error('Saldo insuficiente de créditos');
      const dup = get('SELECT * FROM predictions WHERE user_id = ? AND event_id = ?', [req.user.id, event.id]);
      if (dup) { prediction = dup; return; }

      run(
        `INSERT INTO predictions (user_id,event_id,selected_option,stake,idempotency_key)
         VALUES (?,?,?,?,?)`,
        [req.user.id, event.id, selected_option, stake, key]
      );
      const predictionId = lastInsertId();
      moveCredits(req.user.id, -stake, 'stake', 'prediction', predictionId,
        `Participación en ${event.name}`, `stake:${predictionId}`);
      logOperation(key, req.user.id, 'create_prediction', 'success', `Pronóstico #${predictionId}`);
      prediction = get('SELECT * FROM predictions WHERE id = ?', [predictionId]);
    });
    saveToDisk();

    res.status(201).json({ prediction, duplicate: false, message: 'Pronóstico registrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

/* ==================== CONSULTA DEL USUARIO ==================== */
app.get('/api/me/predictions', authenticateToken, (req, res) => {
  const predictions = all(`
    SELECT p.*, e.name AS event_name, e.market_type, e.options, e.result_option,
           e.status AS event_status, e.starts_at, t.name AS tournament_name
    FROM predictions p
    JOIN events e ON p.event_id = e.id
    JOIN tournaments t ON e.tournament_id = t.id
    WHERE p.user_id = ? ORDER BY p.created_at DESC
  `, [req.user.id]).map(p => ({ ...p, options: parseOptions(p.options) }));
  res.json({ predictions, count: predictions.length });
});

app.get('/api/me/credits', authenticateToken, (req, res) => {
  const user = get('SELECT id,name,credits_balance FROM users WHERE id = ?', [req.user.id]);
  const movements = all(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC, id DESC',
    [req.user.id]
  );
  const derived = movements.reduce((s, m) => s + m.amount, 0);
  res.json({ balance: user.credits_balance, derived_balance: derived, movements, consistent: derived === user.credits_balance });
});

app.get('/api/me/summary', authenticateToken, (req, res) => {
  const balance = get('SELECT credits_balance FROM users WHERE id = ?', [req.user.id]).credits_balance;
  const stats = get(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status='won' THEN 1 ELSE 0 END) AS won,
      SUM(CASE WHEN status='lost' THEN 1 ELSE 0 END) AS lost
    FROM predictions WHERE user_id = ?
  `, [req.user.id]);
  res.json({ balance, predictions: stats });
});

/* ==================== ADMINISTRACIÓN ==================== */
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  const one = (sql, params = []) => get(sql, params);
  res.json({
    users: one('SELECT COUNT(*) AS c FROM users').c,
    tournaments: one('SELECT COUNT(*) AS c FROM tournaments').c,
    events: one('SELECT COUNT(*) AS c FROM events').c,
    open_events: one("SELECT COUNT(*) AS c FROM events WHERE status = 'open'").c,
    predictions: one('SELECT COUNT(*) AS c FROM predictions').c,
    transactions: one('SELECT COUNT(*) AS c FROM transactions').c,
    pending_settlements: one("SELECT COUNT(*) AS c FROM events WHERE status = 'closed' AND result_option IS NULL").c,
    total_credits: one('SELECT COALESCE(SUM(credits_balance),0) AS s FROM users').s,
    total_prizes: one("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE type='prize'").s,
    corrections: one('SELECT COUNT(*) AS c FROM result_corrections').c
  });
});

app.get('/api/admin/reconciliation', authenticateToken, requireAdmin, (req, res) => {
  const users = all(`
    SELECT u.id, u.name, u.email, u.credits_balance,
      COALESCE((SELECT SUM(amount) FROM transactions t WHERE t.user_id = u.id),0) AS movements_sum,
      (SELECT COUNT(*) FROM predictions p WHERE p.user_id = u.id) AS predictions_count,
      (SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id AND t.type='stake') AS stake_movements
    FROM users u ORDER BY u.id
  `);
  const rows = users.map(u => ({
    ...u,
    difference: u.credits_balance - u.movements_sum,
    consistent: u.credits_balance === u.movements_sum && u.predictions_count === u.stake_movements
  }));
  res.json({
    consistent: rows.every(r => r.consistent),
    rows,
    checked_at: nowIso()
  });
});

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    users: all('SELECT id,name,email,role,credits_balance,created_at FROM users ORDER BY id')
  });
});

app.post('/api/admin/users/:id/credits', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { amount, type = 'adjustment', reason } = req.body || {};
    const value = Number(amount);
    if (!Number.isInteger(value) || value === 0) {
      return res.status(400).json({ error: 'Cantidad entera distinta de cero requerida' });
    }
    if (!['allocation', 'adjustment', 'reversal'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de movimiento inválido' });
    }
    const key = `admin:${type}:${req.params.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    let result;
    withTransaction(() => {
      result = moveCredits(req.params.id, value, type, 'admin', null, reason || 'Ajuste administrativo', key);
      logOperation(key, req.user.id, 'admin_credit_adjustment', 'success', reason || `${type} ${value}`);
    });
    saveToDisk();
    res.json({ message: 'Saldo actualizado', transaction: result.transaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/transactions', authenticateToken, requireAdmin, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  res.json({
    transactions: all(`
      SELECT t.*, u.name AS user_name FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC, t.id DESC LIMIT ?
    `, [limit])
  });
});

app.get('/api/admin/operations', authenticateToken, requireAdmin, (req, res) => {
  res.json({ operations: all('SELECT * FROM operation_log ORDER BY id DESC LIMIT 200') });
});

app.get('/api/admin/events', authenticateToken, requireAdmin, (req, res) => {
  const events = all(`
    SELECT e.*, t.name AS tournament_name FROM events e
    JOIN tournaments t ON e.tournament_id = t.id ORDER BY e.starts_at
  `).map(serializeEvent);
  res.json({ events });
});

app.post('/api/admin/tournaments', authenticateToken, requireAdmin, (req, res) => {
  const { name, slug, description, sport } = req.body || {};
  if (!name || !slug) return res.status(400).json({ error: 'Nombre y slug son requeridos' });
  try {
    run('INSERT INTO tournaments (name,slug,description,sport,created_by) VALUES (?,?,?,?,?)',
      [name, slug, description || null, sport || null, req.user.id]);
    saveToDisk();
    res.status(201).json({ tournament: get('SELECT * FROM tournaments WHERE id = ?', [lastInsertId()]) });
  } catch (err) {
    res.status(409).json({ error: 'El slug ya existe' });
  }
});

app.post('/api/admin/events', authenticateToken, requireAdmin, (req, res) => {
  try {
    const b = req.body || {};
    if (!b.tournament_id || !b.name || !b.options || !Array.isArray(b.options) || b.options.length < 2) {
      return res.status(400).json({ error: 'Torneo, nombre y al menos dos opciones son requeridos' });
    }
    const options = b.options.map(o => typeof o === 'string'
      ? { code: o.toLowerCase().replace(/\s+/g, '-'), label: o }
      : { code: String(o.code), label: String(o.label) });
    run(
      `INSERT INTO events
        (tournament_id,name,market_type,options,stake_cost,prize_multiplier,opens_at,closes_at,starts_at,status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [b.tournament_id, b.name, b.market_type === '1X2' ? '1X2' : 'winner',
       JSON.stringify(options), Number(b.stake_cost) || 10, Number(b.prize_multiplier) || 2,
       b.opens_at, b.closes_at, b.starts_at, b.status || 'scheduled']
    );
    saveToDisk();
    res.status(201).json({ event: serializeEvent(get('SELECT * FROM events WHERE id = ?', [lastInsertId()])) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/events/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['scheduled', 'open', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const event = get('SELECT * FROM events WHERE id = ?', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
  if (event.status === 'settled') return res.status(400).json({ error: 'El evento ya fue liquidado' });
  run('UPDATE events SET status = ? WHERE id = ?', [status, req.params.id]);
  saveToDisk();
  res.json({ message: 'Estado actualizado', event: serializeEvent(get('SELECT * FROM events WHERE id = ?', [req.params.id])) });
});

app.post('/api/admin/events/:id/result', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { result_option } = req.body || {};
    const event = get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    if (event.status === 'settled') return res.json({ duplicate: true, message: 'El evento ya fue liquidado', event: serializeEvent(event) });
    const validCodes = parseOptions(event.options).map(o => o.code);
    if (!validCodes.includes(result_option)) return res.status(400).json({ error: 'Resultado inválido' });

    run('UPDATE events SET result_option = ?, status = ? WHERE id = ?',
      [result_option, 'closed', event.id]);
    const result = settleEvent(event.id, req.user.id);
    saveToDisk();
    res.json({ message: 'Resultado publicado y liquidado', ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/events/:id/correct-result', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { result_option, reason } = req.body || {};
    const event = get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    if (event.status !== 'settled') return res.status(400).json({ error: 'El evento aún no ha sido liquidado' });
    const validCodes = parseOptions(event.options).map(o => o.code);
    if (!validCodes.includes(result_option)) return res.status(400).json({ error: 'Resultado inválido' });
    if (result_option === event.result_option) return res.status(400).json({ error: 'El resultado es igual al actual' });

    const previousResult = event.result_option;
    const previousVersion = event.settlement_version;
    const previousRun = get('SELECT * FROM settlement_runs WHERE event_id = ? AND version = ?',
      [event.id, previousVersion]);

    withTransaction(() => {
      run(
        `INSERT INTO result_corrections (event_id,previous_result,new_result,corrected_by,reason)
         VALUES (?,?,?,?,?)`,
        [event.id, previousResult, result_option, req.user.id, reason || null]
      );
      const correctionId = lastInsertId();

      // Reversión de premios anteriores: se conserva el historial, se compensa el saldo
      if (previousRun) {
        const prizes = all(
          `SELECT * FROM transactions
           WHERE type='prize' AND reference_type='settlement' AND reference_id = ?`,
          [previousRun.id]
        );
        prizes.forEach(tx => {
          moveCredits(tx.user_id, -tx.amount, 'correction_reversal', 'correction', correctionId,
            `Reversión por corrección de resultado (${event.name})`, `correction-reversal:${tx.id}`);
        });
      }

      run("UPDATE predictions SET status = 'pending', updated_at = ? WHERE event_id = ?",
        [nowIso(), event.id]);
      run(
        `UPDATE events SET result_option = ?, status = 'closed', settled_at = NULL WHERE id = ?`,
        [result_option, event.id]
      );
      logOperation(`correct:${event.id}:${correctionId}`, req.user.id, 'correct_result', 'success', reason || 'Corrección de resultado');
    });

    const result = settleEvent(event.id, req.user.id);
    saveToDisk();
    res.json({
      message: 'Resultado corregido y vuelto a liquidar',
      previous_result: previousResult,
      new_result: result_option,
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/corrections', authenticateToken, requireAdmin, (req, res) => {
  res.json({ corrections: all(`
    SELECT c.*, e.name AS event_name, u.name AS corrected_by_name
    FROM result_corrections c
    JOIN events e ON c.event_id = e.id
    LEFT JOIN users u ON c.corrected_by = u.id
    ORDER BY c.created_at DESC
  `) });
});

/* ==================== RUTA FALLBACK (SPA) ==================== */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ==================== ARRANQUE ==================== */
(async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`🚀 MatchPoint corriendo en http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`🔐 Admin: admin@matchpoint.com / admin123`);
    console.log(`👤 Usuario: laura@email.com / usuario123`);
  });
})();

module.exports = app;
