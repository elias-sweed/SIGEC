# SIGEC

**SIGEC** (*Sistema Integral de Gestión y Evaluación del Certamen*) es una aplicación web para administrar certámenes de danza: centraliza la organización del evento, la evaluación por parte del jurado y la difusión pública de los resultados.

> **Estado actual:** Fase 02 completada — integración de Supabase con el esquema inicial de base de datos. Aún no hay autenticación ni lógica de evaluación funcional.

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| [React](https://react.dev) | Biblioteca de interfaz de usuario |
| [Vite](https://vite.dev) | Entorno de desarrollo y empaquetador |
| [TypeScript](https://www.typescriptlang.org) | Tipado estático |
| [Tailwind CSS](https://tailwindcss.com) | Estilos utilitarios (paleta azul oscuro / blanco / dorado) |
| [React Router](https://reactrouter.com) | Navegación entre vistas |
| [Supabase](https://supabase.com) | Backend como servicio (PostgreSQL) — infraestructura |

## Estructura del proyecto

```
Danza/
├── public/               # Archivos estáticos
├── src/
│   ├── assets/           # Recursos del proyecto
│   ├── components/       # Componentes reutilizables
│   ├── layouts/          # Layouts (estructura común de las vistas)
│   ├── lib/              # Clientes externos (Supabase)
│   ├── pages/            # Vistas de la aplicación
│   ├── routes/           # Configuración de React Router
│   ├── styles/           # Estilos globales y tema de Tailwind
│   └── main.tsx / App.tsx
├── supabase/
│   ├── migrations/       # Migraciones SQL del esquema
│   └── seed.sql          # Datos de ejemplo (se aplica manualmente)
├── .env.example          # Plantilla de variables de entorno
├── CHANGELOG_FASES.md    # Registro de cambios por fase
└── README.md
```

## Vistas disponibles

| Ruta | Vista | Descripción |
| --- | --- | --- |
| `/` | Inicio | Portada con accesos a los demás módulos |
| `/jurado` | Panel del Jurado | Espacio del cuerpo de jurados |
| `/maestro` | Panel Maestro | Centro de control del certamen |
| `/publico` | Pantalla Pública | Proyección en vivo para la audiencia |
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

El archivo `.env` está ignorado por git: nunca se suben claves al repositorio.

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

### Opción A · SQL Editor (rápida)

1. Abre tu proyecto en Supabase y ve a **SQL Editor**.
2. Pega y ejecuta el contenido de cada archivo en orden:
   - `supabase/migrations/20260825090000_initial_schema.sql` (crea las tablas)
   - `supabase/seed.sql` (opcional: datos de ejemplo)

### Opción B · Supabase CLI

Con la [Supabase CLI](https://supabase.com/docs/guides/cli) instalada y habiendo iniciado sesión (`supabase login`):

```bash
# Vincular el directorio supabase/ con tu proyecto remoto
supabase link --project-ref <project-ref>

# Aplicar las migraciones pendientes
supabase db push

# En desarrollo local: levantar todo y aplicar migraciones + seed
supabase db reset
```

> El seed no se carga automáticamente contra el proyecto remoto; aplícalo manualmente si lo necesitas.

## Base de datos

Esquema inicial (Fase 02): `eventos`, `candidatas`, `jurados`, `criterios` (configurables por etapa con su puntaje máximo) y `evaluaciones`. Los puntajes por criterio se incorporarán en una fase posterior.

El historial de trabajo por fases se documenta en [`CHANGELOG_FASES.md`](./CHANGELOG_FASES.md).
