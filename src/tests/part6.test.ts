import { describe, it, expect, beforeEach } from 'vitest';
import { Money } from '../support/money';
import { PaymentService } from '../services/paymentService';
import { StorageService } from '../services/storageService';
import { DocumentPdfService } from '../services/documentPdfService';
import { Company, Invoice, Organisation, User } from '../types';

describe('Part 6 — Payments and Receipts Test Suite', () => {
  const mockCompany: Company = {
    id: 'comp_test_savannah',
    name: 'Savannah Tech Solutions Ltd',
    legal_name: 'Savannah Technology Solutions Limited',
    tpin: '1002345678',
    is_vat_registered: true,
    vat_rate_bp: 1600,
    currency_code: 'ZMW',
    email: 'billing@savannahtech.co.zm',
    phone: '+260 211 254890',
    address_line1: 'Plot 4509, Great East Road',
    city: 'Lusaka',
    country: 'Zambia',
    receipt_prefix: 'REC-',
    next_invoice_number: 101,
    next_quotation_number: 50,
    next_credit_note_number: 10,
    next_receipt_number: 1,
  };

  const adminUser: User = {
    id: 'user_admin',
    name: 'Admin User',
    email: 'admin@savannah.co.zm',
    role: 'owner',
    company_ids: ['comp_test_savannah'],
    current_company_id: 'comp_test_savannah',
  };

  const salesUser: User = {
    id: 'user_sales',
    name: 'Sales Rep',
    email: 'sales@savannah.co.zm',
    role: 'sales_rep',
    company_ids: ['comp_test_savannah'],
    current_company_id: 'comp_test_savannah',
  };

  const clientOrg: Organisation = {
    id: 'org_test_client',
    company_id: 'comp_test_savannah',
    name: 'Zambezi Enterprises Ltd',
    tpin: '1009988776',
    email: 'accounts@zambezi.com.zm',
    phone: '+260 977 123456',
    address_line1: 'Cairo Road, City Center',
    city: 'Lusaka',
    country: 'Zambia',
    is_active: true,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  beforeEach(() => {
    StorageService.resetToDefault();
    const db = StorageService.getDb();
    db.companies = [mockCompany];
    db.currentCompanyId = mockCompany.id;
    db.currentUser = adminUser;
    db.organisations = [clientOrg];
    db.invoices = [];
    db.payments = [];
    db.paymentAllocations = [];
    StorageService.save();
  });

  describe('6.3.1: Proportional Allocation & Money.allocateByRatio (Rounding Remainder Guarantee)', () => {
    it('allocates K1,000 across three invoices proportionally and distributes rounding remainders so sum equals exactly K1,000.00', () => {
      // 3 Invoices with different balances: K300, K500, K700 (Total = K1,500)
      const inv1: Invoice = {
        id: 'inv_p1',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-001',
        issue_date: '2026-09-01',
        due_date: '2026-10-01',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 30000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 30000, // K300.00
        amount_paid_minor: 0,
        balance_due_minor: 30000,
        status: 'sent',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      };

      const inv2: Invoice = {
        ...inv1,
        id: 'inv_p2',
        number: 'INV-002',
        subtotal_minor: 50000,
        total_minor: 50000, // K500.00
        balance_due_minor: 50000,
      };

      const inv3: Invoice = {
        ...inv1,
        id: 'inv_p3',
        number: 'INV-003',
        subtotal_minor: 70000,
        total_minor: 70000, // K700.00
        balance_due_minor: 70000,
      };

      const totalPaymentMinor = 100000; // K1,000.00 (100,000 ngwee)
      const allocations = PaymentService.calculateProportional([inv1, inv2, inv3], totalPaymentMinor, 'ZMW');

      expect(allocations).toHaveLength(3);

      const sumAllocatedMinor = allocations.reduce((sum, a) => sum + a.amount_minor, 0);
      expect(sumAllocatedMinor).toBe(totalPaymentMinor); // Exactly 100,000 ngwee (K1,000.00)

      // Ratio weights are 3:5:7 (total 15). 100,000 * 3/15 = 20,000; 100,000 * 5/15 = 33,333.33; 100,000 * 7/15 = 46,666.66
      // Integer breakdown must sum to exactly 100,000
      expect(allocations[0].amount_minor).toBe(20000); // K200.00
      expect(allocations[1].amount_minor).toBe(33333); // K333.33
      expect(allocations[2].amount_minor).toBe(46667); // K466.67
      expect(allocations[0].amount_minor + allocations[1].amount_minor + allocations[2].amount_minor).toBe(100000);
    });

    it('handles equal ratios without losing a single ngwee on odd amounts', () => {
      // Allocate K100.00 (10,000 ngwee) across 3 identical invoices (3,333.333... each)
      const ratios = [10000, 10000, 10000];
      const result = Money.allocateByRatio(10000, ratios, 'ZMW');

      const sum = result.reduce((s, m) => s + m.amountMinor, 0);
      expect(sum).toBe(10000);
      expect(result[0].amountMinor + result[1].amountMinor + result[2].amountMinor).toBe(10000);
      // Remainder ngwee is distributed (e.g. 3334, 3333, 3333)
      expect(result.map((m) => m.amountMinor).sort()).toEqual([3333, 3333, 3334]);
    });
  });

  describe('6.3.2: Over-allocation and Excessive Invoice Allocation Validation', () => {
    it('rejects allocation when sum of allocations exceeds the payment amount', () => {
      const inv: Invoice = {
        id: 'inv_1',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-101',
        issue_date: '2026-09-01',
        due_date: '2026-10-01',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 50000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 50000,
        amount_paid_minor: 0,
        balance_due_minor: 50000, // K500.00
        status: 'sent',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      };
      StorageService.saveInvoice(inv);

      expect(() => {
        PaymentService.recordPayment({
          company: mockCompany,
          organisation_id: clientOrg.id,
          payment_date: '2026-09-20',
          method: 'bank_transfer',
          currency_code: 'ZMW',
          amount_minor: 20000, // K200 payment
          allocations: [{ invoice_id: 'inv_1', amount_minor: 30000 }], // K300 requested -> over-allocation!
          received_by_user_id: adminUser.id,
        });
      }).toThrow(/Over-allocation rejected/i);
    });

    it('rejects allocation when amount exceeds an individual invoice balance due', () => {
      const inv: Invoice = {
        id: 'inv_2',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-102',
        issue_date: '2026-09-01',
        due_date: '2026-10-01',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 50000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 50000,
        amount_paid_minor: 40000,
        balance_due_minor: 10000, // Only K100.00 remaining
        status: 'partially_paid',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      };
      StorageService.saveInvoice(inv);

      expect(() => {
        PaymentService.recordPayment({
          company: mockCompany,
          organisation_id: clientOrg.id,
          payment_date: '2026-09-20',
          method: 'cash',
          currency_code: 'ZMW',
          amount_minor: 50000, // K500 received
          allocations: [{ invoice_id: 'inv_2', amount_minor: 20000 }], // K200 allocated to K100 balance!
          received_by_user_id: adminUser.id,
        });
      }).toThrow(/Allocation exceeding balance rejected/i);
    });

    it('rejects allocating payments to draft invoices', () => {
      const draftInv: Invoice = {
        id: 'inv_draft',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-DRAFT',
        issue_date: '2026-09-01',
        due_date: '2026-10-01',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 50000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 50000,
        amount_paid_minor: 0,
        balance_due_minor: 50000,
        status: 'draft',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      };
      StorageService.saveInvoice(draftInv);

      expect(() => {
        PaymentService.recordPayment({
          company: mockCompany,
          organisation_id: clientOrg.id,
          payment_date: '2026-09-20',
          method: 'cash',
          currency_code: 'ZMW',
          amount_minor: 10000,
          allocations: [{ invoice_id: 'inv_draft', amount_minor: 10000 }],
          received_by_user_id: adminUser.id,
        });
      }).toThrow(/Cannot allocate payment to draft invoice/i);
    });
  });

  describe('6.3.3: Invoice Status Lifecycle: draft -> sent -> partially_paid -> paid', () => {
    it('moves invoice status across successive payments correctly', () => {
      const inv: Invoice = {
        id: 'inv_lifecycle',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-2026-00010',
        issue_date: '2026-09-10',
        due_date: '2026-10-10',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 100000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 100000, // K1,000.00
        amount_paid_minor: 0,
        balance_due_minor: 100000,
        status: 'sent',
        sent_at: '2026-09-10T10:00:00Z',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-10T10:00:00Z',
        updated_at: '2026-09-10T10:00:00Z',
      };
      StorageService.saveInvoice(inv);

      // Payment 1: Part-pay K400.00 (40,000 minor)
      const res1 = PaymentService.recordPayment({
        company: mockCompany,
        organisation_id: clientOrg.id,
        payment_date: '2026-09-15',
        method: 'bank_transfer',
        currency_code: 'ZMW',
        amount_minor: 40000,
        allocations: [{ invoice_id: inv.id, amount_minor: 40000 }],
        received_by_user_id: adminUser.id,
      });

      const updatedInv1 = StorageService.getInvoiceById(inv.id)!;
      expect(updatedInv1.status).toBe('partially_paid');
      expect(updatedInv1.amount_paid_minor).toBe(40000);
      expect(updatedInv1.balance_due_minor).toBe(60000);
      expect(updatedInv1.fully_paid_at).toBeUndefined();
      expect(res1.payment.receipt_number).toBe('REC-2026-00001');

      // Payment 2: Settle remaining K600.00 (60,000 minor)
      const res2 = PaymentService.recordPayment({
        company: res1.updatedCompany,
        organisation_id: clientOrg.id,
        payment_date: '2026-09-20',
        method: 'mobile_money',
        currency_code: 'ZMW',
        amount_minor: 60000,
        allocations: [{ invoice_id: inv.id, amount_minor: 60000 }],
        received_by_user_id: adminUser.id,
      });

      const updatedInv2 = StorageService.getInvoiceById(inv.id)!;
      expect(updatedInv2.status).toBe('paid');
      expect(updatedInv2.amount_paid_minor).toBe(100000);
      expect(updatedInv2.balance_due_minor).toBe(0);
      expect(updatedInv2.fully_paid_at).toBeDefined();
      expect(res2.payment.receipt_number).toBe('REC-2026-00002');
    });
  });

  describe('6.3.4: Unallocating & Reversal of Payment Allocations', () => {
    it('restores invoice balance, re-resolves status, and returns funds to parent unallocated pool', () => {
      const inv: Invoice = {
        id: 'inv_to_unalloc',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-2026-00020',
        issue_date: '2026-09-10',
        due_date: '2026-10-10',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 100000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 100000,
        amount_paid_minor: 0,
        balance_due_minor: 100000,
        status: 'sent',
        sent_at: '2026-09-10T10:00:00Z',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-10T10:00:00Z',
        updated_at: '2026-09-10T10:00:00Z',
      };
      StorageService.saveInvoice(inv);

      // Pay fully K1,000.00
      const payRes = PaymentService.recordPayment({
        company: mockCompany,
        organisation_id: clientOrg.id,
        payment_date: '2026-09-15',
        method: 'cheque',
        currency_code: 'ZMW',
        amount_minor: 100000,
        allocations: [{ invoice_id: inv.id, amount_minor: 100000 }],
        received_by_user_id: adminUser.id,
      });

      const alloc = payRes.allocations[0];
      const invPaid = StorageService.getInvoiceById(inv.id)!;
      expect(invPaid.status).toBe('paid');
      expect(invPaid.balance_due_minor).toBe(0);

      // Now unallocate via Admin User
      const unallocRes = PaymentService.unallocate(alloc.id, adminUser, 'Cheque bounced/returned');

      expect(unallocRes.reversedAllocation.is_reversed).toBe(true);
      expect(unallocRes.reversedAllocation.reversed_by_user_id).toBe(adminUser.id);
      expect(unallocRes.reversedAllocation.reversal_reason).toBe('Cheque bounced/returned');

      // Parent payment should have amount returned to unallocated pool
      expect(unallocRes.updatedPayment.allocated_minor).toBe(0);
      expect(unallocRes.updatedPayment.unallocated_minor).toBe(100000);

      // Invoice status and balance restored
      const restoredInv = StorageService.getInvoiceById(inv.id)!;
      expect(restoredInv.amount_paid_minor).toBe(0);
      expect(restoredInv.balance_due_minor).toBe(100000);
      expect(restoredInv.status).toBe('sent'); // Restored to sent
      expect(restoredInv.fully_paid_at).toBeUndefined();
    });

    it('rejects unallocating by non-admin users (RBAC check)', () => {
      const inv: Invoice = {
        id: 'inv_rbac',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-2026-00021',
        issue_date: '2026-09-10',
        due_date: '2026-10-10',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 50000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 50000,
        amount_paid_minor: 0,
        balance_due_minor: 50000,
        status: 'sent',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-10T10:00:00Z',
        updated_at: '2026-09-10T10:00:00Z',
      };
      StorageService.saveInvoice(inv);

      const payRes = PaymentService.recordPayment({
        company: mockCompany,
        organisation_id: clientOrg.id,
        payment_date: '2026-09-15',
        method: 'cash',
        currency_code: 'ZMW',
        amount_minor: 50000,
        allocations: [{ invoice_id: inv.id, amount_minor: 50000 }],
        received_by_user_id: adminUser.id,
      });

      expect(() => {
        PaymentService.unallocate(payRes.allocations[0].id, salesUser);
      }).toThrow(/Permission denied/i);
    });
  });

  describe('6.3.5: Atomic Transaction Rollback on Mid-Service Failure', () => {
    it('rolls back all changes atomically if an error occurs mid-operation, leaving no orphan rows', () => {
      const inv: Invoice = {
        id: 'inv_tx_test',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-TX-01',
        issue_date: '2026-09-10',
        due_date: '2026-10-10',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 80000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 80000,
        amount_paid_minor: 0,
        balance_due_minor: 80000,
        status: 'sent',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-10T10:00:00Z',
        updated_at: '2026-09-10T10:00:00Z',
      };
      StorageService.saveInvoice(inv);

      const initialPaymentsCount = StorageService.getPayments().length;
      const initialAllocationsCount = StorageService.getPaymentAllocations().length;

      // Force failure mid-transaction
      expect(() => {
        PaymentService.recordPayment({
          company: mockCompany,
          organisation_id: clientOrg.id,
          payment_date: '2026-09-20',
          method: 'bank_transfer',
          currency_code: 'ZMW',
          amount_minor: 80000,
          allocations: [{ invoice_id: inv.id, amount_minor: 80000 }],
          received_by_user_id: adminUser.id,
          forceFailMidTransaction: true,
        });
      }).toThrow(/Simulated transaction failure/i);

      // Assert no orphan rows were committed
      expect(StorageService.getPayments().length).toBe(initialPaymentsCount);
      expect(StorageService.getPaymentAllocations().length).toBe(initialAllocationsCount);

      // Assert invoice remained pristine
      const pristineInv = StorageService.getInvoiceById(inv.id)!;
      expect(pristineInv.amount_paid_minor).toBe(0);
      expect(pristineInv.balance_due_minor).toBe(80000);
      expect(pristineInv.status).toBe('sent');
    });
  });

  describe('6.3.6: Unallocated Credit Retention & Surfacing for Client', () => {
    it('retains unallocated remainder as client credit and applies it to subsequent payments', () => {
      // 1. Client pays K1,000.00 but only K600.00 is allocated to an open invoice
      const inv1: Invoice = {
        id: 'inv_c1',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-2026-00030',
        issue_date: '2026-09-01',
        due_date: '2026-10-01',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 60000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 60000, // K600.00
        amount_paid_minor: 0,
        balance_due_minor: 60000,
        status: 'sent',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      };
      StorageService.saveInvoice(inv1);

      const pmt1 = PaymentService.recordPayment({
        company: mockCompany,
        organisation_id: clientOrg.id,
        payment_date: '2026-09-10',
        method: 'bank_transfer',
        currency_code: 'ZMW',
        amount_minor: 100000, // K1,000.00
        allocations: [{ invoice_id: inv1.id, amount_minor: 60000 }], // K600 allocated
        received_by_user_id: adminUser.id,
      });

      expect(pmt1.payment.allocated_minor).toBe(60000);
      expect(pmt1.payment.unallocated_minor).toBe(40000); // K400.00 retained credit

      // Check client unallocated credit is surfaced
      const creditAvailable = PaymentService.getClientUnallocatedCredit(mockCompany.id, clientOrg.id);
      expect(creditAvailable).toBe(40000);

      // 2. Later, another invoice of K500.00 is issued
      const inv2: Invoice = {
        id: 'inv_c2',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-2026-00031',
        issue_date: '2026-09-15',
        due_date: '2026-10-15',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 50000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 50000, // K500.00
        amount_paid_minor: 0,
        balance_due_minor: 50000,
        status: 'sent',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-15T00:00:00Z',
        updated_at: '2026-09-15T00:00:00Z',
      };
      StorageService.saveInvoice(inv2);

      // Client pays K100 cash and applies their K400 unallocated credit to clear the K500 invoice
      const pmt2 = PaymentService.recordPayment({
        company: pmt1.updatedCompany,
        organisation_id: clientOrg.id,
        payment_date: '2026-09-20',
        method: 'cash',
        currency_code: 'ZMW',
        amount_minor: 10000, // K100 cash
        use_unallocated_credit_minor: 40000, // K400 credit consumed
        allocations: [{ invoice_id: inv2.id, amount_minor: 50000 }],
        received_by_user_id: adminUser.id,
      });

      expect(pmt2.payment.amount_minor).toBe(10000);
      expect(pmt2.payment.unallocated_minor).toBe(0);

      const updatedInv2 = StorageService.getInvoiceById(inv2.id)!;
      expect(updatedInv2.status).toBe('paid');
      expect(updatedInv2.balance_due_minor).toBe(0);

      // Credit balance should now be zero
      const remainingCredit = PaymentService.getClientUnallocatedCredit(mockCompany.id, clientOrg.id);
      expect(remainingCredit).toBe(0);
    });
  });

  describe('6.3.7: Receipt PDF Output Scope Verification', () => {
    it('receipt PDF lists exactly the allocated invoices and no other unallocated or unrelated invoices', () => {
      const invAllocated1: Invoice = {
        id: 'inv_pdf_1',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        number: 'INV-2026-00041',
        issue_date: '2026-09-01',
        due_date: '2026-10-01',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 35000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 0,
        vat_minor: 0,
        total_minor: 35000, // K350.00
        amount_paid_minor: 0,
        balance_due_minor: 35000,
        status: 'sent',
        issued_by_user_id: adminUser.id,
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      };

      const invAllocated2: Invoice = {
        ...invAllocated1,
        id: 'inv_pdf_2',
        number: 'INV-2026-00042',
        subtotal_minor: 45000,
        total_minor: 45000, // K450.00
        amount_paid_minor: 0,
        balance_due_minor: 45000,
      };

      const invUnrelated: Invoice = {
        ...invAllocated1,
        id: 'inv_unrelated_99',
        number: 'INV-2026-00099',
        subtotal_minor: 990000,
        total_minor: 990000,
        balance_due_minor: 990000,
        status: 'sent',
      };

      StorageService.saveInvoice(invAllocated1);
      StorageService.saveInvoice(invAllocated2);
      StorageService.saveInvoice(invUnrelated);

      const pmtRes = PaymentService.recordPayment({
        company: mockCompany,
        organisation_id: clientOrg.id,
        payment_date: '2026-09-20',
        method: 'bank_transfer',
        reference: 'EFT-TX-99001',
        currency_code: 'ZMW',
        amount_minor: 80000, // K800.00
        allocations: [
          { invoice_id: invAllocated1.id, amount_minor: 35000 },
          { invoice_id: invAllocated2.id, amount_minor: 45000 },
        ],
        received_by_user_id: adminUser.id,
      });

      const html = DocumentPdfService.renderReceiptHtml(
        pmtRes.payment,
        pmtRes.allocations,
        [invAllocated1, invAllocated2, invUnrelated],
        mockCompany,
        clientOrg,
        undefined,
        990000
      );

      // Must contain allocated invoice numbers
      expect(html).toContain('INV-2026-00041');
      expect(html).toContain('INV-2026-00042');
      expect(html).toContain('EFT-TX-99001');
      expect(html).toContain('REC-2026-00001');
      expect(html).toContain('Eight Hundred Kwacha Only');

      // Must NOT contain the unallocated/unrelated invoice in the allocations table
      expect(html).not.toContain('INV-2026-00099');
    });
  });
});
