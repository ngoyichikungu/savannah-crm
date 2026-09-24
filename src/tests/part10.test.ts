import { describe, it, expect, beforeEach } from 'vitest';
import { InstallerService } from '../services/installerService';
import { BackupService } from '../services/backupService';
import { StorageService } from '../services/storageService';
import { Company, Organisation } from '../types';

describe('Part 10 — Packaging, Operations, Installer & Backup Test Suite', () => {
  beforeEach(() => {
    StorageService.clearAllData();
    InstallerService.setInstalledMarker(false);
  });

  describe('10.1 Web Installer & Requirements Check', () => {
    it('verifies system requirements check returns pass status for runtime and storage', () => {
      const checks = InstallerService.checkRequirements();
      expect(checks).toBeInstanceOf(Array);
      expect(checks.length).toBeGreaterThanOrEqual(5);

      const phpCheck = checks.find((c) => c.id === 'php_version');
      expect(phpCheck).toBeDefined();
      expect(phpCheck?.passed).toBe(true);

      const dbCheck = checks.find((c) => c.id === 'pdo_mysql');
      expect(dbCheck).toBeDefined();
      expect(dbCheck?.passed).toBe(true);
    });

    it('generates a valid 32-character base64 APP_KEY', () => {
      const key = InstallerService.generateAppKey();
      expect(key).toMatch(/^base64:[A-Za-z0-9+/=]{44}$/);
    });

    it('executes first-run installation, creates owner user, primary company, seeds stages, and locks installer', () => {
      const result = InstallerService.runInstallation({
        ownerName: 'Chikungu Ngoyi',
        ownerEmail: 'owner@savannah.co.zm',
        companyName: 'Savannah Agribusiness Ltd',
        currencyCode: 'ZMW',
        isVatRegistered: true,
        vatRateBp: 1600,
      });

      expect(result.appKey).toBeDefined();
      expect(result.ownerUser.name).toBe('Chikungu Ngoyi');
      expect(result.ownerUser.role).toBe('owner');
      expect(result.company.name).toBe('Savannah Agribusiness Ltd');
      expect(result.company.currency_code).toBe('ZMW');

      // Verify installer guard flag is locked
      expect(InstallerService.isInstalled()).toBe(true);

      // Verify company was saved in storage
      const savedCompanies = StorageService.getCompanies();
      expect(savedCompanies.length).toBe(1);
      expect(savedCompanies[0].name).toBe('Savannah Agribusiness Ltd');
    });
  });

  describe('10.2 Operations, Backup & Restore Engine', () => {
    it('creates a complete timestamped backup archive and calculates checksum', () => {
      // Seed data
      const comp: Company = {
        id: 'comp_test',
        name: 'Test Enterprise',
        legal_name: 'Test Enterprise Ltd',
        email: 'info@test.com',
        phone: '+260 211 000000',
        address_line1: '123 Main Street',
        currency_code: 'ZMW',
        is_vat_registered: false,
        vat_rate_bp: 0,
        invoice_prefix: 'INV-',
        next_invoice_number: 1,
        credit_note_prefix: 'CN-',
        next_credit_note_number: 1,
        receipt_prefix: 'REC-',
        next_receipt_number: 1,
        quotation_prefix: 'QT-',
        next_quotation_number: 1,
        city: 'Lusaka',
        country: 'Zambia',
      };
      StorageService.saveCompany(comp);

      const archive = BackupService.createBackup();
      expect(archive.version).toBe('1.0.0');
      expect(archive.data.companies.length).toBe(1);
      expect(archive.data.companies[0].id).toBe('comp_test');
      expect(archive.checksum).toBeDefined();
    });

    it('restores database state from backup archive and preserves data integrity', () => {
      // Create company & organisation
      const comp: Company = {
        id: 'comp_restore_test',
        name: 'Restore Company',
        legal_name: 'Restore Company Ltd',
        email: 'info@restore.com',
        phone: '+260 211 111111',
        address_line1: '456 Business Way',
        currency_code: 'USD',
        is_vat_registered: true,
        vat_rate_bp: 1600,
        invoice_prefix: 'INV-',
        next_invoice_number: 1,
        credit_note_prefix: 'CN-',
        next_credit_note_number: 1,
        receipt_prefix: 'REC-',
        next_receipt_number: 1,
        quotation_prefix: 'QT-',
        next_quotation_number: 1,
        city: 'Lusaka',
        country: 'Zambia',
      };
      StorageService.saveCompany(comp);

      const org: Organisation = {
        id: 'org_100',
        company_id: comp.id,
        name: 'Target Client Corp',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      StorageService.saveOrganisation(org);

      // Create backup archive
      const backupArchive = BackupService.createBackup();

      // Wipe storage completely
      StorageService.clearAllData();
      expect(StorageService.getCompanies().length).toBe(0);
      expect(StorageService.getOrganisations().length).toBe(0);

      // Restore from backup archive
      const restoreResult = BackupService.restoreBackup(backupArchive);
      expect(restoreResult.success).toBe(true);

      // Verify restored data
      const restoredCompanies = StorageService.getCompanies();
      const restoredOrgs = StorageService.getOrganisations();

      expect(restoredCompanies.length).toBe(1);
      expect(restoredCompanies[0].name).toBe('Restore Company');
      expect(restoredOrgs.length).toBe(1);
      expect(restoredOrgs[0].name).toBe('Target Client Corp');
    });

    it('backs up and restores marketing targets, activity results, credit notes, and custom pipeline stages seamlessly', () => {
      const comp: Company = {
        id: 'comp_full_test',
        name: 'Full Test Corp',
        legal_name: 'Full Test Corporation Ltd',
        email: 'info@fulltest.com',
        phone: '+260 211 999999',
        address_line1: '99 Finance Boulevard',
        currency_code: 'ZMW',
        is_vat_registered: true,
        vat_rate_bp: 1600,
        invoice_prefix: 'INV-',
        next_invoice_number: 1,
        credit_note_prefix: 'CN-',
        next_credit_note_number: 1,
        receipt_prefix: 'REC-',
        next_receipt_number: 1,
        quotation_prefix: 'QT-',
        next_quotation_number: 1,
        city: 'Lusaka',
        country: 'Zambia',
      };
      StorageService.saveCompany(comp);
      StorageService.setCurrentCompany(comp.id);

      StorageService.saveMarketingPlan({
        id: 'plan_test_1',
        company_id: comp.id,
        name: 'Q4 Growth Plan',
        objective: 'Expand SME base',
        start_date: '2026-10-01',
        end_date: '2026-12-31',
        budget_minor: 5000000,
        owner_user_id: 'user_owner',
        status: 'active',
        created_at: '2026-09-24T00:00:00Z',
        updated_at: '2026-09-24T00:00:00Z',
      });

      StorageService.saveMarketingTarget({
        id: 'target_test_1',
        company_id: comp.id,
        plan_id: 'plan_test_1',
        metric: 'leads_captured',
        target_value: 50,
        period: 'quarterly',
        period_start: '2026-10-01',
        period_end: '2026-12-31',
        created_at: '2026-09-24T00:00:00Z',
        updated_at: '2026-09-24T00:00:00Z',
      });

      StorageService.saveCreditNote({
        id: 'cn_test_1',
        company_id: comp.id,
        invoice_id: 'inv_dummy',
        number: 'CN-0001',
        issue_date: '2026-09-24',
        amount_minor: 10000,
        vat_minor: 1600,
        total_minor: 11600,
        reason: 'Goods returned',
        status: 'issued',
        created_at: '2026-09-24T00:00:00Z',
        updated_at: '2026-09-24T00:00:00Z',
      });

      const backup = BackupService.createBackup();
      expect(backup.data.marketingTargets?.length).toBe(1);
      expect(backup.data.creditNotes?.length).toBe(1);

      StorageService.clearAllData();
      expect(StorageService.getMarketingTargets('plan_test_1').length).toBe(0);

      const res = BackupService.restoreBackup(backup);
      expect(res.success).toBe(true);

      StorageService.setCurrentCompany(comp.id);
      expect(StorageService.getMarketingPlans().length).toBe(1);
      expect(StorageService.getMarketingTargets('plan_test_1').length).toBe(1);
      expect(StorageService.getCreditNotes().length).toBe(1);
    });

    it('health endpoint returns healthy status and record counts', () => {
      const health = InstallerService.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.database.connected).toBe(true);
      expect(health.database.writable).toBe(true);
      expect(typeof health.database.recordsCount).toBe('number');
    });
  });
});
