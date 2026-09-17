# Campus — MVP Gestión Académica

Frontend Angular 21 + backend Node/Express sobre **Firebase Firestore**, con
arquitectura **vertical slice** por feature.

> Nota: el **frontend NO usa Firebase**. Toda la comunicación pasa por el
> backend (`http://localhost:3000`), que es el único que se autentica contra
> Firestore con `firebase-admin`. La configuración de la app web se mantiene
> fuera del repositorio y nunca debe commitearse.

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Node.js | 18+ | `node -v` |
| npm | 10+ (incluido con Node 18) | `npm -v` |
| Angular CLI | 21 (opcional, usa `npx ng ...`) | `npx ng version` |
| Proyecto Firebase | con **Firestore en modo nativo** activo | Firebase Console |

---

## Estructura

```
.
├── backend/                  ← Node 18+ / Express 4 / Firebase Admin / JWT / bcrypt
│   ├── src/
│   │   ├── config/           (firebase.js — Admin SDK + credenciales)
│   │   ├── common/           (middleware auth, wrapper async)
│   │   ├── features/         ← un slice por dominio
│   │   │   ├── auth/            (login con bcrypt + JWT propio)
│   │   │   ├── usuarios/        (CRUD)
│   │   │   ├── cursos/          (CRUD)
│   │   │   ├── calificaciones/  (CRUD + vista del estudiante)
│   │   │   └── horario/         (CRUD + vista del estudiante)
│   │   ├── scripts/
│   │   │   ├── seed.js          (carga inicial)
│   │   │   └── seed-data.json   (datos iniciales del MVP)
│   │   └── server.js         (bootstrap, monta los slices)
│   ├── .env.example
│   └── package.json
└── frontend-academico/       ← Angular 21.2 + Tailwind CSS v4
    └── src/app/
        ├── core/             (models, services, guards, interceptors, config)
        ├── features/         (login, resumen, notas, horario, admin/*)
        └── shared/layout/
```

---

## 1. Configurar el backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` y define cómo se autentica Firebase Admin. Tienes dos opciones:

**A. Service account (recomendado para local y on-prem)**
1. En Firebase Console → *Project settings* → *Service accounts* → *Generate new private key*.
2. Guarda el JSON descargado como `backend/serviceAccountKey.json` (está en `.gitignore`, **no se commitea**).
3. En `.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
   ```

**B. Variables de entorno individuales (recomendado para Cloud Run / App Engine / Vercel)**
```env
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@tu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

También define `JWT_SECRET` con un valor aleatorio largo (`openssl rand -hex 32`).

### Crear las colecciones en Firestore

El proyecto de Firebase debe tener **Firestore en modo nativo** activado.
Reglas iniciales (solo desarrollo):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 12, 31);
    }
  }
}
```

> En producción hay que reemplazarlas por reglas estrictas basadas en
> el JWT (o migrar la auth a Firebase Auth y usar Custom Claims).

### ⚠️ Sobre `npm run seed` — SOLO la primera vez (o para reiniciar)

> **Aviso importante:** el seed lee `backend/src/scripts/seed-data.json`,
> **borra por completo** las colecciones `usuarios`, `cursos`, `calificaciones`
> y `horario` en Firestore, y las repuebla con los datos iniciales del MVP.
>
> **NO vuelvas a ejecutarlo a menos que quieras reiniciar Firestore desde
> cero.** Si el equipo ya creó datos desde la aplicación (o desde Firebase
> Console), esos cambios **no** están reflejados en `seed-data.json` y se
> perderán.
>
> La fuente de verdad actual es **Firestore**, no el JSON del repo.

```bash
cd backend
npm run seed   # ← solo la primera vez, o si quieres resetear todo
```

### Arrancar el backend

```bash
npm start          # producción
npm run dev        # desarrollo con --watch
```

Escucha en `http://localhost:3000`.

### Verificar que el backend responde

```bash
curl http://localhost:3000/health
# → {"ok":true,"ts":1700000000000}
```

Si devuelve `ok: true`, las credenciales de Firebase están bien configuradas.

---

## 2. Levantar el frontend

> Importante: el backend debe estar corriendo **antes** de abrir el frontend.

```bash
cd frontend-academico
npm install
npm start
```

Abre `http://localhost:4200`. El frontend apunta a `http://localhost:3000`
(configurado en `src/app/core/config/api.config.ts`). Si tu backend corre en
otro puerto/host, edita esa constante.

### Configuración del frontend

El frontend **no necesita credenciales de Firebase**: toda petición pasa por
el backend. Si en el futuro agregas auth con Firebase desde el cliente, las
claves web deben ir en un archivo ignorado por git (p.ej.
`src/environments/environment.ts` listado en `.gitignore`).

**Usuarios de prueba** (sembrados por `npm run seed`):

| Correo | Rol | Contraseña |
|---|---|---|
| `estudiante@uta.edu.ec` | estudiante | `campus2026` |
| `docente@uta.edu.ec` | docente | `campus2026` |
| `admin@uta.edu.ec` | administrador | `campus2026` |

