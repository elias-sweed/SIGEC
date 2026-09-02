# SIGEC — Contexto completo para continuar (desde Fase 08)

> Documento generado el **02/09/2026**. Servirá de contexto para retomar el desarrollo
> (por ejemplo, con ChatGPT) sin perder el estado real del proyecto. Aquí está todo lo
> importante: stack, esquema de BD, migraciones, flujos implementados, decisiones tomadas
> y pendientes. Se indica explícitamente qué está **YA IMPLEMENTADO** para no rehacerlo.

---

## 1. Resumen del estado actual

- Proyecto en **git** en `C:\Users\elias\Desktop\Danza` (repo: `https://github.com/elias-sweed/SIGEC.git`, rama `main`).
- **Toda la Fase 08 (acceso por QR: activación con contraseña + Supabase Auth + PDF de tarjetas) está implementada y en producción dev.**
- Certamen: "Elección y Coronación de Señorita Jiménez Pimentel 2026".
  - PRIMERA ETAPA: 04/09/2026 (desfile + coreografía + ronda de preguntas).
  - SEGUNDA ETAPA (Gran Final): 18/09/2026 (ropa sport, talento, traje de gala, pregunta final).
- Fechas importantes: hoy es **02/09/2026**, la primera etapa es en **2 días**.

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | React 19 (JSX, function components, hooks) |
| Build | Vite 8.2.2 (`npm run build` = `tsc && vite build`) |
| Lenguaje | TypeScript estricto (`strict`, `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`) |
| Estilos | Tailwind CSS **v4** (tokens en clase `@theme` dentro de `src/styles/global.css`) |
| Router | react-router-dom v7 |
| Backend | Supabase (PostgreSQL + Auth), cliente `@supabase/supabase-js ^2.112.4` |
| Extra | `three`, `@react-three/fiber`, `@react-three/drei` (fondo de beams en el panel admin) |

Comandos:
- `npm run dev` — servidor de desarrollo.
- `npm run build` — compila y valida tipos (siempre debe pasar antes de commitear).

### Convenciones del código
- **Sin emojis** salvo que el usuario los pida (los pocos que hay en pantallas de jurado fueron pedidos).
- Comunicación con el usuario en español.
- Hacer commit + push **solo cuando el usuario lo pide** (en este proyecto suele pedirlo en cada entrega).
- No escribir `new Date()` junto a `updated_at` en tablas que no tienen esa columna (ver sección 8).

---

