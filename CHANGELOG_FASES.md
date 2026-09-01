# CHANGELOG SIGEC

## Intermedio — Login de Superadmin

Fecha: 27/08/2026
Estado: Completada

### Cambios realizados

- **Login de superadministrador**: nueva ruta `/admin` con formulario que valida contra Supabase Auth (`signInWithPassword`).
- **Acceso restringido al dashboard**: la ruta `/panel` (Centro de Control) ahora está protegida por `AdminGuard`; sin sesión redirige a `/admin`.
- **Email único e inmutable**: solo el correo configurado en `VITE_SUPERADMIN_EMAIL` puede entrar (por defecto `danza@jimenezpimentel.edu.pe`). La cuenta se gestiona solo en Supabase Auth (Authentication → Users), no desde la app.
- **Sesión persistente**: el superadmin se mantiene logueado al recargar (sesión de Supabase Auth).
- **Navegación dinámica**: "Centro de Control" solo aparece en el menú si hay sesión activa; botón "Cerrar sesión" / enlace "Admin" según el estado.
- **Cerrar sesión**: botón que llama a `signOut` y vuelve al inicio.

### Archivos creados

- `src/lib/adminAuth.ts`
- `src/pages/AdminLogin.tsx`
- `src/components/AdminGuard.tsx`

Archivos modificados:

- `src/routes/index.tsx`
- `src/layouts/MainLayout.tsx`
- `.env` / `.env.example` (`VITE_SUPERADMIN_EMAIL`)
- `README.md` / `CHANGELOG_FASES.md`

### Configuración requerida

- La cuenta de superadmin debe existir en Supabase Auth (Authentication → Users).
- Definir `VITE_SUPERADMIN_EMAIL` en `.env` (ya configurado).

## Intermedio — Evaluación de todas las candidatas

Fecha: 27/08/2026
Estado: Completada

### Cambios realizados

- **El jurado ya no evalúa solo la candidata activa**: ahora puede **elegir qué candidata evaluar** desde su pantalla, viendo la lista completa.
- **Contexto ampliado**: `CertamenContext` ahora expone la lista completa de candidatas (`candidatas`).
- **JuradoEvaluacion**: añadido selector de candidata. Al elegir una, carga sus criterios/etapa y muestra sliders, total y guardado; incluye botón "↩ Cambiar candidata" y mantiene el estado de "evaluación enviada" por candidata.
- **Centro de Control**: nuevo panel **"Evaluaciones por candidata"** (tabla) con el puntaje que ha dado cada jurado a cada candidata, y el progreso (n.º evaluaciones / n.º jurados). Botón "↻ Recargar".

## Fase 08

Fecha: 27/08/2026
Estado: Completada

### Cambios realizados

- **Acceso profesional por QR**: el administrador genera una tarjeta por jurado con nombre, código (JUR-001) y un QR único que apunta a `/jurado/activar?codigo=JUR-001`.
- **Primer acceso** en `/jurado/activar`: solicita contraseña y confirmación, crea la cuenta en Supabase Auth con el correo interno `jur-001@gmail.com` y marca al jurado como `activado`. Se usa un dominio con registro MX válido (`gmail.com`): Supabase Auth rechaza 400 "Email is invalid" los dominios sin MX (`.local`, `sigec.com`, `example.com`). Las cuentas solo son identificadores de login y no reciben correos reales.
- **Redirecciones automáticas**: un jurado ya activado que escanea su QR se envía directo al login; el login detecta el parámetro `codigo` y completa el código automáticamente.
- **Ingreso profesional**: después de activarse, el jurado solo escribe su contraseña (el correo interno se deriva del código).
- **Descarga de PDF**: botón "Descargar PDF" en el Panel Maestro que abre la vista de impresión con las tarjetas de todos los jurados (destino "Guardar como PDF").
- **Corrección PATCH /jurados 400**: la actualización de `en_sesion` ahora verifica primero (vía `information_schema.columns`) que la columna exista y usa exactamente el nombre `en_sesion`; si la migración no se aplicó, omite la actualización sin error.
- Cierre de sesión también cierra la sesión de Supabase Auth (`signOut`).

