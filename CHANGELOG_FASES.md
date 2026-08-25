# CHANGELOG SIGEC

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
