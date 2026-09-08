import { Component, HostListener, OnDestroy, input, output } from "@angular/core";

@Component({
  selector: "app-modal",
  standalone: true,
  templateUrl: "./modal.component.html",
})
export class ModalComponent implements OnDestroy {
  readonly titulo = input.required<string>();
  readonly cerrar = output<void>();

  /** Guarda el `overflow` previo del body para restaurarlo al cerrar. */
  private readonly overflowPrevio: string;

  constructor() {
    if (typeof document !== "undefined") {
      this.overflowPrevio = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      this.overflowPrevio = "";
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== "undefined") {
      document.body.style.overflow = this.overflowPrevio;
    }
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.cerrar.emit();
  }

  onBackdropClick(): void {
    this.cerrar.emit();
  }
}