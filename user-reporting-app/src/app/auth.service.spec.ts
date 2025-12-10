import { TestBed } from '@angular/core/testing';

import { computed, signal } from '@angular/core';
import { AuthService, UserPrincipal, UserRole } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

export function createAuthServiceSpy(
  initialUser: UserPrincipal | null = TEST_USER_ANALYST,
) {
  // Create writable signal for testing
  const _currentUserSignal = signal<UserPrincipal | null>(initialUser);

  const spy = jasmine.createSpyObj('AuthService', ['login', 'logout'], {
    // Define signal and computed properties as readonly properties
    currentUser: _currentUserSignal.asReadonly(),
    currentRole: computed(() => _currentUserSignal()?.role ?? null),
    isAuthenticated: computed(() => _currentUserSignal() !== null),
    isAdmin: computed(() => _currentUserSignal()?.role === 'Admin'),
    isAnalyst: computed(() => _currentUserSignal()?.role === 'Analyst'),
  });

  // Implement login spy behavior
  spy.login.and.callFake((username: string, role: UserRole) => {
    const user: UserPrincipal = {
      id: crypto.randomUUID(),
      username,
      role,
      email: `${username.toLowerCase().split(' ').join('')}@example.com`,
    };
    _currentUserSignal.set(user);
  });

  // Implement logout spy behavior
  spy.logout.and.callFake(() => {
    _currentUserSignal.set(null);
  });

  // Attach the writable signal for test manipulation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (spy as any)._testSignal = _currentUserSignal;

  return spy;
}

export const TEST_USER_ANALYST: UserPrincipal = {
  id: '00000000-0000-0000-0000-000000000000',
  username: 'John Doe',
  role: 'Analyst',
  email: 'johndoe@example.com',
};

export const TEST_USER_ADMIN: UserPrincipal = {
  id: '00000000-0000-0000-0000000000000001',
  username: 'Alice Cooper',
  role: 'Admin',
  email: 'alicecooper@example.com',
};
