import {
  ChangeDetectionStrategy,
  Component,
  Input,
  type OnDestroy,
  type OnInit,
} from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { HeroService } from "../hero.service";
import {
  debounceTime,
  distinctUntilChanged,
  Subject,
  takeUntil,
  tap,
} from "rxjs";

@Component({
  selector: "app-hero-bio",
  imports: [ReactiveFormsModule],
  template: ` <form [formGroup]="heroForm">
    <div style="display: none;">
      <label>Id:</label>
      <input type="text" formControlName="id" />
    </div>
    <div>
      <label>Name:</label>
      <input type="text" formControlName="name" />
    </div>
    <div>
      <label>Description:</label>
      <textarea
        formControlName="description"
        placeholder="Description"
      ></textarea>
    </div>
  </form>`,
  styleUrl: "./hero-bio.component.css",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HeroService],
})
export class HeroBioComponent implements OnInit, OnDestroy {
  @Input({ required: true })
  hero!: FormModel<typeof this.heroForm>;
  heroForm = new FormGroup({
    id: new FormControl({ value: "", disabled: true }, { nonNullable: true }),
    name: new FormControl("", { nonNullable: true }),
    description: new FormControl("", { nonNullable: true }),
  });
  private destroy$ = new Subject<void>();
  constructor(private heroService: HeroService) {}
  ngOnInit(): void {
    this.heroForm.setValue(this.hero);

    this.setupHeroFormListeners();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupHeroFormListeners(): void {
    this.heroForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, current) => {
          return (
            prev.name === current.name &&
            prev.description === current.description
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((values) => {
        if (!this.heroForm.valid) return;
        this.heroService.updateHero({
          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          id: this.heroForm.get("id")!.value,
          name: "",
          description: "",
          ...values,
        });
      });
  }
}

type FormModel<T extends FormGroup> = ReturnType<T["getRawValue"]>;
