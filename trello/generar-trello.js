/* =====================================================================
   MatchPoint - Generador del tablero Trello
   Fuente única de verdad para:
     · MatchPoint-Trello.json          (formato exportación completa de Trello)
     · MatchPoint-Trello-Plantilla.json (formato plantilla / Power-Up)
     · Tablero-Trello.html             (vista previa visual del tablero)
     · README-TRELLO.md                (instrucciones de importación)
   Ejecutar: node trello/generar-trello.js
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const BOARD_ID = 'mpMatchPointBoard';
const BOARD_NAME = 'MatchPoint · Tablero final del proyecto';
const BOARD_DESC = [
  'Plataforma de gestión de torneos, pronósticos y créditos virtuales para Nexo Digital Labs.',
  '',
  'Tablero actualizado con la fase de inicio, el Sprint 1 (MVP), el Sprint 2 (producto final), la validación, la entrega y las mejoras pendientes.',
  '',
  'Equipo: Juan Camilo Ramirez · Thomas Mendoza · Miguel Oviedo',
  'Repositorio: https://github.com/tomsnap2104/matchpoint',
  'Demo: https://omissions-immigrants-tip-salad.trycloudflare.com'
].join('\n');

const D = (...parts) => parts.join('\n\n');

/* ------------------------------- Equipo ------------------------------- */
const members = [
  { id: 'mpJuan', fullName: 'Juan Camilo Ramirez', initials: 'JCR', username: 'juancamiloramirez', color: '#d97706' },
  { id: 'mpThomas', fullName: 'Thomas Mendoza', initials: 'TM', username: 'thomasmendoza', color: '#2563eb' },
  { id: 'mpMiguel', fullName: 'Miguel Oviedo', initials: 'MO', username: 'migueloviedo', color: '#059669' },
];
const EQUIPO = members.map(m => m.id);
const nombreCorto = id => (members.find(m => m.id === id) || {}).fullName || 'Equipo';

/* ------------------------------- Etiquetas ---------------------------- */
const labelDefs = [
  { key: 'hecho', name: 'Hecho', color: 'green' },
  { key: 'planeacion', name: 'Planeación', color: 'sky' },
  { key: 'sprint1', name: 'Sprint 1 · MVP', color: 'blue' },
  { key: 'sprint2', name: 'Sprint 2 · Producto final', color: 'purple' },
  { key: 'backend', name: 'Backend', color: 'orange' },
  { key: 'frontend', name: 'Frontend', color: 'yellow' },
  { key: 'qa', name: 'Pruebas / QA', color: 'lime' },
  { key: 'entrega', name: 'Entrega', color: 'pink' },
  { key: 'mejora', name: 'Mejora futura', color: 'red' },
  { key: 'seguridad', name: 'Seguridad', color: 'gray' },
];
const labelByKey = Object.fromEntries(labelDefs.map(l => [l.key, l]));
const labelId = key => `lab_${key}`;

/* -------------------------------- Listas ------------------------------ */
const lists = [
  { id: 'listBacklog', name: '📋 Backlog · Mejoras futuras', pos: 1 },
  { id: 'listPlaneacion', name: '🧭 Planeación · Fase de inicio', pos: 2 },
  { id: 'listSprint1', name: '✅ Sprint 1 · MVP (completado)', pos: 3 },
  { id: 'listSprint2', name: '🚀 Sprint 2 · Producto final (completado)', pos: 4 },
  { id: 'listQA', name: '🧪 Validación · QA y entrega (completado)', pos: 5 },
  { id: 'listRetro', name: '🔁 Retrospectiva · Aprendizajes (completado)', pos: 6 },
];

/* ------------------------------- Tarjetas ----------------------------- */
const cardsRaw = [];
let cardCounter = 0;
function card(list, name, opts = {}) {
  cardCounter++;
  cardsRaw.push({
    id: `mpcard${String(cardCounter).padStart(3, '0')}`,
    list,
    name,
    members: opts.members || [],
    labels: opts.labels || [],
    desc: opts.desc || '',
    due: opts.due || null,
    done: opts.done !== false,
    checklist: opts.checklist || null,
  });
}

