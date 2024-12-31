import { CommonModule } from "@angular/common";
import {
  Component,
  Input,
  type OnChanges,
  type SimpleChanges,
} from "@angular/core";

@Component({
  selector: "app-child",
  imports: [CommonModule],
  template: `<h3>Version {{ major }}.{{ minor }}</h3>
    <ul>
      <li *ngFor="let log of changeLog">{{ log }}</li>
    </ul>`,
  styleUrl: "./child.component.css",
})
export class ChildComponent implements OnChanges {
  @Input({ required: true })
  major!: number;
  @Input({ required: true })
  minor!: number;
  changeLog: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    for (const prop in changes) {
      if (changes[prop]?.isFirstChange()) {
        this.changeLog.push(`Init major to ${changes[prop].currentValue}`);
        continue;
      }
      this.changeLog.push(
        `Prop ${prop} changed from ${changes[prop].previousValue} to ${changes[prop].currentValue}`
      );
    }
  }
}
