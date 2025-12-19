import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UserRole } from '../../auth.service';

@Component({
  selector: 'app-role-dialog',
  imports: [MatDialogModule, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="mb-0">Select Access Level</h2>
    <mat-dialog-content>
      <p class="text-center text-muted mb-4">
        Please select a user profile to simulate authentication.
      </p>

      <div class="row justify-content-center g-4">
        <!-- Analyst Option -->
        <div class="col-6 d-flex">
          <mat-card
            class="role-card w-100 text-center cursor-pointer"
            matRipple
            (click)="selectRole(analystUser, 'Analyst')">
            <mat-card-content class="p-4 d-flex flex-column h-100">
              <mat-icon class="role-icon mb-3 mx-auto">fact_check</mat-icon>
              <h3 class="mb-1 fw-medium">Analyst</h3>
              <small class="role-username fw-bold mb-2">{{
                analystUser
              }}</small>
              <p class="text-muted mb-0 mt-auto small">
                Performs transaction data validation to maintain completeness
                and reporting readiness.
              </p>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Admin Option -->
        <div class="col-6 d-flex">
          <mat-card
            class="role-card admin-card w-100 text-center cursor-pointer"
            matRipple
            (click)="selectRole(adminUser, 'Admin')">
            <mat-card-content class="p-4 d-flex flex-column h-100">
              <mat-icon class="role-icon mb-3 mx-auto"
                >admin_panel_settings</mat-icon
              >
              <h3 class="mb-1 fw-medium">Admin</h3>
              <small class="role-username fw-bold mb-2">{{ adminUser }}</small>
              <p class="text-muted mb-0 mt-auto small">
                Performs privileged case administration actions and compliance
                audits.
              </p>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </mat-dialog-content>
  `,
  styleUrl: './role-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleDialogComponent {
  private dialogRef = inject(MatDialogRef<RoleDialogComponent>);
  readonly analystUser = 'John Doe';
  readonly adminUser = 'Alice Cooper';

  selectRole(username: string, role: UserRole) {
    this.dialogRef.close({ username, role });
  }
}