### Archivos creados

- `supabase/migrations/20260827100000_jurados_activacion.sql`
- `src/pages/JuradoActivar.tsx`
- `src/services/jurado.service.ts`
- `src/utils/impresion.ts`

Archivos modificados:

- `src/pages/JuradoLogin.tsx`
- `src/pages/JuradoEvaluacion.tsx`
- `src/pages/MasterPanel.tsx`
- `src/routes/index.tsx`
- `src/types/database.ts`
- `src/utils/session.ts`
- `README.md`
- `CHANGELOG_FASES.md`

### Configuración requerida en Supabase

- Aplicar la migración `20260827100000_jurados_activacion.sql`.
- Auth → Providers → Email habilitado, y **desactivar** "Confirm email" para que el primer acceso funcione sin verificación de correo.

### Pendiente para Fase 09

- Consolidación de resultados y promedio entre jurados.
- Pantalla Pública con puntajes publicados.
- Realtime: progreso de jurados conectados y evaluaciones sin recargar.
- Reactivar RLS con políticas por rol.

## Fase 07

Fecha: 27/08/2026
Estado: Completada

### Cambios realizados

- **Separación total del acceso del jurado**: el jurado nunca ve la administración.
- **Nuevas rutas**: `/`, `/panel` (Centro de Control), `/jurado` (login), `/jurado/evaluacion` (evaluación protegida) y `/pantalla` (pantalla pública). Eliminadas las rutas `/maestro` y `/publico`.
- **Login premium del jurado** en `/jurado`: logo del certamen, nombre del evento obtenido desde Supabase (sin datos hardcodeados), campo grande para el código y botón "Ingresar"; diseño azul oscuro con acento dorado.
- **Validación del código**: busca el código en la tabla `jurados`; si existe guarda `jurado_id` y `jurado_codigo` en `sessionStorage` y redirige a `/jurado/evaluacion`; si no existe muestra "Código no válido." de forma elegante.
- **Sesión persistente**: mientras la pestaña esté abierta no vuelve al login; entrar directamente a `/jurado/evaluacion` sin sesión redirige a `/jurado` (JuradoGuard).
- **Pantalla de evaluación** en `/jurado/evaluacion` con encabezado de sesión: nombre del jurado, código, candidata activa, etapa y botón "Salir". Diseño premium propio (sin navegación de administración).
- **Cerrar sesión**: "Salir" limpia `sessionStorage` y vuelve a `/jurado`.
- **Jurados conectados** en el Panel Maestro: lista con estado "En sesión / Sin sesión" basada en la nueva columna `en_sesion` de `jurados`; se actualiza al recargar la página.
- **Home rediseñada como portada**: solo "Centro de Control" y "Pantalla Pública"; eliminado el acceso directo al jurado, el DebugPanel y los contadores técnicos.
- **Navegación**: el menú principal ya no muestra el enlace al jurado.

### Archivos creados

- `supabase/migrations/20260826100000_jurados_sesion.sql`
- `src/pages/JuradoLogin.tsx`
- `src/pages/JuradoEvaluacion.tsx`
- `src/layouts/JuradoLayout.tsx`
- `src/components/JuradoGuard.tsx`
- `src/utils/session.ts`

Archivos eliminados:

- `src/pages/JuryPanel.tsx` (contenido movido a JuradoEvaluacion)

Archivos modificados:

- `src/routes/index.tsx`
- `src/layouts/MainLayout.tsx`
- `src/pages/Home.tsx`
- `src/pages/MasterPanel.tsx`
- `src/types/database.ts`
- `README.md`
- `CHANGELOG_FASES.md`

### Pendiente para Fase 08

- Consolidación de resultados y promedio entre jurados (`calcularPromedioJurados()`).
- Pantalla Pública con puntajes publicados.
- Realtime: progreso de jurados conectados y evaluaciones sin recargar.
- Reactivar RLS con políticas por rol.

## Fase 06

Fecha: 27/08/2026
Estado: Completada

### Cambios realizados

