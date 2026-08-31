import { Component, signal, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./login.component.html",
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly correo = signal("estudiante@uta.edu.ec");
  readonly password = signal("");
  readonly cargando = signal(false);
  readonly errorMsg = signal("");

  onSubmit(): void {
    this.errorMsg.set("");
    this.cargando.set(true);

    this.auth.login(this.correo(), this.password()).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(["/horario"]);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorMsg.set(
          err.status === 401 ? "Correo o contraseña incorrectos." : "No se pudo conectar con el servidor."
        );
      },
    });
  }
}
