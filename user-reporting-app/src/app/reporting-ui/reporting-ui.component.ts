import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-reporting-ui',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styleUrl: './reporting-ui.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportingUiComponent {}
