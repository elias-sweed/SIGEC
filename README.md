# SIGEC

**SIGEC** (*Sistema Integral de Gestión y Evaluación del Certamen*) es una aplicación web para administrar certámenes de danza: centraliza la organización del evento, la evaluación por parte del jurado y la difusión pública de los resultados.

> **Estado actual:** Fase 01 completada — base del proyecto con navegación y vistas estructurales. Aún no incluye backend, autenticación ni lógica de negocio.

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| [React](https://react.dev) | Biblioteca de interfaz de usuario |
| [Vite](https://vite.dev) | Entorno de desarrollo y empaquetador |
| [TypeScript](https://www.typescriptlang.org) | Tipado estático |
| [Tailwind CSS](https://tailwindcss.com) | Estilos utilitarios (paleta azul oscuro / blanco / dorado) |
| [React Router](https://reactrouter.com) | Navegación entre vistas |

## Estructura del proyecto

```
Danza/
├── public/               # Archivos estáticos
├── src/
│   ├── assets/           # Recursos del proyecto
│   ├── components/       # Componentes reutilizables
│   ├── layouts/          # Layouts (estructura común de las vistas)
│   ├── pages/            # Vistas de la aplicación
│   ├── routes/           # Configuración de React Router
│   ├── styles/           # Estilos globales y tema de Tailwind
│   ├── App.tsx
│   └── main.tsx
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

El historial de trabajo por fases se documenta en [`CHANGELOG_FASES.md`](./CHANGELOG_FASES.md).
