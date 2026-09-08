import { Routes } from "@angular/router";
import { LoginComponent } from "./features/login/login.component";
import { LayoutComponent } from "./shared/layout/layout.component";
import { authGuard } from "./core/guards/auth.guard";
import { roleGuard } from "./core/guards/role.guard";
import { adminOnlyGuard } from "./core/guards/admin-only.guard";

export const routes: Routes = [
  { path: "login", component: LoginComponent },
  {
    path: "",
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: "resumen",
        loadComponent: () => import("./features/resumen/resumen.component").then((m) => m.ResumenComponent),
        data: { breadcrumb: "Resumen", title: "Resumen" },
      },
      {
        path: "notas",
        loadComponent: () => import("./features/notas/notas.component").then((m) => m.NotasComponent),
        data: { breadcrumb: "Mis Notas", title: "Mis Notas" },
      },
      {
        path: "horario",
        loadComponent: () => import("./features/horario/horario.component").then((m) => m.HorarioComponent),
        data: { breadcrumb: "Horario", title: "Mi Horario" },
      },
      {
        path: "admin/cursos",
        canActivate: [roleGuard],
        loadComponent: () =>
          import("./features/admin/cursos/cursos-admin.component").then((m) => m.CursosAdminComponent),
        data: { breadcrumb: "Administración / Cursos", title: "Cursos" },
      },
      {
        path: "admin/usuarios",
        canActivate: [adminOnlyGuard],
        loadComponent: () =>
          import("./features/admin/usuarios/usuarios-admin.component").then((m) => m.UsuariosAdminComponent),
        data: { breadcrumb: "Administración / Usuarios", title: "Usuarios" },
      },
      {
        path: "admin/notas",
        canActivate: [roleGuard],
        loadComponent: () =>
          import("./features/admin/notas/notas-admin.component").then((m) => m.NotasAdminComponent),
        data: { breadcrumb: "Administración / Calificaciones", title: "Calificaciones" },
      },
      {
        path: "admin/horarios",
        canActivate: [roleGuard],
        loadComponent: () =>
          import("./features/admin/horario/horario-admin.component").then((m) => m.HorarioAdminComponent),
        data: { breadcrumb: "Administración / Horarios", title: "Horarios" },
      },
      { path: "", redirectTo: "resumen", pathMatch: "full" },
    ],
  },
  { path: "**", redirectTo: "login" },
];
