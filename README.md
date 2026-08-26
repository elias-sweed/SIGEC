# SIGEC

**SIGEC** (*Sistema Integral de Gestión y Evaluación del Certamen*) es una aplicación web para administrar certámenes de danza: centraliza la organización del evento, la evaluación por parte del jurado y la difusión pública de los resultados.

> **Estado actual:** Fase 04 completada — MVP funcional completo con Panel Maestro, Panel del Jurado y Pantalla Pública conectados a Supabase. Flujo demostrable de principio a fin.

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

## Tabla `estado_evento` — fuente de verdad

La tabla `estado_evento` reemplaza a `localStorage` como fuente oficial del estado del certamen.

| Campo | Descripción |
| --- | --- |
| `evento_id` | FK única hacia `eventos` (solo un registro por evento) |
| `candidata_actual_id` | FK nullable hacia `candidatas`: candidata activa para evaluación |
| `estado` | Estado actual del evento (activo, en_evaluación, etc.) |
| `updated_at` | Timestamp de la última actualización |

**Flujo:**
1. El **Panel Maestro** escribe en esta tabla al seleccionar una candidata.
2. El **Panel del Jurado**, la **Pantalla Pública** y el **Home** leen desde aquí.
3. `CertamenContext` sincroniza esta tabla con el estado global de React; mantiene `localStorage` como respaldo temporal si Supabase no responde.

## Flujo del MVP

```
Panel Maestro ──────── selecciona candidata ────────┐
         │  escribe estado_evento                   │
         ▼                                           │
   estado_evento  ◄── fuente de verdad ──►  Supabase
         │                                           │
         ├──── lee Panel Jurado                     │
         │     carga criterios por etapa            │
         │     sliders → guardar evaluación         │
         │                                           │
         ├──── lee Home                             │
         │     muestra evento + accesos             │
         │                                           │
         └──── lee Pantalla Pública                 │
               candidata actual + "En curso"        │
```

## Vistas disponibles

| Ruta | Vista | Descripción |
| --- | --- | --- |
| `/` | Inicio | Evento actual + accesos a los módulos |
| `/jurado` | Panel del Jurado | Evaluación dinámica de la candidata activa con sliders y guardado |
| `/maestro` | Panel Maestro | Selección de candidata (conectado directo a Supabase) |
| `/publico` | Pantalla Pública | Proyección en vivo para la audiencia (refrescar para actualizar) |
| Cualquier otra | 404 | Página no encontrada |

## Configuración del entorno (.env)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia `.env.example` como `.env` en la raíz del proyecto.
3. Completa los valores desde **Project Settings → API**:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

> Sin `.env`, la aplicación sigue navegando pero muestra mensajes indicando que falta configurar Supabase.

## Ejecución

Requisito: [Node.js](https://nodejs.org) ≥ 20.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # Compilación para producción (dist/)
npm run preview      # Preview local de la compilación
```

## Cómo probar el flujo completo

1. Aplica las migraciones y el seed en tu proyecto de Supabase (SQL Editor o `supabase db reset`).
2. Ejecuta `npm run dev` y abre `http://localhost:5173`.
3. En el **Inicio** verás el evento cargado y las tarjetas de acceso.
4. Entra al **Panel Maestro** → verás las candidatas desde Supabase. Selecciona una.
5. Abre el **Panel del Jurado** → verás la candidata seleccionada automáticamente. Elige tu nombre de jurado y califica con los sliders.
6. **Guarda** la evaluación. Vuelve al Panel Maestro → todo sigue consistente.
7. Abre la **Pantalla Pública** → muestra la candidata actual; al recargar se actualiza.

## Migraciones y datos de ejemplo

Aplicar en orden contra tu proyecto de Supabase:

1. `supabase/migrations/20260825090000_initial_schema.sql` — tablas base
2. `supabase/migrations/20260825110000_evaluacion_detalles.sql` — motor de evaluación
3. `supabase/migrations/20260825140000_estado_evento.sql` — estado del evento
4. `supabase/seed.sql` — datos de ejemplo completos

### Opción A · SQL Editor (rápida)

Abre **SQL Editor** en Supabase, pega y ejecuta cada archivo en orden.

### Opción B · Supabase CLI

```bash
supabase link --project-ref <project-ref>
supabase db push

# En desarrollo local: levantar todo y aplicar migraciones + seed
supabase db reset
```

El historial de trabajo por fases se documenta en [`CHANGELOG_FASES.md`](./CHANGELOG_FASES.md).
