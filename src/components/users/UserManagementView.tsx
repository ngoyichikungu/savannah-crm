import React, { useState, useMemo } from 'react';
import { Company, User, UserRole } from '../../types';
import { UserService, ROLE_PERMISSIONS_MATRIX } from '../../services/userService';
import {
  Users,
  UserPlus,
  Shield,
  Crown,
  KeyRound,
  Building2,
  Phone,
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  LogIn,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  Ban,
  FileText,
  CreditCard,
  FileSpreadsheet,
  BarChart3,
  Server,
  UserCheck,
} from 'lucide-react';

interface UserManagementViewProps {
  companies: Company[];
  currentUser: User;
  onUserChanged?: () => void;
  onSwitchSessionUser?: (user: User) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  companies,
  currentUser,
  onUserChanged,
  onSwitchSessionUser,
  showToast,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // UI state
  const [showRoleMatrix, setShowRoleMatrix] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Form states for Create / Edit
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('sales_rep');
  const [formCompanies, setFormCompanies] = useState<string[]>([]);
  const [formDepartment, setFormDepartment] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>('active');
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Password Reset
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  const reloadUsers = () => {
    setRefreshKey((k) => k + 1);
    if (onUserChanged) onUserChanged();
  };

  // Fetch users with active filters
  const users = useMemo(() => {
    return UserService.getUsers({
      companyId: companyFilter !== 'all' ? companyFilter : undefined,
      role: roleFilter !== 'all' ? roleFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchQuery,
    });
  }, [refreshKey, companyFilter, roleFilter, statusFilter, searchQuery]);

  const allUsersCount = useMemo(() => UserService.getUsers().length, [refreshKey]);
  const activeCount = useMemo(() => UserService.getUsers({ status: 'active' }).length, [refreshKey]);
  const ownerAdminCount = useMemo(() => {
    return UserService.getUsers().filter((u) => u.role === 'owner' || u.role === 'admin').length;
  }, [refreshKey]);

  const handleOpenCreateModal = () => {
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('sales_rep');
    setFormCompanies(companies.length > 0 ? [companies[0].id] : []);
    setFormDepartment('');
    setFormPhone('');
    setFormStatus('active');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormUsername(user.username || '');
    setFormEmail(user.email);
    setFormPassword('');
    setFormRole(user.role);
    setFormCompanies(user.company_ids || []);
    setFormDepartment(user.department || '');
    setFormPhone(user.phone || '');
    setFormStatus(user.status || 'active');
    setFormError(null);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (editingUser) {
      // Update existing user
      const result = UserService.updateUser(
        editingUser.id,
        {
          name: formName,
          username: formUsername,
          email: formEmail,
          role: formRole,
          company_ids: formCompanies,
          department: formDepartment,
          phone: formPhone,
          status: formStatus,
        },
        currentUser.id
      );

      if (!result.success) {
        setFormError(result.error || 'Failed to update user.');
        return;
      }

      showToast(`User ${formName} updated successfully.`);
      setEditingUser(null);
      reloadUsers();
    } else {
      // Create new user
      const result = UserService.createUser({
        name: formName,
        username: formUsername,
        email: formEmail,
        password: formPassword || 'welcome123',
        role: formRole,
        company_ids: formCompanies,
        department: formDepartment,
        phone: formPhone,
        status: formStatus,
      });

      if (!result.success) {
        setFormError(result.error || 'Failed to create user.');
        return;
      }

      showToast(`User ${formName} created successfully with role ${formRole}.`);
      setIsCreateModalOpen(false);
      reloadUsers();
    }
  };

  const handleToggleCompany = (companyId: string) => {
    if (formCompanies.includes(companyId)) {
      if (formCompanies.length === 1) {
        setFormError('User must have access to at least one legal company entity.');
        return;
      }
      setFormCompanies(formCompanies.filter((id) => id !== companyId));
    } else {
      setFormCompanies([...formCompanies, companyId]);
    }
  };

