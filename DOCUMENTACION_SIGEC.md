# SIGEC — Documentación Técnica Completa del Sistema

> **Sistema Integral de Gestión y Evaluación del Certamen** («Elección y Coronación de Señorita Jiménez Pimentel 2026» — I.E. Jiménez Pimentel).
> Este documento describe el proyecto completo para que una IA (o un desarrollador nuevo) pueda entender **qué es**, **por qué existe**, **cómo funciona por dentro** y **cuál es su esquema de base de datos**, sin necesidad de leer el código fuente.

---

## 1. Resumen ejecutivo

**SIGEC** es una aplicación web (SPA) móvil-priorizada y de proyección en pantalla grande que digitaliza el proceso completo de un **certamen de elección y coronación escolar de una institución educativa peruana**. Sustituye el flujo manual de papel (planillas de puntaje y sumas a mano) por un sistema centralizado en tiempo real con:

- **Pantalla pública de proyección** (televisor/proyector del coliseo).
- **Panel de evaluación para un jurado calificador** (cada jurado desde su celular, vía QR).
- **Centro de control del Superadministrador** (conduce el evento, supervisa el progreso, genera actas y reportes).

La lógica de negocio vive en el **frontend (React) + Supabase (PostgreSQL + Auth + Realtime)**, con el cálculo de puntajes y ranking implementado en TypeScript puro. Los datos se guardan en 9 tablas PostgreSQL.

---

## 2. Contexto y problema

### El problema que motivó el desarrollo

Los certámenes de elección y coronación de una institución educativa se ven afectados sistemáticamente por:

1. **Errores de cálculo**: los jurados puntúan en planillas de papel y el equipo organizador suma a mano (y a veces de forma apresurada, en vivo). Los desempates y el promedio final se calculan mal o con controversia.
2. **Falta de transparencia**: no hay un registro homogéneo y auditable de quién puntuó, cuánto y cuándo; las quejas por «el papel se manipuló» son comunes.
3. **Desorden en la conducción del evento**: no hay una fuente única de verdad de qué candidata está en escenario, qué etiqueta de conexión tiene cada jurado, o si ya terminaron de evaluar.
4. **Trabajo de logística ineficiente**: emitir credenciales/QR de acceso de jurados, preparar planillas, recopilar resultados, generar el acta oficial y los reportes toma horas.
5. **Retrabajo en la segunda etapa**: tras un corte de 15 finalistas, todo el ciclo debe repetirse para la segunda ronda.

### La solución

Un sistema único que **orquesta el evento en vivo** (estados controlados por el admin), **elimina el cálculo manual** (fórmulas automáticas de promedio, desempate y ranking), **bloquea ediciones peligrosas** (los criterios ya evaluados no se pueden reescribir al reanudar), **automatiza los documentos formales** (acta PDF, Excel con múltiples hojas, tarjetas QR imprimibles, respaldo JSON) y **audita cada acción** del operador y los jurados.

---

## 3. Objetivos

### Objetivo general

Desarrollar un sistema web integral que automatice la gestión y evaluación de un certamen de elección y coronación escolar, desde la preparación hasta la publicación de resultados, garantizando exactitud en los puntajes, veracidad del ranking y orquestación en vivo del evento.

### Objetivos específicos

1. **OE1 — Digitalizar la evaluación**: permitir que cada jurado puntúe a las candidatas desde su propio dispositivo mediante una rúbrica por criterios oficiales (base + desempate), sin planillas físicas.
2. **OE2 — Garantizar exactitud aritmética**: calcular automáticamente totales por jurado, promedio por candidata, desempate y ranking final con redondeo a 2 decimales y detección de empates.
3. **OE3 — Orquestar el evento en vivo**: modelar el ciclo de vida del certamen (preparando → evaluando → esperando jurados → resultados listos → publicado) y proyectar en pantalla la escena correcta en tiempo real.
4. **OE4 — Proveer transparencia y control**: mostrar en el Centro de Control el progreso real de cada jurado (contando solo evaluaciones completas), la lista de conectados y permitir cerrar/publicar resultados.
5. **OE5 — Automatizar la gestión documental**: generar el acta oficial en PDF, el libro de resultados en Excel (3 hojas) y el respaldo JSON del certamen con un clic.
6. **OE6 — Controlar el acceso**: proveer identificación por código + contraseña para jurados (con activación por QR único) y acceso restringido y auditable para el superadministrador.
7. **OE7 — Proteger la integridad de la evaluación**: bloquear criterios ya respondidos al reanudar una evaluación y permitir el «deshabilitado suave» de candidatas sin borrar sus evaluaciones.
8. **OE8 — Permitir ensayos seguros**: modo ensayo que marca las evaluaciones como simuladas para no contaminar resultados oficiales.

---

## 4. Alcance y usuarios

### Roles

| Rol | Acceso | Qué puede hacer |
|---|---|---|
| **Público / Audiencia** | Pantalla proyectada (`/pantalla` o `/`) | Ver en vivo la candidata en escenario, el panel de jurados (quién está evaluando), el conteo y los resultados de los 15 finalistas. Sin escribir. |
| **Jurado calificador** | `JuradoLayout` (`/jurado*`) | Activar su cuenta con QR único, iniciar sesión con código JUR-XXXXXX + contraseña, evaluar candidatas con sliders, ver su progreso. |
| **Superadministrador** | `AdminLayout` (`/panel*`, login oculto en `/admin`) | Configurar evento/candidatas/jurados/criterios/reglamento, conducir estados, ver conectados, evaluaciones, ranking, exportar acta/Excel/respaldo, reiniciar certamen. |

### Alcance funcional

Todo el ciclo: **preparación → evaluación → espera → resultados → publicación**, con dos etapas oficiales (primera y segunda), corte de **15 finalistas** (top 3 por grado del 1º al 5º) y re-coronación en la segunda etapa.

