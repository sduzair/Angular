import {
  DestroyRef,
  Directive,
  inject,
  Input,
  OnInit,
  Optional,
} from "@angular/core";
import {
  NgControl,
  FormGroupDirective,
  ControlContainer,
  FormArray,
} from "@angular/forms";
import { startWith } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Directive({
  selector: "[appControlToggle]",
})
export class ControlToggleDirective implements OnInit {
  @Input("appControlToggle") controlNameToWatch!: string;
  @Input({ required: false }) appControlToggleValue?: any;

  constructor(
    private formGroupDirective: FormGroupDirective,
    private controlContainer: ControlContainer,
    @Optional() private ngControl?: NgControl,
  ) {}

  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    const controlToWatch = this.formGroupDirective.form.get(
      this.controlNameToWatch,
    );
    let controlToToggle = this.ngControl?.control;
    if (!controlToToggle) {
      controlToToggle = this.controlContainer.control;
    }

    if (!controlToWatch || !controlToToggle) {
      console.warn(
        "ControlToggleDirective: controls not found in the form group",
      );
      return;
    }

    // Subscribe to value changes of the control to watch
    controlToWatch.valueChanges
      .pipe(
        startWith(controlToWatch.value),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        if (
          this.appControlToggleValue != null &&
          value === this.appControlToggleValue
        ) {
          controlToToggle.enable({ emitEvent: false });
        } else if (this.appControlToggleValue == null && value) {
          controlToToggle.enable({ emitEvent: false });
        } else if (controlToToggle instanceof FormArray) {
          controlToToggle.clear();
          controlToToggle.disable({ emitEvent: false });
        } else {
          controlToToggle.reset();
          controlToToggle.disable({ emitEvent: false });
        }
      });
  }
}
