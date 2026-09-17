// URL base del backend (Node/Express + Firebase Admin). Todas las
// peticiones de la app pasan por aquí: el frontend nunca habla directo
// con Firebase. Si en el futuro hay que separar por entorno
// (dev/staging/prod), convertir esto en environment.ts.
export const API_URL = "http://localhost:3000";