---

## 5. Requisitos funcionales (RF)

### RF-1 — Gestión del evento
- **RF-1.1** Crear, editar nombre y etapa, y eliminar el evento del certamen (uno a la vez). Al crearlo queda en estado `preparando`.
- **RF-1.2** Mantener un único registro de estado vivo (`estado_evento`) con la candidata en escenario, escena de pantalla y modo ensayo.
- **RF-1.3** Reabrir una evaluación ya cerrada/publicada volviendo al estado `evaluando` sin borrar datos, conservando todos los puntajes existentes y habilitando solo los criterios pendientes.

### RF-2 — Gestión de candidatas
- **RF-2.1** CRUD de candidatas con nombre, grado (1–5), sección (A–J) y foto opcional subida a Supabase Storage (bucket `candidatas`, ruta `fotos/`).
- **RF-2.2** Al quitar o reemplazar una foto, borrar el archivo anterior del Storage.
- **RF-2.3** Importar candidatas desde archivo `.xlsx`/`.xls` (normaliza columnas, evita duplicados por `nombre|grado|seccion`) y exportarlas a Excel.
- **RF-2.4** Deshabilitar suave de una candidata (`activa = false`): deja de participar y desaparece de jurado y pantalla pública, pero **no borra sus evaluaciones**.
- **RF-2.5** Ordenar de forma estable por grado → sección → nombre y numerar con un número fijo 1..N pese a filtros.

### RF-3 — Gestión de jurados (accesos)
- **RF-3.1** Registrar jurados; cada uno recibe un código único `JUR-XXXXXX` (6 caracteres, sin caracteres ambiguos) y un token de acceso QR de 32 caracteres (no revela el código).
- **RF-3.2** Generar tarjetas individuales con QR imprimibles (nombre, código, URL de activación) y un QR genérico de ingreso proyectable con temporizador.
- **RF-3.3** Activar el jurado (primer acceso) creando su cuenta en Supabase Auth con email interno derivado `jur-XXXXXX@gmail.com` y marcando `activado`.
- **RF-3.4** Inicios de sesión con límite de 5 intentos y bloqueo de 60 s; la sesión se guarda localmente con TTL de 6 horas.
- **RF-3.5** Marcar en tiempo real si el jurado está en sesión (`en_sesion`) y qué candidata está evaluando (`candidata_actual_id`).

### RF-4 — Evaluación del jurado
- **RF-4.1** El jurado selecciona una candidata (con filtros de grado y sección) y la puntúa con sliders por criterio (paso 0.5, validado contra el puntaje máximo).
- **RF-4.2** La rúbrica separa criterios **base** (suman 100) y criterios de **desempate** (se muestran aparte y no afectan la nota base).
- **RF-4.3** Guardado atómico: si candidata **ya no está en estado `evaluando`**, se aborta (anti-cierre de ronda). El guardado usa UPSERTs con constraints únicos (1 evaluación y 1 puntaje por criterio).
- **RF-4.4** Al reanudar/reabrir, los criterios ya respondidos quedan **bloqueados** (badge «✓ Evaluado», sin edición) y solo se habilitan los restantes; el botón dice «Guardar criterios restantes».
- **RF-4.5** En modo ensayo, toda evaluación se marca `es_ensayo = true` y no cuenta para resultados oficiales.

### RF-5 — Orquestación del evento (Centro de Control)
- **RF-5.1** Checklist de configuración (evento, candidatas, jurados, criterios) habilita «Iniciar Evaluación».
- **RF-5.2** Cambiar estados del evento (Iniciar / Cerrar / Publicar) con paletas visuales y auditoría de cada transición.
- **RF-5.3** Mostrar **progreso real** por jurado: solo cuentan evaluaciones `completada`, no-ensayo y con **todos los criterios de la etapa respondidos** (las parciales no inflan el 100 %; se marcan `◐ parcial`).
- **RF-5.4** Modo ensayo con cambio inmediato y revertible.
- **RF-5.5** Reiniciar el certamen (borrar las 7 tablas en orden FK) con doble confirmación: contraseña del superadmin + escribir la palabra `BORRAR`.
- **RF-5.6** Historial de auditoría de acciones de admin y jurados.

### RF-6 — Resultados y reportes
- **RF-6.1** Ranking automático por promedio de jurados con detección de empates; si el empate persiste (incluido el desempate), el puesto queda como **«Decisión del Jurado»** sin romperse.
- **RF-6.2** Generar **acta oficial PDF** (logo, jurados, criterios, ranking, ganadora resaltada, firmas y pie).
- **RF-6.3** Generar **Excel con 3 hojas**: Ranking, Evaluaciones por jurado (una columna por criterio) y Resumen.
- **RF-6.4** Descargar **respaldo JSON** de las tablas del certamen.

### RF-7 — Pantalla pública
- **RF-7.1** Proyección a pantalla completa con escenas derivadas del estado: inicio (con cuadrícula de candidatas y cuenta regresiva), evaluación en curso (panel de jurados en vivo), esperando resultados, y tablero de resultados.
- **RF-7.2** En resultados, calcular y mostrar el **podio de 15 finalistas** (top 3 de cada grado 1–5) con gráfico de barras, dona por grado y tarjetas con promedio.
- **RF-7.3** Refresco en vivo con doble mecanismo: suscripciones Realtime + polling de respaldo cada 4 s.

### RF-8 — Auditoría
- **RF-8.1** Registrar en `auditoria` con usuario, acción y descripción: logins, cambios de estado, exportaciones, respaldos, modo ensayo, reinicio, inicio de sesión de jurados.

---

## 6. Requisitos no funcionales (RNF)

