import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { CursoAdminService } from "../../../core/services/curso-admin.service";
import { ModalComponent } from "../../../shared/ui/modal.component";
import { ConfirmModalComponent } from "../../../shared/ui/confirm-modal.component";
import { Categoria, Curso } from "../../../core/models/models";

@Component({
  selector: "app-cursos-admin",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent],
  templateUrl: "./cursos-admin.component.html",
})
export class CursosAdminComponent {
  protected readonly cursoAdmin = inject(CursoAdminService);
  private readonly fb = inject(FormBuilder);

  protected readonly categorias: Categoria[] = ["APE", "Laboratorio"];

  protected readonly modalAbierto = signal(false);
  protected readonly editando = signal<Curso | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorMsg = signal("");

  /** Estado del modal de confirmación de eliminación. */
  protected readonly pendienteEliminar = signal<Curso | null>(null);
  protected readonly eliminando = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ["", [Validators.required, Validators.minLength(3)]],
    profesor: ["", Validators.required],
    categoria: ["APE" as Categoria, Validators.required],
  });

  abrirCrear(): void {
    this.editando.set(null);
    this.errorMsg.set("");
    this.form.reset({ nombre: "", profesor: "", categoria: "APE" });
    this.modalAbierto.set(true);
  }

  abrirEditar(curso: Curso): void {
    this.editando.set(curso);
    this.errorMsg.set("");
    this.form.reset({ nombre: curso.nombre, profesor: curso.profesor, categoria: curso.categoria });
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
        await this.cursoAdmin.actualizar(editando.id, valor);
      } else {
        await this.cursoAdmin.crear(valor);
      }
      this.modalAbierto.set(false);
    } catch {
      this.errorMsg.set("No se pudo guardar el curso. Intenta nuevamente.");
    } finally {
      this.guardando.set(false);
    }
  }

  /** Abre el modal de confirmación para eliminar. */
  pedirEliminar(curso: Curso): void {
    this.pendienteEliminar.set(curso);
  }

  cancelarEliminar(): void {
    if (this.eliminando()) return;
    this.pendienteEliminar.set(null);
  }

  async confirmarEliminar(): Promise<void> {
    const curso = this.pendienteEliminar();
    if (!curso) return;

    this.eliminando.set(true);
    try {
      await this.cursoAdmin.eliminar(curso.id);
      this.pendienteEliminar.set(null);
    } finally {
      this.eliminando.set(false);
    }
  }
}
