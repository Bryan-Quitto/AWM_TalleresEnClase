import { Injectable, inject } from "@angular/core";
import { HttpClient, httpResource } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { API_URL } from "../config/api.config";
import { Curso, CursoFormValue } from "../models/models";

@Injectable({ providedIn: "root" })
export class CursoAdminService {
  private readonly http = inject(HttpClient);

  /** Lista reactiva de todos los cursos. `.reload()` la vuelve a pedir tras mutar. */
  readonly cursos = httpResource<Curso[]>(() => `${API_URL}/cursos`, { defaultValue: [] });

  async crear(valor: CursoFormValue): Promise<void> {
    await firstValueFrom(this.http.post<Curso>(`${API_URL}/cursos`, valor));
    this.cursos.reload();
  }

  async actualizar(id: number, valor: CursoFormValue): Promise<void> {
    await firstValueFrom(this.http.put<Curso>(`${API_URL}/cursos/${id}`, valor));
    this.cursos.reload();
  }

  async eliminar(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_URL}/cursos/${id}`));
    this.cursos.reload();
  }
}
