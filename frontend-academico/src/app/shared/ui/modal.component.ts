import { Component, input, output } from "@angular/core";

@Component({
  selector: "app-modal",
  standalone: true,
  templateUrl: "./modal.component.html",
})
export class ModalComponent {
  readonly titulo = input.required<string>();
  readonly cerrar = output<void>();

  onBackdropClick(): void {
    this.cerrar.emit();
  }
}
