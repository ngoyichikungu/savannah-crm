import { describe, it, expect, beforeEach } from 'vitest';
import { BackupService } from '../services/backupService';
import { AuthService } from '../services/authService';
import { StorageService } from '../services/storageService';
import { Company, Invoice, Organisation } from '../types';

describe('Sign Out & Backup Workflow', () => {
  const testCompany: Company = {
    id: 'comp_signout_test',
    name: 'Savannah Agribusiness Logistics',
    legal_name: 'Savannah Agribusiness Logistics Ltd',
    currency_code: 'ZMW',
    is_vat_registered: true,
    vat_rate_bp: 1600,
    email: 'ops@savannah.co.zm',
    phone: '+260 211 999111',
    address_line1: 'Kafue Road',
    city: 'Lusaka',
    country: 'Zambia',
    next_invoice_number: 1001,
    next_quotation_number: 2001,
    next_credit_note_number: 3001,
  };

  beforeEach(() => {
    StorageService.saveCompany(testCompany);
    StorageService.setCurrentCompany(testCompany.id);
  });

  it('generates a complete backup archive on prompt before signing out', () => {
    // 1. Seed sample data
    const org: Organisation = {
      id: 'org_backup_prompt_1',
      company_id: testCompany.id,
      name: 'Choma Ranching Supplies',
      tpin: '1004567890',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    StorageService.saveOrganisation(org);

    const inv: Invoice = {
      id: 'inv_backup_prompt_1',
      company_id: testCompany.id,
      organisation_id: org.id,
      number: 'INV-2026-9001',
      issue_date: '2026-09-24',
      due_date: '2026-10-24',
      status: 'sent',
      currency_code: 'ZMW',
      issued_by_user_id: 'usr_admin',
      payment_terms_days: 30,
      discount_type: 'none',
      discount_value: 0,
      discount_minor: 0,
      subtotal_minor: 1000000,
      vat_rate_bp: 1600,
      vat_minor: 160000,
      total_minor: 1160000,
      amount_paid_minor: 0,
      balance_due_minor: 1160000,
      lines: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    StorageService.saveInvoice(inv);

    // 2. Execute backup creation
    const archive = BackupService.createBackup();
    expect(archive).toBeDefined();
    expect(archive.version).toBe('1.0.0');
    expect(archive.checksum).toBeDefined();
    expect(archive.timestamp).toBeDefined();

    // Verify data completeness inside the archive
    expect(archive.data.organisations.some((o) => o.id === org.id)).toBe(true);
    expect(archive.data.invoices.some((i) => i.id === inv.id)).toBe(true);
    expect(archive.data.companies.some((c) => c.id === testCompany.id)).toBe(true);
  });

  it('performs clean logout and tears down active session state', () => {
    // Login session
    const loginResult = AuthService.login('admin', 'password123');
    expect(loginResult.success).toBe(true);
    expect(AuthService.getCurrentSession()).not.toBeNull();

    // Logout
    AuthService.logout();
    expect(AuthService.getCurrentSession()).toBeNull();
  });
});