## 3. Variables de entorno (`.env`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPERADMIN_EMAIL=
```

- `VITE_SUPERADMIN_EMAIL` es el **único** email autorizado para entrar al panel admin (ver sección 11).
- Existe `.env` local y `.env.example`.

---

## 4. Rutas de la aplicación (`src/routes/index.tsx`)

| Ruta | Lo que muestra |
|---|---|
| `/` | Portada (`Home`) |
| `/pantalla` | Pantalla pública proyectada (`PublicScreen`) |
| `/admin` | Login oculto del superadmin (`AdminLogin`) |
| `/panel` | Dashboard admin con sidebar (`AdminLayout`) + subrutas: `index`=Resumen, `evento`, `candidatas`, `jurados`, `criterios`, `conectados`, `accesos`, `evaluaciones` |
| `/jurado` | Login del jurado (`JuradoLogin`) |
| `/jurado/activar` | Primer acceso del jurado (`JuradoActivar`) — recibe `?t=<token>` |
| `/jurado/evaluacion` | Evaluación a ancho completo (`JuradoEvaluacion`) — protegida por `JuradoGuard` |

Nota: `/jurado` y `/jurado/activar` usan `JuradoLayout` (contenedor centrado, sin navegación admin).
`/jurado/evaluacion` **no** usa `JuradoLayout` (se colocó a ancho completo para la nueva UI de evaluación).

---

## 5. Esquema de base de datos (esquema `public`, RLS desactivado en desarrollo)

### Tablas y columnas

**`eventos`**
| columna | tipo |
|---|---|
| id | uuid PK default gen_random_uuid() |
| nombre | text not null |
| etapa | text not null |
| estado | text not null default 'pendiente' |
| created_at | timestamptz not null default now() |

**`candidatas`**
| columna | tipo |
|---|---|
| id | uuid PK |
| nombre | text not null |
| grado | text not null |
| seccion | text not null |
| foto_url | text null |
| created_at | timestamptz default now() |

**`jurados`**
| columna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| nombre | text not null | |
| codigo | text not null **unique** | ej. `JUR-001` |
| created_at | timestamptz default now() | |
| en_sesion | boolean not null default false | sesión activa (se actualiza al entrar/salir) |
| activado | boolean not null default false | primer acceso hecho |
| email_interno | text null | email creado en Supabase Auth |
| auth_uid | uuid null | id del usuario en auth.users |
| token_acceso | text null | token de 32 chars usado en el QR |

**`criterios`**
| columna | tipo |
|---|---|
| id | uuid PK |
| etapa | text not null |
| nombre | text not null |
| puntaje_maximo | numeric(5,2) not null check (puntaje_maximo > 0) |
| indicadores | text null |
| es_desempate | boolean not null default false |
| orden | integer not null check (orden > 0) |
| | **unique (etapa, orden)** |

Importante: la rúbrica por etapa tiene estos criterios; los de **desempate** (`es_desempate = true`) no cuentan dentro de los 100 pts.

**`reglamento_etapa`**
| columna | tipo |
|---|---|
| id | uuid PK |
| etapa | text not null **unique** |
| contenido | text not null |
| updated_at | timestamptz default now() |

**`evaluaciones`**
| columna | tipo |
|---|---|
| id | uuid PK |
| evento_id | uuid not null FK → eventos (on delete cascade) |
| candidata_id | uuid not null FK → candidatas (cascade) |
| jurado_id | uuid not null FK → jurados (cascade) |
| estado | text not null default 'pendiente' |
| created_at | timestamptz default now() |
| updated_at | timestamptz not null default now() (auto via trigger) |
| | **unique (evento_id, candidata_id, jurado_id)** |

**`evaluacion_detalles`** (puntaje por criterio dentro de cada evaluación)
| columna | tipo |
|---|---|
| id | uuid PK |
| evaluacion_id | uuid not null FK → evaluaciones (cascade) |
| criterio_id | uuid not null FK → criterios |
| puntaje | numeric(5,2) not null check (puntaje >= 0) |
| created_at | timestamptz default now() |
| | **unique (evaluacion_id, criterio_id)** |

**`estado_evento`** (fuente de verdad de la candidata activa / fase de la pantalla pública)
| columna | tipo |
|---|---|
| id | uuid PK |
| evento_id | uuid not null **unique** FK → eventos |
| candidata_actual_id | uuid null FK → candidatas |
| estado | text not null default 'inactivo' |
| updated_at | timestamptz default now() |

### Índices
`evaluaciones_evento_idx`, `evaluaciones_candidata_idx`, `evaluaciones_jurado_idx`, `criterios_etapa_idx`, `evaluacion_detalles_evaluacion_idx`, `evaluacion_detalles_criterio_idx`, `estado_evento_evento_idx`.

### RLS
Deshabilitado en todas las tablas (desarrollo) mediante `alter table ... disable row level security`.

---

## 6. Migraciones (`supabase/migrations/`) y estado

| Migración | Contenido | ¿Aplicada? |
|---|---|---|
| `20260825090000_initial_schema.sql` | Tablas base: eventos, candidatas, jurados, criterios, evaluaciones + índices (Fase 02) | Probable (si hiciste el setup inicial) |
| `20260825110000_evaluacion_detalles.sql` | Tabla evaluacion_detalles (puntajes por criterio) | Probable |
| `20260825140000_estado_evento.sql` | Tabla estado_evento (candidata activa) | Probable |
| `20260825160000_disable_rls_dev.sql` | Desactiva RLS en desarrollo | Probable |
| `20260826100000_jurados_sesion.sql` | `jurados.en_sesion` (Fase 07) | Probable |
| `20260827100000_jurados_activacion.sql` | `jurados.activado`, `email_interno`, `auth_uid` (reafirma `en_sesion`) (Fase 08) | Probable |
| `20260901100000_jurados_token_acceso.sql` | `jurados.token_acceso` + rellena un token de 32 chars a filas existentes | **Verificar / aplicar** |
| `20260901110000_criterios_indicadores_reglamento.sql` | `criterios.indicadores`, tabla `reglamento_etapa`, seed oficial 1ª etapa (6 criterios + reglamento) | **Verificar / aplicar** |
| `20260901120000_segunda_etapa_oficial.sql` | Seed oficial 2ª etapa (7 criterios + reglamento) | **Verificar / aplicar** |
| `20260902100000_criterios_desempate.sql` | `criterios.es_desempate` (`alter table ... add column if not exists es_desempate boolean not null default false`) | **Pendiente** |
| `20260902150000_evaluaciones_updated_at.sql` | `evaluaciones.updated_at` (default now) + trigger `touch_updated_at` que la actualiza automáticamente en cada UPDATE | **Pendiente de aplicar** |

> Si se llega al proyecto "frío", la forma más segura es pegar todo `supabase/SETUP_COMPLETO.sql`
> en Supabase SQL Editor (es idempotente: usa `if not exists`) y luego las migraciones nuevas
> (`token_acceso`, `indicadores+reglamento`, `segunda etapa`, `es_desempate`).

---

## 7. Notas críticas de base de datos

1. **Supabase Auth valida el dominio del email**: rechaza dominios sin registro MX (p. ej. `sigec.local`, `example.com`) con error 400 "Email is invalid". Por eso el email interno de cada jurado usa **gmail.com** (tiene MX válido): `emailDeJurado("JUR-001") = "jur-001@gmail.com"`. Estas cuentas **nunca reciben correos reales** (la confirmación de email está desactivada). Definido en `src/services/jurado.service.ts` (`DOMINIO_EMAIL`).
2. **La confirmación de email debe estar DESACTIVADA** en Supabase (Authentication → Sign Up → Confirm email). Si está activa, el login del jurado falla con "Email not confirmed" (el login lo detecta y muestra el mensaje correcto).
3. **`updated_at` en `evaluaciones`** (agregado con migración `20260902150000_evaluaciones_updated_at.sql`): la columna existe con `default now()` y un trigger `touch_updated_at` la actualiza automáticamente en cada UPDATE. **Corregido**: `JuradoEvaluacion.handleGuardar` ya NO envía `updated_at` en el update (antes producía error 400 PGRST204 al corregir una evaluación).
4. El error `PATCH /jurados 400` de la Fase 08 **ya está corregido**: `marcarEnSesion()` primero verifica que la columna `en_sesion` exista (`columnaExiste('jurados','en_sesion')` consultando `information_schema.columns`) y usa exactamente el nombre `en_sesion`. Si la migración no se aplicó, omite el update sin romper nada.
5. `criterios.orden` y `puntaje_maximo` están validados con `check` > 0; `puntaje` de detalles must be >= 0.

---

## 8. Criterios oficiales y rúbrica de 100 pts

### PRIMERA ETAPA 04/09/26 (6 criterios, total = 100)
| orden | criterio | pts |
|---|---|---|
| 1 | Presentación y porte | 15 |
| 2 | Desenvolvimiento en la coreografía, actitud y carisma | 15 |
| 3 | Dominio del tema | 25 |
| 4 | Capacidad de expresión y argumentación | 25 |
| 5 | Actitud y carisma | 10 |
| 6 | Participación de la barra | 10 |

### SEGUNDA ETAPA 18/09/26 (7 criterios, total = 100)
| orden | criterio | pts |
|---|---|---|
| 1 | Porte y elegancia en traje de gala | 15 |
| 2 | Seguridad y desenvolvimiento escénico | 15 |
| 3 | Expresión corporal y comunicación no verbal | 10 |
| 4 | Claridad y coherencia de la respuesta | 15 |
| 5 | Capacidad de análisis y argumentación | 20 |
| 6 | Expresión oral y seguridad en la respuesta | 15 |
| 7 | Participación de la barra | 10 |

Fuentes duplicadas (se mantienen en sincronía manual): los **seeds SQL** de las migraciones y la constante `src/constants/criteriosOficiales.ts` (`CRITERIOS_OFICIALES`). En el panel hay un botón "Cargar oficiales" que hace `upsert on conflict (etapa, orden)` desde la constante.

### Rúbrica de 100 pts y desempate (implementado)
- El panel "Criterios" muestra en vivo el **estado de la rúbrica**: verde "Rúbrica completa · 100 pts"; ámbar "Faltan X pts"; rojo "Sobran X pts".
- **Criterios de desempate** (`es_desempate`): no cuentan dentro de los 100 pts; se evalúan igual (0..puntaje_maximo) pero sus puntos van aparte ("+X pts desempate") y solo se usan para romper empates en la nota base.
- Panel: botón "Desempate" por fila para activar/desactivar; totales base y desempate separados en el pie de la tabla; el modal de agregar/editar muestra una preview en vivo del total resultante.
- El cálculo separa base de desempate con `calcularTotales(detalles, desempateIds)` en `src/utils/scoring.ts`.

---

## 9. Flujo del jurado (Fase 08 terminada) — cómo funciona hoy

1. **Panel Maestro → Accesos**: botón "Generar accesos para jurados" muestra las tarjetas (nombre, código `JUR-001`, QR) y "Descargar PDF" abre una vista de impresión para "Guardar como PDF" (`src/utils/impresion.ts`).
   - El QR apunta a `/jurado/activar?t=<token>` (token de 32 chars, no muestra el código).
   - QR generado con la API pública `https://api.qrserver.com/v1/create-qr-code/`.
   - `urlActivacion(token)` y `urlQR(token, size)` están en `src/services/jurado.service.ts`.
