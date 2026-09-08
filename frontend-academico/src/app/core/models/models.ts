export type Rol = "estudiante" | "docente" | "admin";

export interface Usuario {
  id: number;
  nombre: string;
  iniciales: string;
  correo: string;
  rol: Rol;
  periodo: string;
}

/** Forma completa del recurso /usuarios, usada solo en el CRUD de administración. */
export interface UsuarioRecord extends Usuario {
  password: string;
}

/** Payload para crear/editar un usuario (password opcional al editar). */
export interface UsuarioFormValue {
  nombre: string;
  correo: string;
  password?: string;
  rol: Rol;
  periodo: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export type Categoria = "APE" | "Laboratorio";

/** Forma completa del recurso /cursos. */
export interface Curso {
  id: number;
  nombre: string;
  profesor: string;
  categoria: Categoria;
}

export type CursoFormValue = Omit<Curso, "id">;

/** Forma completa del recurso /calificaciones (para CRUD de administración). */
export interface CalificacionRecord {
  id: number;
  estudianteId: number;
  cursoId: number;
  nota: number;
}

export type CalificacionFormValue = Omit<CalificacionRecord, "id">;

/** Vista combinada (curso + profesor ya resueltos) que consume el estudiante. */
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

export type Dia = "LUN" | "MAR" | "MIE" | "JUE" | "VIE";

/** Forma completa del recurso /horario (para CRUD de administración). */
export interface HorarioRecord {
  id: number;
  estudianteId: number;
  cursoId: number;
  dia: Dia;
  fecha: number;
  horaInicio: string;
  horaFin: string;
}

export type HorarioFormValue = Omit<HorarioRecord, "id">;

/** Vista combinada que consume el estudiante. */
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