/* ---------- 1. Backlog · Mejoras futuras ---------- */
card(0, 'Desplegar una URL permanente (Render / Railway)', {
  members: ['mpThomas'], labels: ['entrega', 'mejora'], due: '2026-12-10T17:00:00.000Z', done: false,
  desc: D(
    'El repositorio ya está listo para desplegar (`npm install` + `npm start`, puerto por variable `PORT`). La URL actual es un túnel de demostración que depende de que el servidor local siga activo.',
    '• Crear servicio web en Render o Railway desde https://github.com/tomsnap2104/matchpoint\n• Configurar `JWT_SECRET` y volumen persistente para `db/matchpoint.db`\n• Verificar el flujo completo en el entorno desplegado'
  ),
  checklist: ['Crear cuenta en la plataforma de despliegue', 'Conectar el repositorio de GitHub', 'Configurar variables y persistencia', 'Probar registro, pronóstico y liquidación en producción'],
});
card(0, 'Reportes exportables de movimientos y liquidaciones (CSV/PDF)', {
  members: ['mpMiguel'], labels: ['mejora', 'frontend'], due: '2026-12-12T17:00:00.000Z', done: false,
  desc: 'Permitir al administrador descargar el historial de movimientos, pronósticos y liquidaciones para atender reclamaciones sin depender de la pantalla.',
  checklist: ['Diseñar columnas del reporte', 'Implementar endpoint de exportación', 'Añadir botones de descarga en el panel admin'],
});
card(0, 'Aprobación doble para ajustes sensibles de créditos', {
  members: ['mpJuan'], labels: ['mejora', 'seguridad'], due: '2026-12-14T17:00:00.000Z', done: false,
  desc: 'Exigir que dos administradores confirmen los ajustes de créditos por encima de un umbral, conservando la bitácora de aprobaciones.',
});
card(0, 'Pruebas de carga sobre liquidación y concurrencia', {
  members: ['mpJuan'], labels: ['mejora', 'qa'], due: '2026-12-16T17:00:00.000Z', done: false,
  desc: 'Ampliar las 28 pruebas E2E con escenarios de muchos pronósticos simultáneos y eventos con gran cantidad de participantes.',
});
card(0, 'Autenticación de dos factores para administradores', {
  members: ['mpThomas'], labels: ['mejora', 'seguridad'], due: '2026-12-17T17:00:00.000Z', done: false,
  desc: 'Añadir una segunda verificación para el rol administrador y registrar los inicios de sesión en la bitácora.',
});
card(0, 'ADR de persistencia y migración a base de datos administrada', {
  members: ['mpThomas'], labels: ['mejora', 'planeacion'], due: '2026-12-18T17:00:00.000Z', done: false,
  desc: 'Documentar la decisión de usar SQLite embebido (`sql.js`) y plantear la migración futura a una base de datos administrada con volumen persistente.',
});
card(0, 'Nuevas modalidades de torneo y tipos de pronóstico', {
  members: ['mpMiguel', 'mpJuan'], labels: ['mejora', 'frontend', 'backend'], due: '2026-12-19T17:00:00.000Z', done: false,
  desc: 'Habilitar modalidades adicionales ( elimination directa con llaves, carreras, marcador exacto) manteniendo el modelo de opciones dinámicas por evento.',
});
card(0, 'Monitoreo y alertas automáticas de conciliación', {
  members: ['mpJuan'], labels: ['mejora', 'qa'], due: '2026-12-20T17:00:00.000Z', done: false,
  desc: 'Ejecutar la conciliación saldo vs. movimientos al iniciar el servicio y generar una alerta cuando aparezca cualquier diferencia.',
});

/* ---------- 2. Planeación · Fase de inicio ---------- */
card(1, 'Canvas de equipo y propósito del producto', {
  members: EQUIPO, labels: ['planeacion', 'hecho'], due: '2026-10-20T17:00:00.000Z',
  desc: D(
    'Definimos juntos el propósito: construir MatchPoint, una plataforma que centralice torneos, pronósticos y créditos virtuales para Nexo Digital Labs.',
    'Equipo 1: Juan Camilo Ramirez, Thomas Mendoza y Miguel Oviedo.'
  ),
});
card(1, 'Mapa de historias de usuario y releases (R1 / R2 / R3)', {
  members: EQUIPO, labels: ['planeacion', 'hecho'], due: '2026-10-21T17:00:00.000Z',
  desc: 'Mapa de historias con siete recorridos: cuenta y acceso, torneos y eventos, pronósticos, créditos virtuales, transacciones y trazabilidad, resultados y liquidación, consulta y seguimiento. Release 1 (MVP), Release 2 (Should) y Release 3 (Could).',
});
card(1, 'Definición de 9 historias de usuario con criterios INVEST', {
  members: EQUIPO, labels: ['planeacion', 'hecho'], due: '2026-10-22T17:00:00.000Z',
  desc: D(
    'Cada historia se revisó con los siete criterios INVEST: completo, consistente, negociable, valioso, estimable, pequeño y comprobable.',
    'Nota: el documento del Sprint 1 usaba otra numeración (HU001–HU014). Para el tablero final se unificó a la numeración HU01–HU09 usada en la review del Sprint 2, donde cada integrante presentó 3 historias.'
  ),
});
card(1, 'Backlog estimado del Sprint 1 (9 HUs / 29 puntos)', {
  members: EQUIPO, labels: ['planeacion', 'hecho'], due: '2026-10-23T17:00:00.000Z',
  desc: 'Estimación en puntos de historia (escala 1, 2, 3, 5): HU01 3, HU02 3, HU03 3, HU04 5, HU05 2, HU06 3, HU07 3, HU08 2, HU09 5. Total: 29 puntos.',
});
card(1, 'Reparto de historias y review del Sprint 1', {
  members: EQUIPO, labels: ['planeacion', 'hecho'], due: '2026-10-25T17:00:00.000Z',
  desc: D(
    'Reparto final (3 historias por persona):',
    '• Thomas Mendoza: HU01 Registro, HU02 Inicio de sesión, HU09 Permisos por rol\n• Juan Camilo Ramirez: HU03 Crear torneo, HU04 Registrar evento, HU07 Asignar créditos\n• Miguel Oviedo: HU05 Consultar torneos, HU06 Ver eventos, HU08 Consultar saldo'
  ),
});
card(1, 'Retrospectiva Starfish del Sprint 1', {
  members: EQUIPO, labels: ['planeacion', 'hecho'], due: '2026-10-27T17:00:00.000Z',
  desc: 'Mantener: documentar antes de programar. Más: probar cada historia con casos concretos. Empezar: commits pequeños por historia. Menos: dejar trabajo para el último día. Dejar de: pegar contenido sin revisar el formato.',
});

