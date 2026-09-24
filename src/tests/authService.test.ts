import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../services/authService';

describe('AuthService & Privacy Authentication', () => {
  beforeEach(() => {
    AuthService.logout();
  });

  it('seeds default admin user account', () => {
    const accounts = AuthService.getAccounts();
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    expect(accounts[0].username).toBe('admin');
  });

  it('authenticates valid credentials successfully', () => {
    const res = AuthService.login('admin', 'password123');
    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.username).toBe('admin');

    const session = AuthService.getCurrentSession();
    expect(session).toBeDefined();
    expect(session?.username).toBe('admin');
  });

  it('rejects invalid password or unknown user', () => {
    const res1 = AuthService.login('admin', 'wrongpass');
    expect(res1.success).toBe(false);
    expect(res1.error).toContain('Invalid');

    const res2 = AuthService.login('nonexistent', 'password123');
    expect(res2.success).toBe(false);
  });

  it('registers a new account and enforces unique username/email', () => {
    const regRes = AuthService.register({
      name: 'John Mumba',
      username: 'jmumba',
      email: 'jmumba@savannah.co.zm',
      password: 'mumbapassword',
      role: 'accountant',
    });

    expect(regRes.success).toBe(true);
    expect(regRes.user?.name).toBe('John Mumba');

    // Duplicate registration attempt
    const dupRes = AuthService.register({
      name: 'John Duplicate',
      username: 'jmumba',
      email: 'another@savannah.co.zm',
      password: 'password123',
    });

    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toContain('already exists');
  });

  it('logs out and clears active privacy session', () => {
    AuthService.login('admin', 'password123');
    expect(AuthService.getCurrentSession()).not.toBeNull();

    AuthService.logout();
    expect(AuthService.getCurrentSession()).toBeNull();
  });
});