- **Panel Maestro convertido en Asistente de Configuración**: flujo obligatorio de 4 pasos con checklist visual — Evento → Candidatas → Jurados → Criterios.
- **Creación de evento** desde la interfaz: nombre + selección de etapa por botones (preliminar, eliminatoria, semifinal, final).
- **Candidatas**: formulario de alta y lista con eliminación.
- **Jurados**: código auto-generado `JUR-001`, `JUR-002`, … (siguiente número basado en el máximo existente, sin duplicados); alta y eliminación.
- **Criterios oficiales**: botón "Cargar criterios oficiales" inserta por upsert (etapa, orden) los criterios definidos en `src/constants/criteriosOficiales.ts` según la etapa; constante con 4 etapas.
- **Botón grande "Iniciar Evaluación"**: habilitado solo cuando el checklist está completo. Al iniciar: crea/actualiza `estado_evento`, selecciona automáticamente la primera candidata, cambia el estado a `evaluando` y actualiza `eventos.estado`.
- **Botón rojo "Reiniciar Certamen"**: con confirmación, vacía `evaluacion_detalles`, `evaluaciones`, `estado_evento`, `criterios`, `jurados`, `candidatas` y `eventos` (servicio `reset.service.ts`), sin eliminar las tablas.
- **Panel Jurado con login por código**: primero pide el código del jurado (ej. JUR-001), valida contra la tabla `jurados` y recién muestra la candidata activa; banner de sesión con botón "Salir".
- **Sin dependencia de `seed.sql`**: todo el certamen se prepara desde la interfaz; `seed.sql` queda como referencia opcional.
- **Contexto**: ya no auto-crea `estado_evento` al cargar — el registro solo se crea al iniciar la evaluación explícitamente.

### Archivos creados

- `src/constants/criteriosOficiales.ts`
- `src/services/reset.service.ts`

Archivos modificados:

- `src/pages/MasterPanel.tsx`
- `src/pages/JuryPanel.tsx`
- `src/context/CertamenContext.tsx`
- `src/pages/Home.tsx`
- `src/layouts/MainLayout.tsx`
- `README.md`
- `CHANGELOG_FASES.md`

### Pendiente para Fase 07

- Consolidación de resultados y promedio entre jurados (`calcularPromedioJurados()`).
- Pantalla Pública con puntajes publicados.
- Realtime sin recargar.
- Reactivar RLS con políticas por rol.

## Fase 05

Fecha: 26/08/2026
Estado: Completada

### Cambios realizados

- **Estados oficiales del evento**: nuevos estados `preparando`, `evaluando`, `esperando_jurados`, `resultados_listos`, `publicado` centralizados en `src/constants/eventStates.ts` con labels y colores. Eliminados todos los strings hardcodeados.
- **Centro de Control (Panel Maestro rediseñado)**: dividido en 4 bloques funcionales:
  - **Bloque A – Evento**: nombre, etapa, estado actual con indicador de color; botones de transición de estado (Iniciar evaluación, Cerrar evaluación, Publicar resultados).
  - **Bloque B – Candidata activa**: tarjeta grande con nombre, grado y sección; navegación Anterior/Siguiente sin volver a la tabla.
  - **Bloque C – Progreso de jurados**: cálculo real desde `evaluaciones` (no simulado); muestra "X/5 respondieron" con barra de progreso y lista de completados/pendientes.
  - **Bloque D – Barra lateral**: última actualización, evento activo, cantidad de candidatas, jurados y respondieron.
- **Panel Jurado mejorado**: encabezado grande con nombre y grado de la candidata; sliders con label + valor actual / máximo (`18 / 20`); total de puntos calculado con `calcularTotal()`.
- **Botón Enviar**: cambio visual post-envío — de "Guardar evaluación" (dorado) a "✓ Evaluación enviada" (verde, deshabilitado). El jurado no puede re-enviar hasta que el admin cambie de candidata.
- **Pantalla Pública estilo escenario**: logo del evento, nombre grande, candidata actual, badge de estado con color; si el estado es `publicado` muestra "Resultados publicados" preparado para puntajes futuros.
- **Componentes reutilizables** en `src/components/event/`: `EventStatusCard`, `CandidateCard`, `JuryProgressCard`, `ScoreSlider`.
- **Animaciones Tailwind**: transiciones suaves en hover, cambio de candidata, cambio de estado y botones (duration-300/500, scale, opacity).
- **Migración RLS dev**: `disable row level security` en todas las tablas para desarrollo sin autenticación.