/* ---------- 3. Sprint 1 · MVP ---------- */
const hu = (n, titulo, pts, member, criteria) => {
  card(2, `HU${n} · ${titulo} (${pts} pts)`, {
    members: [member], labels: ['sprint1', 'hecho'], due: `2026-11-0${n <= 5 ? 3 : 5}T17:00:00.000Z`,
    desc: D(
      `Historia de usuario del Sprint 1 · Responsable: ${nombreCorto(member)} · Estimación: ${pts} puntos.`,
      'Implementada y validada en el producto final de MatchPoint.'
    ),
    checklist: criteria,
  });
};
hu('01', 'Registrarme con una identificación en la plataforma', 3, 'mpThomas',
  ['Formulario de registro con datos obligatorios', 'Email repetido rechazado con mensaje claro', 'Cuenta creada con rol Usuario y saldo 0']);
hu('02', 'Iniciar sesión', 3, 'mpThomas',
  ['Credenciales correctas abren sesión JWT', 'Credenciales incorrectas muestran error genérico', 'Opción de cerrar sesión disponible']);
hu('03', 'Crear un torneo', 3, 'mpJuan',
  ['Solo el administrador puede crear torneos', 'Nombre y slug obligatorios y únicos', 'El torneo aparece en el catálogo']);
hu('04', 'Registrar un evento con fecha y opciones de pronóstico', 5, 'mpJuan',
  ['Nombre, fechas y al menos dos opciones', 'Modalidad 1X2 o Ganador', 'El evento queda asociado al torneo']);
hu('05', 'Consultar torneos disponibles', 2, 'mpMiguel',
  ['Lista de torneos con nombre y descripción', 'Navegación al detalle del torneo', 'Mensaje cuando no hay torneos']);
hu('06', 'Ver eventos, fechas y estado de cada uno', 3, 'mpMiguel',
  ['Eventos ordenados por fecha', 'Estado efectivo según ventana horaria', 'Filtro por estado en el catálogo']);
hu('07', 'Asignar créditos iniciales a un usuario', 3, 'mpJuan',
  ['Cantidad entera y distinta de cero', 'El saldo aumenta exactamente', 'Movimiento de asignación registrado']);
hu('08', 'Consultar mi saldo de créditos', 2, 'mpMiguel',
  ['Saldo entero no negativo', 'Solo el saldo del usuario con sesión', 'Actualización visible al recargar']);
hu('09', 'Restringir acciones según el rol y los permisos', 5, 'mpThomas',
  ['Roles Administrador y Usuario', 'Validación en servidor, no solo en la UI', 'Usuario solo ve sus propios datos']);

