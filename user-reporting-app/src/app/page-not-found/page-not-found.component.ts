import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  imports: [MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="not-found-container">
      <mat-card>
        <mat-card-header>
          <mat-icon color="warn" aria-hidden="false" aria-label="Warning"
            >warning</mat-icon
          >
          <mat-card-title>Error 404: Page Not Found</mat-card-title>
        </mat-card-header>
        <mat-card-content></mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: './page-not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-page-not-found',
})
export class PageNotFoundComponent {}