### Archivos creados

- `src/constants/eventStates.ts`
- `src/components/event/EventStatusCard.tsx`
- `src/components/event/CandidateCard.tsx`
- `src/components/event/JuryProgressCard.tsx`
- `src/components/event/ScoreSlider.tsx`
- `supabase/migrations/20260825160000_disable_rls_dev.sql`

Archivos modificados:

- `src/pages/MasterPanel.tsx`
- `src/pages/JuryPanel.tsx`
- `src/pages/PublicScreen.tsx`
- `supabase/seed.sql`
- `README.md`
- `CHANGELOG_FASES.md`

### Pendiente para Fase 06

- Autenticación de jurados con identidad real.
- Reactivar RLS con políticas por rol.
- Consolidación de resultados y promedio entre jurados.
- Pantalla Pública con Realtime.
- Exportación de resultados (PDF o CSV).

## Fase 04.1

Fecha: 26/08/2026
Estado: Completada

### Cambios realizados

- Nuevo componente `DebugPanel` que muestra en tiempo real: URL de Supabase (solo dominio), existencia de variables de entorno y estado de conexión.
- Home actualizada: `DebugPanel` visible + contadores de tablas (eventos, candidatas, jurados, criterios) obtenidos con `count: exact` desde Supabase; se ve claramente cuando una tabla tiene 0 registros.
- Panel Maestro ampliado con CRUD completo de candidatas: formulario de creación, tabla con acciones (Seleccionar / Editar / Eliminar), edición inline y eliminación (con manejo de errores si tiene evaluaciones asociadas).
- Panel Maestro ampliado con CRUD de criterios: formulario de creación (etapa, nombre, puntaje máximo, orden), tabla con acciones (Editar nombre / puntaje; orden e IDs no modificables).
- Tarjeta de estado del evento en Panel Maestro: muestra evento activo, etapa, estado, candidata seleccionada y última actualización; si no existe `estado_evento`, muestra "No existe un estado activo" y botón "Crear estado inicial".
- `CertamenContext` reescrito: elimina los FK hints (`evento!evento_id`) que causaban error 400 por conflictos con constraints auto-generadas de PostgreSQL; ahora consulta cada tabla por separado. Si `estado_evento` está vacío, intenta automáticamente crear el registro inicial (evento + primera candidata).
- Utilidad `devlog.ts`: funciones `logConsulta()`, `logFilas()`, `logError()` con `console.group()` que solo se ejecutan en modo desarrollo; centralizan los logs sin dejar `console.log` desordenados.

### Problemas corregidos

- **Error 400 (Bad Request)** en la consulta `estado_evento?select=*,evento!evento_id(*),candidata:...`: los FK hints usaban el nombre de columna en lugar del nombre auto-generado de la constraint (`estado_evento_evento_id_fkey`). Se resolvió eliminando los hints y consultando cada tabla por separado.
- `estado_evento` vacío devolvía null silenciosamente: ahora se intenta crear el registro automáticamente usando el primer evento y la primera candidata de la base de datos.

### Archivos creados

- `src/components/DebugPanel.tsx`
- `src/utils/devlog.ts`

Archivos modificados:

- `src/context/CertamenContext.tsx`
- `src/pages/Home.tsx`
- `src/pages/MasterPanel.tsx`
- `CHANGELOG_FASES.md`

## Fase 04

Fecha: 25/08/2026
Estado: Completada

### Cambios realizados