2. **`/jurado/activar?t=<token>`** (`JuradoActivar.tsx`):
   - Busca el jurado por `token_acceso` (si no existe, por código, para compatibilidad con QRs viejos).
   - Si **ya está activado** (o hubo activación local en el celular) → redirige a `/jurado?t=<token>`.
   - Si **no** → pantalla de primer acceso: pide contraseña + confirmación (mín. 6 chars), hace `supabase.auth.signUp({ email: jur-001@gmail.com, password })`, marca `jurados.activado = true` y guarda `email_interno` y `auth_uid`. Si la cuenta ya existía en Auth, solamente marca activado y sigue.
3. **`/jurado`** (`JuradoLogin.tsx`):
   - Si llega `?t=` del QR/código: valida el token y salta directo a la pantalla de contraseña (sin escribir código).
   - Si el código no está activado → redirige a `/jurado/activar`.
   - Ingreso: `supabase.auth.signInWithPassword({ email: jur-001@gmail.com, password })`.
   - Protecciones: `MAX_INTENTOS = 5`, bloqueo de 60s (`ESPERA_MS`); mensajes neutros (no filtra si el error es de código o contraseña).
   - Al entrar: `guardarSesionJurado(id, codigo)` (localStorage) + `marcarEnSesion(id, true)`.
   - Si ya hay sesión (localStorage) → redirige directo a `/jurado/evaluacion`.
