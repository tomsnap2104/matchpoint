# Tablero Trello · MatchPoint

Tablero actualizado con **todo el trabajo realizado**: fase de inicio, Sprint 1 (MVP), Sprint 2 (producto final), validación, entrega y mejoras futuras.

## Tablero creado en Trello

**Enlace al tablero en vivo:** https://trello.com/b/jo3DPPfq/matchpoint-tablero-final-del-proyecto

El tablero ya fue creado en la cuenta de Thomas con 6 columnas, 53 tarjetas, 12 checklists, 13 etiquetas de contenido y 3 etiquetas de responsable. Juan Camilo Ramirez, Thomas Mendoza y Miguel Oviedo quedan identificados en cada tarjeta mediante etiquetas de responsable y en la descripción; Thomas también está asignado como miembro real de Trello en sus 23 tarjetas.

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
| `MatchPoint-Trello.json` | Formato de **exportación completa de Trello**. Es el principal: se importa desde la opción de Trello para importar tableros. |
| `MatchPoint-Trello-Plantilla.json` | Formato **plantilla** (nombre, listas, tarjetas, etiquetas, miembros y checklists). Útil para Power-Ups y herramientas compatibles. |
| `Tablero-Trello.html` | Vista previa visual del tablero, lista para abrir o capturar. |
| `generar-trello.js` | Generador: si cambias una tarjeta, edita este archivo y corre `node trello/generar-trello.js`. |

## Cómo importar a Trello

### Opción A · Importar desde la exportación completa

1. Abre directamente el tablero ya creado: **https://trello.com/b/jo3DPPfq/matchpoint-tablero-final-del-proyecto**.
2. Si necesitas una copia en otra cuenta, usa un Power-Up de importación JSON o una herramienta compatible con el formato de exportación de Trello.
3. Elige el archivo `MatchPoint-Trello.json`.
4. Se recreará el tablero **"MatchPoint · Tablero final del proyecto"** con las 6 columnas, las tarjetas, etiquetas, colores, fechas, miembros y checklists.
5. Si los usuarios no existen en esa cuenta de Trello, las tarjetas conservan los nombres completos: asígnlos manualmente (Juan Camilo Ramirez, Thomas Mendoza, Miguel Oviedo).

### Opción B · Importar desde el menú de un tablero

1. Crea un tablero vacío.
2. Abre el menú del tablero → **Más → Importar** (o usa un Power-Up de importación JSON).
3. Selecciona `MatchPoint-Trello-Plantilla.json`.
4. Revisa que las listas y tarjetas se hayan creado.

### Opción C · Solo revisar el tablero

Abre `Tablero-Trello.html` en el navegador. Muestra el tablero completo con etiquetas, responsables, fechas y progreso de checklists.

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
- ZIP: `../MatchPoint-Sprint2.zip`
- Credenciales: admin `admin@matchpoint.com` / `admin123` · usuario `laura@email.com` / `usuario123`
