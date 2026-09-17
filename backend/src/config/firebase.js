// =============================================================================
// Inicialización de Firebase Admin SDK
// =============================================================================
// Soporta dos modos:
//   1) GOOGLE_APPLICATION_CREDENTIALS apuntando a un archivo de service account
//      (recomendado para desarrollo local y despliegues on-prem).
//   2) Variables FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
//      inyectadas por la plataforma (Cloud Run, App Engine, Vercel, etc.).
// =============================================================================

require("dotenv").config();
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Modo 1: el SDK descubre las credenciales automáticamente desde la variable.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    // Modo 2: credenciales explícitas. La clave privada llega con \n escapados.
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    throw new Error(
      "Firebase Admin no está configurado. Define GOOGLE_APPLICATION_CREDENTIALS " +
        "o las variables FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY en .env."
    );
  }
}

const db = admin.firestore();

module.exports = { admin, db };