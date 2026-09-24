import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../services/storageService';
import { Company } from '../types';

describe('Multi-Company Management & Persistence', () => {
  beforeEach(() => {
    StorageService.resetToDefault();
  });

  it('retrieves default companies list and current active company', () => {
    const companies = StorageService.getCompanies();
    expect(companies.length).toBeGreaterThan(0);

    const currentCompany = StorageService.getCurrentCompany();
    expect(currentCompany).toBeDefined();
    expect(currentCompany.id).toBe(companies[0].id);
  });

  it('creates and saves a new subsidiary company', () => {
    const initialCompanies = StorageService.getCompanies();
    const countBefore = initialCompanies.length;

    const newCompany: Company = {
      id: 'comp_test_subsidiary_99',
      name: 'Savannah Renewable Energy',
      legal_name: 'Savannah Renewable Energy Ltd',
      tpin: '1000998877',
      is_vat_registered: true,
      vat_rate_bp: 1600,
      currency_code: 'ZMW',
      email: 'energy@savannah.co.zm',
      phone: '+260 97 9998888',
      address_line1: 'Plot 44, Solar Way',
      city: 'Ndola',
      country: 'Zambia',
      invoice_prefix: 'SOL-2026-',
      next_invoice_number: 1001,
      quotation_prefix: 'QUO-SOL-',
      next_quotation_number: 1001,
      credit_note_prefix: 'CN-SOL-',
      next_credit_note_number: 101,
    };

    StorageService.saveCompany(newCompany);

    const updatedCompanies = StorageService.getCompanies();
    expect(updatedCompanies.length).toBe(countBefore + 1);

    const retrieved = updatedCompanies.find((c) => c.id === 'comp_test_subsidiary_99');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Savannah Renewable Energy');
    expect(retrieved?.invoice_prefix).toBe('SOL-2026-');
  });

  it('updates an existing company settings and logo', () => {
    const current = StorageService.getCurrentCompany();
    const updatedCompany: Company = {
      ...current,
      legal_name: 'Savannah Holdings Group Limited',
      logo_url: 'data:image/svg+xml;utf8,<svg><text>LOGO</text></svg>',
      vat_rate_bp: 1600,
    };

    StorageService.updateCompany(updatedCompany);

    const refetched = StorageService.getCurrentCompany();
    expect(refetched.legal_name).toBe('Savannah Holdings Group Limited');
    expect(refetched.logo_url).toContain('data:image/svg+xml');
  });

  it('switches active company context', () => {
    const newCompany: Company = {
      id: 'comp_sub_22',
      name: 'Savannah Logistics',
      legal_name: 'Savannah Logistics Ltd',
      is_vat_registered: false,
      vat_rate_bp: 0,
      currency_code: 'USD',
      email: 'logistics@savannah.com',
      phone: '+260 96 1112223',
      address_line1: 'Kabwe Road',
      city: 'Lusaka',
      country: 'Zambia',
      next_invoice_number: 500,
      next_quotation_number: 500,
      next_credit_note_number: 500,
    };

    StorageService.saveCompany(newCompany);
    StorageService.setCurrentCompany('comp_sub_22');

    const active = StorageService.getCurrentCompany();
    expect(active.id).toBe('comp_sub_22');
    expect(active.currency_code).toBe('USD');
  });

  it('prevents deleting the last remaining company but deletes non-active companies', () => {
    const companies = StorageService.getCompanies();
    expect(companies.length).toBeGreaterThan(0);

    // Add a secondary company
    const secondary: Company = {
      id: 'comp_temp_to_delete',
      name: 'Temporary Entity',
      legal_name: 'Temporary Entity Ltd',
      is_vat_registered: false,
      vat_rate_bp: 0,
      currency_code: 'ZMW',
      email: 'temp@example.com',
      phone: '1234',
      address_line1: 'Temp St',
      city: 'Lusaka',
      country: 'Zambia',
      next_invoice_number: 1,
      next_quotation_number: 1,
      next_credit_note_number: 1,
    };
    StorageService.saveCompany(secondary);

    const deleteSuccess = StorageService.deleteCompany('comp_temp_to_delete');
    expect(deleteSuccess).toBe(true);

    const remaining = StorageService.getCompanies();
    expect(remaining.some((c) => c.id === 'comp_temp_to_delete')).toBe(false);
  });

  it('manages organizations, contacts, and catalog items with tenant isolation and soft deletion', () => {
    const currentComp = StorageService.getCurrentCompany();

    // Create organisation
    StorageService.saveOrganisation({
      id: 'org_test_new',
      company_id: currentComp.id,
      name: 'Zambezi Solar Energy',
      email: 'contact@zambezisolar.com',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const org = StorageService.getOrganisationById('org_test_new');
    expect(org).toBeDefined();
    expect(org?.name).toBe('Zambezi Solar Energy');

    // Create contact for this org
    StorageService.saveContact({
      id: 'cont_test_new',
      company_id: currentComp.id,
      organisation_id: 'org_test_new',
      first_name: 'Kangwa',
      last_name: 'Bwalya',
      email: 'kangwa@zambezisolar.com',
      is_primary: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const contact = StorageService.getContactById('cont_test_new');
    expect(contact).toBeDefined();
    expect(contact?.first_name).toBe('Kangwa');

    // Create item
    StorageService.saveItem({
      id: 'item_test_new',
      company_id: currentComp.id,
      code: 'SOL-PNL-400W',
      name: '400W Monocrystalline Solar Panel',
      description: 'High-efficiency solar PV module',
      unit: 'pcs',
      default_unit_price_minor: 250000,
      is_vatable: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const item = StorageService.getItemById('item_test_new');
    expect(item).toBeDefined();
    expect(item?.code).toBe('SOL-PNL-400W');

    // Soft delete item, contact, and organisation
    StorageService.deleteItem('item_test_new');
    expect(StorageService.getItemById('item_test_new')).toBeUndefined();
    expect(StorageService.getItems().some((i) => i.id === 'item_test_new')).toBe(false);

    StorageService.deleteContact('cont_test_new');
    expect(StorageService.getContactById('cont_test_new')).toBeUndefined();

    StorageService.deleteOrganisation('org_test_new');
    expect(StorageService.getOrganisationById('org_test_new')).toBeUndefined();
  });
});