/* ---------- 4. Sprint 2 · Producto final ---------- */
card(3, 'Diseño del esquema SQLite y datos de ejemplo', {
  members: ['mpJuan'], labels: ['sprint2', 'backend', 'hecho'], due: '2026-11-10T17:00:00.000Z',
  desc: D(
    'Tablas: users, tournaments, events, predictions, transactions, settlement_runs, result_corrections y operation_log.',
    'Restricciones clave: saldo no negativo, un pronóstico por usuario y evento, claves de idempotencia únicas y versión de liquidación por evento.',
    'SQLite embebido con `sql.js` y binario WASM local: sin servidor de base de datos ni compilación nativa.'
  ),
  checklist: ['Esquema y restricciones CHECK/UNIQUE', 'Datos de ejemplo (3 torneos, 6 eventos, 3 usuarios)', 'Script npm run init-db'],
});
card(3, 'API REST: registro, login y tokens JWT', {
  members: ['mpThomas'], labels: ['sprint2', 'backend', 'hecho'], due: '2026-11-10T18:00:00.000Z',
  desc: 'Endpoints /api/auth/register, /api/auth/login, /api/auth/me (GET y PUT). Contraseñas cifradas con bcryptjs y sesión con JWT de 7 días.',
});
card(3, 'Guards de rol y aislamiento de datos por usuario', {
  members: ['mpThomas'], labels: ['sprint2', 'backend', 'hecho'], due: '2026-11-11T17:00:00.000Z',
  desc: 'Middleware `authenticateToken` y `requireAdmin`. Las consultas /api/me/* filtran siempre por el usuario autenticado. Probado: un usuario recibe HTTP 403 al intentar /api/admin/*.',
});
card(3, 'API de torneos y eventos con modalidades 1X2 y Ganador', {
  members: ['mpJuan'], labels: ['sprint2', 'backend', 'hecho'], due: '2026-11-11T18:00:00.000Z',
  desc: 'Listado y detalle de torneos, listado de eventos con filtro por estado, estado efectivo calculado según opens_at / closes_at y opciones dinámicas por evento.',
});
card(3, 'Registro de pronósticos con validación de opción y ventana', {
  members: ['mpJuan'], labels: ['sprint2', 'backend', 'hecho'], due: '2026-11-12T17:00:00.000Z',
  desc: 'Validación de opción válida, evento abierto, saldo suficiente y un pronóstico por usuario/evento. Los pronósticos fuera del periodo son rechazados con HTTP 400.',
});
card(3, 'Control de saldo y movimientos de créditos (sin negativos)', {
  members: ['mpJuan'], labels: ['sprint2', 'backend', 'hecho'], due: '2026-11-12T18:00:00.000Z',
  desc: 'Cada movimiento guarda tipo, cantidad, saldo resultante, referencia, descripción y fecha. La función moveCredits verifica el saldo antes de descontar y nunca permite valores negativos.',
});
card(3, 'Idempotencia y transacciones atómicas', {
  members: ['mpJuan'], labels: ['sprint2', 'backend', 'hecho'], due: '2026-11-13T17:00:00.000Z',
  desc: D(
    'Clave de idempotencia única en pronósticos y movimientos. Dos peticiones simultáneas con la misma clave producen un solo pronóstico y un solo descuento.',
    'Revalidación de saldo y duplicados dentro de la transacción (BEGIN / COMMIT / ROLLBACK) y registro de operaciones exitosas, duplicadas y fallidas en `operation_log`.'
  ),
});
card(3, 'Publicación de resultados y liquidación versionada', {
  members: ['mpJuan'], labels: ['sprint2', 'backend', 'hecho'], due: '2026-11-13T18:00:00.000Z',
  desc: 'Al publicar el resultado se determinan los acertados y se acreditan premios según el multiplicador. `settlement_runs` guarda una versión por liquidación; repetirla devuelve "ya liquidado" sin pagos dobles.',
});
card(3, 'Corrección controlada con reversión e historial', {
  members: ['mpJuan'], labels: ['sprint2', 'backend', 'hecho'], due: '2026-11-14T17:00:00.000Z',
  desc: 'La corrección revierte los premios anteriores con movimientos `correction_reversal`, vuelve a liquidar con el nuevo resultado y deja constancia en `result_corrections`. Ningún movimiento confirmado se elimina.',
});
card(3, 'Conciliación de saldos contra movimientos', {
  members: ['mpJuan'], labels: ['sprint2', 'backend', 'hecho'], due: '2026-11-14T18:00:00.000Z',
  desc: 'Endpoint /api/admin/reconciliation compara el saldo guardado de cada usuario con la suma de sus movimientos y el número de apuestas. El panel muestra el resultado por usuario.',
});
card(3, 'SPA: estructura, router y diseño responsive', {
  members: ['mpMiguel'], labels: ['sprint2', 'frontend', 'hecho'], due: '2026-11-14T19:00:00.000Z',
  desc: 'Aplicación de página única en HTML/CSS/JavaScript vanilla, con router por hash, guardas de ruta, header con saldo en vivo, mensajes toast y diseño adaptable a móvil.',
});
card(3, 'Vistas de torneos, eventos y detalle con pronóstico', {
  members: ['mpMiguel'], labels: ['sprint2', 'frontend', 'hecho'], due: '2026-11-15T10:00:00.000Z',
  desc: 'Catálogo de torneos, filtro de eventos por estado, detalle de evento con opciones, resultado oficial, participaciones recientes y formulario de pronóstico.',
});
card(3, 'Vistas de créditos, pronósticos y perfil', {
  members: ['mpMiguel'], labels: ['sprint2', 'frontend', 'hecho'], due: '2026-11-15T12:00:00.000Z',
  desc: '"Mis créditos" muestra saldo, saldo derivado y estado Conciliado; "Mis pronósticos" muestra estado y resultado; perfil permite actualizar el nombre.',
});
card(3, 'Panel de administración con 4 pestañas', {
  members: ['mpMiguel'], labels: ['sprint2', 'frontend', 'hecho'], due: '2026-11-15T15:00:00.000Z',
  desc: 'Resumen e indicadores, torneos y eventos, liquidación (publicar/cerrar/corregir) y movimientos con trazabilidad y ajuste manual de créditos.',
});
card(3, 'Repositorio GitHub y commits del proyecto', {
  members: ['mpThomas'], labels: ['sprint2', 'entrega', 'hecho'], due: '2026-11-16T10:00:00.000Z',
  desc: 'Repositorio público https://github.com/tomsnap2104/matchpoint con el código completo, .gitignore y dos commits: implementación inicial y documentación de la URL pública.',
});
card(3, 'ZIP de entrega y documentación del proyecto', {
  members: ['mpThomas'], labels: ['sprint2', 'entrega', 'hecho'], due: '2026-11-16T12:00:00.000Z',
  desc: 'Archivo MatchPoint-Sprint2.zip con código, base de datos de ejemplo, README, retrospectiva y review. Incluye también este tablero y su vista previa.',
});