- **RNF-1 — Tiempo real**: las suscripciones WebSocket (`postgres_changes`) deben actualizar el panel admin y la pantalla pública al instante; si el hosting no soporta Realtime, un polling de 4 s debe cubrir el caso.
- **RNF-2 — Exactitud numérica**: todo puntaje `numeric(5,2)`; redondeo matemático a 2 decimales; umbral de empate 0.005.
- **RNF-3 — Seguridad**: códigos y tokens generados con CSPRNG (`crypto.getRandomValues`), nunca `Math.random()`. El token de acceso es único (índice único) y no expone el código. Sin secretos en el frontend (solo anon key de Supabase). Verificación de contraseña del superadmin para acciones destructivas.
- **RNF-4 — Disponibilidad/robustez**: caché de respaldo en `localStorage` (`sigec-certamen`) ante fallos de consulta; sesión de jurado local con TTL 6 h; operaciones destructivas con confirmaciones explícitas.
- **RNF-5 — Usabilidad**: pantalla pública legible a distancia (elementos grandes, alto contraste navy/dorado), panel admin con sidebar colapsable, versión móvil para jurados.
- **RNF-6 — Accesibilidad**: inputs con labels/ARIA (p. ej. `PasswordInput`, `FormularioCriterio` con `role="switch"`).
- **RNF-7 — Mantenibilidad**: dependencias de UI reducidas (Tailwind + SVG inline), lógica de negocio en `utils/services` puros testeables, logging de desarrollo solo en `import.meta.env.DEV`.
- **RNF-8 — Integridad de datos**: constraints UNIQUE (`evento,candidata,jurado`), (`evaluacion,criterio`), (`etapa, orden`), `candidatas.activa` como deshabilitado suave, triggers para `updated_at`.
- **RNF-9 — Performance**: proyección ligera de columnas para el ranking (`evaluacion_detalles` con solo `evaluacion_id, criterio_id, puntaje`), efectos 3D con lazy-loading (`Beams`) y DPR limitado.

---

## 7. Stack y arquitectura

### Tecnologías

| Capa | Tecnología | Versión |
|---|---|---|
| SPA / UI | React + TypeScript + Vite | React 19.2, TS 7.0, Vite 8.2 |
| Estilos | Tailwind CSS 4 (plugin Vite) | 4.3 |
| Enrutado | react-router-dom (HTML5, layout anidados) | 7.18 |
| Backend as a Service | Supabase (PostgreSQL 15 + Auth + Realtime + Storage) | @supabase/supabase-js 2.112 |
| PDF | jsPDF + jspdf-autotable | 4.2 / 5.0 |
| Excel | `xlsx` (solo importación, carga diferida) + SpreadsheetML propio (exportación) | xlsx 0.18 |
| Efectos visuales | three + @react-three/fiber + @react-three/drei | 0.185 / 9.7 / 10.7 |
| Hosting | Vercel (build `tsc && vite build`) | — |

### Arquitectura

```
┌─────────────────────────── ZONA ADMIN (Superadmin) ───────────────────────────┐
│ /admin (login oculto) ──► AdminGuard ──► AdminLayout ──► PanelDataProvider      │
│   ├── Resumen (Consola operativa)                                              │
│   ├── Evento · Candidatas · Jurados · Criterios                                │
│   ├── Conectados · Accesos (QR) · Evaluaciones                                 │
│   └── Exportaciones: Acta PDF · Excel 3 hojas · Respaldo JSON · Reinicio        │
└────────────────────────────────────────────────────────────────────────────────┘
                          │ Realtime (postgres_changes)
┌─────────────────────────── ZONA PÚBLICA ───────────────────────────────────────┐
│ PublicScreen ("/" y "/pantalla") — 4 escenas derivadas del estado              │
│   ├── Escena inicio (cuadrícula + countdown)                                   │
│   ├── Escena evaluación (PanelJurados en vivo)                                 │
│   ├── Escena esperando resultados                                              │
│   └── Escena resultados (podio top 3 x grado)                                  │
│ Refresco: Realtime + polling 4 s de respaldo                                   │
└────────────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────── ZONA JURADO ────────────────────────────────────────┐
│ /jurado (código+contraseña) → JuradoGuard                                      │
│   ├── /jurado/activar (primer acceso por QR, crea cuenta Auth)                 │
│   └── /jurado/evaluacion (rúbrica sliders, guardado atómico, bloqueos)         │
└────────────────────────────────────────────────────────────────────────────────┘
                          │
              ┌───────────▼────────────┐
              │  SUPABASE (Backend)    │
              │  ┌──────────────────┐  │
              │  │ PostgreSQL: 9    │  │
              │  │ tablas de negocio│  │
              │  ├──────────────────┤  │
              │  │ Auth: superadmin │  │
              │  │ + cuentas jur    │  │
              │  │ (jur-XXX@gmail)  │  │
              │  ├──────────────────┤  │
              │  │ Realtime (WS)    │  │
              │  ├──────────────────┤  │
              │  │ Storage: bucket  │  │
              │  │ candidatas/fotos │  │
              │  └──────────────────┘  │
              └───────────────────────┘
```

**Tree-shaking de providers:**
- `CertamenProvider` (contexto de «certamen en vivo»: evento, candidata en escenario, candidatas activas, `estado_evento`) envuelve **toda la app** (`src/App.tsx`).
- `PanelDataProvider` (datos completos del panel: evento, candidatas, jurados, criterios, evaluaciones, detalles, reglamento + `useRealtime`) se monta **solo dentro de `AdminLayout`** (reducción de carga en zonas que no lo necesitan).

---

## 8. Estructura del proyecto

