import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';

describe('User Management Facility & Role-Based Access Control', () => {
  beforeEach(() => {
    // Reset accounts to clean seed state
    AuthService.logout();
    const defaultAccounts = [
      {
        id: 'usr_admin_default',
        name: 'Chikungu Ngoyi',
        username: 'admin',
        email: 'admin@savannah.co.zm',
        password: 'password123',
        role: 'owner' as const,
        company_ids: ['comp_savannah', 'comp_kafue'],
        current_company_id: 'comp_savannah',
        status: 'active' as const,
        department: 'Executive Management',
        phone: '+260 977 123456',
        created_at: '2026-08-01T08:00:00Z',
      },
      {
        id: 'usr_accountant_test',
        name: 'John Mumba',
        username: 'jmumba',
        email: 'jmumba@savannah.co.zm',
        password: 'pass_mumba',
        role: 'accountant' as const,
        company_ids: ['comp_savannah'],
        current_company_id: 'comp_savannah',
        status: 'active' as const,
        department: 'Finance & Tax',
        phone: '+260 966 234567',
        created_at: '2026-08-10T09:00:00Z',
      },
    ];
    AuthService.saveAccounts(defaultAccounts);
    AuthService.login('admin', 'password123');
  });

  describe('User Listing & Filtering', () => {
    it('retrieves all accounts when no filters applied', () => {
      const users = UserService.getUsers();
      expect(users.length).toBe(2);
      expect(users.some((u) => u.username === 'admin')).toBe(true);
      expect(users.some((u) => u.username === 'jmumba')).toBe(true);
    });

    it('filters users by legal company entity', () => {
      const kafueUsers = UserService.getUsers({ companyId: 'comp_kafue' });
      expect(kafueUsers.length).toBe(1);
      expect(kafueUsers[0].username).toBe('admin');

      const savannahUsers = UserService.getUsers({ companyId: 'comp_savannah' });
      expect(savannahUsers.length).toBe(2);
    });

    it('filters users by system role', () => {
      const owners = UserService.getUsers({ role: 'owner' });
      expect(owners.length).toBe(1);
      expect(owners[0].username).toBe('admin');

      const accountants = UserService.getUsers({ role: 'accountant' });
      expect(accountants.length).toBe(1);
      expect(accountants[0].username).toBe('jmumba');

      const salesReps = UserService.getUsers({ role: 'sales_rep' });
      expect(salesReps.length).toBe(0);
    });

    it('filters users by search query (name, username, email, department)', () => {
      const searchByName = UserService.getUsers({ search: 'Chikungu' });
      expect(searchByName.length).toBe(1);
      expect(searchByName[0].username).toBe('admin');

      const searchByUsername = UserService.getUsers({ search: 'jmumba' });
      expect(searchByUsername.length).toBe(1);

      const searchByDept = UserService.getUsers({ search: 'Finance' });
      expect(searchByDept.length).toBe(1);
      expect(searchByDept[0].name).toBe('John Mumba');

      const searchNoMatch = UserService.getUsers({ search: 'NonExistent' });
      expect(searchNoMatch.length).toBe(0);
    });

    it('retrieves user by unique id', () => {
      const user = UserService.getUserById('usr_admin_default');
      expect(user).toBeDefined();
      expect(user?.name).toBe('Chikungu Ngoyi');

      const notFound = UserService.getUserById('usr_unknown');
      expect(notFound).toBeUndefined();
    });
  });

  describe('User Creation & Validation', () => {
    it('creates a new user successfully with all fields', () => {
      const createRes = UserService.createUser({
        name: 'Mutale Mwewa',
        username: 'mmwewa',
        email: 'mmwewa@savannah.co.zm',
        password: 'securePassword1',
        role: 'sales_rep',
        company_ids: ['comp_savannah'],
        department: 'Commercial Sales',
        phone: '+260 971 998877',
      });

      expect(createRes.success).toBe(true);
      expect(createRes.user).toBeDefined();
      expect(createRes.user?.id).toMatch(/^usr_/);
      expect(createRes.user?.username).toBe('mmwewa');
      expect(createRes.user?.role).toBe('sales_rep');
      expect(createRes.user?.status).toBe('active');
      expect(createRes.user?.department).toBe('Commercial Sales');

      // Verify in storage
      const fetched = UserService.getUserById(createRes.user!.id);
      expect(fetched).toBeDefined();
      expect(fetched?.name).toBe('Mutale Mwewa');
    });

    it('rejects creation when required fields are missing or invalid', () => {
      // Empty name
      const res1 = UserService.createUser({
        name: '',
        username: 'validuser',
        email: 'user@savannah.co.zm',
        password: 'password123',
        role: 'sales_rep',
        company_ids: ['comp_savannah'],
      });
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('name is required');

      // Username too short
      const res2 = UserService.createUser({
        name: 'Short User',
        username: 'ab',
        email: 'short@savannah.co.zm',
        password: 'password123',
        role: 'sales_rep',
        company_ids: ['comp_savannah'],
      });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('at least 3 characters');

      // Invalid username characters
      const res3 = UserService.createUser({
        name: 'Invalid Char User',
        username: 'user with spaces!',
        email: 'valid@savannah.co.zm',
        password: 'password123',
        role: 'sales_rep',
        company_ids: ['comp_savannah'],
      });
      expect(res3.success).toBe(false);
      expect(res3.error).toContain('letters, numbers');

      // Invalid email
      const res4 = UserService.createUser({
        name: 'Invalid Email User',
        username: 'invalidmail',
        email: 'invalid-email-string',
        password: 'password123',
        role: 'sales_rep',
        company_ids: ['comp_savannah'],
      });
      expect(res4.success).toBe(false);
      expect(res4.error).toContain('valid email address');

      // Password too short
      const res5 = UserService.createUser({
        name: 'Short Pass User',
        username: 'shortpass',
        email: 'shortpass@savannah.co.zm',
        password: '123',
        role: 'sales_rep',
        company_ids: ['comp_savannah'],
      });
      expect(res5.success).toBe(false);
      expect(res5.error).toContain('at least 4 characters');
    });

    it('enforces unique username and email on user creation', () => {
      // Duplicate username
      const dupUser = UserService.createUser({
        name: 'Duplicate Username User',
        username: 'admin',
        email: 'unique@savannah.co.zm',
        password: 'password123',
        role: 'admin',
        company_ids: ['comp_savannah'],
      });
      expect(dupUser.success).toBe(false);
      expect(dupUser.error).toContain('already taken');

      // Duplicate email
      const dupEmail = UserService.createUser({
        name: 'Duplicate Email User',
        username: 'unique_user',
        email: 'admin@savannah.co.zm',
        password: 'password123',
        role: 'admin',
        company_ids: ['comp_savannah'],
      });
      expect(dupEmail.success).toBe(false);
      expect(dupEmail.error).toContain('already registered');
    });
  });

  describe('User Updating & Security Guards', () => {
    it('updates user contact and profile details', () => {
      const updateRes = UserService.updateUser('usr_accountant_test', {
        name: 'John Mumba Senior',
        department: 'Treasury & Internal Audit',
        phone: '+260 966 999000',
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.user?.name).toBe('John Mumba Senior');
      expect(updateRes.user?.department).toBe('Treasury & Internal Audit');
      expect(updateRes.user?.phone).toBe('+260 966 999000');

      const fetched = UserService.getUserById('usr_accountant_test');
      expect(fetched?.name).toBe('John Mumba Senior');
    });

    it('updates user role successfully', () => {
      const updateRes = UserService.updateUser('usr_accountant_test', {
        role: 'admin',
      });
      expect(updateRes.success).toBe(true);
      expect(updateRes.user?.role).toBe('admin');
    });

    it('prevents demoting the last active owner', () => {
      const res = UserService.updateUser('usr_admin_default', {
        role: 'admin',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('at least one active Owner account');
    });

    it('allows demoting an owner if another active owner exists', () => {
      // Create secondary owner
      const newOwner = UserService.createUser({
        name: 'Secondary Owner',
        username: 'owner2',
        email: 'owner2@savannah.co.zm',
        password: 'password123',
        role: 'owner',
        company_ids: ['comp_savannah'],
      });
      expect(newOwner.success).toBe(true);

      // Now demoting original owner should succeed
      const demoteRes = UserService.updateUser('usr_admin_default', {
        role: 'admin',
      });
      expect(demoteRes.success).toBe(true);
      expect(demoteRes.user?.role).toBe('admin');
    });

    it('prevents user from suspending their own active logged-in account', () => {
      const currentSession = AuthService.getCurrentSession();
      expect(currentSession).toBeDefined();

      const res = UserService.toggleUserStatus(currentSession!.id, currentSession!.id);
      expect(res.success).toBe(false);
      expect(res.error).toContain('cannot suspend your own active account');
    });

    it('prevents suspending the last active owner', () => {
      // Trying to suspend the only owner as a different actor
      const res = UserService.updateUser(
        'usr_admin_default',
        { status: 'suspended' },
        'other_actor_id'
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('Cannot suspend the only active Owner');
    });

    it('allows suspending and reactivating non-owner accounts', () => {
      const suspendRes = UserService.toggleUserStatus('usr_accountant_test', 'usr_admin_default');
      expect(suspendRes.success).toBe(true);
      expect(suspendRes.user?.status).toBe('suspended');

      const activateRes = UserService.toggleUserStatus('usr_accountant_test', 'usr_admin_default');
      expect(activateRes.success).toBe(true);
      expect(activateRes.user?.status).toBe('active');
    });
  });

  describe('Password Reset & Authentication Verification', () => {
    it('resets user password with valid length and authenticates with new password', () => {
      const resetRes = UserService.resetPassword('usr_accountant_test', 'newPassword2026');
      expect(resetRes.success).toBe(true);

      // Verify old password fails
      const loginOld = AuthService.login('jmumba', 'pass_mumba');
      expect(loginOld.success).toBe(false);

      // Verify new password succeeds
      const loginNew = AuthService.login('jmumba', 'newPassword2026');
      expect(loginNew.success).toBe(true);
      expect(loginNew.user?.username).toBe('jmumba');
    });

    it('rejects password reset with less than 4 characters', () => {
      const res = UserService.resetPassword('usr_accountant_test', '12');
      expect(res.success).toBe(false);
      expect(res.error).toContain('at least 4 characters');
    });
  });

  describe('User Deletion Safety Checks', () => {
    it('prevents deleting oneself (active logged-in user)', () => {
      const res = UserService.deleteUser('usr_admin_default', 'usr_admin_default');
      expect(res.success).toBe(false);
      expect(res.error).toContain('cannot delete your own');
    });

    it('prevents deleting the last remaining owner', () => {
      const res = UserService.deleteUser('usr_admin_default', 'some_other_id');
      expect(res.success).toBe(false);
      expect(res.error).toContain('only remaining Owner');
    });

    it('deletes non-owner user successfully', () => {
      const res = UserService.deleteUser('usr_accountant_test', 'usr_admin_default');
      expect(res.success).toBe(true);

      const deleted = UserService.getUserById('usr_accountant_test');
      expect(deleted).toBeUndefined();
    });
  });

  describe('Active Session Switching & Impersonation', () => {
    it('switches active session to another active user', () => {
      const switchRes = UserService.switchActiveSession('usr_accountant_test');
      expect(switchRes.success).toBe(true);
      expect(switchRes.user?.username).toBe('jmumba');

      const session = AuthService.getCurrentSession();
      expect(session?.username).toBe('jmumba');
      expect(session?.role).toBe('accountant');
    });

    it('rejects switching session to a suspended user', () => {
      // Suspend accountant
      UserService.updateUser('usr_accountant_test', { status: 'suspended' }, 'usr_admin_default');

      const switchRes = UserService.switchActiveSession('usr_accountant_test');
      expect(switchRes.success).toBe(false);
      expect(switchRes.error).toContain('suspended account');
    });
  });

  describe('Role-Based Access Control (RBAC) Permissions Matrix', () => {
    it('provides correct permissions for Owner', () => {
      const perms = UserService.getRolePermissions('owner');
      expect(perms.canManageUsers).toBe(true);
      expect(perms.canManageCompanies).toBe(true);
      expect(perms.canAccessOperations).toBe(true);
      expect(perms.canIssueInvoices).toBe(true);
      expect(perms.canRecordPayments).toBe(true);
    });

    it('provides correct permissions for Admin', () => {
      const perms = UserService.getRolePermissions('admin');
      expect(perms.canManageUsers).toBe(true);
      expect(perms.canManageCompanies).toBe(false);
      expect(perms.canAccessOperations).toBe(true);
    });

    it('provides restricted financial permissions for Accountant', () => {
      const perms = UserService.getRolePermissions('accountant');
      expect(perms.canManageUsers).toBe(false);
      expect(perms.canManageCompanies).toBe(false);
      expect(perms.canAccessOperations).toBe(false);
      expect(perms.canIssueInvoices).toBe(true);
      expect(perms.canRecordPayments).toBe(true);
      expect(perms.canManageQuotations).toBe(false);
    });

    it('provides restricted commercial permissions for Sales Rep', () => {
      const perms = UserService.getRolePermissions('sales_rep');
      expect(perms.canManageUsers).toBe(false);
      expect(perms.canManageCompanies).toBe(false);
      expect(perms.canAccessOperations).toBe(false);
      expect(perms.canIssueInvoices).toBe(false);
      expect(perms.canRecordPayments).toBe(false);
      expect(perms.canManageQuotations).toBe(true);
    });
  });
});
