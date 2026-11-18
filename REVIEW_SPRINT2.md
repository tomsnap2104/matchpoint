# Review / Demo — Sprint 2

**Proyecto:** MatchPoint
**Empresa solicitante:** Nexo Digital Labs
**Fecha:** 17 de noviembre de 2026
**URL de la aplicación (demo en vivo):** https://omissions-immigrants-tip-salad.trycloudflare.com
**Repositorio:** https://github.com/tomsnap2104/matchpoint
**Entrega en archivo:** `MatchPoint-Sprint2.zip`

> La URL en vivo es un túnel de demostración y permanece activa mientras el servidor local y el túnel estén en ejecución. Para una URL permanente, desplegar el repositorio en Render/Railway siguiendo las instrucciones del `README.md`.

---

## 1. Objetivo del sprint

Construir una solución funcional para MatchPoint que permita gestionar torneos y pronósticos de manera confiable, con control de créditos virtuales, trazabilidad de transacciones y liquidación verificable de resultados.

## 2. Alcance entregado

| Módulo del enunciado | Implementado | Evidencia en la app |
|---|---|---|
| Gestión de torneos y eventos | ✅ | Catálogo de torneos, detalle de torneo, listado de eventos con filtros |
| Modalidades 1X2 y Ganador | ✅ | Opciones dinámicas por evento |
| Registro y participación | ✅ | Login, registro, pronósticos por evento |
| Cierre de evento sin nuevos pronósticos | ✅ | Validación de ventana horaria y estado |
| Administración de créditos | ✅ | Asignación, ajuste y reversión desde el panel admin |
| Saldo verificable | ✅ | Vista "Mis créditos" muestra saldo y saldo derivado + estado "Conciliado" |
| Trazabilidad de transacciones | ✅ | Tabla de movimientos con tipo, monto, saldo, referencia y fecha |
| Idempotencia y concurrencia | ✅ | Clave de idempotencia, transacciones atómicas y `operation_log` |
| Resultados y liquidación | ✅ | Publicación de resultado y cálculo automático de acertados |
| Liquidación sin duplicados | ✅ | `settlement_runs` versionado; reintentos devuelven "ya liquidado" |
| Corrección controlada | ✅ | Reversión de premios, nueva liquidación e historial de correcciones |
| Consulta consolidada | ✅ | Dashboard con indicadores, conciliación y movimientos |
| Restricciones de roles | ✅ | Rutas `/admin` protegidas y usuarios solo ven sus propios datos |

## 3. Guion de demostración

1. **Inicio:** abrir la URL y observar torneos, eventos abiertos e indicadores.
2. **Participar:** iniciar sesión como `laura@email.com` / `usuario123`, entrar a un evento abierto y confirmar un pronóstico.
3. **Verificar descuento:** el contador de créditos del encabezado baja en el costo del evento.
4. **Reintentar:** recargar y comprobar que no se puede registrar un segundo pronóstico en el mismo evento ni se descuenta dos veces.
5. **Mis créditos:** revisar el movimiento de tipo `stake` y el saldo "Conciliado".
6. **Administración:** iniciar sesión como `admin@matchpoint.com` / `admin123`.
7. **Cerrar y publicar resultado:** en la pestaña *Liquidación*, cerrar el evento, elegir el resultado y publicar.
8. **Verificar premios:** volver como usuario y comprobar el movimiento `prize` y el pronóstico en estado *Acertado*.
9. **Repetir liquidación:** comprobar que el sistema responde "ya liquidado" sin nuevos premios.
10. **Corregir resultado:** cambiar el resultado, indicar el motivo y verificar la reversión (`correction_reversal`), la nueva liquidación y el registro de la corrección.
11. **Conciliación:** en *Resumen*, verificar que todos los saldos coinciden con sus movimientos.

## 4. Evidencia de pruebas

- **API:** 28/28 pruebas end-to-end exitosas.
- **Navegador:** sin errores de consola en inicio, login, evento, créditos, pronósticos, perfil y administración.
- **Casos críticos verificados:**
  - Dos solicitudes simultáneas con la misma clave → un solo pronóstico y un solo descuento.
  - Pronóstico en evento cerrado → rechazado (HTTP 400).
  - Opción inválida → rechazada (HTTP 400).
  - Liquidación repetida → sin premios duplicados.
  - Corrección de resultado → premio revertido y nuevo cálculo.
  - Usuario intentando acceder a `/admin` → redirigido.

## 5. Criterios de aceptación

| Criterio | Resultado |
|---|---|
| Centralizar la operación en una sola plataforma | ✔ |
| Consultar torneos, eventos, opciones y estados | ✔ |
| Registrar pronósticos solo en periodo habilitado | ✔ |
| No permitir saldos negativos | ✔ |
| Registrar todos los movimientos de créditos | ✔ |
| Conservar trazabilidad de operaciones fallidas y correcciones | ✔ |
| Liquidación consistente y verificable | ✔ |
| Usuarios solo consultan sus propios datos | ✔ |
| Panel consolidado para responsables | ✔ |

## 6. Decisiones técnicas relevantes

- **SQLite embebido (`sql.js`)** para no depender de un servidor de base de datos ni de compilación nativa.
- **Transacciones atómicas** para agrupar descuento, pronóstico y registro de operación.
- **Idempotencia por clave única** en `predictions` y `transactions`.
- **Liquidación por versiones** en `settlement_runs` para hacer repetible y auditable el proceso.
- **Correcciones compensatorias** en lugar de borrar movimientos confirmados.

## 7. Mejoras futuras

- Reportes exportables de movimientos y liquidaciones.
- Aprobación doble para ajustes de créditos sensibles.
- Pruebas de carga y monitoreo en el entorno desplegado.
- Persistencia administrada (volumen o base de datos externa) en producción.

---

**Estado del sprint:** ✅ **Completado y listo para demostración.**
