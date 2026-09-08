import { Injectable, inject } from "@angular/core";
import { HttpClient, httpResource } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { API_URL } from "../config/api.config";
import { HorarioRecord, HorarioFormValue } from "../models/models";

@Injectable({ providedIn: "root" })
export class HorarioAdminService {
  private readonly http = inject(HttpClient);

  /** Colección completa (todas las clases, de todos los estudiantes). */
  readonly horario = httpResource<HorarioRecord[]>(() => `${API_URL}/horario`, { defaultValue: [] });

  async crear(valor: HorarioFormValue): Promise<void> {
    await firstValueFrom(this.http.post<HorarioRecord>(`${API_URL}/horario`, valor));
    this.horario.reload();
  }

  async actualizar(id: number, valor: HorarioFormValue): Promise<void> {
    await firstValueFrom(this.http.put<HorarioRecord>(`${API_URL}/horario/${id}`, valor));
    this.horario.reload();
  }

  async eliminar(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_URL}/horario/${id}`));
    this.horario.reload();
  }
}
