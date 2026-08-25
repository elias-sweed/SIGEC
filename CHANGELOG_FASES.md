# CHANGELOG SIGEC

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
