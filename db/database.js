/* =====================================================================
   MatchPoint - Capa de base de datos (SQLite embebido con sql.js)
   Toda la persistencia se concentra aquí.
   ===================================================================== */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'matchpoint.db');
const WASM_PATH = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

let dbInstance = null;
let initPromise = null;
let txDepth = 0;

function requireDb() {
  if (!dbInstance) throw new Error('Base de datos no inicializada. Llama a await init() primero.');
  return dbInstance;
}

initPromise = (async () => {
  const wasmBinary = fs.readFileSync(WASM_PATH);
  const SQL = await initSqlJs({ wasmBinary });
  let buffer = null;
  if (fs.existsSync(DB_PATH)) buffer = fs.readFileSync(DB_PATH);
  dbInstance = new SQL.Database(buffer);
  dbInstance.run('PRAGMA foreign_keys = ON');
  initSchemaAndSeed();
})();

function init() { return initPromise; }

function run(sql, params = []) {
  const stmt = requireDb().prepare(sql);
  stmt.bind(params);
  stmt.run();
  stmt.free();
}

function get(sql, params = []) {
  const stmt = requireDb().prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const stmt = requireDb().prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function saveToDisk() {
  if (!dbInstance) return;
  fs.writeFileSync(DB_PATH, dbInstance.export());
}

/** Transacción anidada segura: solo el nivel externo hace BEGIN/COMMIT. */
function withTransaction(fn) {
  if (txDepth > 0) return fn();
  const db = requireDb();
  db.run('BEGIN');
  txDepth++;
  try {
    const result = fn();
    db.run('COMMIT');
    txDepth--;
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    txDepth--;
    throw err;
  }
}

/* ==================== ESQUEMA ==================== */
function initSchemaAndSeed() {
  const db = requireDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      credits_balance INTEGER NOT NULL DEFAULT 0 CHECK(credits_balance >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      sport TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','finished')),
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      market_type TEXT NOT NULL CHECK(market_type IN ('1X2','winner')),
      options TEXT NOT NULL,
      stake_cost INTEGER NOT NULL DEFAULT 10 CHECK(stake_cost > 0),
      prize_multiplier REAL NOT NULL DEFAULT 2.0,
      opens_at DATETIME NOT NULL,
      closes_at DATETIME NOT NULL,
      starts_at DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','open','closed','settled')),
      result_option TEXT,
      settlement_version INTEGER NOT NULL DEFAULT 0,
      settled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      event_id INTEGER NOT NULL REFERENCES events(id),
      selected_option TEXT NOT NULL,
      stake INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','won','lost')),
      idempotency_key TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      UNIQUE(user_id, event_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('allocation','stake','prize','adjustment','reversal','correction_reversal')),
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      description TEXT,
      idempotency_key TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settlement_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id),
      version INTEGER NOT NULL,
      result_option TEXT NOT NULL,
      settled_by INTEGER REFERENCES users(id),
      winners_count INTEGER NOT NULL DEFAULT 0,
      total_prize INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, version)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS result_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id),
      previous_result TEXT,
      new_result TEXT NOT NULL,
      corrected_by INTEGER REFERENCES users(id),
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS operation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT,
      user_id INTEGER,
      operation TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('success','failed','duplicate')),
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ['users', 'events', 'predictions', 'transactions', 'settlement_runs'].forEach(t => {
    db.run(`CREATE INDEX IF NOT EXISTS idx_${t}_created ON ${t}(created_at)`);
  });

  const count = get('SELECT COUNT(*) AS c FROM users').c;
  if (count === 0) seed();
  saveToDisk();
  console.log('✅ Base de datos de MatchPoint inicializada');
}