/* ---------- 5. Validación · QA y entrega ---------- */
card(4, '28 pruebas end-to-end de la API (100% exitosas)', {
  members: ['mpJuan'], labels: ['qa', 'hecho'], due: '2026-11-17T09:00:00.000Z',
  desc: 'Cobertura: health, torneos, eventos, autenticación, roles, opción inválida, idempotencia, concurrencia, descuento, premio, liquidación duplicada, corrección, conciliación, trazabilidad, guards y frontend servido.',
});
card(4, 'Verificación del SPA en navegador sin errores de consola', {
  members: ['mpMiguel'], labels: ['qa', 'hecho'], due: '2026-11-17T10:00:00.000Z',
  desc: 'Probados inicio, login, evento, pronóstico desde la UI (saldo 125 → 110), créditos, administración, pestaña de liquidación y guard de rutas. Consola limpia.',
});
card(4, 'Caso crítico: doble descuento y operaciones simultáneas', {
  members: ['mpJuan'], labels: ['qa', 'hecho'], due: '2026-11-17T11:00:00.000Z',
  desc: 'Dos solicitudes concurrentes con la misma clave de idempotencia → un solo pronóstico y un solo movimiento de apuesta. El reintento devuelve `duplicate: true` sin descontar.',
});
card(4, 'Caso crítico: premios duplicados y corrección', {
  members: ['mpJuan'], labels: ['qa', 'hecho'], due: '2026-11-17T12:00:00.000Z',
  desc: 'Repetir la liquidación no aumenta el saldo. Corregir el resultado revierte el premio, vuelve a liquidar y conserva el historial de correcciones.',
});
card(4, 'URL pública de demostración', {
  members: ['mpThomas'], labels: ['entrega', 'hecho'], due: '2026-11-17T13:00:00.000Z',
  desc: 'Túnel público https://omissions-immigrants-tip-salad.trycloudflare.com apuntando al servidor local. Verificado con /api/health y con la carga de la SPA.',
});
card(4, 'README con instalación, endpoints y despliegue', {
  members: ['mpThomas'], labels: ['entrega', 'hecho'], due: '2026-11-17T14:00:00.000Z',
  desc: 'Incluye stack, comandos, credenciales de prueba, tabla de endpoints, pruebas, URLs y notas de despliegue.',
});
card(4, 'REVIEW_SPRINT2.md: demo, criterios y evidencia', {
  members: ['mpMiguel'], labels: ['entrega', 'hecho'], due: '2026-11-17T15:00:00.000Z',
  desc: 'Guion de demostración de 11 pasos, matriz de criterios de aceptación, evidencia de pruebas y decisiones técnicas.',
});
card(4, 'RETROSPECTIVA_SPRINT2.md: Starfish y mejoras', {
  members: ['mpThomas'], labels: ['entrega', 'hecho'], due: '2026-11-17T16:00:00.000Z',
  desc: 'Mantener, hacer más, hacer menos, dejar de hacer y empezar a hacer, con aprendizajes y compromisos para el siguiente sprint.',
});

/* ---------- 6. Retrospectiva · Aprendizajes ---------- */
card(5, 'Mantener: documentar antes de programar', {
  members: EQUIPO, labels: ['planeacion', 'hecho'], due: '2026-11-17T17:00:00.000Z',
  desc: 'El canvas, el mapa de historias y el backlog dieron una guía clara de qué construir. Mantener esta práctica en el siguiente sprint.',
});
card(5, 'Más de: pruebas concretas y seguimiento corto', {
  members: EQUIPO, labels: ['qa', 'hecho'], due: '2026-11-17T17:10:00.000Z',
  desc: 'Probar cada historia con datos repetidos, fechas inválidas y permisos por rol; reuniones breves de seguimiento durante la semana.',
});
card(5, 'Menos de: dejar el trabajo para los últimos días', {
  members: EQUIPO, labels: ['mejora', 'hecho'], due: '2026-11-17T17:20:00.000Z',
  desc: 'Distribuir la carga durante el sprint para evitar concentrar la entrega al final.',
});
card(5, 'Empezar: commits pequeños por historia', {
  members: ['mpThomas'], labels: ['entrega', 'hecho'], due: '2026-11-17T17:30:00.000Z',
  desc: 'Usar Git con commits frecuentes y mensajes descriptivos, accesibles desde cualquier equipo.',
});
card(5, 'Dejar de: pegar contenido sin revisar el formato', {
  members: ['mpMiguel'], labels: ['mejora', 'hecho'], due: '2026-11-17T17:40:00.000Z',
  desc: 'Revisar siempre el formato al migrar contenido entre herramientas; en el sprint anterior se dañó el formato varias veces.',
});
card(5, 'Aprendizaje clave: idempotencia y conciliación', {
  members: ['mpJuan'], labels: ['hecho'], due: '2026-11-17T17:50:00.000Z',
  desc: 'La idempotencia evita cobros dobles por reintentos de red; la conciliación (saldo vs. suma de movimientos) es la prueba directa de que el sistema es confiable.',
});

