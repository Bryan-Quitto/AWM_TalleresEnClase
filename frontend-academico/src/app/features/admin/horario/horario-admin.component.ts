import { Component, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { HorarioAdminService } from "../../../core/services/horario-admin.service";
import { CursoAdminService } from "../../../core/services/curso-admin.service";
import { UsuarioAdminService } from "../../../core/services/usuario-admin.service";
import { ModalComponent } from "../../../shared/ui/modal.component";
import { ConfirmModalComponent } from "../../../shared/ui/confirm-modal.component";
import { Dia, HorarioRecord } from "../../../core/models/models";

/**
 * Validador de grupo: horaFin debe ser estrictamente mayor que horaInicio.
 * Si falla, deja el error `rangoHorario` en el propio FormGroup (no en un control específico)
 * para poder mostrarlo en el formulario.
 */
function rangoHorarioValido(group: AbstractControl): ValidationErrors | null {
  const inicio = group.get("horaInicio")?.value as string | undefined;
  const fin = group.get("horaFin")?.value as string | undefined;
  if (!inicio || !fin) return null;
  return fin > inicio ? null : { rangoHorario: true };
}

/** Validador de fecha: debe caer dentro del mes en curso (entre 1 y el último día del mes). */
function fechaDelMesValido(control: AbstractControl): ValidationErrors | null {
  const raw = control.value as number | null | undefined;
  if (raw === null || raw === undefined) return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 1) return { fechaInvalida: true };
  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  return v <= ultimoDia ? null : { fechaInvalida: true };
}

@Component({
  selector: "app-horario-admin",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent],
  templateUrl: "./horario-admin.component.html",
})
export class HorarioAdminComponent {
  protected readonly horarioAdmin = inject(HorarioAdminService);
  protected readonly cursoAdmin = inject(CursoAdminService);
  protected readonly usuarioAdmin = inject(UsuarioAdminService);
  private readonly fb = inject(FormBuilder);

  protected readonly modalAbierto = signal(false);
  protected readonly editando = signal<HorarioRecord | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorMsg = signal("");

  protected readonly diasDisponibles: Dia[] = ["LUN", "MAR", "MIE", "JUE", "VIE"];

  /** Estado del modal de confirmación de eliminación. */
  protected readonly pendienteEliminar = signal<HorarioRecord | null>(null);
  protected readonly eliminando = signal(false);

  protected readonly filas = computed(() => {
    const cursos = this.cursoAdmin.cursos.value() ?? [];
    const estudiantes = this.usuarioAdmin.estudiantes() ?? [];
    return (this.horarioAdmin.horario.value() ?? []).map((h) => ({
      registro: h,
      estudiante: estudiantes.find((e) => e.id === h.estudianteId)?.nombre ?? `#${h.estudianteId}`,
      curso: cursos.find((c) => c.id === h.cursoId)?.nombre ?? `#${h.cursoId}`,
    }));
  });

  protected readonly form = this.fb.nonNullable.group(
    {
      estudianteId: [0, [Validators.required, Validators.min(1)]],
      cursoId: [0, [Validators.required, Validators.min(1)]],
      dia: ["LUN" as Dia, Validators.required],
      fecha: [24, [Validators.required, fechaDelMesValido]],
      horaInicio: ["08:00", Validators.required],
      horaFin: ["10:00", Validators.required],
    },
    { validators: rangoHorarioValido }
  );

  abrirCrear(): void {
    this.editando.set(null);
    this.errorMsg.set("");
    this.form.reset({ estudianteId: 0, cursoId: 0, dia: "LUN", fecha: 24, horaInicio: "08:00", horaFin: "10:00" });
    this.modalAbierto.set(true);
  }

  abrirEditar(registro: HorarioRecord): void {
    this.editando.set(registro);
    this.errorMsg.set("");
    this.form.reset({ ...registro });
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
        await this.horarioAdmin.actualizar(editando.id, valor);
      } else {
        await this.horarioAdmin.crear(valor);
      }
      this.modalAbierto.set(false);
    } catch {
      this.errorMsg.set("No se pudo guardar la clase. Intenta nuevamente.");
    } finally {
      this.guardando.set(false);
    }
  }

  pedirEliminar(registro: HorarioRecord): void {
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
      await this.horarioAdmin.eliminar(registro.id);
      this.pendienteEliminar.set(null);
    } finally {
      this.eliminando.set(false);
    }
  }
}