function isoDays(offset, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function seed() {
  const hash = bcrypt.hashSync('usuario123', 10);
  const adminHash = bcrypt.hashSync('admin123', 10);

  run(`INSERT INTO users (name,email,password_hash,role,credits_balance) VALUES (?,?,?,?,?)`,
    ['Admin MatchPoint', 'admin@matchpoint.com', adminHash, 'admin', 0]);
  const users = [
    ['Laura Gómez', 'laura@email.com', 120],
    ['Diego Ruiz', 'diego@email.com', 120],
    ['Sofía Torres', 'sofia@email.com', 120],
  ];
  users.forEach(u => {
    run(`INSERT INTO users (name,email,password_hash,role,credits_balance) VALUES (?,?,?,?,?)`,
      [u[0], u[1], hash, 'user', u[2]]);
  });
  run(`INSERT INTO transactions (user_id,type,amount,balance_after,reference_type,description,idempotency_key)
       SELECT id,'allocation',credits_balance,credits_balance,'admin','Asignación inicial de créditos',
              'alloc:'||id FROM users WHERE credits_balance > 0`);

  run(`INSERT INTO tournaments (name,slug,description,sport,created_by) VALUES (?,?,?,?,?)`,
    ['Liga de Fútbol 2026', 'liga-futbol-2026', 'Torneo de pronósticos de la temporada regular.', 'Fútbol', 1]);
  run(`INSERT INTO tournaments (name,slug,description,sport,created_by) VALUES (?,?,?,?,?)`,
    ['Copa Eliminación Directa', 'copa-eliminacion', 'Llaves eliminatorias con pronóstico de ganador.', 'Fútbol', 1]);
  run(`INSERT INTO tournaments (name,slug,description,sport,created_by) VALUES (?,?,?,?,?)`,
    ['Gran Premio de Ciclismo', 'gran-premio-ciclismo', 'Pronostica al ganador de la carrera.', 'Ciclismo', 1]);

  const opts1x2 = JSON.stringify([
    { code: 'local', label: 'Victoria local' },
    { code: 'draw', label: 'Empate' },
    { code: 'away', label: 'Victoria visitante' },
  ]);
  const optsWin = (a, b, c) => JSON.stringify([
    { code: 'a', label: a }, { code: 'b', label: b }, { code: 'c', label: c },
  ]);

  run(`INSERT INTO events (tournament_id,name,market_type,options,stake_cost,prize_multiplier,opens_at,closes_at,starts_at,status)
       VALUES (1,?,'1X2',?,10,2.5,?,?,?,'open')`,
    ['Águilas vs. Toros', opts1x2, isoDays(-2), isoDays(2), isoDays(3)]);
  run(`INSERT INTO events (tournament_id,name,market_type,options,stake_cost,prize_multiplier,opens_at,closes_at,starts_at,status)
       VALUES (1,?,'1X2',?,15,2.0,?,?,?,'open')`,
    ['Lobos vs. Cóndores', opts1x2, isoDays(-1), isoDays(4), isoDays(5)]);
  run(`INSERT INTO events (tournament_id,name,market_type,options,stake_cost,prize_multiplier,opens_at,closes_at,starts_at,status)
       VALUES (2,?,'winner',?,10,3.0,?,?,?,'scheduled')`,
    ['Semifinal: Tigres vs. Leones', optsWin('Tigres', 'Leones', 'Empate / penales'), isoDays(1), isoDays(3), isoDays(4)]);
  run(`INSERT INTO events (tournament_id,name,market_type,options,stake_cost,prize_multiplier,opens_at,closes_at,starts_at,status)
       VALUES (3,?,'winner',?,10,4.0,?,?,?,'closed')`,
    ['Etapa reina: Meta del Alto', optsWin('Equipo A', 'Equipo B', 'Equipo C'), isoDays(-5), isoDays(-1), isoDays(0, 8)]);
  run(`INSERT INTO events (tournament_id,name,market_type,options,stake_cost,prize_multiplier,opens_at,closes_at,starts_at,status,result_option,settlement_version,settled_at)
       VALUES (1,?,'1X2',?,10,2.5,?,?,?,'settled','local',1,?)`,
    ['Panteras vs. Osos', opts1x2, isoDays(-8), isoDays(-4), isoDays(-3), isoDays(-3, 18)]);
  run(`INSERT INTO events (tournament_id,name,market_type,options,stake_cost,prize_multiplier,opens_at,closes_at,starts_at,status)
       VALUES (2,?,'winner',?,20,2.0,?,?,?,'open')`,
    ['Cuartos: Sharks vs. Wolves', optsWin('Sharks', 'Wolves', 'Empate / penales'), isoDays(-1), isoDays(2), isoDays(3)]);

  // Historial del evento ya liquidado (evento 5)
  run(`INSERT INTO predictions (user_id,event_id,selected_option,stake,status,idempotency_key,created_at)
       VALUES (2,5,'local',10,'won','seed-pred-2-5',?)`, [isoDays(-7)]);
  run(`INSERT INTO predictions (user_id,event_id,selected_option,stake,status,idempotency_key,created_at)
       VALUES (3,5,'draw',10,'lost','seed-pred-3-5',?)`, [isoDays(-7)]);

  // Ajustar saldos y registrar movimientos derivados del evento liquidado
  // Laura: 120 - 10 + 25 = 135 | Diego: 120 - 10 = 110
  run(`UPDATE users SET credits_balance = 135 WHERE id = 2`);
  run(`UPDATE users SET credits_balance = 110 WHERE id = 3`);

  run(`INSERT INTO transactions (user_id,type,amount,balance_after,reference_type,reference_id,description,idempotency_key,created_at)
       VALUES (2,'stake',-10,110,'prediction',1,'Pronóstico en Panteras vs. Osos','seed-stake-2',?)`, [isoDays(-7)]);
  run(`INSERT INTO transactions (user_id,type,amount,balance_after,reference_type,reference_id,description,idempotency_key,created_at)
       VALUES (3,'stake',-10,110,'prediction',2,'Pronóstico en Panteras vs. Osos','seed-stake-3',?)`, [isoDays(-7)]);
  run(`INSERT INTO transactions (user_id,type,amount,balance_after,reference_type,reference_id,description,idempotency_key,created_at)
       VALUES (2,'prize',25,135,'settlement',1,'Premio por pronóstico acertado','seed-prize-2',?)`, [isoDays(-3, 18)]);

  run(`INSERT INTO settlement_runs (event_id,version,result_option,settled_by,winners_count,total_prize,created_at)
       VALUES (5,1,'local',1,1,25,?)`, [isoDays(-3, 18)]);

  console.log('👥 Usuarios, torneos, eventos y movimientos de ejemplo creados');
}

module.exports = {
  run, get, all, saveToDisk, withTransaction, init: () => initPromise, DB_PATH
};