```
src/
├── App.tsx / main.tsx / vite-env.d.ts
├── assets/Logo/logo.png
├── components/
│   ├── AdminGuard.tsx · JuradoGuard.tsx · PhaseNotice.tsx · DebugPanel.tsx
│   ├── PageHeader.tsx · Skeleton.tsx · PasswordInput.tsx
│   ├── admin/        PanelHeader · Section · Iconos · EvaluacionesPanel · RankingPanel ·
│   │                 AccesosJurados · QRIngresoModal · ReiniciarCertamenModal
│   ├── public/       CandidatasGrid · PanelJurados
│   ├── event/        CandidateCard · EventStatusCard · JuryProgressCard · ScoreSlider
│   └── effects/      Aurora · AuroraText · Beams · Lightning   (Three.js/WebGL)
├── constants/        criteriosOficiales.ts · eventStates.ts
├── context/          CertamenContext.tsx · PanelDataContext.tsx
├── layouts/          MainLayout.tsx · AdminLayout.tsx · JuradoLayout.tsx
├── lib/              supabase.ts · adminAuth.ts
├── pages/            Home · PublicScreen · JuradoLogin · JuradoActivar · JuradoEvaluacion ·
│   │                 AdminLogin · NotFound
│   └── admin/        Resumen · Evento · Candidatas · Jurados · Criterios · Conectados ·
│                     Accesos · Evaluaciones
├── routes/index.tsx
├── services/         criteria · evaluation · jurado · reset
├── styles/global.css
├── types/database.ts
└── utils/            scoring · codigos · session · auditLog · actaPdf · exportExcel ·
                      impresion · realtime · respaldo · devlog

supabase/
├── SETUP_COMPLETO.sql            Script idempotente de esquema final (foto ejecutable)
├── reset_completo.sql + seed.sql Datos demo / reinicio
├── RLS_DEV_POLICIES.sql          Políticas permisivas de desarrollo (anon_all)
└── migrations/                   17 migraciones cronológicas (ver §9.3)
```

---

## 9. Modelo de datos (esquema de la base de datos)

Motor: **PostgreSQL 15 (Supabase)**. RLS **deshabilitado** en las tablas de negocio (desarrollo); existe `RLS_DEV_POLICIES.sql` con política permisiva `anon_all` para el rol `anon`. Acerca de almacenamiento adicional: Supabase **Storage** con bucket público **`candidatas`** para las fotos.

### 9.1 Diagrama de relaciones

```
eventos 1 ──── 1 estado_evento            (evento_id)
eventos 1 ──── N evaluaciones            (evento_id, ON DELETE CASCADE)
candidatas 1 ─ N evaluaciones            (candidata_id, CASCADE)
jurados 1 ───── N evaluaciones           (jurado_id, CASCADE)
candidatas 1 ── N jurados.candidata_actual_id  (SET NULL)
evaluaciones 1─ N evaluacion_detalles    (evaluacion_id, CASCADE)
criterios 1 ─── N evaluacion_detalles    (criterio_id, sin ON DELETE → protector)
criterios N ──── 1 reglamento_etapa      (misma clave lógica: etapa)
estado_evento N─ 1 candidatas            (candidata_actual_id, sin ON DELETE)
```

### 9.2 Definición final por tabla

#### `public.eventos` — el certamen (Uno solo activo)
| Columna | Tipo | Constraint / Default |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `nombre` | `text` | NOT NULL |
| `etapa` | `text` | NOT NULL |
| `estado` | `text` | NOT NULL, default `'pendiente'` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

- Índices: PK `id`. Sin índices adicionales. **FK entrantes**: `evaluaciones.evento_id` (CASCADE), `estado_evento.evento_id` (sin cascade). RLS desactivada.
- Estados usados por el código: `preparando`, `evaluando`, `esperando_jurados`, `resultados_listos`, `publicado` (maestro en `constants/eventStates.ts`).

#### `public.candidatas` — participantes
| Columna | Tipo | Constraint / Default |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `nombre` | `text` | NOT NULL |
| `grado` | `text` | NOT NULL (ej. `'5'`) |
| `seccion` | `text` | NOT NULL (ej. `'A'`) |
| `foto_url` | `text` | nullable (URL pública de Storage bucket `candidatas`) |
| `activa` | `boolean` | NOT NULL, default `true` *(col. agregada en migración nº 17 — deshabilitado suave)* |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

- **FK entrantes**: `evaluaciones.candidata_id` (CASCADE), `jurados.candidata_actual_id` (SET NULL), `estado_evento.candidata_actual_id` (sin cascade).
- Semántica de `activa=false`: la candidata deja de participar (filtrada en jurado/pantalla pública vía `.eq('activa', true)`) pero sus evaluaciones se conservan.

#### `public.jurados` — calificadores
| Columna | Tipo | Constraint / Default | Origen |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | migración 1 |
| `nombre` | `text` | NOT NULL | 1 |
| `codigo` | `text` | NOT NULL, **UNIQUE** (`JUR-XXXXXX`) | 1 |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | 1 |
| `en_sesion` | `boolean` | NOT NULL, default `false` | 5 |
| `activado` | `boolean` | NOT NULL, default `false` | 6 |
| `email_interno` | `text` | nullable (`jur-XXXXXX@gmail.com`) | 6 |
| `auth_uid` | `uuid` | nullable (referencia a `auth.users`) | 6 |
| `token_acceso` | `text` | nullable + **índice único** (token QR 32 chars) | 7 (col), 15 (único) |
| `candidata_actual_id` | `uuid` | FK → `candidatas(id)` **ON DELETE SET NULL** | 16 |

- Índices: PK `id`; único `jurados_token_acceso_idx` (token_acceso); `jurados_candidata_actual_idx` (candidata_actual_id); único automático de `codigo`.

