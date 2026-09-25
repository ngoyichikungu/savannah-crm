import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../services/storageService';
import { Company, Contact, Organisation } from '../types';

describe('Client Accounts Management — Capture & Edit Client Details', () => {
  const testCompany: Company = {
    id: 'comp_client_test',
    name: 'Savannah Operations Ltd',
    legal_name: 'Savannah Operations Limited',
    tpin: '1001234567',
    is_vat_registered: true,
    vat_rate_bp: 1600,
    currency_code: 'ZMW',
    email: 'finance@savannah.co.zm',
    phone: '+260 211 123456',
    address_line1: 'Plot 44, Cairo Road',
    city: 'Lusaka',
    country: 'Zambia',
    next_invoice_number: 1001,
    next_quotation_number: 5001,
    next_credit_note_number: 3001,
  };

  beforeEach(() => {
    StorageService.saveCompany(testCompany);
    StorageService.setCurrentCompany(testCompany.id);
  });

  it('captures a new client organisation with full billing details', () => {
    const newOrg: Organisation = {
      id: 'org_test_mumbwa',
      company_id: testCompany.id,
      name: 'Mumbwa Grain Growers Co-op',
      tpin: '1009876543',
      email: 'accounts@mumbwagrain.co.zm',
      phone: '+260 97 9998888',
      address_line1: 'Plot 12, Mumbwa Boma Road',
      address_line2: 'Shed 3',
      city: 'Mumbwa',
      country: 'Zambia',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    StorageService.saveOrganisation(newOrg);

    const fetched = StorageService.getOrganisationById(newOrg.id);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Mumbwa Grain Growers Co-op');
    expect(fetched?.tpin).toBe('1009876543');
    expect(fetched?.city).toBe('Mumbwa');
    expect(fetched?.email).toBe('accounts@mumbwagrain.co.zm');
    expect(fetched?.phone).toBe('+260 97 9998888');
  });

  it('modifies and updates existing client details (name, TPIN, address, phone)', () => {
    const orgId = 'org_test_edit_sample';
    const initialOrg: Organisation = {
      id: orgId,
      company_id: testCompany.id,
      name: 'Kafue Agrivet Supplies',
      tpin: '1001112223',
      email: 'info@kafueagri.co.zm',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    StorageService.saveOrganisation(initialOrg);

    // Edit organisation details
    const updatedOrg: Organisation = {
      ...initialOrg,
      name: 'Kafue Agrivet Enterprises Limited',
      tpin: '1001119999',
      phone: '+260 96 1112233',
      address_line1: 'Plot 88, Kafue Industrial Area',
      city: 'Kafue',
      country: 'Zambia',
      updated_at: new Date().toISOString(),
    };
    StorageService.saveOrganisation(updatedOrg);

    const retrieved = StorageService.getOrganisationById(orgId);
    expect(retrieved?.name).toBe('Kafue Agrivet Enterprises Limited');
    expect(retrieved?.tpin).toBe('1001119999');
    expect(retrieved?.phone).toBe('+260 96 1112233');
    expect(retrieved?.address_line1).toBe('Plot 88, Kafue Industrial Area');
    expect(retrieved?.city).toBe('Kafue');
  });

  it('captures and links primary contact person details for a client organisation', () => {
    const orgId = 'org_test_with_contact';
    const org: Organisation = {
      id: orgId,
      company_id: testCompany.id,
      name: 'Mazabuka Sugar Logistics',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    StorageService.saveOrganisation(org);

    const contact: Contact = {
      id: 'cont_test_primary',
      company_id: testCompany.id,
      organisation_id: orgId,
      first_name: 'Choolwe',
      last_name: 'Mutale',
      email: 'c.mutale@mazabukasugar.co.zm',
      phone: '+260 97 5554443',
      job_title: 'Procurement Officer',
      is_primary: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    StorageService.saveContact(contact);

    const orgContacts = StorageService.getContacts(orgId);
    expect(orgContacts.length).toBeGreaterThanOrEqual(1);
    const primary = orgContacts.find((c) => c.is_primary);
    expect(primary).toBeDefined();
    expect(primary?.first_name).toBe('Choolwe');
    expect(primary?.last_name).toBe('Mutale');
    expect(primary?.job_title).toBe('Procurement Officer');
    expect(primary?.email).toBe('c.mutale@mazabukasugar.co.zm');
  });

  it('updates contact details when client details are modified', () => {
    const orgId = 'org_test_contact_update';
    const contactId = 'cont_test_update';

    const contact: Contact = {
      id: contactId,
      company_id: testCompany.id,
      organisation_id: orgId,
      first_name: 'David',
      last_name: 'Phiri',
      email: 'd.phiri@olddomain.com',
      job_title: 'Manager',
      is_primary: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    StorageService.saveContact(contact);

    // Update contact
    const updatedContact: Contact = {
      ...contact,
      job_title: 'Managing Director',
      email: 'david.phiri@newdomain.co.zm',
      phone: '+260 95 0001112',
      updated_at: new Date().toISOString(),
    };
    StorageService.saveContact(updatedContact);

    const retrieved = StorageService.getContactById(contactId);
    expect(retrieved?.job_title).toBe('Managing Director');
    expect(retrieved?.email).toBe('david.phiri@newdomain.co.zm');
    expect(retrieved?.phone).toBe('+260 95 0001112');
  });
});