4. **`/jurado/evaluacion`** (`JuradoEvaluacion.tsx`, a ancho completo):
   - Solo funciona si `estado_evento.estado === 'evaluando'`.
   - Selector de candidatas en cuadrícula; "X/N evaluadas"; tarjetas deslizadoras de criterios (pasos de ±0.5, 3 columnas) con la **sección aparte de "Criterios de desempate"**.
   - Barra inferior fija con el total base sobre **/ 100 pts** + chip "+X desempate" y botón "Guardar evaluación".
   - Guardado: upsert en `evaluaciones` (unique evento+candidata+jurado) y `evaluacion_detalles` (unique evaluacion+criterio).
   - Al salir: `marcarEnSesion(id, false)` y cierra sesión.

Utilidades de sesión en `src/utils/session.ts` (`guardarSesionJurado`, `leerSesionJurado`, `limpiarSesionJurado`, `marcarActivadoLocal`, `estaActivadoLocal`).

---

## 10. Cálculo de puntajes (`src/utils/scoring.ts`)

```ts
export interface PuntajeDetalle { criterio_id: string; puntaje: number }

export function calcularTotal(detalles: PuntajeDetalle[]): number  // suma simple
export function calcularTotales(detalles, desempateIds: Set<string>): { base; desempate }
export function calcularPromedioJurados(totales: number[]): number  // media redondeada (NO usado aún)
export function validarPuntaje(puntaje, puntajeMaximo): boolean
```

