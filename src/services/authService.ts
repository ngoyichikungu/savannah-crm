import { User } from '../types';

const ACCOUNTS_KEY = 'savannah_auth_accounts_v1';
const SESSION_KEY = 'savannah_active_session_v1';

const DEFAULT_ADMIN: User = {
  id: 'usr_admin_default',
  name: 'Chikungu Ngoyi',
  username: 'admin',
  email: 'admin@savannah.co.zm',
  password: 'password123',
  role: 'owner',
  company_ids: ['comp_savannah', 'comp_kafue'],
  current_company_id: 'comp_savannah',
};

// In-memory fallback for Node/SSR environments
const memoryStorage: Record<string, string> = {};

function getItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(key);
  }
  return memoryStorage[key] || null;
}

function setItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(key, value);
  } else {
    memoryStorage[key] = value;
  }
}

function removeItem(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(key);
  } else {
    delete memoryStorage[key];
  }
}

export class AuthService {
  /**
   * Get all registered accounts
   */
  static getAccounts(): User[] {
    try {
      const raw = getItem(ACCOUNTS_KEY);
      if (!raw) {
        // Seed default admin account
        const initial = [DEFAULT_ADMIN];
        setItem(ACCOUNTS_KEY, JSON.stringify(initial));
        return initial;
      }
      const accounts: User[] = JSON.parse(raw);
      if (!Array.isArray(accounts) || accounts.length === 0) {
        setItem(ACCOUNTS_KEY, JSON.stringify([DEFAULT_ADMIN]));
        return [DEFAULT_ADMIN];
      }
      return accounts;
    } catch {
      return [DEFAULT_ADMIN];
    }
  }

  /**
   * Save accounts list to localStorage
   */
  private static saveAccounts(accounts: User[]): void {
    setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  /**
   * Authenticate user with username/email and password
   */
  static login(identifier: string, passwordInput: string): { success: boolean; user?: User; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    const accounts = this.getAccounts();
    const match = accounts.find(
      (u) =>
        (u.username?.toLowerCase() === cleanId || u.email?.toLowerCase() === cleanId) &&
        u.password === cleanPass
    );

    if (!match) {
      return {
        success: false,
        error: 'Invalid username/email or password. Please try again.',
      };
    }

    // Omit password from session object
    const sessionUser: User = { ...match };
    delete sessionUser.password;

    setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
  }

  /**
   * Register a new user
   */
  static register(data: {
    name: string;
    username: string;
    email: string;
    password: string;
    role?: 'owner' | 'admin' | 'sales_rep' | 'accountant';
  }): { success: boolean; user?: User; error?: string } {
    const cleanName = data.name.trim();
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPassword = data.password.trim();

    if (!cleanName) {
      return { success: false, error: 'Full Name is required.' };
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    const accounts = this.getAccounts();

    // Check existing username or email
    const exists = accounts.some(
      (u) =>
        u.username?.toLowerCase() === cleanUsername ||
        u.email?.toLowerCase() === cleanEmail
    );

    if (exists) {
      return {
        success: false,
        error: 'An account with this username or email already exists.',
      };
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
      role: data.role || 'admin',
      company_ids: ['comp_savannah', 'comp_kafue'],
      current_company_id: 'comp_savannah',
    };

    accounts.push(newUser);
    this.saveAccounts(accounts);

    // Auto log in after registration
    const sessionUser: User = { ...newUser };
    delete sessionUser.password;
    setItem(SESSION_KEY, JSON.stringify(sessionUser));

    return { success: true, user: sessionUser };
  }

  /**
   * Get active authenticated user session
   */
  static getCurrentSession(): User | null {
    try {
      const raw = getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Log out active session
   */
  static logout(): void {
    removeItem(SESSION_KEY);
  }
}
