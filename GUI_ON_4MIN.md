# Guion — Tablero Trello y tecnologías (4 minutos)

> Lee en voz alta las frases entre comillas. Las acciones entre paréntesis son para hacerlas en pantalla.

---

## 0:00 – 0:25 | Apertura

"Buenos días. Hoy les voy a explicar dos cosas: cómo organizamos el proyecto en **Trello** y cómo construimos **MatchPoint**, la plataforma para Nexo Digital Labs."

"MatchPoint sirve para gestionar torneos, pronósticos y créditos virtuales."

*(Mostrar el tablero de Trello.)*

---

## 0:25 – 1:25 | El tablero Trello

"El tablero es el mapa del proyecto. Ahí se ve todo el trabajo desde la planeación hasta la entrega."

"Tiene **6 columnas**."

"La primera es **Backlog**, donde dejamos las mejoras futuras.  
La segunda es **Planeación**, con el canvas, el mapa de historias y el reparto de tareas.  
La tercera es el **Sprint 1**, con las 9 historias de usuario básicas.  
La cuarta es el **Sprint 2**, con el producto final: base de datos, API, panel de administración e interfaz.  
La quinta es **Validación**, con pruebas y entrega.  
Y la sexta es **Retrospectiva**, con lo que aprendimos."

"En total son **53 tarjetas** y **12 listas de comprobación**. Cada tarjeta tiene etiquetas, responsable, fecha y pasos para saber qué faltaba."

"El equipo fuimos **Juan Camilo Ramirez, Thomas Mendoza y Miguel Oviedo**. Cada tarjeta lleva una etiqueta de color con su responsable."

---

## 1:25 – 1:55 | Cómo repartimos el trabajo

"Repartimos tres historias por persona."

"Thomas tomó registro, inicio de sesión y permisos.  
Juan tomó torneos, eventos y créditos.  
Miguel tomó consulta de torneos, eventos y saldo."

"En el Sprint 2, Juan se enfocó en la API y la lógica de créditos, Thomas en autenticación y GitHub, y Miguel en la interfaz y el panel de administración."

---

## 1:55 – 2:50 | Tecnologías que usamos

"Para el **backend** usamos **Node.js con Express**. Es la parte que recibe las peticiones y responde desde la API."

"Para la **base de datos** usamos **SQLite embebido con sql.js**. Todo se guarda en un archivo local llamado `matchpoint.db`, así que no necesitamos instalar un servidor de base de datos como MySQL o PostgreSQL. Elegimos sql.js porque funciona con WASM local y evita compilaciones nativas."

"Para la **autenticación** usamos **JWT** para mantener la sesión y **bcryptjs** para guardar contraseñas cifradas."

"Para el **frontend** usamos **HTML, CSS y JavaScript vanilla**. Es una SPA, una sola página que cambia de vista sin recargar. No usamos React ni Angular para mantener el proyecto fácil de instalar y entender."

"Todo se ejecuta con Node.js y se instala con `npm install`."

---

## 2:50 – 3:40 | Cómo hicimos la app

"La construimos en dos capas. Por un lado, una **API REST** con Express. Por otro, una **interfaz** que consume esa API."

"Primero definimos la base de datos: usuarios, torneos, eventos, pronósticos, movimientos, liquidaciones, correcciones y registro de operaciones."

"Después hicimos que cada acción importante quedara registrada. El saldo nunca puede ser negativo: antes de descontar, el sistema valida que haya créditos suficientes."

"También agregamos **idempotencia**. Si una petición llega dos veces por un reintento de red, el sistema reconoce la clave y no descuenta dos veces. Además, esas operaciones van en transacciones: o se guarda todo junto, o no se guarda nada."

"Para resultados, hicimos liquidación versionada. Repetir la liquidación no genera premios duplicados. Y si un resultado se corrige, se revierte el premio anterior y se guarda el historial, sin borrar movimientos."

"Eso nos permite conciliar: sumamos los movimientos y comparamos con el saldo. Si coinciden, el sistema es confiable."

"Antes de entregar corrimos **28 pruebas end-to-end** y todas pasaron. También revisamos la interfaz en navegador sin errores de consola."

---

## 3:40 – 4:00 | Cierre

"Como entrega quedan el código en GitHub, el ZIP con la documentación y el tablero en vivo."

"Eso es todo. Quedo atento a sus preguntas."

**Tablero:** https://trello.com/b/jo3DPPfq/matchpoint-tablero-final-del-proyecto  
**Repositorio:** https://github.com/tomsnap2104/matchpoint
