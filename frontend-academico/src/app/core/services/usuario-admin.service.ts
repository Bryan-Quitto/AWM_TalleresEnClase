import { Injectable, inject, computed } from "@angular/core";
import { HttpClient, httpResource } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { API_URL } from "../config/api.config";
import { UsuarioRecord, UsuarioFormValue } from "../models/models";

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

@Injectable({ providedIn: "root" })
export class UsuarioAdminService {
  private readonly http = inject(HttpClient);

  readonly usuarios = httpResource<UsuarioRecord[]>(() => `${API_URL}/usuarios`, { defaultValue: [] });

  /** Solo estudiantes — útil para poblar selects en los formularios de Calificaciones/Horario. */
  readonly estudiantes = computed(() => this.usuarios.value().filter((u) => u.rol === "estudiante"));

  async crear(valor: UsuarioFormValue): Promise<void> {
    const payload = {
      ...valor,
      iniciales: iniciales(valor.nombre),
      password: valor.password ?? "",
    };
    await firstValueFrom(this.http.post<UsuarioRecord>(`${API_URL}/usuarios`, payload));
    this.usuarios.reload();
  }

  async actualizar(id: number, valor: UsuarioFormValue): Promise<void> {
    // Si el formulario de edición deja la contraseña en blanco, no la sobrescribimos.
    const actual = this.usuarios.value().find((u) => u.id === id);
    const password = valor.password?.trim() ? valor.password : actual?.password ?? "";

    const payload = { ...valor, iniciales: iniciales(valor.nombre), password };
    await firstValueFrom(this.http.put<UsuarioRecord>(`${API_URL}/usuarios/${id}`, payload));
    this.usuarios.reload();
  }

  async eliminar(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_URL}/usuarios/${id}`));
    this.usuarios.reload();
  }
}
