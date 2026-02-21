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
        <div class="col-4 d-flex">
          <mat-card
            class="role-card w-100 text-center cursor-pointer"
            matRipple
            (click)="selectRole(analystUser, 'Analyst')">
            <mat-card-content class="p-4 d-flex flex-column h-100">
              <mat-icon class="role-icon mb-3 mx-auto">fact_check</mat-icon>
              <span matCardTitle class="mb-1">Analyst</span>
              <span matCardSubtitle class="mb-2">{{ analystUser }}</span>
              <p class="mb-0 mt-auto">
                Performs transaction data validation to maintain completeness
                and reporting readiness.
              </p>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Investigator Option -->
        <div class="col-4 d-flex">
          <mat-card
            class="role-card w-100 text-center cursor-pointer"
            matRipple
            (click)="selectRole(invUser, 'Inv')">
            <mat-card-content class="p-4 d-flex flex-column h-100">
              <mat-icon class="role-icon inv-icon mb-3 mx-auto"
                >manage_search</mat-icon
              >
              <span matCardTitle class="mb-1">Investigator</span>
              <span matCardSubtitle class="mb-2">
                {{ invUser }}
              </span>
              <p class="mb-0 mt-auto">
                Reviews and updates case records, manages transaction
                selections, and drives AML investigations to resolution.
              </p>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Admin Option -->
        <div class="col-4 d-flex">
          <mat-card
            class="role-card w-100 text-center cursor-pointer"
            matRipple
            (click)="selectRole(adminUser, 'Admin')">
            <mat-card-content class="p-4 d-flex flex-column h-100">
              <mat-icon class="role-icon admin-icon mb-3 mx-auto">
                admin_panel_settings
              </mat-icon>
              <span matCardTitle class="mb-1">Admin</span>
              <span matCardSubtitle class="mb-2">
                {{ adminUser }}
              </span>
              <p class="mb-0 mt-auto">
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
  readonly adminUser = 'Alice Cooper';
  readonly invUser = 'Jane Smith';
  readonly analystUser = 'John Doe';

  selectRole(username: string, role: UserRole) {
    this.dialogRef.close({ username, role });
  }
}