/* ==================== FORMATO 1: exportación completa ==================== */
function buildFullExport() {
  const labelObjects = labelDefs.map(l => ({
    id: labelId(l.key), name: l.name, color: l.color, idBoard: BOARD_ID, pos: labelDefs.indexOf(l) + 1,
  }));
  const cardObjects = [];
  const checklistObjects = [];

  cardsRaw.forEach((c, i) => {
    const pos = (i + 1) * 1024;
    const labels = c.labels.map(k => ({ id: labelId(k), name: labelByKey[k].name, color: labelByKey[k].color }));
    const idChecklists = [];
    if (c.checklist) {
      const clId = `mpcheck${String(i + 1).padStart(3, '0')}`;
      checklistObjects.push({
        id: clId,
        name: 'Criterios / pasos',
        idCard: c.id,
        pos: 1024,
        checkItems: c.checklist.map((item, j) => ({
          id: `${clId}item${j + 1}`,
          name: item,
          state: c.done ? 'complete' : 'incomplete',
          pos: (j + 1) * 1024,
        })),
      });
      idChecklists.push(clId);
    }
    cardObjects.push({
      id: c.id,
      idBoard: BOARD_ID,
      idList: lists[c.list].id,
      name: c.name,
      desc: c.desc,
      descData: null,
      idMembers: c.members,
      idLabels: labels.map(l => l.id),
      labels,
      pos,
      due: c.due,
      dueComplete: c.done,
      start: null,
      closed: false,
      pinned: false,
      idChecklists,
      cover: null,
      manualCover: false,
      customFieldItems: [],
      url: `https://trello.com/c/${c.id}`,
      shortUrl: `https://trello.com/c/${c.id}`,
      dateLastActivity: c.due || '2026-11-17T17:50:00.000Z',
    });
  });

  return {
    id: BOARD_ID,
    name: BOARD_NAME,
    desc: BOARD_DESC,
    descData: null,
    closed: false,
    idOrganization: null,
    idEnterprise: null,
    pinned: false,
    url: 'https://trello.com/b/mpMatchPoint/matchpoint',
    shortUrl: 'https://trello.com/b/mpMatchPoint',
    prefs: {
      permissionLevel: 'private',
      hideVotes: false,
      voting: 'members',
      comments: 'members',
      invitations: 'members',
      selfJoin: false,
      cardCovers: true,
      cardAging: 'regular',
      calendarFeedEnabled: false,
      background: 'gradientblue',
      backgroundImage: null,
      backgroundImageScaled: null,
      backgroundTile: false,
      backgroundBrightness: 'dark',
      backgroundColor: '#0079BF',
      backgroundBottomColor: '#0C5AA6',
      backgroundTopColor: '#0079BF',
      canBePublic: true,
      canBeEnterprise: true,
      canBeOrg: true,
      canBePrivate: true,
      canInvite: true,
    },
    labelNames: Object.fromEntries(labelDefs.map(l => [l.color, l.name])),
    limits: {},
    members: members.map(m => ({
      id: m.id,
      avatarHash: null,
      fullName: m.fullName,
      initials: m.initials,
      username: m.username,
      confirmed: true,
      memberType: 'normal',
      status: 'active',
    })),
    labels: labelObjects,
    lists: lists.map(l => ({ id: l.id, name: l.name, closed: false, idBoard: BOARD_ID, pos: l.pos })),
    cards: cardObjects,
    checklists: checklistObjects,
  };
}

/* ==================== FORMATO 2: plantilla ==================== */
function buildTemplate() {
  return {
    name: BOARD_NAME,
    desc: BOARD_DESC,
    defaultLists: false,
    labels: labelDefs.map(l => ({ id: labelId(l.key), name: l.name, color: l.color })),
    lists: lists.map((list, li) => ({
      name: list.name,
      cards: cardsRaw.filter(c => c.list === li).map((c, i) => ({
        name: c.name,
        desc: c.desc,
        pos: (i + 1) * 1024,
        labels: c.labels.map(labelId),
        idMembers: c.members,
        due: c.due,
        dueComplete: c.done,
        checklists: c.checklist
          ? [{ name: 'Criterios / pasos', items: c.checklist.map(name => ({ name, checked: c.done })) }]
          : [],
      })),
    })),
  };
}

