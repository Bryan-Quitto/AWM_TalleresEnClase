import { Component, computed, inject } from "@angular/core";
import { AcademicoService } from "../../core/services/academico.service";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-resumen",
  standalone: true,
  templateUrl: "./resumen.component.html",
})
export class ResumenComponent {
  protected readonly academico = inject(AcademicoService);
  protected readonly auth = inject(AuthService);

  protected readonly proximaClase = computed(() => this.academico.horario.value().horario?.[0] ?? null);
  protected readonly totalCursos = computed(() => this.academico.calificaciones.value().calificaciones.length);
}
