import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { UsuarioAdminService } from "../../../core/services/usuario-admin.service";
import { AuthService } from "../../../core/services/auth.service";
import { ModalComponent } from "../../../shared/ui/modal.component";
import { ConfirmModalComponent } from "../../../shared/ui/confirm-modal.component";
import { Rol, UsuarioRecord, UsuarioFormValue } from "../../../core/models/models";

@Component({
  selector: "app-usuarios-admin",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent],
  templateUrl: "./usuarios-admin.component.html",
})
export class UsuariosAdminComponent {
  protected readonly usuarioAdmin = inject(UsuarioAdminService);
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly roles: Rol[] = ["estudiante", "docente", "admin"];

  protected readonly modalAbierto = signal(false);
  protected readonly editando = signal<UsuarioRecord | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorMsg = signal("");

  /** Estado del modal de confirmación de eliminación. */
  protected readonly pendienteEliminar = signal<UsuarioRecord | null>(null);
  protected readonly eliminando = signal(false);

  /** Modal informativo (reemplaza al antiguo `alert`). */
  protected readonly aviso = signal<string | null>(null);

  /** Doble confirmación al guardar docentes/admin. */
  protected readonly pendienteGuardarPotente = signal<{ valor: UsuarioFormValue; editando: boolean } | null>(null);
  protected readonly guardandoPotente = signal(false);

  /** Lista cerrada de periodos para evitar texto libre. */
  protected readonly periodosDisponibles: string[] = [
    "Periodo 2026 · Portal estudiantil",
    "Periodo 2026 · Portal docente",
    "Periodo 2026 · Portal administrativo",
  ];

  protected readonly form = this.fb.nonNullable.group({
    nombre: ["", [Validators.required, Validators.minLength(3)]],
    correo: ["", [Validators.required, Validators.email]],
    password: [""],
    rol: ["estudiante" as Rol, Validators.required],
    periodo: ["Periodo 2026 · Portal estudiantil", Validators.required],
  });

  abrirCrear(): void {
    this.editando.set(null);
    this.errorMsg.set("");
    this.form.reset({
      nombre: "",
      correo: "",
      password: "",
      rol: "estudiante",
      periodo: "Periodo 2026 · Portal estudiantil",
    });
    // Al crear, la contraseña es obligatoria; al editar, es opcional (dejarla vacía = no cambiarla).
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.modalAbierto.set(true);
  }

  abrirEditar(usuario: UsuarioRecord): void {
    this.editando.set(usuario);
    this.errorMsg.set("");
    this.form.reset({
      nombre: usuario.nombre,
      correo: usuario.correo,
      password: "",
      rol: usuario.rol,
      periodo: usuario.periodo,
    });
    this.form.controls.password.setValidators([Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();

    // Doble confirmación si el rol es docente o admin (operación sensible).
    if (valor.rol !== "estudiante") {
      this.pendienteGuardarPotente.set({ valor, editando: !!this.editando() });
      this.modalAbierto.set(false);
      return;
    }

    await this.ejecutarGuardar(valor);
  }

  cancelarGuardarPotente(): void {
    if (this.guardandoPotente()) return;
    this.pendienteGuardarPotente.set(null);
  }

  async confirmarGuardarPotente(): Promise<void> {
    const ctx = this.pendienteGuardarPotente();
    if (!ctx) return;
    this.guardandoPotente.set(true);
    try {
      await this.ejecutarGuardar(ctx.valor);
      this.pendienteGuardarPotente.set(null);
    } finally {
      this.guardandoPotente.set(false);
    }
  }

  private async ejecutarGuardar(valor: UsuarioFormValue): Promise<void> {
    this.guardando.set(true);
    this.errorMsg.set("");

    try {
      const editando = this.editando();
      if (editando) {
        await this.usuarioAdmin.actualizar(editando.id, valor);
      } else {
        await this.usuarioAdmin.crear(valor);
      }
      this.modalAbierto.set(false);
    } catch {
      this.errorMsg.set("No se pudo guardar el usuario. Verifica que el correo no esté repetido.");
    } finally {
      this.guardando.set(false);
    }
  }

  pedirEliminar(usuario: UsuarioRecord): void {
    if (usuario.id === this.auth.usuario()?.id) {
      this.aviso.set("No puedes eliminar tu propio usuario mientras tienes la sesión iniciada.");
      return;
    }
    this.pendienteEliminar.set(usuario);
  }

  cancelarEliminar(): void {
    if (this.eliminando()) return;
    this.pendienteEliminar.set(null);
  }

  async confirmarEliminar(): Promise<void> {
    const usuario = this.pendienteEliminar();
    if (!usuario) return;

    this.eliminando.set(true);
    try {
      await this.usuarioAdmin.eliminar(usuario.id);
      this.pendienteEliminar.set(null);
    } finally {
      this.eliminando.set(false);
    }
  }

  cerrarAviso(): void {
    this.aviso.set(null);
  }
}
