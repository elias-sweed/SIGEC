# SIGEC

**SIGEC** (*Sistema Integral de Gestión y Evaluación del Certamen*) es una aplicación web para administrar certámenes de danza: centraliza la organización del evento, la evaluación por parte del jurado y la difusión pública de los resultados.

> **Estado actual:** Fase 03 completada — motor de evaluación dinámico conectado a Supabase (Panel Maestro y Panel del Jurado mínimamente funcionales). Aún no hay autenticación ni RLS.

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| [React](https://react.dev) | Biblioteca de interfaz de usuario |
| [Vite](https://vite.dev) | Entorno de desarrollo y empaquetador |
| [TypeScript](https://www.typescriptlang.org) | Tipado estático |
| [Tailwind CSS](https://tailwindcss.com) | Estilos utilitarios (paleta azul oscuro / blanco / dorado) |
| [React Router](https://reactrouter.com) | Navegación entre vistas |
| [Supabase](https://supabase.com) | Backend como servicio (PostgreSQL) |

## Estructura del proyecto

```
Danza/
├── public/               # Archivos estáticos
├── src/
│   ├── assets/           # Recursos del proyecto
│   ├── components/       # Componentes reutilizables de interfaz
│   ├── context/          # Estado global (CertamenContext)
│   ├── layouts/          # Layouts (estructura común de las vistas)
│   ├── lib/              # Clientes externos (Supabase)
│   ├── pages/            # Vistas de la aplicación
│   ├── routes/           # Configuración de React Router
│   ├── services/         # Acceso a datos vía Supabase
│   ├── styles/           # Estilos globales y tema de Tailwind
│   ├── types/            # Interfaces del modelo de datos
│   ├── utils/            # Funciones puras (cálculo de puntajes)
│   └── main.tsx / App.tsx
├── supabase/
│   ├── migrations/       # Migraciones SQL del esquema
│   └── seed.sql          # Datos de ejemplo (se aplica manualmente)
├── .env.example          # Plantilla de variables de entorno
├── CHANGELOG_FASES.md    # Registro de cambios por fase
└── README.md
```

## Motor de evaluación

El sistema de calificación es **100 % dinámico**: los criterios y sus puntajes máximos viven en la base de datos, nunca en el código.

### Flujo actual

1. **Panel Maestro** (`/maestro`): muestra el evento actual y la lista de candidatas desde Supabase, y permite **seleccionar una candidata**.
2. La selección se comparte mediante `CertamenContext` (persistida en `localStorage`).
3. **Panel del Jurado** (`/jurado`): al existir candidata seleccionada, carga automáticamente los criterios de la etapa del evento, con un slider por criterio limitado por su `puntaje_maximo`, y guarda la evaluación.

### Tabla `evaluacion_detalles`

Cada fila representa **un criterio calificado dentro de una evaluación**:

| Campo | Descripción |
| --- | --- |
| `id` | Identificador único |
| `evaluacion_id` | FK hacia `evaluaciones` (borrado en cascada) |
| `criterio_id` | FK hacia `criterios` |
| `puntaje` | Puntaje otorgado (`>= 0`) |
| `created_at` | Fecha de creación |

- El límite superior (`puntaje <= puntaje_maximo`) cruza dos tablas y no puede ir en un `CHECK` de SQL: se valida en la aplicación con `validarPuntaje()` (`src/utils/scoring.ts`).
- La restricción `unique (evaluacion_id, criterio_id)` permite volver a guardar sin duplicar filas (upsert).

### Capa de servicios y cálculo

| Archivo | Responsabilidad |
| --- | --- |
| `src/services/criteria.service.ts` | Obtener criterios por etapa |
| `src/services/evaluation.service.ts` | Crear evaluación, guardar detalle, obtener evaluación completa |
| `src/utils/scoring.ts` | Funciones puras: `calcularTotal()`, `calcularPromedioJurados()`, `validarPuntaje()` |
| `src/types/database.ts` | Tipado del modelo completo (sin `any`) |

## Vistas disponibles

| Ruta | Vista | Descripción |
| --- | --- | --- |
| `/` | Inicio | Portada con accesos a los demás módulos |
| `/jurado` | Panel del Jurado | Evaluación dinámica con sliders según criterios de la etapa |
| `/maestro` | Panel Maestro | Selección del evento actual y de la candidata a evaluar |
| `/publico` | Pantalla Pública | Proyección para la audiencia (próximas fases) |
| Cualquier otra | 404 | Página no encontrada |

## Configuración del entorno (.env)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia la plantilla `.env.example` como `.env` en la raíz del proyecto.
3. Completa los valores desde el panel de Supabase (**Project Settings → API**):

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

El archivo `.env` está ignorado por git: nunca se suben claves al repositorio. Sin `.env`, la aplicación sigue navegando; los paneles muestran un mensaje indicando que falta configurar Supabase.

## Ejecución

Requisito previo: tener instalado [Node.js](https://nodejs.org) (versión 20 o superior).

```bash
# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

Otros comandos disponibles:

```bash
npm run build     # Compila el proyecto para producción (carpeta dist/)
npm run preview   # Sirve localmente la build de producción
```

## Migraciones y datos de ejemplo

Aplicar en orden contra tu proyecto de Supabase:

1. `supabase/migrations/20260825090000_initial_schema.sql` — tablas base (`eventos`, `candidatas`, `jurados`, `criterios`, `evaluaciones`)
2. `supabase/migrations/20260825110000_evaluacion_detalles.sql` — motor de evaluación (`evaluacion_detalles`)
3. `supabase/seed.sql` — datos de ejemplo (evento, candidatas, jurados, criterios y una evaluación completa)

### Opción A · SQL Editor (rápida)

Abre **SQL Editor** en Supabase, pega y ejecuta cada archivo en orden.

### Opción B · Supabase CLI

Con la [Supabase CLI](https://supabase.com/docs/guides/cli) instalada y habiendo iniciado sesión (`supabase login`):

```bash
supabase link --project-ref <project-ref>
supabase db push

# En desarrollo local: levantar todo y aplicar migraciones + seed
supabase db reset
```

> El seed no se carga automáticamente contra el proyecto remoto; aplícalo manualmente si lo necesitas.

## Base de datos

Esquema vigente: `eventos`, `candidatas`, `jurados`, `criterios` (configurables por etapa), `evaluaciones` (jurado–candidata–evento) y `evaluacion_detalles` (un puntaje por criterio). Sin autenticación ni RLS por ahora.

El historial de trabajo por fases se documenta en [`CHANGELOG_FASES.md`](./CHANGELOG_FASES.md).
