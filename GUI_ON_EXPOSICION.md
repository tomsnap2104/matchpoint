# Guion de exposición — MatchPoint y tablero Trello

**Duración aproximada:** 6 a 7 minutos.

> Cómo usarlo: lee en voz alta las frases entre comillas. Las acciones entre paréntesis son cosas que puedes hacer en pantalla mientras hablas.

---

## 1. Apertura

"(Buenos días / buenas tardes.)  
Hoy les voy a presentar **MatchPoint**, una plataforma web para manejar torneos, pronósticos y créditos virtuales.  
También les voy a mostrar el **tablero de Trello** donde organizamos todo el trabajo.

El equipo estuvo conformado por **Juan Camilo Ramirez, Thomas Mendoza y Miguel Oviedo**."

*(Mostrar el tablero de Trello.)*

---

## 2. Qué es el tablero Trello

"El tablero es como el mapa del proyecto. Ahí se ve desde lo que planeamos al inicio hasta lo que ya quedó terminado."

"Tiene **6 columnas**:

1. **Backlog · Mejoras futuras**: cosas que todavía no hicimos, como despliegue permanente o reportes.
2. **Planeación · Fase de inicio**: el canvas, el mapa de historias y el reparto de tareas.
3. **Sprint 1 · MVP**: las 9 historias de usuario básicas.
4. **Sprint 2 · Producto final**: la app terminada: base de datos, API, panel admin y frontend.
5. **Validación · QA y entrega**: las pruebas, la revisión en navegador y la documentación.
6. **Retrospectiva · Aprendizajes**: lo que mantuvimos, lo que mejoramos y lo que aprendimos."

"En total tenemos **53 tarjetas** y **12 listas de comprobación**.  
Cada tarjeta tiene etiquetas, responsable, fecha y pasos para saber si está lista."

"Los responsables están visibles con etiquetas de color: naranja para Juan, azul para Thomas y verde para Miguel. Thomas además quedó como miembro real de Trello porque es la cuenta desde la que se creó el tablero."

*(Señalar una tarjeta, por ejemplo “Idempotencia y transacciones atómicas”.)*

---

## 3. Cómo trabajamos

"Dividimos el trabajo en tres historias por persona.  
Thomas se encargó de registro, inicio de sesión y permisos.  
Juan se encargó de torneos, eventos y asignación de créditos.  
Miguel se encargó de consultar torneos, ver eventos y consultar saldo."

"Después, en el Sprint 2, cada uno apoyó en su parte fuerte: Juan en la API y la lógica de créditos, Thomas en autenticación y repositorio, y Miguel en la interfaz y el panel de administración."

---

## 4. Cómo hicimos la app

"La aplicación tiene dos tipos de usuario: **administrador** y **usuario normal**."

"El administrador puede crear torneos y eventos, definir el costo de participación y el multiplicador del premio, abrir o cerrar apuestas, publicar resultados y corregirlos."

"El usuario puede registrarse, iniciar sesión, ver los eventos disponibles, hacer un pronóstico, ver su saldo y revisar todos sus movimientos."

"La idea principales es que todo quede registrado. Si un usuario gasta créditos, siempre existe un movimiento que explica por qué. Si se corrige un resultado, no borramos el movimiento anterior: hacemos una reversión y dejamos el historial."

---

## 5. Tecnologías que usamos

"Para el **backend** usamos **Node.js con Express**. Es la parte que recibe las peticiones y responde desde la API."

"Para la **base de datos** usamos **SQLite embebido con sql.js**. Es un archivo local, así que no necesitamos instalar un servidor de base de datos como MySQL o PostgreSQL. La base se llama `matchpoint.db`."

"Para el **login** usamos **JWT**, que es un token para mantener la sesión, y **bcryptjs** para guardar las contraseñas cifradas."

"Para el **frontend** usamos **HTML, CSS y JavaScript vanilla**, sin frameworks pesados. Es una SPA, es decir, una sola página que cambia de vista sin recargar."

"Todo se ejecuta con `npm start` y queda disponible en `http://localhost:3000`."

---

## 6. Lo más importante de la lógica

"Hay tres ideas clave que quisimos proteger muy bien."

"La primera es el **saldo nunca negativo**. Antes de descontar créditos, el sistema revisa si hay saldo suficiente."

"La segunda es la **idempotencia**. Si el usuario aprieta dos veces el botón de pronóstico, o si hay un reintento de red, el sistema reconoce la misma clave y no descuenta dos veces. Es como decir: ‘esta operación ya se hizo, no la repito’."

