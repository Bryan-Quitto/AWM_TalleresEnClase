import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

/**
 * Protege las rutas /admin/*: solo docentes y administradores pueden entrar.
 * Un estudiante autenticado que intente acceder es redirigido a /resumen,
 * no a /login (ya está autenticado, solo no tiene permiso).
 */
export const roleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.puedeGestionar()) return true;

  router.navigate(["/resumen"]);
  return false;
};
