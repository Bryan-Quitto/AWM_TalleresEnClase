import { Component, computed, inject, signal, DestroyRef } from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
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

/** Devuelve la abreviatura del día de la semana (LUN..VIE) a partir de un string YYYY-MM-DD. */
function abbrDeFechaString(fechaStr: string): Dia | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaStr);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dow = new Date(y, mo - 1, d).getDay();
  const map: Dia[] = ["LUN", "MAR", "MIE", "JUE", "VIE"];
  return dow >= 1 && dow <= 5 ? map[dow - 1] : null;
}

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

/**
 * Validador de fecha: la recibimos como string `YYYY-MM-DD` (lo que emite
 * `<input type="date">`). Sólo exigimos que sea un día laborable (Lun–Vie).
 *
 * Importante: NO usamos `new Date(...)` aquí porque introduce ambigüedad
 * de zona horaria — `new Date('2026-09-09')` se interpreta como UTC y,
 * en navegadores al oeste de Greenwich, se "corre" un día, haciendo que
 * una fecha válida falle la validación. Trabajamos directamente con el
 * string para evitar ese problema.
 */
function fechaDelMesValido(control: AbstractControl): ValidationErrors | null {
  const raw = control.value as string | null | undefined;
  if (!raw) return null;
  // Aceptamos sólo el formato exacto que produce <input type="date">.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { fechaInvalida: true };
  const [y, m, d] = raw.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // armado en local, sólo para getDay()
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
  private readonly destroyRef = inject(DestroyRef);

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
      /** Fecha como string `YYYY-MM-DD` (formato de `<input type="date">`). */
      fecha: ["", [Validators.required, fechaDelMesValido]],
      horaInicio: ["08:00", Validators.required],
      horaFin: ["10:00", Validators.required],
    },
    { validators: rangoHorarioValido }
  );

  /** Stream de cambios de la fecha → abreviatura del día. */
  private readonly fechaValueChanges = toSignal(
    this.form.controls.fecha.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)),
    { initialValue: this.form.controls.fecha.value }
  );

  /**
   * Día de la semana derivado de la fecha del form (LUN..VIE o null si no
   * aplica). Es el único día posible para la clase — el usuario no lo elige,
   * se calcula automáticamente desde la fecha que introduce.
   */
  protected readonly diaCalculado = computed<Dia | null>(
    () => abbrDeFechaString(this.fechaValueChanges() ?? "")
  );

  /**
   * Convierte un día del mes (1–31) en string `YYYY-MM-DD` usando el mes/año
   * actuales — sin pasar por `new Date(...)` para evitar corrimientos de TZ.
   */
  private fechaPorDiaDelMes(dia: number): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    const d = String(dia).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /** Genera el string YYYY-MM-DD del próximo día laborable (incluye hoy si es laboral). */
  private proximoDiaLaborable(): string {
    const hoy = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) return this.fechaPorDiaDelMes(d.getDate());
    }
    return this.fechaPorDiaDelMes(hoy.getDate());
  }

  abrirCrear(): void {
    this.editando.set(null);
    this.errorMsg.set("");
    this.form.reset({
      estudianteId: 0,
      cursoId: 0,
      fecha: this.proximoDiaLaborable(),
      horaInicio: "08:00",
      horaFin: "10:00",
    });
    this.modalAbierto.set(true);
  }

  abrirEditar(registro: HorarioRecord): void {
    this.editando.set(registro);
    this.errorMsg.set("");
    this.form.reset({
      estudianteId: registro.estudianteId,
      cursoId: registro.cursoId,
      fecha: this.fechaPorDiaDelMes(registro.fecha),
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
    const fechaStr = raw.fecha as string;
    const d = Number(fechaStr.split("-")[2]);
    const dia = this.diaCalculado();
    if (!dia) {
      this.errorMsg.set("La fecha seleccionada no corresponde a un día laborable.");
      return;
    }

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
      fecha: d,
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
