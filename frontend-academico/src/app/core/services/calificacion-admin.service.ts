import { Injectable, inject } from "@angular/core";
import { HttpClient, httpResource } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { API_URL } from "../config/api.config";
import { CalificacionRecord, CalificacionFormValue } from "../models/models";

@Injectable({ providedIn: "root" })
export class CalificacionAdminService {
  private readonly http = inject(HttpClient);

  /** Colección completa (todas las calificaciones, de todos los estudiantes). */
  readonly calificaciones = httpResource<CalificacionRecord[]>(() => `${API_URL}/calificaciones`, {
    defaultValue: [],
  });

  async crear(valor: CalificacionFormValue): Promise<void> {
    await firstValueFrom(this.http.post<CalificacionRecord>(`${API_URL}/calificaciones`, valor));
    this.calificaciones.reload();
  }

  async actualizar(id: number, valor: CalificacionFormValue): Promise<void> {
    await firstValueFrom(this.http.put<CalificacionRecord>(`${API_URL}/calificaciones/${id}`, valor));
    this.calificaciones.reload();
  }

  async eliminar(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_URL}/calificaciones/${id}`));
    this.calificaciones.reload();
  }
}
