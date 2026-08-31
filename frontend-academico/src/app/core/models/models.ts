export interface Usuario {
  id: number;
  nombre: string;
  iniciales: string;
  correo: string;
  rol: "estudiante" | "docente" | "admin";
  periodo: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface CalificacionItem {
  curso: string;
  profesor: string;
  nota: number;
}

export interface CalificacionesResponse {
  estudianteId: number;
  promedio: number;
  calificaciones: CalificacionItem[];
}

export interface HorarioItem {
  dia: string;
  fecha: number;
  horaInicio: string;
  horaFin: string;
  curso: string;
  profesor: string;
  categoria: string;
}

export interface HorarioResponse {
  estudianteId: number;
  horario: HorarioItem[];
}
