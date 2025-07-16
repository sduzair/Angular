import { Component } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: "app-single-tab-guard",
  imports: [MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="single-tab-guard-container">
      <mat-card>
        <mat-card-header>
          <mat-icon color="warn" aria-hidden="false" aria-label="Warning">warning</mat-icon>
          <mat-card-title>Page Already Open</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>
            This page <i>{{page}}</i> is already open in another tab or window.<br>
            To prevent data conflicts or accidental overwrites, only one tab can access this page at a time.
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: "./single-tab-guard.component.scss",
})
export class SingleTabGuardComponent {
  page = "";
  constructor(private route: ActivatedRoute) {
    this.route.queryParams.subscribe((params) => {
      this.page = params["page"];
    });
  }
}
