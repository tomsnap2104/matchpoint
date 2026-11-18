# Retrospectiva — Sprint 2

**Proyecto:** MatchPoint · Plataforma de gestión de torneos, pronósticos y créditos virtuales
**Empresa solicitante:** Nexo Digital Labs
**Fecha:** 17 de noviembre de 2026
**Participantes:** Equipo de desarrollo MatchPoint

---

## Método: Starfish (Estrella de mar)

### ⭐ Seguir haciendo

- **Diseñar el modelo de datos antes de codificar.** Definir tablas, restricciones y relaciones (especialmente `predictions`, `transactions` y `settlement_runs`) evitó correcciones costosas durante la liquidación.
- **Centralizar la persistencia en un solo módulo** (`db/database.js`). Todas las consultas, transacciones y el guardado a disco pasan por ahí.
- **Validar en servidor, no solo en el navegador.** El saldo, la ventana del evento y las opciones válidas se verifican siempre en la API.
- **Pruebas end-to-end con datos reales.** Las 28 pruebas automatizadas detectaron de inmediato cualquier regresión en descuentos y premios.
- **Credenciales y datos de ejemplo visibles en la pantalla de login.** Facilitaron la demostración al solicitante.

### ⭐ Hacer más

- **Más pruebas automatizadas de concurrencia**, no solo dos solicitudes simultáneas con la misma clave, sino cargas mayores y eventos con muchos pronósticos.
- **Más instrumentación**: métricas de latencia por endpoint y bitácora estructurada en archivo, además de la tabla `operation_log`.
- **Más cobertura de UI** con pruebas de navegador automatizadas (formularios, estados vacíos y mensajes de error).
- **Más documentación de decisiones** (ADR) sobre por qué `sql.js` y por qué liquidación por versiones.

### ⭐ Hacer menos

- **Menos lógica duplicada en el frontend.** Algunas validaciones (por ejemplo, el estado efectivo del evento) se calculan tanto en cliente como en servidor; conviene que el cliente solo consuma lo que devuelve la API.
- **Menos estilos globales.** La hoja de estilos es única y ya es extensa; separarla por componentes facilitaría el mantenimiento.
- **Menos datos hardcodeados en las vistas de administración.** Los textos de ayuda y los formularios pueden moverse a configuración.

### ⭐ Dejar de hacer

- **Dejar de depender de `localStorage` para decisiones de negocio.** Solo se usa para el token y el usuario; el saldo siempre se consulta al servidor.
- **Dejar de usar claves de idempotencia generadas solo con `Date.now()` en ejemplos manuales.** En producción deben venir del cliente y ser estables por operación.
- **Dejar de modificar archivos sin ejecutar `node --check`**, especialmente en plantillas de cadena del SPA.

### ⭐ Empezar a hacer

- **Publicar la aplicación con una URL real** y verificar el flujo completo en el entorno desplegado.
- **Añadir autenticación de dos factores para administradores** y auditoría de inicio de sesión.
- **Implementar exportación de reportes** (CSV/PDF) de movimientos y liquidaciones para atender reclamaciones.
- **Definir un proceso formal de ajustes** con aprobación de dos personas para montos altos.
- **Programar un chequeo automático de conciliación** al iniciar el servicio y alertar si hay diferencias.

---

## Aprendizajes clave

1. La **idempotencia** no es opcional en operaciones que mueven saldos: un reintento de red puede costar dos descuentos.
2. La **conciliación** (saldo vs. suma de movimientos) es la herramienta más directa para demostrar confiabilidad al solicitante.
3. Una **corrección de resultado** no debe borrar el pasado: se revierte con un movimiento nuevo y se deja constancia del cambio.
4. El **orden de las verificaciones** importa: primero estado del evento, luego opción válida, luego saldo, y todo dentro de la transacción.

## Compromisos para el siguiente sprint

| Compromiso | Responsable | Prioridad |
|---|---|---|
| Desplegar y validar URL pública | Equipo | Alta |
| Pruebas de carga sobre liquidación | Equipo | Alta |
| Aprobación doble para ajustes de créditos | Equipo | Media |
| Reportes exportables | Equipo | Media |
| ADR de arquitectura de persistencia | Equipo | Baja |

---

**Conclusión:** el Sprint 2 cumplió el objetivo de entregar una solución funcional, verificable y preparada para incorporar nuevas modalidades de torneo y reglas de participación.
