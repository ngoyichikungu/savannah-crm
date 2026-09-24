import { describe, it, expect } from 'vitest';
import { Money } from '../support/money';
import { InvoiceStatusResolver } from '../services/invoiceStatusResolver';
import { InvoiceService } from '../services/invoiceService';
import { DocumentPdfService } from '../services/documentPdfService';
import { Company, Invoice, Quotation } from '../types';

describe('Part 5 Test Suite', () => {
  const mockCompanyVat: Company = {
    id: 'comp_1',
    name: 'Savannah Tech Solutions Ltd',
    legal_name: 'Savannah Technology Solutions Limited',
    tpin: '1002345678',
    is_vat_registered: true,
    vat_rate_bp: 1600, // 16%
    currency_code: 'ZMW',
    email: 'accounts@savannahtech.zm',
    phone: '+260 211 123456',
    address_line1: 'Plot 4509, Great East Road',
    city: 'Lusaka',
    country: 'Zambia',
    bank_name: 'Stanbic Bank Zambia',
    bank_account_name: 'Savannah Technology Solutions Limited',
    bank_account_number: '9130004928172',
    bank_branch_code: '040002',
    momo_provider: 'Airtel Money',
    momo_account_number: '0977123456',
    invoice_prefix: 'INV-',
    quotation_prefix: 'QT-',
    credit_note_prefix: 'CN-',
    next_invoice_number: 101,
    next_quotation_number: 55,
    next_credit_note_number: 12,
  };

  const mockCompanyNonVat: Company = {
    ...mockCompanyVat,
    id: 'comp_2',
    name: 'Kafue Small Business',
    legal_name: 'Kafue Small Business Enterprises',
    is_vat_registered: false,
    vat_rate_bp: 0,
    tpin: '2009876543',
  };

  describe('5.5.1: Editing a sent invoice is rejected at the service layer', () => {
    it('allows editing line items on a draft invoice', () => {
      const { invoice } = InvoiceService.createInvoice(mockCompanyVat, {
        company_id: mockCompanyVat.id,
        organisation_id: 'org_1',
        issue_date: '2026-09-20',
        due_date: '2026-10-20',
        issued_by_user_id: 'user_1',
        lines: [
          {
            description: 'Web Hosting 1 Year',
            quantity_thousandths: 1000,
            unit_price_minor: 50000, // 500.00
          },
        ],
      });

      expect(invoice.status).toBe('draft');
      expect(invoice.total_minor).toBe(58000); // 500 + 16% VAT = 580.00

      // Editing draft should succeed
      const updated = InvoiceService.updateInvoice(invoice, {
        lines: [
          {
            description: 'Web Hosting 2 Years',
            quantity_thousandths: 2000,
            unit_price_minor: 50000,
          },
        ],
      });

      expect(updated.total_minor).toBe(116000); // 1,000 + 16% = 1160.00
    });

    it('throws an error and rejects editing lines or totals on a sent invoice', () => {
      const { invoice } = InvoiceService.createInvoice(mockCompanyVat, {
        company_id: mockCompanyVat.id,
        organisation_id: 'org_1',
        issue_date: '2026-09-20',
        due_date: '2026-10-20',
        issued_by_user_id: 'user_1',
        lines: [
          {
            description: 'IT Consulting Services',
            quantity_thousandths: 5000,
            unit_price_minor: 100000,
          },
        ],
      });

      const sentInvoice = InvoiceService.sendInvoice(invoice);
      expect(sentInvoice.status).toBe('sent');

      // Attempting to edit line items must throw
      expect(() => {
        InvoiceService.updateInvoice(sentInvoice, {
          lines: [
            {
              description: 'Altered Items',
              quantity_thousandths: 1000,
              unit_price_minor: 10000,
            },
          ],
        });
      }).toThrow(/Accounting Integrity Violation/i);

      // Attempting to edit discount must throw
      expect(() => {
        InvoiceService.updateInvoice(sentInvoice, {
          discount_type: 'percent',
          discount_value: 1000,
        });
      }).toThrow(/Accounting Integrity Violation/i);

      // Attempting to edit VAT rate must throw
      expect(() => {
        InvoiceService.updateInvoice(sentInvoice, {
          vat_rate_bp: 0,
        });
      }).toThrow(/Accounting Integrity Violation/i);
    });

    it('rejects cancellation of an invoice with allocated payments', () => {
      const { invoice } = InvoiceService.createInvoice(mockCompanyVat, {
        company_id: mockCompanyVat.id,
        organisation_id: 'org_1',
        issue_date: '2026-09-20',
        due_date: '2026-10-20',
        issued_by_user_id: 'user_1',
        lines: [
          {
            description: 'Consulting',
            quantity_thousandths: 1000,
            unit_price_minor: 100000,
          },
        ],
      });

      const sent = InvoiceService.sendInvoice(invoice);
      const { invoice: paidPartial } = InvoiceService.recordPayment(sent, {
        amount_minor: 50000,
        payment_method: 'bank_transfer',
      });

      expect(() => {
        InvoiceService.cancelInvoice(paidPartial, 'Client cancelled');
      }).toThrow(/payments allocated/i);
    });
  });

  describe('5.5.2: InvoiceStatusResolver every branch including due-date boundary at exactly today', () => {
    const today = '2026-09-22';

    it('returns draft for draft status', () => {
      const status = InvoiceStatusResolver.resolve({
        status: 'draft',
        total_minor: 10000,
        balance_due_minor: 10000,
        due_date: '2026-09-15',
      }, today);
      expect(status).toBe('draft');
    });

    it('returns cancelled for cancelled status', () => {
      const status = InvoiceStatusResolver.resolve({
        status: 'cancelled',
        total_minor: 10000,
        balance_due_minor: 10000,
        due_date: '2026-09-15',
      }, today);
      expect(status).toBe('cancelled');
    });

    it('returns paid when balance due is zero', () => {
      const status = InvoiceStatusResolver.resolve({
        status: 'sent',
        total_minor: 10000,
        balance_due_minor: 0,
        amount_paid_minor: 10000,
        due_date: '2026-09-10',
      }, today);
      expect(status).toBe('paid');
    });

    it('returns partially_paid when 0 < balance < total and not past due', () => {
      const status = InvoiceStatusResolver.resolve({
        status: 'sent',
        total_minor: 10000,
        balance_due_minor: 4000,
        amount_paid_minor: 6000,
        due_date: '2026-09-30', // in future
      }, today);
      expect(status).toBe('partially_paid');
    });

    it('returns sent when balance equals total and due date is in the future', () => {
      const status = InvoiceStatusResolver.resolve({
        status: 'sent',
        total_minor: 10000,
        balance_due_minor: 10000,
        due_date: '2026-09-30',
      }, today);
      expect(status).toBe('sent');
    });

    it('handles due-date boundary at EXACTLY TODAY: not overdue on the exact due date', () => {
      // Due date is 2026-09-22, asOfDate is 2026-09-22 (today)
      const statusOnDueDate = InvoiceStatusResolver.resolve({
        status: 'sent',
        total_minor: 10000,
        balance_due_minor: 10000,
        due_date: '2026-09-22',
      }, today);
      expect(statusOnDueDate).toBe('sent');

      const partialOnDueDate = InvoiceStatusResolver.resolve({
        status: 'sent',
        total_minor: 10000,
        balance_due_minor: 5000,
        amount_paid_minor: 5000,
        due_date: '2026-09-22',
      }, today);
      expect(partialOnDueDate).toBe('partially_paid');
    });

    it('returns overdue when date is 1 day past due date with remaining balance', () => {
      // Due date was yesterday: 2026-09-21, asOfDate is 2026-09-22
      const statusPastDueFull = InvoiceStatusResolver.resolve({
        status: 'sent',
        total_minor: 10000,
        balance_due_minor: 10000,
        due_date: '2026-09-21',
      }, today);
      expect(statusPastDueFull).toBe('overdue');

      const statusPastDuePartial = InvoiceStatusResolver.resolve({
        status: 'sent',
        total_minor: 10000,
        balance_due_minor: 3000,
        amount_paid_minor: 7000,
        due_date: '2026-09-21',
      }, today);
      expect(statusPastDuePartial).toBe('overdue');
    });
  });

  describe('5.5.3: Amount-in-words helper on Money', () => {
    it('converts 0 correctly', () => {
      expect(new Money(0, 'ZMW').amountInWords()).toBe('Zero Kwacha Only');
    });

    it('converts 1 (100 minor) correctly', () => {
      expect(new Money(100, 'ZMW').amountInWords()).toBe('One Kwacha Only');
    });

    it('converts 99 (9900 minor) correctly', () => {
      expect(new Money(9900, 'ZMW').amountInWords()).toBe('Ninety-Nine Kwacha Only');
    });

    it('converts 100 (10000 minor) correctly', () => {
      expect(new Money(10000, 'ZMW').amountInWords()).toBe('One Hundred Kwacha Only');
    });

    it('converts 1000 (100000 minor) correctly', () => {
      expect(new Money(100000, 'ZMW').amountInWords()).toBe('One Thousand Kwacha Only');
    });

    it('converts 1000000 (100000000 minor) correctly', () => {
      expect(new Money(100000000, 'ZMW').amountInWords()).toBe('One Million Kwacha Only');
    });

    it('converts values with ngwee correctly', () => {
      // 125.50 ZMW = 12550 minor
      expect(new Money(12550, 'ZMW').amountInWords()).toBe('One Hundred Twenty-Five Kwacha and Fifty Ngwee Only');

      // 0.75 ZMW = 75 minor
      expect(new Money(75, 'ZMW').amountInWords()).toBe('Seventy-Five Ngwee Only');

      // 1000.05 ZMW = 100005 minor
      expect(new Money(100005, 'ZMW').amountInWords()).toBe('One Thousand Kwacha and Five Ngwee Only');
    });
  });

  describe('5.5.4: PDF renders for VAT-registered and non-registered company', () => {
    const mockInvoice: Invoice = {
      id: 'inv_test_1',
      company_id: 'comp_1',
      organisation_id: 'org_1',
      number: 'INV-2026-00001',
      issue_date: '2026-09-22',
      due_date: '2026-10-22',
      payment_terms_days: 30,
      currency_code: 'ZMW',
      subtotal_minor: 100000,
      discount_type: 'none',
      discount_value: 0,
      discount_minor: 0,
      vat_rate_bp: 1600,
      vat_minor: 16000,
      total_minor: 116000,
      amount_paid_minor: 0,
      balance_due_minor: 116000,
      status: 'sent',
      issued_by_user_id: 'user_1',
      created_at: '2026-09-22T00:00:00Z',
      updated_at: '2026-09-22T00:00:00Z',
      lines: [
        {
          id: 'line_1',
          company_id: 'comp_1',
          invoice_id: 'inv_test_1',
          sort_order: 1,
          item_code: 'SRV-01',
          description: 'Network Installation',
          quantity_thousandths: 1000,
          unit: 'service',
          unit_price_minor: 100000,
          discount_percent_bp: 0,
          line_subtotal_minor: 100000,
          is_vatable: true,
          line_vat_minor: 16000,
          line_total_minor: 116000,
          created_at: '2026-09-22T00:00:00Z',
          updated_at: '2026-09-22T00:00:00Z',
        },
      ],
    };

    it('renders "TAX INVOICE" heading when company is VAT-registered', () => {
      const heading = DocumentPdfService.getInvoiceHeading(mockCompanyVat);
      expect(heading).toBe('TAX INVOICE');

      const html = DocumentPdfService.renderInvoiceHtml(mockInvoice, mockCompanyVat);
      expect(html).toContain('TAX INVOICE');
      expect(html).toContain('TPIN / Tax Reg:');
    });

    it('renders "INVOICE" heading when company is NOT VAT-registered', () => {
      const heading = DocumentPdfService.getInvoiceHeading(mockCompanyNonVat);
      expect(heading).toBe('INVOICE');

      const html = DocumentPdfService.renderInvoiceHtml(mockInvoice, mockCompanyNonVat);
      expect(html).toContain('INVOICE');
      expect(html).not.toContain('TAX INVOICE');
    });
  });

  describe('5.5.5: Converting a quotation produces an invoice with identical stored totals', () => {
    it('preserves subtotal, discounts, VAT, and grand total identically', () => {
      const sourceQuotation: Quotation = {
        id: 'qt_100',
        company_id: mockCompanyVat.id,
        organisation_id: 'org_abc',
        contact_id: 'contact_xyz',
        number: 'QT-2026-00055',
        title: 'Enterprise Server Migration',
        reference: 'RFP-2026-99',
        issue_date: '2026-09-10',
        valid_until: '2026-10-10',
        currency_code: 'ZMW',
        subtotal_minor: 250000, // 2500.00
        discount_type: 'percent',
        discount_value: 1000, // 10.00%
        discount_minor: 25000, // 250.00
        vat_rate_bp: 1600,
        vat_minor: 36000, // 16% of 2250.00 = 360.00
        total_minor: 261000, // 2610.00
        status: 'accepted',
        revision_number: 0,
        prepared_by_user_id: 'user_1',
        created_at: '2026-09-10T00:00:00Z',
        updated_at: '2026-09-15T00:00:00Z',
        lines: [
          {
            id: 'ql_1',
            company_id: mockCompanyVat.id,
            quotation_id: 'qt_100',
            sort_order: 1,
            item_code: 'MIG-01',
            description: 'Database Migration Service',
            quantity_thousandths: 1000,
            unit: 'job',
            unit_price_minor: 250000,
            discount_percent_bp: 0,
            line_subtotal_minor: 250000,
            is_vatable: true,
            line_vat_minor: 40000,
            line_total_minor: 290000,
            created_at: '2026-09-10T00:00:00Z',
            updated_at: '2026-09-10T00:00:00Z',
          },
        ],
      };

      const { invoice } = InvoiceService.convertQuotationToInvoice(mockCompanyVat, sourceQuotation, 'user_1');

      expect(invoice.quotation_id).toBe(sourceQuotation.id);
      expect(invoice.organisation_id).toBe(sourceQuotation.organisation_id);
      expect(invoice.contact_id).toBe(sourceQuotation.contact_id);
      expect(invoice.currency_code).toBe(sourceQuotation.currency_code);

      // Stored totals MUST be identical
      expect(invoice.subtotal_minor).toBe(sourceQuotation.subtotal_minor);
      expect(invoice.discount_type).toBe(sourceQuotation.discount_type);
      expect(invoice.discount_value).toBe(sourceQuotation.discount_value);
      expect(invoice.discount_minor).toBe(sourceQuotation.discount_minor);
      expect(invoice.vat_rate_bp).toBe(sourceQuotation.vat_rate_bp);
      expect(invoice.vat_minor).toBe(sourceQuotation.vat_minor);
      expect(invoice.total_minor).toBe(sourceQuotation.total_minor);
      expect(invoice.balance_due_minor).toBe(sourceQuotation.total_minor);
      expect(invoice.amount_paid_minor).toBe(0);
      expect(invoice.lines?.length).toBe(sourceQuotation.lines?.length);
    });
  });

  describe('5.5.6: invoices:verify-balances detects a deliberately corrupted balance', () => {
    it('detects no discrepancies on healthy invoices', () => {
      const { invoice } = InvoiceService.createInvoice(mockCompanyVat, {
        company_id: mockCompanyVat.id,
        organisation_id: 'org_1',
        issue_date: '2026-09-20',
        due_date: '2026-10-20',
        issued_by_user_id: 'user_1',
        lines: [
          {
            description: 'Consulting',
            quantity_thousandths: 1000,
            unit_price_minor: 100000,
          },
        ],
      });

      const sent = InvoiceService.sendInvoice(invoice);
      const { invoice: paid } = InvoiceService.recordPayment(sent, {
        amount_minor: 30000,
        payment_method: 'bank_transfer',
      });

      const discrepancies = InvoiceService.verifyInvoiceBalances([paid]);
      expect(discrepancies.length).toBe(0);
    });

    it('flags and reports a deliberately corrupted balance due or amount paid', () => {
      const { invoice } = InvoiceService.createInvoice(mockCompanyVat, {
        company_id: mockCompanyVat.id,
        organisation_id: 'org_1',
        issue_date: '2026-09-20',
        due_date: '2026-10-20',
        issued_by_user_id: 'user_1',
        lines: [
          {
            description: 'Consulting',
            quantity_thousandths: 1000,
            unit_price_minor: 100000,
          },
        ],
      });

      const sent = InvoiceService.sendInvoice(invoice);
      const { invoice: paid } = InvoiceService.recordPayment(sent, {
        amount_minor: 50000,
        payment_method: 'bank_transfer',
      });

      // Deliberately corrupt stored balance
      const corruptedInvoice: Invoice = {
        ...paid,
        amount_paid_minor: 20000, // Corrupted from 50000
        balance_due_minor: 96000, // Corrupted from 66000 (total is 116000)
      };

      const discrepancies = InvoiceService.verifyInvoiceBalances([corruptedInvoice]);
      expect(discrepancies.length).toBe(1);
      expect(discrepancies[0].invoice_id).toBe(corruptedInvoice.id);
      expect(discrepancies[0].stored_paid_minor).toBe(20000);
      expect(discrepancies[0].computed_paid_minor).toBe(50000);
      expect(discrepancies[0].stored_balance_due_minor).toBe(96000);
      expect(discrepancies[0].computed_balance_due_minor).toBe(66000);
    });
  });
});
