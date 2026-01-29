import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService, UserRole } from '../auth.service';
import { RoleDialogComponent } from './role-dialog/role-dialog.component';

@Component({
  selector: 'app-login',
  imports: [MatButtonModule],
  template: ``,
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.openAuthDialog();
  }

  openAuthDialog() {
    const dialogRef = this.dialog.open<
      RoleDialogComponent,
      void,
      { username: string; role: UserRole }
    >(RoleDialogComponent, {
      disableClose: true,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
      .subscribe((res) => {
        const { username, role } = res!;

        this.authService.login(username, role);

        this.router.navigate(['/transactionsearch']);
      });
  }
}
