import { Component, computed, inject } from "@angular/core";
import { AcademicoService } from "../../core/services/academico.service";

@Component({
  selector: "app-notas",
  standalone: true,
  templateUrl: "./notas.component.html",
})
export class NotasComponent {
  protected readonly academico = inject(AcademicoService);

  protected readonly estadisticas = computed(() => {
    const notas = this.academico.calificaciones.value()?.calificaciones || [];
    const total = notas.length;
    const aprobadas = notas.filter((n: any) => n.nota >= 7).length;
    return { total, aprobadas };
  });
}