- El jurado ve su **total base** (suma de criterios no-desempate, sobre 100).
- En el panel ***Evaluaciones*** (`EvaluacionesPanel.tsx`): tabla por candidata × jurado; cada celda muestra la nota base y debajo el "+X" de desempate; columna de progreso `X/totalJurados`.
- **No existe aún** ranking final ni promedio por candidata ni declaración de ganadora (ver pendientes).

---

## 11. Panel Maestro (superadmin)

- Login oculto en `/admin` (acceso directo por URL, sin enlace público). Acepta **solo** `VITE_SUPERADMIN_EMAIL` y valida la contraseña contra Supabase Auth (`src/lib/adminAuth.ts`).
- Sesión: ingreso con `signInWithPassword`; `AdminGuard` protege `/panel`.
- `AdminLayout` con sidebar: logo del colegio (`src/assets/Logo/logo.png`) + "ECSA 2026" (Elección · Coronación · Señorita · Aniversario) + navegación y métricas (candidatas / activados / criterios). Fondo de beams 3D (`three`+r3f+drei) cargado con `React.lazy` solo en el panel.
- Páginas: `Resumen` (checklist y botones iniciar/reiniciar), `Evento`, `Candidatas`, `Jurados`, `Criterios` (CRUD + rúbrica + desempate), `Conectados`, `Accesos` (QR + PDF), `Evaluaciones`.
- Estados del evento (`src/constants/eventStates.ts`): `preparando`, `evaluando`, `esperando_jurados`, `resultados_listos`, `publicado` (con etiquetas y colores).
- Sistema de diseño premium en `src/styles/global.css` (Tailwind v4 `@theme` navy/gold + clases utilitarias): `.panel-card`, `.panel-overline`, `.btn-gold`, `.btn-ghost`, `.btn-danger`, `.input-panel`, `.fila-panel`, `.chip`/`.chip-ok`/`.chip-muted`/`.chip-gold`.

---

## 12. Pendientes conocidos / sugeridos para la siguiente fase

**Bugs / deuda técnica (revisar primero):**
1. ~~Update de evaluación existente con columna inexistente~~ → **corregido** (ver sección 7, punto 3).
2. Los servicios `evaluation.service.ts` / `criteria.service.ts` existen pero el flujo real usa llamadas inline con `getSupabase()` (no borrarlos sin confirmar, pero hay que unificar o eliminar).

**Funciones todavía no implementadas (candidatas a la siguiente fase):**
- ~~Puntaje **promedio por candidata** y **ranking** ordenado~~ → **implementado** en `src/components/admin/RankingPanel.tsx` (promedio descendente; empates se rompen con el `+desempate` y, si persisten, se muestran como "Decisión del Jurado" sin romper automáticamente).
- Determinación automática de la **ganadora** declarada (coronación) y pantalla pública con **resultados reales**.
- Cierre de sesión con expiración o intentos adicionales; login por contraseña ya funciona.
- **RLS / políticas por rol** para producción (hoy todo deshabilitado; RLS off).
- Verificar si la configuración de Supabase tiene la confirmación de email desactivada y, si se quiere, restringir `auth` (email confirm) para jurados.

---

## 13. Historial de entregas recientes (commits)

- `b129607` — Parte 0 y 1: migración `20260902150000_evaluaciones_updated_at.sql` (columna `updated_at` + trigger) y Consola de Operación en el dashboard (reloj, control de estados, navegación de candidata).
- `eddbe82` — Fondo Beams 3D en el contenido del panel (lazy).
- `c9e0b10` — Rediseño premium del panel (glass cards, botones dorados, chips).
- `7463ad7` — Sidebar premium (logo, "ECSA 2026", métricas glass).
- `0530e04` — CRUD de criterios en el panel (tabla con total, agregar/editar/eliminar).
- `0ca8237` — Rúbrica de 100 pts controlada + criterios de desempate (`es_desempate`).

Antes de eso, ya estaban: sistema de QR por token (`49..`), logo en login admin (`78b0b0d`), rayos en login (`0492a63`), nueva UI de evaluación del jurado (`d6b0080`), criterios/reglamento en BD (`8b3beed`, `70ff0a7`), y todo el flujo de la Fase 08.

---

*Fin del documento. Al continuar, respeta las convenciones de la sección 2 y verifica la sección 7 (notas críticas) antes de tocar Supabase.*