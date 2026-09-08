import { Component, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { CalificacionAdminService } from "../../../core/services/calificacion-admin.service";
import { CursoAdminService } from "../../../core/services/curso-admin.service";
import { UsuarioAdminService } from "../../../core/services/usuario-admin.service";
import { ModalComponent } from "../../../shared/ui/modal.component";
import { ConfirmModalComponent } from "../../../shared/ui/confirm-modal.component";
import { CalificacionRecord } from "../../../core/models/models";

@Component({
  selector: "app-notas-admin",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent],
  templateUrl: "./notas-admin.component.html",
})
export class NotasAdminComponent {
  protected readonly calificacionAdmin = inject(CalificacionAdminService);
  protected readonly cursoAdmin = inject(CursoAdminService);
  protected readonly usuarioAdmin = inject(UsuarioAdminService);
  private readonly fb = inject(FormBuilder);

  protected readonly modalAbierto = signal(false);
  protected readonly editando = signal<CalificacionRecord | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorMsg = signal("");

  /** Estado del modal de confirmación de eliminación. */
  protected readonly pendienteEliminar = signal<CalificacionRecord | null>(null);
  protected readonly eliminando = signal(false);

  /** Filas de la tabla, con nombre de estudiante y curso ya resueltos. */
  protected readonly filas = computed(() => {
    const cursos = this.cursoAdmin.cursos.value() ?? [];
    const estudiantes = this.usuarioAdmin.estudiantes() ?? [];
    return (this.calificacionAdmin.calificaciones.value() ?? []).map((c) => ({
      registro: c,
      estudiante: estudiantes.find((e) => e.id === c.estudianteId)?.nombre ?? `#${c.estudianteId}`,
      curso: cursos.find((cu) => cu.id === c.cursoId)?.nombre ?? `#${c.cursoId}`,
    }));
  });

  protected readonly form = this.fb.nonNullable.group({
    estudianteId: [0, [Validators.required, Validators.min(1)]],
    cursoId: [0, [Validators.required, Validators.min(1)]],
    nota: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
  });

  abrirCrear(): void {
    this.editando.set(null);
    this.errorMsg.set("");
    this.form.reset({ estudianteId: 0, cursoId: 0, nota: 0 });
    this.modalAbierto.set(true);
  }

  abrirEditar(registro: CalificacionRecord): void {
    this.editando.set(registro);
    this.errorMsg.set("");
    this.form.reset({
      estudianteId: registro.estudianteId,
      cursoId: registro.cursoId,
      nota: registro.nota,
    });
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

    this.guardando.set(true);
    this.errorMsg.set("");
    const valor = this.form.getRawValue();

    try {
      const editando = this.editando();
      if (editando) {
        await this.calificacionAdmin.actualizar(editando.id, valor);
      } else {
        await this.calificacionAdmin.crear(valor);
      }
      this.modalAbierto.set(false);
    } catch {
      this.errorMsg.set("No se pudo guardar la calificación. Intenta nuevamente.");
    } finally {
      this.guardando.set(false);
    }
  }

  pedirEliminar(registro: CalificacionRecord): void {
    this.pendienteEliminar.set(registro);
  }

  cancelarEliminar(): void {
    if (this.eliminando()) return;
    this.pendienteEliminar.set(null);
  }

  async confirmarEliminar(): Promise<void> {
    const registro = this.pendienteEliminar();
    if (!registro) return;

    this.eliminando.set(true);
    try {
      await this.calificacionAdmin.eliminar(registro.id);
      this.pendienteEliminar.set(null);
    } finally {
      this.eliminando.set(false);
    }
  }
}