- Nueva migración `estado_evento`: tabla que almacena la candidata activa y el estado del evento en Supabase, reemplazando a `localStorage` como fuente de verdad.
- `CertamenContext` reescrito completamente: lee desde Supabase en montaje, mantiene `localStorage` como respaldo temporal si Supabase no responde, y expone `eventoCandidato`, `candidataActual`, `estadoEvento`, `actualizarCandidata()` y `cargarEstado()`.
- Panel Maestro funcional: muestra evento actual, candidatas desde Supabase, botón de selección que actualiza `estado_evento` en la base de datos y resalta visualmente la candidata activa; indicadores de estado, spinner de carga y manejo de errores.
- Panel del Jurado funcional: lee la candidata activa desde `estado_evento`, muestra su nombre y grado, carga criterios de la etapa, sliders con `puntaje_maximo` desde la base, precarga de evaluaciones existentes, guardado con indicadores de éxito/error y spinner.
- Pantalla Pública (modo demostración): muestra nombre del evento, etapa y candidata actual; se actualiza al recargar la página.
- Home rediseñada: muestra el evento actual y tarjetas de acceso con datos reales desde Supabase.
- Manejo de errores consistente en todos los paneles: nunca se muestra una pantalla completamente vacía si Supabase falla.
- Seed actualizado con `estado_evento` (registro activo con candidata por defecto).
- README actualizado con explicación de `estado_evento`, flujo del MVP e instrucciones para probar el flujo completo.

### Archivos creados

- `supabase/migrations/20260825140000_estado_evento.sql`

Archivos modificados:

- `src/context/CertamenContext.tsx`
- `src/pages/Home.tsx`
- `src/pages/MasterPanel.tsx`
- `src/pages/JuryPanel.tsx`
- `src/pages/PublicScreen.tsx`
- `supabase/seed.sql`
- `README.md`
- `CHANGELOG_FASES.md`

### Pendiente para Fase 05

- Autenticación de usuarios e identidad real del jurado.
- Row Level Security según roles del certamen.
- Envío oficial de evaluaciones (estados y bloqueo posterior al envío).
- Consolidación de resultados y promedio entre jurados.
- Pantalla Pública con Realtime (actualización sin recargar).

## Fase 03

Fecha: 25/08/2026
Estado: Completada

### Cambios realizados

- Nueva migración `evaluacion_detalles`: guarda un puntaje independiente por criterio calificado en cada evaluación (FKs a `evaluaciones` y `criterios`, CHECK `puntaje >= 0`, índices sobre `evaluacion_id` y `criterio_id`, unicidad por par evaluación–criterio).
- El límite `puntaje <= puntaje_maximo` se resuelve con validación lógica en la aplicación (`validarPuntaje()`), ya que cruza tablas distintas y no puede ir en un CHECK de SQL.
- Seed actualizado con IDs reproducibles y una evaluación completa de ejemplo (4 detalles con puntajes distintos).
- Tipado del modelo de datos en `src/types/database.ts` (sin `any`).
- Capa de servicios con acceso a Supabase: `criteria.service.ts` (criterios por etapa) y `evaluation.service.ts` (crear evaluación, guardar detalle con upsert, obtener evaluación completa).
- Utilidades puras de cálculo en `src/utils/scoring.ts`: `calcularTotal()`, `calcularPromedioJurados()` y `validarPuntaje()`; independientes de React y reutilizables.
- Contexto global `CertamenContext`: comparte el evento actual y la candidata seleccionada entre paneles, persistido en `localStorage`.
- Panel Maestro mínimo funcional: muestra el evento actual y las candidatas desde Supabase, con botón "Seleccionar candidata".
- Panel Jurado mínimo funcional: carga automática de los criterios de la etapa, sliders limitados por `puntaje_maximo` de la base, prefill de evaluaciones previas y guardado de la evaluación con sus detalles.
- README actualizado con la estructura del motor de evaluación y la explicación de `evaluacion_detalles`.

### Archivos creados

- `supabase/migrations/20260825110000_evaluacion_detalles.sql`
- `src/types/database.ts`
- `src/services/criteria.service.ts`
- `src/services/evaluation.service.ts`
- `src/utils/scoring.ts`
- `src/context/CertamenContext.tsx`

Archivos modificados:

- `supabase/seed.sql`
- `src/App.tsx`
- `src/pages/MasterPanel.tsx`
- `src/pages/JuryPanel.tsx`
- `README.md`
- `CHANGELOG_FASES.md`