### 📌 Nota sobre el campo `password` en Firestore

Cada documento de la colección `usuarios` tiene **dos** campos de contraseña:

- `passwordHash`: hash bcrypt, **es el que usa el backend para autenticar** (`/login`).
- `password`: texto plano, conservado por compatibilidad con el CRUD admin
  heredado del json-server (el frontend muestra/edita este campo en los formularios
  de gestión de usuarios). **El backend nunca lo usa para autenticar** — solo lo
  refleja tal cual llega del cliente.

> **¿Por qué se mantiene?** Es el shape de campos que dejó el docente en el
> modelo inicial (json-server). Quitarlo implicaría reescribir el formulario
> admin del frontend y cambiar el contrato de `GET /usuarios`, cosa que está
> fuera del alcance de esta migración. Si en una fase siguiente se decide
> endurecer la seguridad, basta con: (a) dejar de devolver `password` en el
> GET, (b) hashear siempre lo que llegue por PUT, y (c) ajustar el form de
> Angular para que solo pida la contraseña al crear/resetear.

**Implicación práctica:** en producción real esto **no debe quedarse así**
porque cualquiera con acceso de lectura a Firestore ve contraseñas en claro.
Para el MVP académico y la calificación actual es aceptable porque el equipo
controla el proyecto de Firebase.

---

## 3. Endpoints disponibles

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/login` | — | `{ correo, password }` → `{ token, usuario }` |
| GET | `/health` | — | healthcheck |
| GET | `/api/estudiantes/:id/calificaciones` | Bearer | notas + promedio del estudiante |
| GET | `/api/estudiantes/:id/horario` | Bearer | horario del estudiante (ordenado LUN→VIE, hora) |
| GET / POST / PUT / DELETE | `/usuarios` | Bearer (admin/docente para mutar) | CRUD |
| GET / POST / PUT / DELETE | `/cursos` | Bearer (admin/docente para mutar) | CRUD |
| GET / POST / PUT / DELETE | `/calificaciones` | Bearer (admin/docente para mutar) | CRUD |
| GET / POST / PUT / DELETE | `/horario` | Bearer (admin/docente para mutar) | CRUD |

Los contratos son **idénticos** a los del antiguo json-server, así que el
frontend Angular no requiere cambios.

---

## 4. Stack

- **Backend:** Node.js 18+, Express 4, `firebase-admin` 12, `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv`.
- **Frontend:** Angular 21.2, Tailwind CSS v4, RxJS, TypeScript 5.9, Vitest.
- **Base de datos:** Cloud Firestore (modo nativo).
- **Auth:** JWT propio + bcrypt (firmado con `JWT_SECRET`).

---

## 5. Troubleshooting

| Problema | Causa probable | Solución |
|---|---|---|
| `EADDRINUSE: 3000` al arrancar el backend | Puerto ocupado | Cierra el proceso o cambia `PORT` en `.env` |
| `Firebase Admin no está configurado` | Faltan variables en `.env` | Revisa la sección 1A o 1B; verifica que `.env` esté en `backend/` |
| `permission-denied` al hacer login o seed | Reglas de Firestore muy estrictas o proyecto incorrecto | Verifica proyecto en Firebase Console y reglas (sección 1) |
| Frontend no carga datos | Backend caído o `API_URL` apunta a otro host | Revisa `src/app/core/config/api.config.ts` y que `http://localhost:3000/health` responda |
| El seed "borró mis datos" | Se ejecutó `npm run seed` dos veces | Solo la fuente de verdad es Firestore; repoblar desde la app o restaurar manualmente |
| `npm install` falla en frontend | Node < 18 o caché corrupto | Actualiza Node y prueba `rm -rf node_modules package-lock.json && npm install` |

---

## 6. Por qué vertical slice

Cada feature vive en `src/features/<nombre>/` con su `*.service.js`
(acceso a Firestore, validaciones, reglas de negocio) y su `*.controller.js`
(rutas Express). El bootstrap (`server.js`) solo los monta. Esto significa:

- Cambiar una regla de validación de calificaciones **no toca** horario.
- Añadir una nueva feature = crear una carpeta nueva, sin tocar el resto.
- Los tests futuros pueden targetear un slice completo sin montar Express.

No hay ORM: el acceso a Firestore es directo a través del SDK oficial
(`firebase-admin`). No existe un ORM maduro equivalente para Firestore y el
acceso nativo evita una capa de abstracción innecesaria — el shape de los
documentos ya es schema-less por naturaleza.

---

## 7. Próximos pasos sugeridos

- Endurecer las reglas de Firestore para producción (no permitir todo a cualquiera).
- Sustituir el JWT propio por **Firebase Authentication + Custom Claims** si
  se quiere delegar la identidad (login con Google, etc.).
- Reemplazar el script de seed por migraciones idempotentes (p.ej. usando
  `firebase-tools` y `firestore:import`).
- Desplegar el backend en **Cloud Run** / **App Engine**; el `Dockerfile` es
  opcional (Node 18 basta).
