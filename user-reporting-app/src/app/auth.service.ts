import { computed, inject, Injectable, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export interface UserPrincipal {
  id: string;
  username: string;
  role: keyof typeof ROLE_ENUM;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // private readonly _currentUser = signal<UserPrincipal | null>(TEST_USER_ADMIN);
  private readonly _currentUser = signal<UserPrincipal | null>(null);

  // private readonly _accessToken = signal<string | null>(
  //   TEST_USER_ADMIN ? ROLE_TOKEN_MAP[ROLE_ENUM.Admin] : null,
  // );
  private readonly _accessToken = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();

  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly currentRole = computed(() => this._currentUser()?.role ?? null);
  readonly isAdmin = computed(() => this._currentUser()?.role === 'Admin');
  readonly isAnalyst = computed(() => this._currentUser()?.role === 'Analyst');
  readonly isInvestigator = computed(() => this._currentUser()?.role === 'Inv');

  login(username: string, role: keyof typeof ROLE_ENUM): void {
    const user: UserPrincipal = {
      id: crypto.randomUUID(),
      username,
      role,
      email: `${username.toLowerCase().replaceAll(' ', '')}@example.com`,
    };

    this._currentUser.set(user);
    this._accessToken.set(ROLE_TOKEN_MAP[ROLE_ENUM[role]]);

    console.info(`[AuthService] Logged in as ${user.username} (${user.role})`);
  }

  logout(): void {
    this._currentUser.set(null);
    this._accessToken.set(null);

    console.info('[AuthService] Logged out');
  }
}

export const isAuthenticatedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isAuthenticated() || router.createUrlTree(['/login']);
};

export const hasRoleGuard = (
  requiredRole: keyof typeof ROLE_ENUM,
): CanActivateFn => {
  return (_route, _state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.currentRole() === requiredRole) {
      return true;
    }

    alert(`Access Denied: Requires ${requiredRole} role.`);
    return router.createUrlTree(['/transactionsearch']);
  };
};

const ROLE_TOKEN_MAP = {
  0: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6ImFuYWx5c3QtdXNlciIsInN1YiI6ImFuYWx5c3QtdXNlciIsImp0aSI6ImYwZDgzNTdkIiwicm9sZSI6ImFuYWx5c3QiLCJhdWQiOlsiaHR0cDovL2xvY2FsaG9zdDo0MzA4IiwiaHR0cHM6Ly9sb2NhbGhvc3Q6NDQzNzQiLCJodHRwOi8vbG9jYWxob3N0OjUxMTAiLCJodHRwczovL2xvY2FsaG9zdDo3MDk1Il0sIm5iZiI6MTc3MTU0OTQxNSwiZXhwIjo0MTAyMzU4NDAwLCJpYXQiOjE3NzE1NDk0MTYsImlzcyI6ImRvdG5ldC11c2VyLWp3dHMifQ.ybVapTE3-KqI6oCV7RgDrPxYgeU3Wvl5Ec5j-LFMT5U',
  1: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6IkphbmUgU21pdGgiLCJzdWIiOiJKYW5lIFNtaXRoIiwianRpIjoiNzZkNjkzZjciLCJyb2xlIjoiaW52IiwiYXVkIjpbImh0dHA6Ly9sb2NhbGhvc3Q6NDMwOCIsImh0dHBzOi8vbG9jYWxob3N0OjQ0Mzc0IiwiaHR0cDovL2xvY2FsaG9zdDo1MTEwIiwiaHR0cHM6Ly9sb2NhbGhvc3Q6NzA5NSJdLCJuYmYiOjE3NzE1ODE2NTUsImV4cCI6NDEwMjM1ODQwMCwiaWF0IjoxNzcxNTgxNjU2LCJpc3MiOiJkb3RuZXQtdXNlci1qd3RzIn0.v16ifBaOu6ND66p9c-bcQLZs_AlHTGBE3VBV7Yy4ecw',
  2: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6IkFsaWNlIENvb3BlciIsInN1YiI6IkFsaWNlIENvb3BlciIsImp0aSI6ImJhNDNjZGEiLCJyb2xlIjoiYWRtaW4iLCJhdWQiOlsiaHR0cDovL2xvY2FsaG9zdDo0MzA4IiwiaHR0cHM6Ly9sb2NhbGhvc3Q6NDQzNzQiLCJodHRwOi8vbG9jYWxob3N0OjUxMTAiLCJodHRwczovL2xvY2FsaG9zdDo3MDk1Il0sIm5iZiI6MTc3MTU4MTY5NSwiZXhwIjo0MTAyMzU4NDAwLCJpYXQiOjE3NzE1ODE2OTUsImlzcyI6ImRvdG5ldC11c2VyLWp3dHMifQ.rZeyfC_8AlMzSwGkRI3MEAiVPuXJetH6hFvAt_s4RFY',
};

const ROLE_ENUM = {
  Analyst: 0,
  Inv: 1,
  Admin: 2,
} as const;

export type UserRole = keyof typeof ROLE_ENUM;
