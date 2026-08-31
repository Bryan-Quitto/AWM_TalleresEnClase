import { Component, computed, inject, signal } from "@angular/core";
import { AcademicoService } from "../../core/services/academico.service";

interface DiaPill {
  abbr: string;
  fecha: number;
}

@Component({
  selector: "app-horario",
  standalone: true,
  templateUrl: "./horario.component.html",
})
export class HorarioComponent {
  protected readonly academico = inject(AcademicoService);

  protected readonly dias: DiaPill[] = [
    { abbr: "LUN", fecha: 24 },
    { abbr: "MAR", fecha: 25 },
    { abbr: "MIE", fecha: 26 },
    { abbr: "JUE", fecha: 27 },
    { abbr: "VIE", fecha: 28 },
  ];

  readonly diaSeleccionado = signal("MAR");

  readonly clasesDelDia = computed(() =>
    (this.academico.horario.value().horario ?? []).filter((h) => h.dia === this.diaSeleccionado())
  );

  seleccionarDia(abbr: string): void {
    this.diaSeleccionado.set(abbr);
  }

  claseCategoriaClase(categoria: string): string {
    return categoria === "APE" ? "text-accent-600" : "text-brand-700";
  }

  exportarHorario(): void {
    const filas = this.academico.horario.value().horario ?? [];
    const contenido = filas
      .map((h) => `${h.dia} ${h.horaInicio}-${h.horaFin};${h.curso};${h.profesor}`)
      .join("\n");
    const blob = new Blob([`Día Horario;Curso;Profesor\n${contenido}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi-horario.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
}
