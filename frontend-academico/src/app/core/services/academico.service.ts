import { Injectable, inject } from "@angular/core";
import { httpResource } from "@angular/common/http";
import { API_URL } from "../config/api.config";
import { AuthService } from "./auth.service";
import { CalificacionesResponse, HorarioResponse } from "../models/models";

@Injectable({ providedIn: "root" })
export class AcademicoService {
  private readonly auth = inject(AuthService);

  /**
   * httpResource reacciona automáticamente: si el usuario cambia (login/logout),
   * vuelve a pedir los datos solos, sin necesidad de suscribirse manualmente.
   * Mientras no haya usuario autenticado, la URL es `undefined` y no se hace
   * ninguna petición.
   */
  readonly calificaciones = httpResource<CalificacionesResponse>(
    () => {
      const usuario = this.auth.usuario();
      return usuario ? `${API_URL}/api/estudiantes/${usuario.id}/calificaciones` : undefined;
    },
    { defaultValue: { estudianteId: 0, promedio: 0, calificaciones: [] } }
  );

  readonly horario = httpResource<HorarioResponse>(
    () => {
      const usuario = this.auth.usuario();
      return usuario ? `${API_URL}/api/estudiantes/${usuario.id}/horario` : undefined;
    },
    { defaultValue: { estudianteId: 0, horario: [] } }
  );
}
