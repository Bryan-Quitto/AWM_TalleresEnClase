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
import { Dia, HorarioRecord, HorarioFormValue } from "../../../core/models/models";

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

/** Validador de fecha: debe caer dentro del mes en curso y ser un día laborable (Lun–Vie). */
function fechaDelMesValido(control: AbstractControl): ValidationErrors | null {
  const raw = control.value as Date | null | undefined;
  if (raw === null || raw === undefined) return null;
  if (!(raw instanceof Date) || Number.isNaN(raw.getTime())) return { fechaInvalida: true };
  const hoy = new Date();
  const mismoMes =
    raw.getFullYear() === hoy.getFullYear() && raw.getMonth() === hoy.getMonth();
  if (!mismoMes) return { fechaInvalida: true };
  const dow = raw.getDay();
  if (dow === 0 || dow === 6) return { fechaFinDeSemana: true };
  return null;
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

  /** Orden estable de filas: por estudiante → día (LUN→VIE) → hora de inicio. */
  private readonly ORDEN_DIAS: Record<Dia, number> = { LUN: 0, MAR: 1, MIE: 2, JUE: 3, VIE: 4 };

  /** Estado del modal de confirmación de eliminación. */
  protected readonly pendienteEliminar = signal<HorarioRecord | null>(null);
  protected readonly eliminando = signal(false);

  protected readonly filas = computed(() => {
    const cursos = this.cursoAdmin.cursos.value() ?? [];
    const estudiantes = this.usuarioAdmin.estudiantes() ?? [];
    const lista = (this.horarioAdmin.horario.value() ?? []).map((h) => ({
      registro: h,
      estudiante: estudiantes.find((e) => e.id === h.estudianteId)?.nombre ?? `#${h.estudianteId}`,
      curso: cursos.find((c) => c.id === h.cursoId)?.nombre ?? `#${h.cursoId}`,
    }));
    return [...lista].sort((a, b) => {
      const ea = estudiantes.find((e) => e.id === a.registro.estudianteId)?.nombre ?? "";
      const eb = estudiantes.find((e) => e.id === b.registro.estudianteId)?.nombre ?? "";
      if (ea !== eb) return ea.localeCompare(eb);
      const dia = this.ORDEN_DIAS[a.registro.dia] - this.ORDEN_DIAS[b.registro.dia];
      if (dia !== 0) return dia;
      return a.registro.horaInicio.localeCompare(b.registro.horaInicio);
    });
  });

  protected readonly form = this.fb.nonNullable.group(
    {
      estudianteId: [0, [Validators.required, Validators.min(1)]],
      cursoId: [0, [Validators.required, Validators.min(1)]],
      dia: ["LUN" as Dia, Validators.required],
      fecha: [null as Date | null, [Validators.required, fechaDelMesValido]],
      horaInicio: ["08:00", Validators.required],
      horaFin: ["10:00", Validators.required],
    },
    { validators: rangoHorarioValido }
  );

  abrirCrear(): void {
    this.editando.set(null);
    this.errorMsg.set("");
    // Por defecto: próximo día laborable en horario laboral.
    const hoy = new Date();
    const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    this.form.reset({
      estudianteId: 0,
      cursoId: 0,
      dia: "LUN",
      fecha: manana,
      horaInicio: "08:00",
      horaFin: "10:00",
    });
    this.modalAbierto.set(true);
  }

  abrirEditar(registro: HorarioRecord): void {
    this.editando.set(registro);
    this.errorMsg.set("");
    const hoy = new Date();
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), registro.fecha);
    this.form.reset({
      estudianteId: registro.estudianteId,
      cursoId: registro.cursoId,
      dia: registro.dia,
      fecha,
      horaInicio: registro.horaInicio,
      horaFin: registro.horaFin,
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

    const raw = this.form.getRawValue();
    const fecha: Date = raw.fecha as Date;
    const dia = raw.dia as Dia;

    // Validación de choque: mismo estudiante + mismo día + solapamiento de rango horario.
    const editandoId = this.editando()?.id;
    const chocan = (this.horarioAdmin.horario.value() ?? []).some((h) => {
      if (h.id === editandoId) return false;
      if (h.estudianteId !== raw.estudianteId) return false;
      if (h.dia !== dia) return false;
      return !(raw.horaFin <= h.horaInicio || raw.horaInicio >= h.horaFin);
    });
    if (chocan) {
      this.errorMsg.set("El estudiante ya tiene una clase que se solapa en ese horario.");
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set("");

    const valor: HorarioFormValue = {
      estudianteId: raw.estudianteId,
      cursoId: raw.cursoId,
      dia,
      fecha: fecha.getDate(),
      horaInicio: raw.horaInicio,
      horaFin: raw.horaFin,
    };

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
