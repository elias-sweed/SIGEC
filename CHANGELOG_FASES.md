# CHANGELOG SIGEC

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
