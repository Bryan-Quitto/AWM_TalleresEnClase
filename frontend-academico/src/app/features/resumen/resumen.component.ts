import { Component, computed, inject } from "@angular/core";
import { AcademicoService } from "../../core/services/academico.service";
import { AuthService } from "../../core/services/auth.service";
import { HorarioItem } from "../../core/models/models";

const ORDEN_DIAS: Record<string, number> = { LUN: 0, MAR: 1, MIE: 2, JUE: 3, VIE: 4 };

@Component({
  selector: "app-resumen",
  standalone: true,
  templateUrl: "./resumen.component.html",
})
export class ResumenComponent {
  protected readonly academico = inject(AcademicoService);
  protected readonly auth = inject(AuthService);

  protected readonly totalCursos = computed(() => this.academico.calificaciones.value().calificaciones.length);

  /**
   * Próxima clase real: la primera del día actual/posterior que aún no haya
   * terminado (o la siguiente del día siguiente si todas las de hoy ya pasaron).
   */
  protected readonly proximaClase = computed<HorarioItem | null>(() => {
    const clases = this.academico.horario.value().horario ?? [];
    if (clases.length === 0) return null;

    const ahora = new Date();
    const dowHoy = ahora.getDay(); // 0=Dom, 1=Lun, ... 6=Sáb
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const aMinutos = (h: string) => {
      const [hh, mm] = h.split(":").map(Number);
      return hh * 60 + mm;
    };

    const clasesPorDia = clases.reduce<Record<string, HorarioItem[]>>((acc, c) => {
      (acc[c.dia] ??= []).push(c);
      return acc;
    }, {});
    for (const lista of Object.values(clasesPorDia)) {
      lista.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    }

    const nombresDias = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
    // Empezamos a buscar desde hoy; si dow es fin de semana, saltamos a LUN.
    let idx = nombresDias.indexOf(nombresDias[dowHoy]);
    for (let i = 0; i < 7; i++) {
      const candidato = nombresDias[(idx + i) % 7];
      const orden = ORDEN_DIAS[candidato];
      // Sólo días laborables en nuestra BD; si la BD trae SAB/DOM los ignoramos.
      if (orden === undefined) continue;
      const lista = clasesPorDia[candidato];
      if (!lista || lista.length === 0) continue;
      // El mismo día: la primera futura. Otro día: la primera.
      if (i === 0) {
        const futuras = lista.filter((c) => aMinutos(c.horaFin) > minutosAhora);
        if (futuras[0]) return futuras[0];
      } else {
        return lista[0];
      }
    }
    return null;
  });
}