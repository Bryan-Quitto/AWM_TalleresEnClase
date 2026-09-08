import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

/** Protege /admin/usuarios: solo el rol admin puede gestionar cuentas de otros usuarios. */
export const adminOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.esAdmin()) return true;

  router.navigate(["/resumen"]);
  return false;
};
