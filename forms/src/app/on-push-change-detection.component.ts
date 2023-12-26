import { ChangeDetectionStrategy, Component } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  standalone: true,
  selector: 'on-push-change-detection',
  template: `
    <input type="text" [(ngModel)]="name" />
    {{ name }}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule]
})
export class OnPushChangeDetectionComponent {
  name = '';
}