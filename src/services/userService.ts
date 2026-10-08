import { User, UserRole } from '../types';
import { AuthService } from './authService';
import { StorageService } from './storageService';

export interface CreateUserInput {
  name: string;
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  company_ids: string[];
  current_company_id?: string;
  phone?: string;
  department?: string;
  status?: 'active' | 'suspended';
}

export interface UpdateUserInput {
  name?: string;
  username?: string;
  email?: string;
  role?: UserRole;
  company_ids?: string[];
  current_company_id?: string;
  phone?: string;
  department?: string;
  status?: 'active' | 'suspended';
}

export interface RolePermissionInfo {
  role: UserRole;
  title: string;
  description: string;
  canManageUsers: boolean;
  canManageCompanies: boolean;
  canIssueInvoices: boolean;
  canRecordPayments: boolean;
  canManageQuotations: boolean;
  canViewReports: boolean;
  canAccessOperations: boolean;
  allowedModules: string[];
}

export const ROLE_PERMISSIONS_MATRIX: Record<UserRole, RolePermissionInfo> = {
  owner: {
    role: 'owner',
    title: 'Business Owner & Executive',
    description: 'Unrestricted full access across all legal entities, financial statements, user accounts, and server operations.',
    canManageUsers: true,
    canManageCompanies: true,
    canIssueInvoices: true,
    canRecordPayments: true,
    canManageQuotations: true,
    canViewReports: true,
    canAccessOperations: true,
    allowedModules: ['dashboard', 'calendar', 'invoices', 'payments', 'clients', 'quotations', 'proposals', 'marketing', 'reports', 'integrity', 'operations', 'users'],
  },
  admin: {
    role: 'admin',
    title: 'Operations Administrator',
    description: 'Manages day-to-day operations, client portfolios, quotes, invoices, team member accounts, and general system settings.',
    canManageUsers: true,
    canManageCompanies: false,
    canIssueInvoices: true,
    canRecordPayments: true,
    canManageQuotations: true,
    canViewReports: true,
    canAccessOperations: true,
    allowedModules: ['dashboard', 'calendar', 'invoices', 'payments', 'clients', 'quotations', 'proposals', 'marketing', 'reports', 'integrity', 'operations', 'users'],
  },
  accountant: {
    role: 'accountant',
    title: 'Financial Accountant & Comptroller',
    description: 'Dedicated financial officer access for managing billing, credit notes, receipts, client ledger reconciliations, and tax reports.',
    canManageUsers: false,
    canManageCompanies: false,
    canIssueInvoices: true,
    canRecordPayments: true,
    canManageQuotations: false,
    canViewReports: true,
    canAccessOperations: false,
    allowedModules: ['dashboard', 'calendar', 'invoices', 'payments', 'clients', 'reports', 'integrity'],
  },
  sales_rep: {
    role: 'sales_rep',
    title: 'Commercial Sales Representative',
    description: 'Field & office commercial access for drafting quotations, tracking sales pipelines, executing marketing campaigns, and scheduling meetings.',
    canManageUsers: false,
    canManageCompanies: false,
    canIssueInvoices: false,
    canRecordPayments: false,
    canManageQuotations: true,
    canViewReports: false,
    canAccessOperations: false,
    allowedModules: ['dashboard', 'calendar', 'quotations', 'proposals', 'marketing', 'clients'],
  },
};

