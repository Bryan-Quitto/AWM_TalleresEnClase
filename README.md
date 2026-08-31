# Campus — MVP Gestión Académica

Frontend Angular 21 + Tailwind CSS v4, construido a partir de los mockups
provistos (login, horario, mis notas), conectado a un mock API con
json-server para desarrollo y pruebas.

## Estructura

```
.
├── mock-api/              ← json-server 0.17.4 + rutas personalizadas
│   ├── db.json             (usuarios, cursos, calificaciones, horario)
│   ├── server.js
│   └── package.json
└── frontend-academico/    ← Angular 21.2 + Tailwind CSS v4
    ├── src/app/
    │   ├── core/            (models, services, guards, interceptors, config)
    │   ├── features/        (login, resumen, notas, horario)
    │   └── shared/layout/   (sidebar + topbar compartidos)
    ├── .postcssrc.json
    └── package.json
```

## 1. Levantar el mock API

```bash
cd mock-api
npm install
npm start
```

Queda escuchando en `http://localhost:3001`. Rutas disponibles:

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/login` | `{ correo, password }` → `{ token, usuario }` |
| GET | `/api/estudiantes/:id/calificaciones` | Notas con promedio ya calculado |
| GET | `/api/estudiantes/:id/horario` | Horario con curso/profesor/categoría ya combinados |
| GET/POST/PUT/DELETE | `/usuarios`, `/cursos`, `/calificaciones`, `/horario` | CRUD estándar de json-server, útil para editar datos de prueba sin tocar `db.json` a mano |

**Usuario de prueba:** `estudiante@uta.edu.ec` / `campus2026`

> ⚠️ Este mock API es solo para desarrollo del frontend: las contraseñas
> están en texto plano y el token no está firmado. No lo despliegues en
> producción. El backend real (Node/Express + JWT + PostgreSQL) construido
> en una sesión anterior de este mismo proyecto es el que debe reemplazarlo
> más adelante — la forma del JSON de respuesta es intencionalmente la
> misma, para que el cambio sea casi transparente para el frontend.

## 2. Levantar el frontend

En otra terminal:

```bash
cd frontend-academico
npm install
npm start
```

Abre `http://localhost:4200`. Inicia sesión con el usuario de prueba de
arriba y navega entre Resumen, Mis Notas y Horario.

## 3. Qué usa Angular 21 aquí (y por qué)

- **Standalone + zoneless por defecto** — no hay `NgModule` ni Zone.js en
  el proyecto; el detector de cambios reacciona a signals.
- **`httpResource()`** (`core/services/academico.service.ts`) — reemplaza el
  patrón clásico `subscribe()` + variable de estado manual. El recurso se
  vuelve a pedir solo cuando cambia la URL reactiva (por ejemplo, al hacer
  login/logout), sin código adicional.
- **Nueva sintaxis de control de flujo** (`@if`, `@for`, `@empty`) en todos
  los templates, en vez de `*ngIf`/`*ngFor`.
- **`inject()`** en vez de inyección por constructor, consistente en
  servicios, guards e interceptors.
- **Rutas con `loadComponent`** — cada pantalla (`notas`, `horario`,
  `resumen`) se descarga en un chunk separado (confirmado en el build:
  `notas-component`, `horario-component`, `resumen-component` como archivos
  independientes).

## 4. Diseño visual

Los tokens de color (`src/styles.css`, bloque `@theme`) usan la paleta del
mockup: verde azulado oscuro (`brand-900` `#0f4c46`) para el panel de login
y el sidebar, dorado (`accent-500` `#e3a34d`) para el acento de "Avanza.",
y verde menta (`brand-100`) para los estados activos e insignias.

Si el mockup real usa tonos distintos a los que aproximé visualmente,
ajusta solo el bloque `@theme` en `styles.css` — como son custom properties
de Tailwind v4, el cambio se propaga automáticamente a todas las clases
`bg-brand-900`, `text-accent-500`, etc. sin tocar los componentes.

## 5. Próximos pasos sugeridos

- Migrar el estado de sesión de `localStorage` a algo persistente entre
  pestañas si el proyecto crece (por ahora es suficiente para el MVP).
- Cuando el backend real esté listo, cambiar `API_URL` en
  `src/app/core/config/api.config.ts` — es el único lugar donde vive esa URL.
- Agregar `HorarioComponent`/`NotasComponent` a Ionic siguiendo el mismo
  patrón ya usado en la fase de diseño (reutilizar `core/` tal cual).