#### `public.criterios` — rúbrica de una etapa
| Columna | Tipo | Constraint / Default | Origen |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | 1 |
| `etapa` | `text` | NOT NULL (participa en UNIQUE `(etapa, orden)`) | 1 |
| `nombre` | `text` | NOT NULL | 1 |
| `puntaje_maximo` | `numeric(5,2)` | NOT NULL, **CHECK (`puntaje_maximo > 0`)** | 1 |
| `orden` | `integer` | NOT NULL, **CHECK (`orden > 0`)** | 1 |
| `indicadores` | `text` | nullable | 8 |
| `es_desempate` | `boolean` | NOT NULL, default `false` | 10 |

- Índices: PK `id`; UNIQUE `(etapa, orden)` (target de los seed/UPSERT); `criterios_etapa_idx (etapa)`.
- `etapa` es texto libre (no enum). Los valores oficiales: `'PRIMERA ETAPA 04/09/26'`, `'SEGUNDA ETAPA 18/09/26'`.

#### `public.reglamento_etapa` — texto reglamentario por etapa
| Columna | Tipo | Constraint / Default |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `etapa` | `text` | NOT NULL, **UNIQUE** (una fila por etapa) |
| `contenido` | `text` | NOT NULL |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

- ⚠️ **Nota**: es la única tabla sin RLS desactivada ni política de desarrollo (§18 lo detalla).

#### `public.evaluaciones` — puntaje de un jurado a una candidata
| Columna | Tipo | Constraint / Default | Origen |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | 1 |
| `evento_id` | `uuid` | NOT NULL, FK → `eventos(id)` **CASCADE** | 1 |
| `candidata_id` | `uuid` | NOT NULL, FK → `candidatas(id)` **CASCADE** | 1 |
| `jurado_id` | `uuid` | NOT NULL, FK → `jurados(id)` **CASCADE** | 1 |
| `estado` | `text` | NOT NULL, default `'pendiente'` (usado valor `'completada'`) | 1 |
| `es_ensayo` | `boolean` | NOT NULL, default `false` | 14 |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | 1 |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` (trigger automático) | 11 |

- **UNIQUE `(evento_id, candidata_id, jurado_id)`** → un jurado evalúa a una candidata una sola vez por evento (target del UPSERT y del `onConflict` de la app).
- Índices: `evaluaciones_evento_idx`, `evaluaciones_candidata_idx`, `evaluaciones_jurado_idx`.
- **Trigger**: `evaluaciones_touch_updated_at` (BEFORE UPDATE) ejecuta la función `public.touch_updated_at()` que fija `updated_at = now()`.

#### `public.evaluacion_detalles` — puntaje por criterio
| Columna | Tipo | Constraint / Default |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `evaluacion_id` | `uuid` | NOT NULL, FK → `evaluaciones(id)` **CASCADE** |
| `criterio_id` | `uuid` | NOT NULL, FK → `criterios(id)` (sin ON DELETE) |
| `puntaje` | `numeric(5,2)` | NOT NULL, **CHECK (`puntaje >= 0`)** |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

- **UNIQUE `(evaluacion_id, criterio_id)`** → un criterio se califica una sola vez por evaluación (target de UPSERT `onConflict`).
- Índices: `evaluacion_detalles_evaluacion_idx`, `evaluacion_detalles_criterio_idx`.
- El límite superior tras `criterios.puntaje_maximo` **no** puede expresarse en CHECK (depende de otra tabla); se valida en la app con `validarPuntaje()`.

#### `public.estado_evento` — estado vivo del certamen (UN registro por evento)
| Columna | Tipo | Constraint / Default | Origen |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | 3 |
| `evento_id` | `uuid` | NOT NULL, **UNIQUE**, FK → `eventos(id)` (sin cascade) | 3 (+15 refuerza) |
| `candidata_actual_id` | `uuid` | nullable, FK → `candidatas(id)` (sin cascade) | 3 |
| `estado` | `text` | NOT NULL, default `'inactivo'` | 3 |
| `pantalla_escena` | `text` | NOT NULL, default `'inicio'` (valores: `inicio/evaluacion/esperando/resultados`) | 12 |
| `modo_ensayo` | `boolean` | NOT NULL, default `false` | 12 |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | 3 |

- Es la **fuente de verdad** de la candidata en escenario, la escena de pantalla pública y el modo ensayo.
- Solo se crea al pulsar «Iniciar Evaluación» (en `Resumen.tsx`); si no existe, CertamenContext asume que el certamen no inició.

#### `public.auditoria` — bitácora de acciones
| Columna | Tipo | Constraint / Default |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `usuario` | `text` | NOT NULL (nombre/código del operador) |
| `accion` | `text` | NOT NULL (ej. `inicio_sesion`, `estado_evaluando`, `exportar_acta`) |
| `descripcion` | `text` | nullable |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

- Índice: `auditoria_created_at_idx (created_at DESC)`. RLS desactivada.

### 9.3 Funciones, triggers y ciclo de migraciones

**Función trigger única:** `public.touch_updated_at()` (plpgsql, `security definer`, `set search_path = public`) → `new.updated_at = now()`.

**Trigger:** `evaluaciones_touch_updated_at` (BEFORE UPDATE ON evaluaciones, FOR EACH ROW).

**17 migraciones (orden cronológico):**

| # | Migración | Qué hace |
|---|---|---|
| 1 | `20260825090000_initial_schema.sql` | Tablas `eventos`, `candidatas`, `jurados`, `criterios`, `evaluaciones` + índices |
| 2 | `20260825110000_evaluacion_detalles.sql` | Tabla `evaluacion_detalles` + índices |
| 3 | `20260825140000_estado_evento.sql` | Tabla `estado_evento` |
| 4 | `20260825160000_disable_rls_dev.sql` | Desactiva RLS en las 7 tablas existentes |
| 5 | `20260826100000_jurados_sesion.sql` | `jurados.en_sesion` |
| 6 | `20260827100000_jurados_activacion.sql` | `jurados.activado`, `email_interno`, `auth_uid` |
| 7 | `20260901100000_jurados_token_acceso.sql` | `jurados.token_acceso` + backfill de tokens 32 chars |
| 8 | `20260901110000_criterios_indicadores_reglamento.sql` | `criterios.indicadores`, tabla `reglamento_etapa`, seed 1.ª etapa |
| 9 | `20260901120000_segunda_etapa_oficial.sql` | Seed 2.ª etapa |
| 10 | `20260902100000_criterios_desempate.sql` | `criterios.es_desempate` |
| 11 | `20260902150000_evaluaciones_updated_at.sql` | `evaluaciones.updated_at` + función/función trigger |
| 12 | `20260902160000_estado_evento_escena_ensayo.sql` | `estado_evento.pantalla_escena`, `modo_ensayo` |
| 13 | `20260902170000_auditoria.sql` | Tabla `auditoria` |
| 14 | `20260902180000_evaluaciones_ensayo.sql` | `evaluaciones.es_ensayo` |
| 15 | `20260903100000_uniques_integridad.sql` | Índice único `jurados_token_acceso_idx`; refuerza UNIQUE `estado_evento.evento_id` |
| 16 | `20260903110000_jurados_candidata_actual.sql` | `jurados.candidata_actual_id` (FK SET NULL) + índice |
| 17 | `20260904000000_candidatas_activa.sql` | `candidatas.activa` (deshabilitado suave) |

> `supabase/SETUP_COMPLETO.sql` es un script **idempotente** que ensambla el esquema final completo (todas las tablas, columnas, índices, función/trigger) para ejecutarse de una sola vez; `reset_completo.sql` hace TRUNCATE en orden FK + reinserta el seed demo.

### 9.4 Seed / datos demo

- Evento `Gran Final Nacional 2026`, etapa `final`, estado `activo`.
- 3 candidatas; 5 jurados (`JUR-001`…`JUR-005`); criterios demo de la etapa `final` (Técnica 40 / Interpretación 30 / Coreografía 20 / Presencia 10).
- 1 evaluación `en_proceso` con 4 detalles (32.5 + 24 + 15 + 8 = 79.5).
- 1 registro `estado_evento` ligado al evento.

---

## 10. Ciclo de vida del evento (máquina de estados)

| Estado | Etiqueta | Color visual | Significado |
|---|---|---|---|
| `preparando` | Preparando | Slate (gris) | Configuración inicial; no se puede evaluar |
| `evaluando` | Evaluando | Emerald (verde) | Los jurados puntúan; pantalla en escena de evaluación |
| `esperando_jurados` | Esperando Jurados | Amber | Se cerró la evaluación, admin revisa y decide a publicar |
| `resultados_listos` | Resultados Listos | Blue | Resultados cargados, a la espera de publicar |
| `publicado` | Publicado | Purple | Resultados visibles; pantalla en tablero final |

**Transiciones en `Resumen.tsx` (`cambiarEstado`):**
- Iniciar Evaluación: crea el registro `estado_evento` (si no existe), fija `candidata_actual_id` a la primera candidata y pasa a `evaluando`.
- Cerrar Evaluación: solo se habilita cuando **todos los jurados están listos** (progreso real = N/N con TODOS los criterios respondidos).
- Publicar Resultados: pasa a `publicado`.
- Volver a Preparando: pide confirmación y deja `candidata_actual_id = null`.
- **Reabrir Evaluación** (desde `esperando_jurados`, `resultados_listos` o `publicado`): vuelve a `evaluando` sin borrar datos; los criterios ya respondidos quedan bloqueados para el jurado.

**Escenas públicas (derivadas):** `evaluando` → escena de evaluación; `esperando_jurados`/`resultados_listos` → esperando; `publicado` → resultados; otros → inicio.

---

## 11. Reglas de negocio y fórmulas (motor de puntaje)

Centralizado en `src/utils/scoring.ts`:

### 11.1 Totales por evaluación (un jurado → una candidata)

```
Para cada detalle d de la evaluación E del jurado J hacia la candidata C:
  si criterio(d) ∈ desempateIds  → desempate += punto(d)
  si no                          → base      += punto(d)

