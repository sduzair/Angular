import { UserPrincipal } from './auth.service';

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
