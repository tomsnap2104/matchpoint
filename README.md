# MatchPoint

**Plataforma de gestión de torneos, pronósticos y créditos virtuales**
Empresa solicitante: **Nexo Digital Labs**

MatchPoint centraliza la operación de torneos deportivos, pronósticos de resultados y créditos virtuales. La plataforma garantiza trazabilidad de cada movimiento, control de saldo, idempotencia ante reintentos y liquidación verificable de resultados.

> Los créditos son **exclusivamente virtuales**: no tienen valor monetario, no pueden retirarse ni convertirse a dinero real.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express |
| Base de datos | SQLite embebido (`sql.js`, binario WASM local) |
| Autenticación | JWT (jsonwebtoken) + bcryptjs |
| Frontend | SPA en HTML / CSS / JavaScript vanilla |
| Persistencia | Archivo `db/matchpoint.db` |

No se requiere servidor de base de datos externo ni descargas en tiempo de ejecución.

**Demo en vivo:** https://omissions-immigrants-tip-salad.trycloudflare.com
**Repositorio:** https://github.com/tomsnap2104/matchpoint

---

## Instalación y ejecución

```bash
npm install
npm run init-db     # crea db/matchpoint.db con datos de ejemplo
npm start           # http://localhost:3000
```

Variables de entorno opcionales:

- `PORT` (por defecto `3000`)
- `JWT_SECRET` (cambiar en producción)

