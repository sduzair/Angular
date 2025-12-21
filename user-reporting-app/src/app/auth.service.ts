import { computed, inject, Injectable, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TEST_USER_ADMIN } from './auth.fixture';

export type UserRole = 'Analyst' | 'Admin';

export interface UserPrincipal {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // note: null = not logged in
  private _currentUser = signal<UserPrincipal | null>(TEST_USER_ADMIN);
  readonly currentUser = this._currentUser.asReadonly();

  readonly currentRole = computed(() => this._currentUser()?.role ?? null);

  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isAdmin = computed(() => this._currentUser()?.role === 'Admin');
  readonly isAnalyst = computed(() => this._currentUser()?.role === 'Analyst');

  login(username: string, role: UserRole) {
    const user: UserPrincipal = {
      id: crypto.randomUUID(),
      username,
      role,
      email: `${username.toLowerCase().split(' ').join('')}@example.com`,
    };

    this._currentUser.set(user);
    console.info(`[AuthService] Logged in as ${user.username} (${user.role})`);
  }

  logout() {
    this._currentUser.set(null);
    console.info('[AuthService] Logged out');
  }
}

export const isAuthenticatedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const hasRoleGuard = (requiredRole: UserRole): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.currentRole() === requiredRole) {
      return true;
    }

    alert(`Access Denied: Requires ${requiredRole} role.`);
    return router.createUrlTree(['/transactionsearch']);
  };
};