### Pendiente para Fase 04

- Autenticación de usuarios e identidad real del jurado (sin selector manual).
- Row Level Security según roles del certamen.
- Envío oficial de evaluaciones (estados y bloqueo posterior al envío).
- Consolidación de resultados y promedio entre jurados usando `calcularPromedioJurados()`.
- Pantalla Pública con resultados reales.

## Fase 02

Fecha: 25/08/2026
Estado: Completada

### Cambios realizados

- Integración de Supabase mediante el SDK oficial (`@supabase/supabase-js`).
- Creación del cliente en `src/lib/supabase.ts` con inicialización perezosa: la app sigue funcionando sin `.env` hasta que se use por primera vez.
- Tipado de las variables de entorno de Vite en `src/vite-env.d.ts`.
- Creación de `.env.example` como plantilla (sin claves reales; `.env` sigue ignorado por git).
- Primera migración SQL con el esquema inicial: tablas `eventos`, `candidatas`, `jurados`, `criterios` y `evaluaciones` (con llaves foráneas, índices y restricciones básicas).
- Los criterios son configurables por etapa y definen su `puntaje_maximo` en base de datos (nada hardcodeado en el frontend).
- Las evaluaciones aún no guardan puntajes por criterio; solo representan la relación jurado–candidata–evento.
- Seed de ejemplo (`supabase/seed.sql`) con un evento, tres candidatas, cinco jurados y cuatro criterios; no se aplica automáticamente.
- Actualización del README con la configuración de `.env`, ejecución y aplicación de migraciones.

### Archivos creados

- `.env.example`
- `src/lib/supabase.ts`
- `supabase/migrations/20260825090000_initial_schema.sql`
- `supabase/seed.sql`

Archivos modificados:

- `src/vite-env.d.ts`
- `.gitignore`
- `README.md`
- `CHANGELOG_FASES.md`

### Pendiente para Fase 03

- Implementar autenticación de usuarios.
- Habilitar Row Level Security según los roles del certamen.
- Tabla de puntajes por criterio asociada a cada evaluación.
- Conectar los paneles existentes a datos reales de Supabase.

## Fase 01

Fecha: 24/08/2026
Estado: Completada

### Cambios realizados

- Inicialización del proyecto base con Vite + React + TypeScript.
- Instalación y configuración de Tailwind CSS v4 mediante el plugin oficial de Vite.
- Definición de la paleta institucional en `global.css`: azules oscuros (`navy`) y dorado (`gold`) como acento.
- Configuración de React Router con rutas para todas las vistas y manejo de páginas no encontradas (404).
- Creación del layout principal con encabezado, navegación activa, pie de página y contenido centralizado.
- Creación de componentes reutilizables: `PageHeader` (encabezado consistente) y `PhaseNotice` (aviso de funcionalidad futura).
- Creación de las vistas vacías: Inicio, Panel del Jurado, Panel Maestro, Pantalla Pública y 404.
- Botones de acceso desde Inicio hacia el Panel del Jurado, Panel Maestro y Pantalla Pública.
- Documentación del proyecto en `README.md`.

### Archivos creados

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `index.html`
- `.gitignore`
- `public/favicon.svg`
- `src/main.tsx`
- `src/App.tsx`
- `src/vite-env.d.ts`
- `src/styles/global.css`
- `src/layouts/MainLayout.tsx`
- `src/components/PageHeader.tsx`
- `src/components/PhaseNotice.tsx`
- `src/routes/index.tsx`
- `src/pages/Home.tsx`
- `src/pages/JuryPanel.tsx`
- `src/pages/MasterPanel.tsx`
- `src/pages/PublicScreen.tsx`
- `src/pages/NotFound.tsx`
- `src/assets/.gitkeep`
- `README.md`
- `CHANGELOG_FASES.md`

### Pendiente para Fase 02

- Integrar Supabase como backend (conexión y configuración del cliente).
- Implementar autenticación de usuarios.
- Definir el modelo de datos inicial del certamen.
- Comenzar lógica básica del Panel Maestro y del Panel del Jurado.
