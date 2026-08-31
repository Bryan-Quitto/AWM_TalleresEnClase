import { Injectable, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { API_URL } from "../config/api.config";
import { LoginResponse, Usuario } from "../models/models";

const TOKEN_KEY = "campus_token";
const USUARIO_KEY = "campus_usuario";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly usuarioSignal = signal<Usuario | null>(this.leerUsuarioGuardado());

  readonly usuario = this.usuarioSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.usuarioSignal() !== null);

  constructor(private http: HttpClient) {}

  login(correo: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/login`, { correo, password }).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USUARIO_KEY, JSON.stringify(res.usuario));
        this.usuarioSignal.set(res.usuario);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    this.usuarioSignal.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private leerUsuarioGuardado(): Usuario | null {
    const raw = localStorage.getItem(USUARIO_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  }
}
