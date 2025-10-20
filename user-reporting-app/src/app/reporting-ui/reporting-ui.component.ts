import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MatIcon } from "@angular/material/icon";
import { MatToolbarModule } from "@angular/material/toolbar";
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterOutlet,
  RouterStateSnapshot,
} from "@angular/router";
import { SessionDataService, SessionStateLocal } from "../session-data.service";
import { MatChip } from "@angular/material/chips";
import { MatProgressSpinner } from "@angular/material/progress-spinner";

@Component({
  selector: "app-reporting-ui",
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatChip,
    MatProgressSpinner,
    MatIcon,
  ],
  template: `
    <div class="container-fluid px-0 my-1">
      <div class="row row-cols-1 mx-0">
        <mat-toolbar class="col">
          <mat-toolbar-row class="px-0 header-toolbar-row">
            <h1>Reporting UI</h1>
            <div class="flex-fill"></div>
            <mat-chip
              *ngIf="sessionDataService.sessionStateValue.lastUpdated"
              selected="true"
              class="last-updated-chip"
            >
              <ng-container
                *ngIf="sessionDataService.saving$ | async; else updateIcon"
              >
                <mat-progress-spinner
                  diameter="20"
                  mode="indeterminate"
                  class="last-updated-chip-spinner"
                ></mat-progress-spinner>
              </ng-container>
              <ng-template #updateIcon>
                <mat-icon class="mat-accent last-updated-chip-spinner"
                  >update</mat-icon
                >
              </ng-template>
              Last Updated:
              {{
                sessionDataService.sessionStateValue.lastUpdated
                  | date : "short"
              }}
            </mat-chip>
          </mat-toolbar-row>
        </mat-toolbar>
        <div class="col"><router-outlet /></div>
      </div>
    </div>
  `,
  styleUrl: "./reporting-ui.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportingUiComponent {
  sessionDataService = inject(SessionDataService);
}
