import { Component, computed, inject, signal } from "@angular/core";
import { AcademicoService } from "../../core/services/academico.service";
import { HorarioItem } from "../../core/models/models";

interface DiaPill {
  abbr: string;
  fecha: number;
}

const ABBR: Record<number, string> = { 1: "LUN", 2: "MAR", 3: "MIE", 4: "JUE", 5: "VIE" };
const NOMBRES: Record<number, string> = { 1: "lunes", 2: "martes", 3: "miércoles", 4: "jueves", 5: "viernes" };

@Component({
  selector: "app-horario",
  standalone: true,
  templateUrl: "./horario.component.html",
})
export class HorarioComponent {
  protected readonly academico = inject(AcademicoService);

  /**
   * Pills fijas: los 5 días laborables. El número mostrado es el día del mes
   * de la semana actual. Como un horario académico es semanal y repetitivo,
   * no tiene sentido paginar entre semanas.
   */
  protected readonly dias: DiaPill[] = this.diasDeLaSemanaActual();

  /** Lunes y viernes de la semana actual, para el subtítulo del header. */
  protected readonly rangoSemana = this.rangoDeLaSemanaActual();

  /** Día seleccionado por defecto: el día de la semana de hoy. */
  readonly diaSeleccionado = signal(this.diaHoy());

  protected readonly clasesDelDia = computed(() => {
    const todas = this.academico.horario.value().horario ?? [];
    return [...todas.filter((h) => h.dia === this.diaSeleccionado())].sort((a, b) =>
      a.horaInicio.localeCompare(b.horaInicio)
    );
  });

  /**
   * "Próxima clase" para el subtítulo del día: la primera clase futura del
   * día seleccionado (o la última si todas las de hoy ya pasaron).
   */
  protected readonly proximaClaseDelDia = computed<HorarioItem | null>(() => {
    const clases = this.clasesDelDia();
    if (clases.length === 0) return null;
    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const aMinutos = (h: string) => {
      const [hh, mm] = h.split(":").map(Number);
      return hh * 60 + mm;
    };
    const futuras = clases.filter((c) => aMinutos(c.horaFin) > minutosAhora);
    return futuras[0] ?? clases[clases.length - 1];
  });

  nombreLargoDelDia(abbr: string): string {
    const inv = Object.fromEntries(Object.entries(ABBR).map(([k, v]) => [v, Number(k)]));
    return NOMBRES[inv[abbr]] ?? abbr;
  }

  claseCategoriaClase(categoria: string): string {
    return categoria === "APE" ? "text-accent-600" : "text-brand-700";
  }

  /**
   * Exporta el CSV del día seleccionado. Si no hay selección, exporta la
   * semana completa ordenada por día y hora.
   */
  exportarHorario(): void {
    const todas = this.academico.horario.value().horario ?? [];
    const seleccion = this.diaSeleccionado();
    const filas = todas
      .filter((h) => !seleccion || h.dia === seleccion)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

    const contenido = filas
      .map((h) => `${h.dia} ${h.horaInicio}-${h.horaFin};${h.curso};${h.profesor}`)
      .join("\n");
    const blob = new Blob([`Día Horario;Curso;Profesor\n${contenido}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mi-horario-${seleccion || "semana"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private diaHoy(): string {
    const dow = new Date().getDay(); // 0=Dom..6=Sáb
    return ABBR[dow] ?? "LUN";
  }

  private diasDeLaSemanaActual(): DiaPill[] {
    const hoy = new Date();
    // Lunes de esta semana (getDay(): 0=Dom, 1=Lun).
    const lunes = new Date(hoy);
    const diff = hoy.getDay() === 0 ? -6 : 1 - hoy.getDay();
    lunes.setDate(hoy.getDate() + diff);
    const resultado: DiaPill[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      resultado.push({ abbr: ABBR[d.getDay()], fecha: d.getDate() });
    }
    return resultado;
  }

  private rangoDeLaSemanaActual(): { desde: number; hasta: number } {
    const pills = this.dias;
    return { desde: pills[0].fecha, hasta: pills[pills.length - 1].fecha };
  }
}