  const handleOpenPasswordReset = (user: User) => {
    setPasswordResetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  const handleSavePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword || newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Password confirmation does not match.');
      return;
    }

    if (!passwordResetUser) return;

    const res = UserService.resetPassword(passwordResetUser.id, newPassword);
    if (!res.success) {
      setPasswordError(res.error || 'Failed to reset password.');
      return;
    }

    showToast(`Password for ${passwordResetUser.name} reset successfully.`);
    setPasswordResetUser(null);
  };

  const handleToggleStatus = (user: User) => {
    const res = UserService.toggleUserStatus(user.id, currentUser.id);
    if (!res.success) {
      showToast(res.error || 'Cannot change user status', 'error');
      return;
    }
    const newStatus = res.user?.status || 'active';
    showToast(
      `Account for ${user.name} has been ${newStatus === 'active' ? 'activated' : 'suspended'}.`
    );
    reloadUsers();
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;
    const res = UserService.deleteUser(deletingUser.id, currentUser.id);
    if (!res.success) {
      showToast(res.error || 'Cannot delete user', 'error');
      setDeletingUser(null);
      return;
    }
    showToast(`User ${deletingUser.name} deleted successfully.`);
    setDeletingUser(null);
    reloadUsers();
  };

  const handleSwitchSession = (user: User) => {
    const res = UserService.switchActiveSession(user.id);
    if (!res.success) {
      showToast(res.error || 'Failed to switch user session', 'error');
      return;
    }
    showToast(`Switched active session to ${user.name} (${user.role}).`);
    if (onSwitchSessionUser && res.user) {
      onSwitchSessionUser(res.user);
    }
    reloadUsers();
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
            <Crown className="w-3 h-3 text-amber-700" />
            Owner
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">
            <Shield className="w-3 h-3 text-blue-700" />
            Admin
          </span>
        );
      case 'accountant':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CreditCard className="w-3 h-3 text-emerald-700" />
            Accountant
          </span>
        );
      case 'sales_rep':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300">
            <UserCheck className="w-3 h-3 text-purple-700" />
            Sales Rep
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-800">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & KPI Summary Cards */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-stone-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-semibold border border-emerald-500/30">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              USER ACCESS CONTROL &amp; RBAC
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              User Management Facility
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Create and provision user accounts, allocate company entity access, enforce role-based
              permissions, and manage security credentials across the system.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-toggle-role-matrix"
              onClick={() => setShowRoleMatrix(!showRoleMatrix)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold border border-stone-600 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span>{showRoleMatrix ? 'Hide Role Guide' : 'Role Permissions Guide'}</span>
              {showRoleMatrix ? (
                <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              )}
            </button>

            <button
              id="btn-add-new-user"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black tracking-wide shadow-md hover:shadow-emerald-900/40 transition-all cursor-pointer active:scale-95 border border-emerald-400/40"
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span>+ Create Team Member</span>
            </button>
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-stone-700/60">
          <div className="bg-stone-800/80 p-3.5 rounded-2xl border border-stone-700/60">
            <span className="text-[10px] font-mono uppercase text-stone-400 block font-semibold">
              Total Accounts
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">
              {allUsersCount}
            </span>
          </div>
          <div className="bg-stone-800/80 p-3.5 rounded-2xl border border-stone-700/60">
            <span className="text-[10px] font-mono uppercase text-emerald-400 block font-semibold">
              Active Users
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5 block">
              {activeCount}
            </span>
          </div>
          <div className="bg-stone-800/80 p-3.5 rounded-2xl border border-stone-700/60">
            <span className="text-[10px] font-mono uppercase text-amber-400 block font-semibold">
              Owners / Admins
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-0.5 block">
              {ownerAdminCount}
            </span>
          </div>
          <div className="bg-stone-800/80 p-3.5 rounded-2xl border border-stone-700/60">
            <span className="text-[10px] font-mono uppercase text-blue-400 block font-semibold">
              Current Session
            </span>
            <span className="text-xs font-bold text-blue-300 truncate block mt-1" title={currentUser.name}>
              {currentUser.name} ({currentUser.role})
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Role Permissions Guide & Matrix */}
      {showRoleMatrix && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-black text-stone-900">
                Role-Based Access Control (RBAC) Specification
              </h2>
            </div>
            <button
              onClick={() => setShowRoleMatrix(false)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(ROLE_PERMISSIONS_MATRIX) as UserRole[]).map((roleKey) => {
              const info = ROLE_PERMISSIONS_MATRIX[roleKey];
              return (
                <div
                  key={roleKey}
                  className="bg-stone-50 rounded-2xl p-4 border border-stone-200/90 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      {getRoleBadge(roleKey)}
                      <span className="text-[10px] font-mono text-stone-500 uppercase font-semibold">
                        {roleKey}
                      </span>
                    </div>
                    <h3 className="text-xs font-black text-stone-900">{info.title}</h3>
                    <p className="text-[11px] text-stone-600 leading-relaxed">{info.description}</p>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-stone-200/60 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600 flex items-center gap-1">
                        <Users className="w-3 h-3 text-stone-500" /> User Admin:
                      </span>
                      {info.canManageUsers ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-stone-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-stone-500" /> Entities:
                      </span>
                      {info.canManageCompanies ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-stone-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-stone-500" /> Invoices:
                      </span>
                      {info.canIssueInvoices ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-stone-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600 flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-stone-500" /> Receipts:
                      </span>
                      {info.canRecordPayments ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-stone-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600 flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3 text-stone-500" /> Quotes:
                      </span>
                      {info.canManageQuotations ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-stone-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3 text-stone-500" /> Reports:
                      </span>
                      {info.canViewReports ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-stone-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600 flex items-center gap-1">
                        <Server className="w-3 h-3 text-stone-500" /> Ops/Install:
                      </span>
                      {info.canAccessOperations ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-stone-300" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              id="input-user-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, username, email..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-stone-400 shrink-0" />
            <select
              id="select-user-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-stone-800"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner (Executive)</option>
              <option value="admin">Administrator (Operations)</option>
              <option value="accountant">Accountant (Finance)</option>
              <option value="sales_rep">Sales Representative</option>
            </select>
          </div>

          {/* Company Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-stone-400 shrink-0" />
            <select
              id="select-user-company-filter"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-stone-800"
            >
              <option value="all">All Company Entities</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400 shrink-0" />
            <select
              id="select-user-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-stone-800"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="suspended">Suspended Accounts</option>
            </select>
          </div>
        </div>

        {/* Active Filters readout */}
        {(searchQuery || roleFilter !== 'all' || companyFilter !== 'all' || statusFilter !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
            <span>
              Showing <strong className="text-stone-900">{users.length}</strong> matching user
              {users.length === 1 ? '' : 's'}
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setCompanyFilter('all');
                setStatusFilter('all');
              }}
              className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Users Table / Card List */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              Registered Accounts ({users.length})
            </h2>
          </div>
          <span className="text-[11px] text-stone-500 font-mono">
            Security: Local Encrypted Account Registry
          </span>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">No users match your criteria</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Try adjusting your search query, role filter, or entity filters to find accounts.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setCompanyFilter('all');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-100/70 text-stone-600 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">User Details</th>
                  <th className="py-3 px-4 font-bold">Role</th>
                  <th className="py-3 px-4 font-bold">Department / Contact</th>
                  <th className="py-3 px-4 font-bold">Entity Access</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800 font-medium">
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  const isSuspended = u.status === 'suspended';
                  const userCompanies = companies.filter((c) =>
                    (u.company_ids || []).includes(c.id)
                  );

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        isSelf ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      {/* User Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 text-white flex items-center justify-center font-bold text-xs font-mono shadow-2xs">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            {isSelf && (
                              <span
                                className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-2xs"
                                title="Active Logged In Session"
                              />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-stone-900 text-xs sm:text-sm">
                                {u.name}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono mt-0.5">
                              <span>@{u.username || 'unspecified'}</span>
                              <span>•</span>
                              <span className="text-stone-600">{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                      {/* Dept & Phone Column */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {u.department ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                              <Briefcase className="w-3 h-3 text-stone-400" />
                              {u.department}
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">No department</span>
                          )}
                          {u.phone && (
                            <div className="text-[10px] font-mono text-stone-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5 text-stone-400" />
                              {u.phone}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Entity Access */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {userCompanies.length > 0 ? (
                            userCompanies.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200"
                                title={c.legal_name || c.name}
                              >
                                <Building2 className="w-2.5 h-2.5 text-emerald-700" />
                                {c.name.split(' ')[0]}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-amber-700 font-bold">
                              No entities assigned
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Quick Switch / Impersonate */}
                          {!isSelf && !isSuspended && (
                            <button
                              onClick={() => handleSwitchSession(u)}
                              className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title={`Switch to session as ${u.name} to preview view`}
                            >
                              <LogIn className="w-4 h-4 text-emerald-700" />
                            </button>
                          )}

                          {/* Edit Details */}
                          <button
                            id={`btn-edit-user-${u.id}`}
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit user details and roles"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            id={`btn-reset-pw-${u.id}`}
                            onClick={() => handleOpenPasswordReset(u)}
                            className="p-1.5 text-stone-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Reset password"
                          >
                            <KeyRound className="w-4 h-4 text-amber-600" />
                          </button>

                          {/* Toggle Active / Suspended */}
                          {!isSelf && (
                            <button
                              id={`btn-toggle-status-${u.id}`}
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isSuspended
                                  ? 'text-emerald-700 hover:bg-emerald-50'
                                  : 'text-amber-600 hover:bg-amber-50'
                              }`}
                              title={isSuspended ? 'Reactivate account' : 'Suspend account'}
                            >
                              {isSuspended ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Delete */}
                          {!isSelf && (
                            <button
                              id={`btn-delete-user-${u.id}`}
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete user account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit User */}
      {(isCreateModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    {editingUser ? `Edit Account: ${editingUser.name}` : 'Create New Team Member'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {editingUser
                      ? 'Update permissions, role, and accessible company entities'
                      : 'Provision credentials and role-based permissions'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingUser(null);
                }}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. John Mumba"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="e.g. jmumba"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. jmumba@savannah.co.zm"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Min 4 characters (e.g. Pass@123)"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                )}

                {editingUser && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Account Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-stone-800"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Role &amp; Permissions Profile <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(ROLE_PERMISSIONS_MATRIX) as UserRole[]).map((r) => {
                    const info = ROLE_PERMISSIONS_MATRIX[r];
                    const isSelected = formRole === r;
                    return (
                      <div
                        key={r}
                        onClick={() => setFormRole(r)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-600 shadow-2xs'
                            : 'bg-stone-50 border-stone-200 hover:bg-stone-100/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-xs text-stone-900">{info.title}</span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />}
                        </div>
                        <p className="text-[10px] text-stone-600 leading-snug">{info.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Company Entity Access Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Permitted Legal Entities <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  {companies.map((c) => {
                    const isChecked = formCompanies.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2.5 p-1.5 hover:bg-stone-100 rounded-xl cursor-pointer text-xs font-medium text-stone-800"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCompany(c.id)}
                          className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                        />
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{c.legal_name || c.name}</span>
                          <span className="text-[10px] font-mono text-stone-500">
                            ({c.currency_code})
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Department & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Sales, Accounting, Executive"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +260 977 123456"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-user-submit"
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Password Reset */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Reset Password</h3>
                  <p className="text-[11px] text-stone-500">
                    For {passwordResetUser.name} (@{passwordResetUser.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPasswordResetUser(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleSavePasswordReset} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete User Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">Delete User Account</h3>
                <p className="text-xs text-stone-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-stone-900">{deletingUser.name}</strong> (
              <span className="font-mono text-stone-800">@{deletingUser.username}</span>)? They will
              immediately lose access to all company entities and records.
            </p>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