### Credenciales de demostración

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@matchpoint.com` | `admin123` |
| Usuario | `laura@email.com` | `usuario123` |
| Usuario | `diego@email.com` | `usuario123` |
| Usuario | `sofia@email.com` | `usuario123` |

---

## Funcionalidades

### Gestión de torneos y eventos
- Creación de torneos y eventos desde el panel de administración.
- Modalidades de pronóstico: **1X2** (local / empate / visitante) y **Ganador**.
- Cada evento define costo de participación, multiplicador de premio y ventana de apertura/cierre.
- Estados efectivos: `scheduled`, `open`, `closed`, `settled`.
- Solo administradores pueden crear torneos/eventos, cambiar estados y publicar resultados.

### Participación y pronósticos
- Registro de usuarios e inicio de sesión.
- Un pronóstico por usuario y evento (`UNIQUE(user_id, event_id)`).
- Validación de opción válida y de ventana habilitada.
- Rechazo de pronósticos fuera del periodo permitido.
- Consulta de pronósticos propios con estado y resultado del evento.

### Créditos virtuales
- Asignación inicial y ajustes administrativos (asignación / ajuste / reversión).
- Verificación de saldo antes de descontar; **nunca se permite saldo negativo**.
- Cada movimiento registra tipo, cantidad, saldo resultante, referencia y descripción.
- El saldo mostrado puede verificarse sumando el historial de movimientos.
- Panel de conciliación que detecta inconsistencias entre saldo, movimientos y apuestas.

### Trazabilidad y idempotencia
- Clave de idempotencia en pronósticos: un reintento devuelve el pronóstico original sin descontar créditos dos veces.
- Operaciones agrupadas en transacciones atómicas (`BEGIN / COMMIT / ROLLBACK`).
- Revalidación de saldo y duplicados dentro de la transacción para evitar ejecuciones simultáneas.
- Registro de operaciones exitosas, duplicadas y fallidas (`operation_log`).
- Los movimientos confirmados **nunca se eliminan**; las correcciones se registran como movimientos compensatorios.

### Liquidación y corrección
- Publicación de resultado y cálculo automático de acertados.
- Liquidación idempotente: repetir el proceso no genera premios duplicados (`settlement_runs` con versión).
- Corrección controlada de resultados: revierte premios anteriores, vuelve a liquidar y conserva el historial (`result_corrections`).

---

## API REST

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio |
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Inicio de sesión |
| GET/PUT | `/api/auth/me` | Perfil del usuario |
| GET | `/api/tournaments` / `/api/tournaments/:id` | Torneos y sus eventos |
| GET | `/api/events` / `/api/events/:id` | Eventos (filtro `?status=open`) |
| POST | `/api/events/:id/predictions` | Registrar pronóstico |
| GET | `/api/me/predictions` | Pronósticos propios |
| GET | `/api/me/credits` | Saldo y movimientos propios |
| GET | `/api/me/summary` | Resumen del usuario |
| GET | `/api/admin/stats` | Indicadores globales |
| GET | `/api/admin/reconciliation` | Conciliación de saldos |
| GET | `/api/admin/users` | Usuarios |
| POST | `/api/admin/users/:id/credits` | Asignar / ajustar / reversar créditos |
| GET | `/api/admin/events` | Eventos (administración) |
| POST | `/api/admin/tournaments` | Crear torneo |
| POST | `/api/admin/events` | Crear evento |
| PUT | `/api/admin/events/:id/status` | Abrir / cerrar evento |
| POST | `/api/admin/events/:id/result` | Publicar resultado y liquidar |
| POST | `/api/admin/events/:id/correct-result` | Corregir resultado |
| GET | `/api/admin/corrections` | Historial de correcciones |
| GET | `/api/admin/transactions` | Movimientos |
| GET | `/api/admin/operations` | Registro de operaciones |

Todas las rutas privadas requieren `Authorization: Bearer <token>`. Las rutas `/api/admin/*` requieren rol `admin`.

---

## Pruebas

Se ejecutaron **28 pruebas end-to-end** sobre la API, todas exitosas. Cubren:

- Autenticación y roles.
- Creación y consulta de torneos/eventos.
- Validación de opciones y de ventana de pronóstico.
- Idempotencia y solicitudes simultáneas (sin doble descuento).
- Descuento de apuesta, acreditación de premio y rechazo de duplicados.
- Liquidación idempotente y corrección con reversión.
- Conciliación de saldos y trazabilidad de movimientos.

También se verificó el SPA en navegador: inicio, catálogo, detalle de evento, registro de pronóstico, créditos, pronósticos, perfil, panel de administración y guard de rutas.

---

## Despliegue

La aplicación puede desplegarse en cualquier plataforma Node.js (Render, Railway, Fly.io):

- **Build:** `npm install`
- **Start:** `npm start`
- **Puerto:** variable `PORT`

En entornos con sistema de archivos efímero, la base de datos se regenera automáticamente con datos de ejemplo al iniciar. Para producción se recomienda montar un volumen persistente o migrar la capa de persistencia a una base de datos administrada.

---

## Tablero Trello

**Tablero en vivo:** https://trello.com/b/jo3DPPfq/matchpoint-tablero-final-del-proyecto

El tablero actualizado del proyecto (fase de inicio, Sprint 1, Sprint 2, QA, entrega, retrospectiva y mejoras) está creado en Trello con 6 columnas, 53 tarjetas y 12 checklists. También están estos archivos en la carpeta `trello/`:

- `MatchPoint-Trello.json` — importable desde Trello (formato de exportación completa).
- `MatchPoint-Trello-Plantilla.json` — formato plantilla para Power-Ups y herramientas compatibles.
- `Tablero-Trello.html` — vista previa visual del tablero.
- `README-TRELLO.md` — instrucciones de importación y reparto de responsabilidades.

Equipo: **Juan Camilo Ramirez, Thomas Mendoza y Miguel Oviedo**. Para regenerar los archivos después de editar el generador: `node trello/generar-trello.js`.

**Guiones para exponer el proyecto:**
- [`GUI_ON_4MIN.md`](GUI_ON_4MIN.md) — versión de 4 minutos: tablero Trello, tecnologías y cómo construimos la app.
- [`GUI_ON_EXPOSICION.md`](GUI_ON_EXPOSICION.md) — versión amplia de 6–7 minutos, incluye demostración de uso.

---

## Estructura

```
matchpoint/
├── db/
│   ├── database.js     # esquema, seed, helpers y transacciones
│   ├── init.js         # script npm run init-db
│   └── matchpoint.db   # base de datos SQLite
├── public/
│   ├── css/style.css
│   ├── js/api.js       # cliente API
│   ├── js/app.js       # router y vistas SPA
│   └── index.html
├── trello/
│   ├── generar-trello.js                 # fuente única del tablero
│   ├── MatchPoint-Trello.json            # importar a Trello
│   ├── MatchPoint-Trello-Plantilla.json  # formato plantilla
│   ├── Tablero-Trello.html               # vista previa
│   └── README-TRELLO.md                  # instrucciones
├── server.js           # API REST
├── package.json
├── README.md
├── RETROSPECTIVA_SPRINT2.md
└── REVIEW_SPRINT2.md
```
