import { Component, inject, signal, DestroyRef } from "@angular/core";
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from "@angular/router";
import { filter, map, startWith } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
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
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // En móvil, si la navegación la dispara código (no un click), también cerramos el menú.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.menuAbierto.set(false));
  }

  // Estado del menú en móviles
  menuAbierto = signal(false);

  // Estado de los acordeones del sidebar (persistido en localStorage por sección).
  readonly seccionMiEspacioAbierta = signal(this.leerBool("sidebar_miEspacio", true));
  readonly seccionAdminAbierta = signal(this.leerBool("sidebar_admin", true));

  private leerBool(key: string, defecto: boolean): boolean {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? defecto : raw === "true";
    } catch {
      return defecto;
    }
  }

  private guardarBool(key: string, valor: boolean): void {
    try {
      localStorage.setItem(key, String(valor));
    } catch {
      /* sin localStorage (modo privado, SSR) → ignorar */
    }
  }

  toggleMenu() {
    this.menuAbierto.update(v => !v);
  }

  cerrarMenu() {
    this.menuAbierto.set(false);
  }

  toggleSeccionMiEspacio(): void {
    this.seccionMiEspacioAbierta.update((v) => {
      const nv = !v;
      this.guardarBool("sidebar_miEspacio", nv);
      return nv;
    });
  }

  toggleSeccionAdmin(): void {
    this.seccionAdminAbierta.update((v) => {
      const nv = !v;
      this.guardarBool("sidebar_admin", nv);
      return nv;
    });
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
