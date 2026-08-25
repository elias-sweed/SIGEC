# CHANGELOG SIGEC

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