base      = redondear2(base)
desempate = redondear2(desempate)
```
- `redondear2(x) = Math.round(x * 100) / 100` (2 decimales).
- `desempateIds` = todos los criterios con `es_desempate = true`.

### 11.2 Promedio por candidata

```
promedio(C) = redondear2( Σ base_J(C) / #jurados_que_evaluaron(C) )
```

### 11.3 Ranking (orden y empates)

```
Orden: promedio DESC
Si |promedio(A) − promedio(B)| ≤ 0.005  →  desempate DESC
Si además |desempate(A) − desempate(B)| ≤ 0.005  →  «Decisión del Jurado», NO se rompe
```

- Umbral de empate **0.005** (redondeo a 2 decimales ⇒ diferencias < medio punto se tratan como empate efectivo).
- Las candidatas con menos evaluaciones que el total de jurados se marcan **«en curso»**.
- **Desempate en el ranking/acta = suma** de los desempates de los jurados. **En el Excel exportado = promedio** de desempates (ver §18, diferencia documentada).

### 11.4 Validación

`validarPuntaje(puntaje, puntajeMaximo)` → debe ser finito, `>= 0` y `<= puntaje_maximo`.

### 11.5 Podio de la pantalla pública (resultados)

- Se consideran solo evaluaciones `estado='completada'` y `!es_ensayo`.
- **15 finalistas = top 3 de mejor promedio por grado (1º a 5º)**; se muestran barras proporcionales al promedio, dona de distribución por grado y tarjetas por grado/puesto.

### 11.6 Criterios oficiales de cada etapa

**PRIMERA ETAPA 04/09/26 (6 criterios, = 100 pts)**

| # | Criterio | Puntaje máx |
|---|---|---|
| 1 | Presentación y porte | 15 |
| 2 | Desenvolvimiento en la coreografía, actitud y carisma | 15 |
| 3 | Dominio del tema | 25 |
| 4 | Capacidad de expresión y argumentación | 25 |
| 5 | Actitud y carisma | 10 |
| 6 | Participación de la barra | 10 |

**SEGUNDA ETAPA 18/09/26 (7 criterios, = 100 pts)**

| # | Criterio | Puntaje máx |
|---|---|---|
| 1 | Porte y elegancia en traje de gala | 15 |
| 2 | Seguridad y desenvolvimiento escénico | 15 |
| 3 | Expresión corporal y comunicación no verbal | 10 |
| 4 | Claridad y coherencia de la respuesta | 15 |
| 5 | Capacidad de análisis y argumentación | 20 |
| 6 | Expresión oral y seguridad en la respuesta | 15 |
| 7 | Participación de la barra | 10 |

- El `FormularioCriterio` del admin muestra el total base en vivo y «Cargar oficiales» reenvía estos valores por UPSERT `ON CONFLICT (etapa, orden)`.
- El reglamento (texto completo por etapa) vive en `reglamento_etapa` y se muestra en la página Criterios con `whitespace-pre-line`.

---

## 12. Módulos y flujos en detalle

### 12.1 Pantalla pública (`PublicScreen.tsx`)

Fuentes de refresco (redundancia intencional):
1. Carga inicial al montar.
2. **Polling de respaldo cada 4 s** (`setInterval`), comentado como fallback si Realtime no está publicada en el hosting.
3. **Realtime** (`useRealtime(['estado_evento','jurados','evaluaciones'])`) → recarga estado + datos en vivo.

Elementos: escena derivada del estado, `CandidatasGrid` (fotos o iniciales, badge «ya evaluada», modal de foto), `PanelJurados` (tarjetas en vivo: sin conexión / conectado evaluando candidata X / conectado sin seleccionar), `ContadorRegresivo` al objetivo (viernes 8:00 PM, base 2026-09-04, +1 día a las 20:00).

### 12.2 Acceso del jurado (QR → activación → login → evaluación)

1. **Registro**: el admin crea el jurado; se generan `codigo = JUR-XXXXXX` y `token_acceso` (32 chars CSPRNG, alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` sin ambiguos).
2. **QR individual** (`AccesosJurados`): apunta a `{origin}/jurado/activar?t={token}` (imagen vía `api.qrserver.com`); botón «Descargar PDF» abre la vista de impresión (`impresion.ts`) con tarjetas en grid de 2 columnas.
3. **Activación** (`JuradoActivar`): crea la cuenta Auth con `email = jur-XXXXXX@gmail.com` (dominio con MX válido; confirmación desactivada), guarda `auth_uid`/`email_interno` y marca `activado`. Si la cuenta ya existe, re-vincula.
4. **Login** (`JuradoLogin`): paso 1 código (5 intentos → bloqueo 60 s; si el QR trae token, no hay que escribirlo), paso 2 contraseña. Éxito → `guardarSesionJurado` (localStorage, TTL 6 h) + `marcarEnSesion(true)` + auditoría.
5. **Evaluación** (`JuradoEvaluacion`): selección con filtros → rúbrica de `ScoreSlider` (paso 0.5, badge de desempate, badge «✓ Evaluado» bloqueado) → `handleGuardar()`:
   - Guardia anti-cierre: re-consulta `estado_evento`; si no es `evaluando`, aborta.
   - UPSERT `evaluaciones` con `onConflict: 'evento_id,candidata_id,jurado_id'`.
   - UPSERT de cada detalle con `onConflict: 'evaluacion_id,criterio_id'`.
   - Bloquea los criterios guardados (`lockedIds`).