"La tercera es la **trazabilidad**. Cada movimiento guarda tipo, cantidad, saldo resultante, fecha y una descripción. Con eso podemos conciliar: sumamos todos los movimientos y debe coincidir con el saldo mostrado."

"También hicimos **liquidación versionada**. Si publicamos el resultado dos veces, no paga dos veces. Y si hay que corregir un resultado, se revierte el premio anterior, se vuelve a liquidar y queda el registro de la corrección."

---

## 7. Demostración rápida

*(Abrir el demo o la app local.)*

"Primero entramos como **administrador** con `admin@matchpoint.com` y contraseña `admin123`."

"En el panel de administración podemos ver los torneos, los eventos, las estadísticas, los movimientos y la pestaña de liquidación."

"Ahora salimos y entramos como usuario, por ejemplo **laura@email.com** con contraseña `usuario123`."

"Laura tiene **125 créditos**. Si entra a un evento abierto y hace un pronóstico que cuesta 15 créditos, su saldo baja a **110**. Ese descuento queda registrado como un movimiento."

"Después, el administrador publica el resultado. Si Laura acertó, el sistema calcula el premio con el multiplicador y lo acredita automáticamente."

"Si el resultado estaba mal, el administrador puede corregirlo. El sistema revierte el premio anterior y hace una nueva liquidación, sin borrar el historial."

"Finalmente, en la pestaña de conciliación se verifica que el saldo de cada usuario coincida con la suma de sus movimientos."

---

## 8. Pruebas y calidad

"Antes de entregar ejecutamos **28 pruebas end-to-end** sobre la API y todas pasaron."

"Esas pruebas cubren registro, login, roles, creación de torneos y eventos, pronósticos válidos e inválidos, idempotencia, concurrencia, descuento de créditos, premios, correcciones, conciliación y trazabilidad."

"También revisamos la interfaz en el navegador: inicio, login, detalle de evento, pronóstico desde la UI, créditos, administración y guard de rutas. No salieron errores en consola."

---

## 9. Cierre

"Como entrega tenemos cuatro cosas:

1. La **app funcionando**.
2. El **repositorio en GitHub**: https://github.com/tomsnap2104/matchpoint
3. El **ZIP** con código, documentación y archivos del tablero.
4. El **tablero en Trello**: https://trello.com/b/jo3DPPfq/matchpoint-tablero-final-del-proyecto

"Con eso cerramos la presentación. Quedo atento a sus preguntas."

---

## Preguntas rápidas

**¿Los créditos son dinero real?**  
"No. Son créditos virtuales de la plataforma. No se pueden retirar ni convertir en dinero."

**¿Por qué usamos SQLite en vez de otra base de datos?**  
"Porque es fácil de ejecutar, no necesita servidor externo y todo queda en un archivo. Con `sql.js` evitamos compilaciones nativas."

**¿Por qué no usamos React o Angular?**  
"Porque la app es pequeña y queremos que sea fácil de instalar y entender. Con JavaScript vanilla es suficiente."

**¿Cómo evitan el doble cobro?**  
"Con una clave de idempotencia y transacciones. Si llega la misma operación dos veces, solo se aplica una."

**¿Por qué Juan y Miguel no aparecen como miembros reales en Trello?**  
"Porque no tenemos sus cuentas de Trello. Por eso los dejamos como etiquetas de responsable y en la descripción de cada tarjeta. Si nos dan sus correos, los podemos invitar al tablero."

---

## Versión corta de 1 minuto

"MatchPoint es una plataforma para torneos, pronósticos y créditos virtuales. La hicimos con Node.js y Express en el backend, SQLite con sql.js como base de datos, JWT para la sesión y una SPA en HTML, CSS y JavaScript puro.

El tablero de Trello resume todo el proyecto: fase de inicio, Sprint 1, Sprint 2, pruebas, entrega y mejoras futuras. Tenemos 53 tarjetas, 12 checklists y responsables por cada integrante del equipo.

La parte más importante de la app es que todo es trazable: cada movimiento queda registrado, el saldo nunca es negativo, los reintentos no generan dobles cobros y las correcciones conservan el historial.

Probamos la API con 28 pruebas end-to-end, todas exitosas, y verificamos la interfaz en navegador. La entrega incluye repositorio, ZIP, documentación y el tablero en vivo."
