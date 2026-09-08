import { Component, input, output } from "@angular/core";
import { ModalComponent } from "./modal.component";

export type ConfirmVariant = "danger" | "info";

@Component({
  selector: "app-confirm-modal",
  standalone: true,
  imports: [ModalComponent],
  templateUrl: "./confirm-modal.component.html",
})
export class ConfirmModalComponent {
  readonly titulo = input.required<string>();
  readonly mensaje = input.required<string>();
  readonly textoConfirmar = input<string>("Confirmar");
  readonly textoCancelar = input<string>("Cancelar");
  readonly variant = input<ConfirmVariant>("danger");

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  onConfirmar(): void {
    this.confirmar.emit();
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}