### 12.3 Centro de Control del Superadmin

**Consola (`Resumen.tsx`):** reloj en vivo, checklist, progreso real por jurado (completas con todos los criterios), chips de conectados/activados, botones de transición de estados, modo ensayo, exportaciones (Acta PDF, Excel, Respaldo JSON), reinicio (modal 2 pasos) y banner ámbar «Reabrir Evaluación».

**Gestión:**
- `Candidatas`: CRUD + fotos (subida a bucket `candidatas/fotos/{ts}-{rand}.{ext}` con `getPublicUrl`), quitar foto borra del Storage, importación `xlsx` diferida con anti-duplicados, alta/edición en modal (se cierra con ESC/✕/Cancelar), toggle de visibilidad (`activa`).
- `Jurados`: alta con código/token, edición de nombre, estado Activado/Pendiente.
- `Criterios`: rúbrica por etapa, suma en vivo a 100, switch de desempate, carga de oficiales, reglamento.
- `Evento`: crear/editar/eliminar (al eliminar borra `estado_evento` a mano antes que `eventos`, porque no hay cascade).
- `Conectados`: vista en vivo de `en_sesion`/`activado`.
- `Evaluaciones`: tabla candidata × jurado (base + desempate, parciales ◐) + `RankingPanel` en vivo.

**Seguridad del reinicio:** `ReiniciarCertamenModal` pide contraseña del superadmin (verifica contra Auth sin cambiar sesión) + escribir `BORRAR`, y `reset.service.resetCertamen()` borra las 7 tablas en orden FK usando `.delete().neq('id', ID_NEUTRO)` (UUID cero) para evitar DELETE sin WHERE.

---

## 13. Seguridad y autenticación

