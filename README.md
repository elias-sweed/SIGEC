# SIGEC

**SIGEC** (*Sistema Integral de Gestión y Evaluación del Certamen*) es una aplicación web para administrar certámenes de danza: centraliza la organización del evento, la evaluación por parte del jurado y la difusión pública de los resultados.

> **Estado actual:** Fase 05 completada — Centro de Control funcional con estados oficiales, progreso de jurados en tiempo real y Panel Jurado mejorado.

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
│   │   └── event/        # Componentes del evento (EventStatusCard, CandidateCard, etc.)
│   ├── constants/        # Estados del evento y constantes compartidas
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

## Flujo del certamen

```
┌──────────────────────────────────────────────────────────────────┐
│                      CENTRO DE CONTROL                          │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Bloque A    │  │ Bloque B     │  │ Bloque D             │   │
│  │ Evento      │  │ Candidata    │  │ Sidebar              │   │
│  │             │  │              │  │                      │   │
│  │ Preparando  │  │  Valentina   │  │ Última actualización │   │
│  │   ↓         │  │  5° · A     │  │ Evento: Gran Final   │   │
│  │ Evaluando   │  │  ← Anterior  │  │ Candidatas: 3        │   │
│  │   ↓         │  │  Siguiente → │  │ Jurados: 2/5         │   │
│  │ Esperando   │  └──────────────┘  └──────────────────────┘   │
│  │   Jurados   │                                                │
│  │   ↓         │  ┌──────────────────────────────────────┐      │
│  │ Resultados  │  │ Bloque C                             │      │
│  │ Listos      │  │ Jurados                              │      │
│  │   ↓         │  │ 2/5 respondieron                     │      │
│  │ Publicado   │  │ ████████████░░░░░░░░                 │      │
│  └─────────────┘  │ María     Completado                 │      │
│                   │ Carlos    Pendiente                   │      │
│                   │ Ana       Completado                  │      │
│                   └──────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
         │
         │ selecciona candidata / cambia estado
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                     PANEL DEL JURADO                            │
│                                                                  │
│                    Candidata actual                               │
│                    Valentina Ríos                                │
│                    5° · Sección A                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────┐         │
│  │ Técnica de ejecución              32 / 40          │         │
│  │ ████████████████████████████░░░░░░░░░░░░           │         │
│  ├────────────────────────────────────────────────────┤         │
│  │ Interpretación artística          24 / 30          │         │
│  │ ████████████████████████░░░░░░░░░░░░               │         │
│  ├────────────────────────────────────────────────────┤         │
│  │ Coreografía                       15 / 20          │         │
│  │ ███████████████░░░░░░░░░░░░                         │         │
│  ├────────────────────────────────────────────────────┤         │
│  │ Presencia escénica                 8 / 10          │         │
│  │ ████████░░░░                                       │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
│                      Total                                       │
│                      79 puntos                                   │
│                                                                  │
│              ┌──────────────────────┐                            │
│              │  ✓ Evaluación enviada│  ← deshabilitado post-envío│
│              └──────────────────────┘                            │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                     PANTALLA PÚBLICA                             │
│                                                                  │
│                          🏆                                      │
│                                                                  │
│                  Gran Final Nacional 2026                        │
│                       Etapa: final                               │
│                                                                  │
│                  ● Evaluando                                     │
│                                                                  │
│              ┌──────────────────────────┐                        │
│              │    Candidata actual       │                        │
│              │                          │                        │
│              │    Valentina Ríos        │                        │
│              │    5° · Sección A        │                        │
│              └──────────────────────────┘                        │
│                                                                  │
│               Evaluación en curso                                │
└──────────────────────────────────────────────────────────────────┘
```

### Estados del evento

El evento avanza por estos estados en orden:

```
Preparando → Evaluando → Esperando Jurados → Resultados Listos → Publicado
```

| Estado | Descripción |
| --- | --- |
| `preparando` | Configuración inicial, candidatas y criterios listos |
| `evaluando` | El jurado puede calificar candidatas |
| `esperando_jurados` | Evaluación cerrada, esperando que todos envíen |
| `resultados_listos` | Todos los jurados han respondido |
| `publicado` | Resultados visibles en la Pantalla Pública |

## Vistas disponibles

| Ruta | Vista | Descripción |
| --- | --- | --- |
| `/` | Inicio | Evento actual + accesos a los módulos |
| `/jurado` | Panel del Jurado | Evaluación con sliders, total y envío |
| `/maestro` | Centro de Control | Estados, candidatas, progreso de jurados |
| `/publico` | Pantalla Pública | Proyección estilo escenario |
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

1. Aplica las migraciones y el seed en tu proyecto de Supabase (SQL Editor).
2. Ejecuta `npm run dev` y abre `http://localhost:5173`.
3. En el **Inicio** verás el evento cargado y las tarjetas de acceso.
4. Entra al **Centro de Control** → verás el Bloque A con estado "Preparando". Haz clic en "Iniciar evaluación".
5. Selecciona una candidata con los botones ← →.
6. Abre el **Panel del Jurado** → verás la candidata y los sliders. Califica y haz clic en "Guardar evaluación". El botón cambiará a "✓ Evaluación enviada".
7. Vuelve al Centro de Control → el Bloque C mostrará el avance de jurados ("1/5 respondieron").
8. Cuando todos los jurados hayan respondido, cambia a "Publicar resultados".
9. Abre la **Pantalla Pública** → verás "Resultados publicados".

## Migraciones y datos de ejemplo

Aplicar en orden contra tu proyecto de Supabase:

1. `supabase/migrations/20260825090000_initial_schema.sql` — tablas base
2. `supabase/migrations/20260825110000_evaluacion_detalles.sql` — motor de evaluación
3. `supabase/migrations/20260825140000_estado_evento.sql` — estado del evento
4. `supabase/migrations/20260825160000_disable_rls_dev.sql` — desactivar RLS (desarrollo)
5. `supabase/seed.sql` — datos de ejemplo completos

El historial de trabajo por fases se documenta en [`CHANGELOG_FASES.md`](./CHANGELOG_FASES.md).
