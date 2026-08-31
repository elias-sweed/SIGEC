# SIGEC

**SIGEC** (*Sistema Integral de Gestión y Evaluación del Certamen*) es una aplicación web para administrar certámenes de danza: centraliza la organización del evento, la evaluación por parte del jurado y la difusión pública de los resultados.

> **Estado actual:** Fase 08 completada — Acceso profesional del jurado por QR: tarjetas con QR único, primer acceso con contraseña (Supabase Auth, correo interno jur-XXX@sigec.local), redirección automática al login para activados y descarga de PDF con las tarjetas.

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
| `/` | Inicio | Portada del sistema (sin acceso directo al jurado) |
| `/panel` | Centro de Control | Asistente: evento, candidatas, jurados, criterios e iniciar |
| `/jurado` | Inicio de sesión | Detecta `?codigo=` del QR; valida y pide contraseña |
| `/jurado/activar` | Primer acceso | Activa la cuenta con contraseña (viene del QR) |
| `/jurado/evaluacion` | Evaluación | Protegida por sesión: evalúa a la candidata activa |
| `/pantalla` | Pantalla Pública | Proyección estilo escenario |
| Cualquier otra | 404 | Página no encontrada |

## Flujo de acceso del jurado

```
QR (JUR-001) ──▶ /jurado/activar?codigo=JUR-001
                      │
                      ├─ nunca activado ──▶ contraseña × 2 ──▶ Supabase Auth (jur-001@sigec.local) ──▶ activado ✔
                      │
                      └─ ya activado ──▶ /jurado?codigo=JUR-001 ──▶ contraseña ──▶ sessionStorage ──▶ /jurado/evaluacion
                                                                                                      │
                                           sin sesión directa a /jurado/evaluacion
                                           → JuradoGuard redirige a /jurado
```

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

> A partir de la Fase 06 ya **no es necesario el seed**: todo se prepara desde la interfaz.

1. Aplica las migraciones en tu proyecto de Supabase (SQL Editor). RLS debe estar desactivado (migración `20260825160000_disable_rls_dev.sql`).
2. Ejecuta `npm run dev` y abre `http://localhost:5173`.
3. En el **Inicio** verás el estado de las tablas (todo en 0 al empezar).
4. Entra a **Configurar Certamen** → completa el checklist:
   - Crea el evento (nombre + etapa).
   - Agrega candidatas.
   - Agrega jurados (los códigos JUR-001, JUR-002… se generan solos).
   - Carga los criterios oficiales de la etapa.
5. Cuando todo esté listo, pulsa el botón dorado **"Iniciar Evaluación"** → se crea `estado_evento`, se selecciona la primera candidata y pasa a `evaluando`.
6. Abre el **Panel del Jurado** → ingresa con un código (ej. `JUR-001`) → evalúa con los sliders → "Guardar evaluación".
7. Al terminar, en el asistente: **Reiniciar Certamen** (rojo) borra todos los datos.

## Migraciones y datos de ejemplo

Aplicar contra tu proyecto de Supabase:

1. `supabase/migrations/20260825090000_initial_schema.sql` — tablas base
2. `supabase/migrations/20260825110000_evaluacion_detalles.sql` — motor de evaluación
3. `supabase/migrations/20260825140000_estado_evento.sql` — estado del evento
4. `supabase/migrations/20260825160000_disable_rls_dev.sql` — desactivar RLS (desarrollo)
5. `supabase/migrations/20260826100000_jurados_sesion.sql` — columna `en_sesion` en jurados
6. `supabase/migrations/20260827100000_jurados_activacion.sql` — activación por QR (`en_sesion`, `activado`, `email_interno`, `auth_uid`)

> `supabase/seed.sql` queda como **referencia opcional** (datos de ejemplo). El asistente permite preparar el certamen sin usarlo.

El historial de trabajo por fases se documenta en [`CHANGELOG_FASES.md`](./CHANGELOG_FASES.md).