- **Superadmin**: sesión Supabase Auth; el email se restringe a `VITE_SUPERADMIN_EMAIL` (case-insensitive, inmutable en runtime, verificado en `adminAuth.ts`). Login oculto en `/admin`, rutas protegidas por `AdminGuard`. Doble verificación de contraseña para acciones destructivas.
- **Jurados**: cuentas Auth sintéticas `jur-XXXXXX@gmail.com`; el acceso por QR usa un **token separado del código** (si alguien escanea el QR solo ve el token). Sesión local con TTL 6 h. `JuradoGuard` verificaciones 100 % local.
- **Códigos/tokens**: generados con `crypto.getRandomValues` (CSPRNG). `token_acceso` único por índice.
- **Datos**: RLS desactivado en tablas de negocio (modo desarrollo) con política `anon_all` en `RLS_DEV_POLICIES.sql` que permite al rol `anon` todas las operaciones. No hay secretos en el frontend (solo `VITE_SUPABASE_ANON_KEY`).

---

## 14. Realtime y persistencia local

- `useRealtime(tablas[], onCambio)` (`utils/realtime.ts`): un canal Supabase por tabla suscrito a `postgres_changes` con `event:'*'`; cleanup de canales al desmontar y flag `activo` anti-setState.
- Suscripciones típicas: `['estado_evento','evaluaciones','jurados']` en el panel (`PanelDataContext`) y la pantalla pública.
- `localStorage`:
  - `sigec-certamen`: respaldo evento + candidata actual (restaurado si una consulta falla).
  - `sigec_jurado_id` / `sigec_jurado_codigo` / `sigec_jurado_expira`: sesión del jurado (TTL 6 h).
  - `sigec_jurado_activado`: flag local de activación.

---

## 15. Variables de entorno y configuración

Archivo `.env` (Vite):

```
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_SUPERADMIN_EMAIL=correo.del.superadmin@dominio.com
```

Setup de Supabase (manual, una vez):
1. Ejecutar `supabase/migrations/*.sql` en orden (o `SETUP_COMPLETO.sql`) en SQL Editor.
2. Crear el **bucket público `candidatas`** en Storage.
3. Opcional: `RLS_DEV_POLICIES.sql` para políticas permisivas.
4. `reset_completo.sql`/`seed.sql` para datos demo.

---

## 16. Compilación y despliegue

- `npm run dev` → Vite dev server.
- `npm run build` → `tsc && vite build` (servidor `npm run preview`).
- Despliegue: Vercel (comando build `tsc && vite build`).
- Nota de performance del build actual: el chunk principal supera 500 kB (se recomienda code-splitting para los efectos/Three y `xlsx`).

---

## 17. Hallazgos, decisiones y deudas técnicas (importantes para una IA)

1. **Desempate inconsistente entre reportes**: `RankingPanel` y `actaPdf.ts` usan **suma** de desempates; `exportExcel.ts` usa **promedio**. El ranking resultante es idéntico (orden proporcional), pero el número mostrado en Excel difiere del acta/panel.
2. **`RankingPanel` no filtra `es_ensayo`**: considera toda evaluación `completada` (incluidas las de modo ensayo), mientras `actaPdf`, `exportExcel` y el podio público sí excluyen ensayos. En un ensayo activo el ranking del panel podría contaminarse.
3. **`reglamento_etapa` huérfana de RLS**: no está en `disable_rls`, no tiene política `anon_all` ni aparece en `SETUP_COMPLETO.sql`. Si se habilita RLS globalmente, quedaría inaccesible.
4. **FK sin manejar**: `estado_evento.evento_id` y `estado_evento.candidata_actual_id` no tienen `ON DELETE`; el borrado de un evento con estado activo fallaría por el FK de `estado_evento` (la app lo resuelve borrando a mano primero). `evaluacion_detalles.criterio_id` tampoco tiene ON DELETE (protector: no se puede borrar un criterio calificado).
5. **`Home.tsx` no está enrutada**: la raíz `/` renderiza `PublicScreen`; `Home` quedó como reliquia y `MainLayout` sirve al 404.
6. **Bloqueo de criterios al reabrir**: los criterios ya respondidos no pueden corregirse con la UI (feature intencional para evitar errores). Si se necesita corrección, habría que añadir un desbloqueo.
7. **Progreso «real»**: en el panel, una evaluación con criterios incompletos se muestra como parcial (◐) y **no infla** el progreso del jurado.
8. **Modo ensayo**: los puntajes ensayados quedan marcados con `es_ensayo=true` y `estado='completada'`; afectan al `RankingPanel` (ver punto 2) pero no al podio público, acta ni Excel.
9. **El `estado_evento` se crea solo al iniciar la evaluación**; `CertamenContext` soporta que no exista (certamen sin iniciar).
10. **Límite de puntaje por criterio validado en frontend** (no hay CHECK en BD por depender de otra tabla).

---

## 18. Glosario rápido

| Término | Significado |
|---|---|
| Criterio base | Rubric item que suma a los 100 pts de la nota |
| Criterio de desempate | Ítem opcional (`es_desempate=true`) que solo rompe empates |
| Promedio del jurado | Media aritmética de los `base` de los jurados que evaluaron |
| Decisión del Jurado | Empate no resuelto por promedio ni desempate; se resuelve en reunión |
| Modo ensayo | Evaluaciones simuladas (`es_ensayo=true`) sin valor oficial |
| Deshabilitado suave | `candidatas.activa=false`: retira sin borrar evaluaciones |
| Reabrir evaluación | Volver de cerrado/publicado a `evaluando` conservando puntajes |
| Escena pública | `inicio · evaluacion · esperando · resultados` en pantalla |

---

*Documento generado a partir del análisis del repositorio SIGEC (commit actual: rama `main`). Última validación: esquema con 9 tablas y 17 migraciones.*