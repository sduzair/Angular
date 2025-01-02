import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";

@Component({
  selector: "app-child-output",
  imports: [],
  template: ` <div>
    <p>{{ name }}</p>
    <button (click)="vote(true)" [disabled]="hasCastedVote">Yes</button>
    <button (click)="vote(false)" [disabled]="hasCastedVote">No</button>
  </div>`,
  styleUrl: "./child-output.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildOutputComponent {
  @Input({ required: true }) name!: string;
  @Output()
  voted = new EventEmitter();
  hasCastedVote = false;

  vote(val: boolean) {
    this.hasCastedVote = true;
    this.voted.emit(val);
  }
}
