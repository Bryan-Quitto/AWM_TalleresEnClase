import { Component, signal, inject, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./login.component.html",
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly correo = signal("");
  readonly password = signal("");
  readonly cargando = signal(false);
  readonly errorMsg = signal("");

  ngOnInit(): void {
    // Si ya hay sesión activa, no tiene sentido volver a ver el login.
    if (this.auth.isAuthenticated()) {
      this.redirigirSegunRol();
    }
  }

  onSubmit(): void {
    this.errorMsg.set("");
    this.cargando.set(true);

    this.auth.login(this.correo(), this.password()).subscribe({
      next: () => {
        this.cargando.set(false);
        this.redirigirSegunRol();
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorMsg.set(
          err.status === 401 ? "Correo o contraseña incorrectos." : "No se pudo conectar con el servidor."
        );
      },
    });
  }

  private redirigirSegunRol(): void {
    const usuario = this.auth.usuario();
    if (!usuario) {
      this.router.navigate(["/login"]);
      return;
    }
    if (usuario.rol === "admin" || usuario.rol === "docente") {
      this.router.navigate(["/admin/cursos"]);
    } else {
      this.router.navigate(["/resumen"]);
    }
  }
}