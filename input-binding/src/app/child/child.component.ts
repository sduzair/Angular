import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

@Component({
  selector: "app-child",
  imports: [],
  template: `
    <h3>{{ hero?.name }} says:</h3>
    <p>I, {{ hero?.name }}, am at your service, {{ masterName }}</p>
  `,
  styleUrl: "./child.component.css",
})
export class ChildComponent {
  @Input() masterName = "";
  @Input() hero: Hero | null = null;
}

export interface Hero {
  name: string;
}
