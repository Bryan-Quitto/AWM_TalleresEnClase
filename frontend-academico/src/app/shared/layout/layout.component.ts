import { Component, inject, signal } from "@angular/core";
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from "@angular/router";
import { filter, map, startWith } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import { AuthService } from "../../core/services/auth.service";

interface RouteHeaderData {
  breadcrumb: string;
  title: string;
}

@Component({
  selector: "app-layout",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: "./layout.component.html",
})
export class LayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Estado del menú en móviles
  menuAbierto = signal(false);

  toggleMenu() {
    this.menuAbierto.update(v => !v);
  }

  cerrarMenu() {
    this.menuAbierto.set(false);
  }

  /**
   * Lee { breadcrumb, title } de la ruta hija activa para el header.
   *
   * Importante: caminamos por el árbol de SNAPSHOTS (`routerState.snapshot.root`),
   * no por el árbol "vivo" de ActivatedRoute (`ActivatedRoute.firstChild`).
   * Mezclar ambos (caminar por el vivo y al final leer `.snapshot`) puede
   * fallar justo durante una navegación, porque el nodo `firstChild` vivo
   * puede quedar momentáneamente sin snapshot mientras el router reorganiza
   * el árbol. Empezando ya en modo snapshot, cada nodo trae `.data` directo
   * y no hay ninguna ventana de inconsistencia.
   */
  protected readonly header = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map((): RouteHeaderData => {
        let snapshot = this.router.routerState.snapshot.root;
        while (snapshot.firstChild) snapshot = snapshot.firstChild;
        const data = snapshot.data as Partial<RouteHeaderData>;
        return {
          breadcrumb: data.breadcrumb ?? "",
          title: data.title ?? "",
        };
      })
    ),
    { initialValue: { breadcrumb: "", title: "" } }
  );

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
