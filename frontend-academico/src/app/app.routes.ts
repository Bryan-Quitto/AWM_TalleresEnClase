import { Routes } from "@angular/router";
import { LoginComponent } from "./features/login/login.component";
import { LayoutComponent } from "./shared/layout/layout.component";
import { authGuard } from "./core/guards/auth.guard";

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
      { path: "", redirectTo: "resumen", pathMatch: "full" },
    ],
  },
  { path: "**", redirectTo: "login" },
];