/* ==================== VISTA PREVIA HTML ==================== */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function buildHtml() {
  const done = cardsRaw.filter(c => c.done).length;
  const total = cardsRaw.length;
  const points = 29;
  const memberHtml = members.map(m =>
    `<span class="member-chip"><span class="avatar" style="background:${m.color}">${esc(m.initials)}</span>${esc(m.fullName)}</span>`
  ).join('');

  const columns = lists.map((list, li) => {
    const listCards = cardsRaw.filter(c => c.list === li);
    const cardsHtml = listCards.map(c => {
      const labels = c.labels.map(k => {
        const l = labelByKey[k];
        return `<span class="label label-${l.color}" title="${esc(l.name)}">${esc(l.name)}</span>`;
      }).join('');
      const avatars = c.members.map(id => {
        const m = members.find(x => x.id === id);
        return `<span class="avatar" style="background:${m.color}" title="${esc(m.fullName)}">${esc(m.initials)}</span>`;
      }).join('');
      const check = c.checklist
        ? `<span class="meta-item">✔ ${c.checklist.length}/${c.checklist.length}</span>` : '';
      const due = c.due ? `<span class="meta-item">📅 ${fmtDate(c.due)}</span>` : '';
      const desc = c.desc ? `<div class="card-desc">${esc(c.desc).split('\n').slice(0, 3).join('<br>')}</div>` : '';
      return `<article class="card">
        <div class="labels">${labels}</div>
        <h4>${esc(c.name)}</h4>
        ${desc}
        <div class="card-footer"><div class="meta">${check}${due}</div><div class="avatars">${avatars}</div></div>
      </article>`;
    }).join('');
    return `<section class="list">
      <div class="list-header"><h3>${esc(list.name)}</h3><span class="count">${listCards.length}</span></div>
      <div class="cards">${cardsHtml}</div>
    </section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(BOARD_NAME)}</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#f1f2f4;color:#172b4d}
header{background:linear-gradient(135deg,#0079bf,#0c5aa6);color:#fff;padding:26px 30px 22px;box-shadow:0 2px 8px rgba(0,0,0,.2)}
header h1{margin:0 0 6px;font-size:26px}
header p{margin:0;opacity:.9;font-size:14px;max-width:960px;line-height:1.5}
.team{display:flex;gap:18px;flex-wrap:wrap;margin-top:16px}
.member-chip{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600}
.avatar{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;color:#fff;font-size:10px;font-weight:800;letter-spacing:.03em}
.stats{display:flex;gap:26px;flex-wrap:wrap;margin-top:18px}
.stat{background:rgba(255,255,255,.14);border-radius:8px;padding:8px 14px;font-size:13px}
.stat b{font-size:18px;display:block}
.board{display:flex;gap:14px;align-items:flex-start;padding:22px 30px 50px;overflow-x:auto}
.list{background:#ebecf0;border-radius:10px;width:310px;min-width:310px;padding:10px;max-height:calc(100vh - 120px);overflow-y:auto}
.list-header{display:flex;align-items:center;justify-content:space-between;padding:4px 6px 12px}
.list-header h3{margin:0;font-size:14px;font-weight:700}
.count{background:#dfe1e6;border-radius:10px;padding:2px 9px;font-size:12px;color:#42526e;font-weight:700}
.cards{display:grid;gap:9px}
.card{background:#fff;border-radius:8px;padding:11px 12px;box-shadow:0 1px 2px rgba(9,30,66,.25);border:1px solid transparent}
.card:hover{border-color:#0079bf}
.card h4{margin:6px 0 6px;font-size:13.5px;line-height:1.35}
.labels{display:flex;flex-wrap:wrap;gap:4px}
.label{font-size:10px;font-weight:700;color:#fff;border-radius:4px;padding:3px 7px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.label-green{background:#61bd4f}.label-sky{background:#5ba4cf}.label-blue{background:#0079bf}
.label-purple{background:#9f5fcd}.label-orange{background:#f5a623}.label-yellow{background:#f2d600;color:#172b4d}
.label-lime{background:#51e898;color:#172b4d}.label-pink{background:#e83e8c}.label-red{background:#eb5a46}
.label-gray{background:#7d8a99}
.card-desc{font-size:11.5px;color:#5e6c84;line-height:1.45;margin-bottom:8px}
.card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #f1f2f4;padding-top:8px}
.meta{display:flex;gap:10px;font-size:11px;color:#6b778c}
.avatars{display:flex}
.avatars .avatar{width:25px;height:25px;font-size:9px;margin-left:-5px;border:2px solid #fff}
footer{padding:0 30px 34px;color:#5e6c84;font-size:12px}
code{background:#e4e6ea;border-radius:4px;padding:1px 5px}
@media(max-width:700px){header,footer{padding-left:16px;padding-right:16px}.board{padding-left:16px;padding-right:16px}}
</style>
</head>
<body>
<header>
  <h1>🎯 ${esc(BOARD_NAME)}</h1>
  <p>${esc(BOARD_DESC.replace(/\n/g, ' '))}</p>
  <div class="team">${memberHtml}</div>
  <div class="stats">
    <div class="stat"><b>${total}</b>tarjetas</div>
    <div class="stat"><b>${done}</b>completadas</div>
    <div class="stat"><b>${lists.length}</b>columnas</div>
    <div class="stat"><b>${points}</b>puntos Sprint 1</div>
    <div class="stat"><b>28/28</b>pruebas E2E</div>
  </div>
</header>
<main class="board">${columns}</main>
<footer>
  Vista previa del tablero. Para importarlo a Trello usa <code>MatchPoint-Trello.json</code> (exportación completa) o
  <code>MatchPoint-Trello-Plantilla.json</code> (formato plantilla). Instrucciones en <code>README-TRELLO.md</code>.
</footer>
</body>
</html>`;
}

/* ==================== README ==================== */
function buildReadme() {
  return `# Tablero Trello · MatchPoint

Tablero actualizado con **todo el trabajo realizado**: fase de inicio, Sprint 1 (MVP), Sprint 2 (producto final), validación, entrega y mejoras futuras.

## Equipo y reparto de historias

| Integrante | Historias del Sprint 1 | Responsabilidades principales en el Sprint 2 |
|---|---|---|
| **Juan Camilo Ramirez** | HU03 Crear torneo · HU04 Registrar evento · HU07 Asignar créditos | Esquema de base de datos, API de pronósticos, créditos, idempotencia, liquidación, correcciones, conciliación y pruebas E2E |
| **Thomas Mendoza** | HU01 Registro · HU02 Inicio de sesión · HU09 Permisos por rol | Autenticación JWT, guards de rol, repositorio GitHub, documentación y URL pública |
| **Miguel Oviedo** | HU05 Consultar torneos · HU06 Ver eventos · HU08 Consultar saldo | SPA, router, vistas de usuario, panel de administración, review y verificación en navegador |

> **Nota sobre la numeración:** el documento original del Sprint 1 usaba HU001–HU014 con otro reparto. Para el tablero final se unificó a la numeración **HU01–HU09** empleada en la *review* del Sprint 2, donde cada integrante presentó 3 historias. El Sprint 1 quedó en **29 puntos** (3+3+3+5+2+3+3+2+5).

## Archivos generados

| Archivo | Para qué sirve |
|---|---|
| \`MatchPoint-Trello.json\` | Formato de **exportación completa de Trello**. Es el principal: se importa desde la opción de Trello para importar tableros. |
| \`MatchPoint-Trello-Plantilla.json\` | Formato **plantilla** (nombre, listas, tarjetas, etiquetas, miembros y checklists). Útil para Power-Ups y herramientas compatibles. |
| \`Tablero-Trello.html\` | Vista previa visual del tablero, lista para abrir o capturar. |
| \`generar-trello.js\` | Generador: si cambias una tarjeta, edita este archivo y corre \`node trello/generar-trello.js\`. |

## Cómo importar a Trello

### Opción A · Importar desde la exportación completa

1. Entra a **https://trello.com** e inicia sesión.
2. Ve a **Crear → Importar tablero** (o abre https://trello.com/import).
3. Elige el archivo \`MatchPoint-Trello.json\` y sube el archivo.
4. Trello creará el tablero **"${BOARD_NAME}"** con las 6 columnas, las tarjetas, etiquetas, colores, fechas, miembros y checklists.
5. Si los usuarios no existen en tu cuenta de Trello, las tarjetas conservan los nombres completos: asígnlos manualmente (Juan Camilo Ramirez, Thomas Mendoza, Miguel Oviedo).

### Opción B · Importar desde el menú de un tablero

1. Crea un tablero vacío.
2. Abre el menú del tablero → **Más → Importar** (o usa un Power-Up de importación JSON).
3. Selecciona \`MatchPoint-Trello-Plantilla.json\`.
4. Revisa que las listas y tarjetas se hayan creado.

### Opción C · Solo revisar el tablero

Abre \`Tablero-Trello.html\` en el navegador. Muestra el tablero completo con etiquetas, responsables, fechas y progreso de checklists.

## Columnas del tablero

| Columna | Contenido |
|---|---|
| 📋 Backlog · Mejoras futuras | Pendientes: despliegue permanente, reportes, aprobación doble, pruebas de carga, 2FA, ADR, nuevas modalidades y monitoreo. |
| 🧭 Planeación · Fase de inicio | Canvas, mapa de historias, criterios INVEST, estimación y reparto del Sprint 1, retro del Sprint 1. |
| ✅ Sprint 1 · MVP (completado) | Las 9 historias de usuario, con responsable, puntos y checklist de criterios. |
| 🚀 Sprint 2 · Producto final (completado) | Base de datos, API, idempotencia, liquidación, correcciones, SPA, panel admin, GitHub y ZIP. |
| 🧪 Validación · QA y entrega (completado) | 28 pruebas E2E, verificación en navegador, casos críticos, URL, README, review y retrospectiva. |
| 🔁 Retrospectiva · Aprendizajes (completado) | Starfish: mantener, más, menos, empezar, dejar de hacer y aprendizaje clave. |

## Datos de la entrega

- Repositorio: https://github.com/tomsnap2104/matchpoint
- Demo en vivo: https://omissions-immigrants-tip-salad.trycloudflare.com
- ZIP: \`../MatchPoint-Sprint2.zip\`
- Credenciales: admin \`admin@matchpoint.com\` / \`admin123\` · usuario \`laura@email.com\` / \`usuario123\`
`;
}

/* ============================ Escritura ============================ */
const full = buildFullExport();
const template = buildTemplate();
const html = buildHtml();
const readme = buildReadme();

fs.writeFileSync(path.join(OUT, 'MatchPoint-Trello.json'), JSON.stringify(full, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(OUT, 'MatchPoint-Trello-Plantilla.json'), JSON.stringify(template, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(OUT, 'Tablero-Trello.html'), html, 'utf8');
fs.writeFileSync(path.join(OUT, 'README-TRELLO.md'), readme, 'utf8');

console.log('✅ Tablero Trello generado');
console.log(`   ${lists.length} columnas · ${cardsRaw.length} tarjetas · ${full.checklists.length} checklists · ${members.length} integrantes`);
console.log('   Archivos: MatchPoint-Trello.json, MatchPoint-Trello-Plantilla.json, Tablero-Trello.html, README-TRELLO.md');
