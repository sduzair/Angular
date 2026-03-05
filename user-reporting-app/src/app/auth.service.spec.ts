import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { AuthService, UserPrincipal, UserRole } from './auth.service';
import { TEST_USER_ADMIN } from './auth.fixture';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start unauthenticated with no token', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
    expect(service.accessToken()).toBeNull();
  });
});

// Mirrors the role mapping in auth.service internals for spy fidelity
const SPY_ROLE_FRIENDLY_NAME: Record<UserRole, UserPrincipal['role']> = {
  Analyst: 'Analyst',
  Inv: 'Investigator',
  Admin: 'Admin',
};

export function createAuthServiceSpy(
  initialUser: UserPrincipal | null = TEST_USER_ADMIN,
) {
  const _currentUserSignal = signal<UserPrincipal | null>(initialUser);
  const _accessTokenSignal = signal<string | null>(null);

  const spy = {
    login: jasmine.createSpy('AuthService.login'),
    logout: jasmine.createSpy('AuthService.logout'),
    currentUser: _currentUserSignal.asReadonly(),
    accessToken: _accessTokenSignal.asReadonly(),
    currentRole: computed(() => _currentUserSignal()?.role ?? null),
    isAuthenticated: computed(() => _currentUserSignal() !== null),
    isAdmin: computed(() => _currentUserSignal()?.role === 'Admin'),
    isAnalyst: computed(() => _currentUserSignal()?.role === 'Analyst'),
    isInvestigator: computed(
      () => _currentUserSignal()?.role === 'Investigator',
    ),
  };

  spy.login.and.callFake((username: string, role: UserRole) => {
    const user: UserPrincipal = {
      id: crypto.randomUUID(),
      username,
      role: SPY_ROLE_FRIENDLY_NAME[role],
      email: `${username.toLowerCase().replaceAll(' ', '')}@example.com`,
    };
    _currentUserSignal.set(user);
    // Set a predictable stub token so consumers can assert on it
    _accessTokenSignal.set(`stub-token-${role.toLowerCase()}`);
  });

  spy.logout.and.callFake(() => {
    _currentUserSignal.set(null);
    _accessTokenSignal.set(null);
  });

  // Expose writable signals for direct test manipulation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (spy as any)._testSignal = _currentUserSignal;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (spy as any)._accessTokenSignal = _accessTokenSignal;

  return spy;
}
