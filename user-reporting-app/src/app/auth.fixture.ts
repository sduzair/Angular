import { UserPrincipal } from './auth.service';

export const TEST_USER_ADMIN: UserPrincipal | null = {
  id: 'admin-user',
  username: 'admin-user',
  role: 'Admin',
  email: 'adminuser@example.com',
};