export class UserService {
  /**
   * Retrieve all users, optionally filtered by company, role, search query, or status.
   */
  static getUsers(filter?: {
    companyId?: string;
    role?: string;
    search?: string;
    status?: string;
  }): User[] {
    const accounts = AuthService.getAccounts();

    return accounts.filter((user) => {
      // Company filtering
      if (filter?.companyId && filter.companyId !== 'all') {
        const hasAccess = (user.company_ids || []).includes(filter.companyId);
        if (!hasAccess) return false;
      }

      // Role filtering
      if (filter?.role && filter.role !== 'all') {
        if (user.role !== filter.role) return false;
      }

      // Status filtering
      if (filter?.status && filter.status !== 'all') {
        const userStatus = user.status || 'active';
        if (userStatus !== filter.status) return false;
      }

      // Search query filtering (name, username, email, department)
      if (filter?.search && filter.search.trim()) {
        const q = filter.search.trim().toLowerCase();
        const nameMatch = (user.name || '').toLowerCase().includes(q);
        const usernameMatch = (user.username || '').toLowerCase().includes(q);
        const emailMatch = (user.email || '').toLowerCase().includes(q);
        const deptMatch = (user.department || '').toLowerCase().includes(q);
        const phoneMatch = (user.phone || '').toLowerCase().includes(q);
        if (!nameMatch && !usernameMatch && !emailMatch && !deptMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Retrieve a specific user by ID.
   */
  static getUserById(id: string): User | undefined {
    const accounts = AuthService.getAccounts();
    return accounts.find((u) => u.id === id);
  }

  /**
   * Create a new team member user account.
   */
  static createUser(data: CreateUserInput): { success: boolean; user?: User; error?: string } {
    const cleanName = (data.name || '').trim();
    const cleanUsername = (data.username || '').trim().toLowerCase();
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanPassword = (data.password || 'welcome123').trim();

    if (!cleanName) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      return { success: false, error: 'Username can only contain letters, numbers, dots, hyphens, and underscores.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (cleanPassword.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    const accounts = AuthService.getAccounts();

    // Check duplicate username or email
    const duplicate = accounts.find(
      (u) =>
        u.username?.toLowerCase() === cleanUsername ||
        u.email?.toLowerCase() === cleanEmail
    );
    if (duplicate) {
      if (duplicate.username?.toLowerCase() === cleanUsername) {
        return { success: false, error: `Username "${cleanUsername}" is already taken by another user.` };
      }
      return { success: false, error: `Email address "${cleanEmail}" is already registered.` };
    }

    const currentCompany = StorageService.getCurrentCompany();
    const assignedCompanies =
      data.company_ids && data.company_ids.length > 0
        ? data.company_ids
        : currentCompany
        ? [currentCompany.id]
        : ['comp_savannah'];

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
      role: data.role || 'sales_rep',
      company_ids: assignedCompanies,
      current_company_id: data.current_company_id || assignedCompanies[0],
      status: data.status || 'active',
      phone: data.phone?.trim() || undefined,
      department: data.department?.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    accounts.push(newUser);
    AuthService.saveAccounts(accounts);

    return { success: true, user: newUser };
  }

  /**
   * Update existing user details, role, company assignments, or status.
   */
  static updateUser(
    id: string,
    updates: UpdateUserInput,
    currentUserId?: string
  ): { success: boolean; user?: User; error?: string } {
    const accounts = AuthService.getAccounts();
    const index = accounts.findIndex((u) => u.id === id);

    if (index === -1) {
      return { success: false, error: 'User account not found.' };
    }

    const targetUser = accounts[index];

    // If updating name
    if (updates.name !== undefined) {
      const cleanName = updates.name.trim();
      if (!cleanName) {
        return { success: false, error: 'Full name cannot be empty.' };
      }
      targetUser.name = cleanName;
    }

    // If updating username
    if (updates.username !== undefined) {
      const cleanUsername = updates.username.trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long.' };
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
        return { success: false, error: 'Username contains invalid characters.' };
      }
      const existingUser = accounts.find((u) => u.id !== id && u.username?.toLowerCase() === cleanUsername);
      if (existingUser) {
        return { success: false, error: `Username "${cleanUsername}" is already taken.` };
      }
      targetUser.username = cleanUsername;
    }

    // If updating email
    if (updates.email !== undefined) {
      const cleanEmail = updates.email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return { success: false, error: 'Please enter a valid email address.' };
      }
      const existingEmail = accounts.find((u) => u.id !== id && u.email?.toLowerCase() === cleanEmail);
      if (existingEmail) {
        return { success: false, error: `Email address "${cleanEmail}" is already in use.` };
      }
      targetUser.email = cleanEmail;
    }

    // If updating role
    if (updates.role !== undefined && updates.role !== targetUser.role) {
      // If demoting an owner, ensure there is at least one other active owner
      if (targetUser.role === 'owner') {
        const remainingOwners = accounts.filter((u) => u.id !== id && u.role === 'owner' && (u.status || 'active') === 'active');
        if (remainingOwners.length === 0) {
          return { success: false, error: 'Cannot change role: the system must have at least one active Owner account.' };
        }
      }
      targetUser.role = updates.role;
    }

    // If updating status (active / suspended)
    if (updates.status !== undefined && updates.status !== targetUser.status) {
      if (updates.status === 'suspended') {
        // Cannot suspend self
        if (currentUserId && id === currentUserId) {
          return { success: false, error: 'You cannot suspend your own active account.' };
        }
        // Cannot suspend last active owner
        if (targetUser.role === 'owner') {
          const otherActiveOwners = accounts.filter((u) => u.id !== id && u.role === 'owner' && (u.status || 'active') === 'active');
          if (otherActiveOwners.length === 0) {
            return { success: false, error: 'Cannot suspend the only active Owner account.' };
          }
        }
      }
      targetUser.status = updates.status;
    }

    // If updating company assignments
    if (updates.company_ids !== undefined) {
      if (updates.company_ids.length === 0) {
        return { success: false, error: 'User must be assigned to at least one company entity.' };
      }
      targetUser.company_ids = updates.company_ids;
      if (!updates.company_ids.includes(targetUser.current_company_id)) {
        targetUser.current_company_id = updates.company_ids[0];
      }
    }

    if (updates.current_company_id !== undefined) {
      targetUser.current_company_id = updates.current_company_id;
    }

    if (updates.phone !== undefined) {
      targetUser.phone = updates.phone.trim() || undefined;
    }

    if (updates.department !== undefined) {
      targetUser.department = updates.department.trim() || undefined;
    }

    accounts[index] = targetUser;
    AuthService.saveAccounts(accounts);

    // If active session user was updated, refresh session
    const currentSession = AuthService.getCurrentSession();
    if (currentSession && currentSession.id === id) {
      AuthService.setActiveSession(targetUser);
    }

    return { success: true, user: targetUser };
  }

  /**
   * Reset user password.
   */
  static resetPassword(id: string, newPassword: string): { success: boolean; error?: string } {
    const cleanPassword = (newPassword || '').trim();
    if (!cleanPassword || cleanPassword.length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    const accounts = AuthService.getAccounts();
    const user = accounts.find((u) => u.id === id);
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    user.password = cleanPassword;
    AuthService.saveAccounts(accounts);

    return { success: true };
  }

  /**
   * Toggle user active/suspended status with safety checks.
   */
  static toggleUserStatus(id: string, currentUserId?: string): { success: boolean; user?: User; error?: string } {
    const accounts = AuthService.getAccounts();
    const user = accounts.find((u) => u.id === id);
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    const newStatus = (user.status || 'active') === 'active' ? 'suspended' : 'active';
    return this.updateUser(id, { status: newStatus }, currentUserId);
  }

  /**
   * Delete a user account safely.
   */
  static deleteUser(id: string, currentUserId?: string): { success: boolean; error?: string } {
    if (currentUserId && id === currentUserId) {
      return { success: false, error: 'You cannot delete your own logged-in account.' };
    }

    const accounts = AuthService.getAccounts();
    const targetUser = accounts.find((u) => u.id === id);
    if (!targetUser) {
      return { success: false, error: 'User account not found.' };
    }

    // Safety check: Cannot delete last remaining owner
    if (targetUser.role === 'owner') {
      const remainingOwners = accounts.filter((u) => u.id !== id && u.role === 'owner');
      if (remainingOwners.length === 0) {
        return { success: false, error: 'Cannot delete the only remaining Owner account in the system.' };
      }
    }

    const filtered = accounts.filter((u) => u.id !== id);
    AuthService.saveAccounts(filtered);

    return { success: true };
  }

  /**
   * Switch the current active session user (impersonate or switch for testing).
   */
  static switchActiveSession(userId: string): { success: boolean; user?: User; error?: string } {
    const accounts = AuthService.getAccounts();
    const user = accounts.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'Target user does not exist.' };
    }

    if (user.status === 'suspended') {
      return { success: false, error: 'Cannot switch to a suspended account.' };
    }

    AuthService.setActiveSession(user);
    StorageService.setCurrentUser(user);

    return { success: true, user };
  }

  /**
   * Get role permissions and module breakdown for UI display.
   */
  static getRolePermissions(role: UserRole): RolePermissionInfo {
    return (
      ROLE_PERMISSIONS_MATRIX[role] || {
        role,
        title: role,
        description: 'Standard system user',
        canManageUsers: false,
        canManageCompanies: false,
        canIssueInvoices: false,
        canRecordPayments: false,
        canManageQuotations: false,
        canViewReports: false,
        canAccessOperations: false,
        allowedModules: ['dashboard'],
      }
    );
  }
}
