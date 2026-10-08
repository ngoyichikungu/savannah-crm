import { describe, it, expect, beforeEach } from 'vitest';
import { AccountingService } from '../services/accountingService';
import { StorageService } from '../services/storageService';
import { profitAndLossReport } from '../services/reports/profitAndLossReport';
import { Company } from '../types';

describe('Small Business Accounting - Purchases, Expenses & Profit and Loss', () => {
  const mockCompany: Company = {
    id: 'comp_test_accounting',
    name: 'Test Accounting SME Ltd',
    legal_name: 'Test Accounting SME Limited',
    tpin: '1009998888',
    is_vat_registered: true,
    vat_rate_bp: 1600, // 16%
    currency_code: 'ZMW',
    email: 'accounts@test-sme.co.zm',
    phone: '+260 211 123456',
    address_line1: 'Cairo Road, City Center',
    city: 'Lusaka',
    country: 'Zambia',
    next_invoice_number: 1,
    next_quotation_number: 1,
    next_credit_note_number: 1,
  };

  beforeEach(() => {
    StorageService.resetToDefault();
  });

  describe('Suppliers / Vendors Management', () => {
    it('creates and retrieves a new supplier', () => {
      const supplier = AccountingService.saveSupplier({
        id: 'supp_test_1',
        company_id: mockCompany.id,
        name: 'Zambia Cable & Fiber Distributors',
        contact_person: 'John Banda',
        email: 'sales@zacable.co.zm',
        phone: '+260 977 112233',
        tpin: '1004455667',
        payment_terms_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      expect(supplier.id).toBe('supp_test_1');
      expect(supplier.name).toBe('Zambia Cable & Fiber Distributors');

      const retrieved = AccountingService.getSupplierById('supp_test_1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.email).toBe('sales@zacable.co.zm');
    });

    it('updates an existing supplier without losing created_at timestamp', () => {
      const initial = AccountingService.saveSupplier({
        id: 'supp_test_2',
        company_id: mockCompany.id,
        name: 'Initial Name',
        payment_terms_days: 15,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      });

      const updated = AccountingService.saveSupplier({
        ...initial,
        name: 'Updated Distributor Name',
        payment_terms_days: 45,
      });

      expect(updated.name).toBe('Updated Distributor Name');
      expect(updated.payment_terms_days).toBe(45);
      expect(updated.created_at).toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('Purchase Invoices (Vendor Bills)', () => {
    it('captures a new purchase invoice with accurate line item subtotal, VAT and total calculation', () => {
      const supplier = AccountingService.saveSupplier({
        id: 'supp_hw_distrib',
        company_id: mockCompany.id,
        name: 'Hardware Wholesale Co',
        tpin: '2001122334',
        payment_terms_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const bill = AccountingService.createPurchaseInvoice(mockCompany, {
        supplier_id: supplier.id,
        invoice_number: 'HW-2026-901',
        internal_reference: 'PO-001',
        issue_date: '2026-09-01',
        due_date: '2026-10-01',
        category: 'cost_of_goods',
        lines: [
          {
            description: 'Fiber Optic Transceivers (10G SFP+)',
            quantity: 10,
            unit: 'pcs',
            unit_price_minor: 50000, // K500 each => K5,000.00 subtotal
            is_vatable: true,
          },
          {
            description: 'Cat6 Shielded Patch Cord 2M',
            quantity: 20,
            unit: 'pcs',
            unit_price_minor: 5000, // K50 each => K1,000.00 subtotal
            is_vatable: true,
          },
        ],
        notes: 'Delivery checked by warehouse.',
        recorded_by_user_id: 'usr-admin-1',
      });

      expect(bill.invoice_number).toBe('HW-2026-901');
      expect(bill.supplier_name).toBe('Hardware Wholesale Co');
      // Subtotal = 500,000 + 100,000 = 600,000 minor (K6,000)
      expect(bill.subtotal_minor).toBe(600000);
      // VAT 16% on 600,000 = 96,000 minor (K960)
      expect(bill.vat_minor).toBe(96000);
      // Total = 696,000 minor (K6,960)
      expect(bill.total_minor).toBe(696000);
      expect(bill.balance_due_minor).toBe(696000);
      expect(bill.status).toBe('received');
      expect(bill.lines.length).toBe(2);
    });

    it('records partial and full payments against purchase bills and updates balances', () => {
      const supplier = AccountingService.saveSupplier({
        id: 'supp_router',
        company_id: mockCompany.id,
        name: 'Enterprise Routers Ltd',
        payment_terms_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const bill = AccountingService.createPurchaseInvoice(mockCompany, {
        supplier_id: supplier.id,
        invoice_number: 'ROUT-1142',
        issue_date: '2026-09-05',
        due_date: '2026-10-05',
        lines: [
          {
            description: 'Core Edge Switch 48-Port',
            quantity: 1,
            unit: 'unit',
            unit_price_minor: 1000000, // K10,000
            is_vatable: false, // exempt line
          },
        ],
        recorded_by_user_id: 'usr-admin-1',
      });

      expect(bill.total_minor).toBe(1000000);
      expect(bill.balance_due_minor).toBe(1000000);

      // Part payment of K4,000 (400,000 minor)
      const partPaid = AccountingService.recordPurchasePayment(bill.id, {
        payment_date: '2026-09-10',
        amount_minor: 400000,
        payment_method: 'bank_transfer',
        reference: 'FT-001',
        recorded_by_user_id: 'usr-admin-1',
      });

      expect(partPaid.status).toBe('partially_paid');
      expect(partPaid.amount_paid_minor).toBe(400000);
      expect(partPaid.balance_due_minor).toBe(600000);
      expect(partPaid.payments?.length).toBe(1);

      // Settle remaining balance of K6,000 (600,000 minor)
      const fullyPaid = AccountingService.recordPurchasePayment(bill.id, {
        payment_date: '2026-09-20',
        amount_minor: 600000,
        payment_method: 'bank_transfer',
        reference: 'FT-002',
        recorded_by_user_id: 'usr-admin-1',
      });

      expect(fullyPaid.status).toBe('paid');
      expect(fullyPaid.amount_paid_minor).toBe(1000000);
      expect(fullyPaid.balance_due_minor).toBe(0);
      expect(fullyPaid.payments?.length).toBe(2);
    });

    it('rejects payments greater than outstanding balance', () => {
      const supplier = AccountingService.saveSupplier({
        id: 'supp_temp',
        company_id: mockCompany.id,
        name: 'Temp Supplier',
        payment_terms_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const bill = AccountingService.createPurchaseInvoice(mockCompany, {
        supplier_id: supplier.id,
        invoice_number: 'TEST-001',
        issue_date: '2026-09-01',
        due_date: '2026-10-01',
        lines: [
          {
            description: 'Item',
            quantity: 1,
            unit: 'unit',
            unit_price_minor: 10000, // K100
            is_vatable: false,
          },
        ],
        recorded_by_user_id: 'usr-admin-1',
      });

      expect(() => {
        AccountingService.recordPurchasePayment(bill.id, {
          payment_date: '2026-09-02',
          amount_minor: 15000, // K150 (exceeds K100)
          payment_method: 'cash',
          recorded_by_user_id: 'usr-admin-1',
        });
      }).toThrow('Payment amount cannot exceed outstanding balance.');
    });
  });

  describe('Business Expenses', () => {
    it('creates an expense and separates net amount and claimable input VAT correctly', () => {
      const expense = AccountingService.createExpense(mockCompany, {
        date: '2026-09-03',
        title: 'Office Generator Fuel & Servicing',
        category: 'utilities',
        amount_minor: 116000, // Total K1,160.00 (Gross including 16% VAT)
        payment_method: 'mobile_money',
        payee_merchant: 'Puma Energy Arcades',
        reference: 'MOMO-77192',
        is_vatable: true,
        recorded_by_user_id: 'usr-admin-1',
      });

      expect(expense.amount_minor).toBe(116000);
      // Net amount = 116000 / 1.16 = 100,000 minor (K1,000.00)
      expect(expense.net_amount_minor).toBe(100000);
      // Input VAT = 116000 - 100000 = 16,000 minor (K160.00)
      expect(expense.vat_minor).toBe(16000);
      expect(expense.status).toBe('paid');
      expect(expense.expense_number).toMatch(/^EXP-\d{4}-\d{4}$/);
    });

    it('handles non-vatable expenses with 0 VAT and full net amount', () => {
      const expense = AccountingService.createExpense(mockCompany, {
        date: '2026-09-04',
        title: 'Commercial Bank Account Maintenance Fee',
        category: 'bank_charges',
        amount_minor: 25000, // K250.00
        payment_method: 'bank_transfer',
        payee_merchant: 'Stanbic Bank Zambia',
        is_vatable: false,
        recorded_by_user_id: 'usr-admin-1',
      });

      expect(expense.amount_minor).toBe(25000);
      expect(expense.net_amount_minor).toBe(25000);
      expect(expense.vat_minor).toBe(0);
    });
  });

  describe('Profit and Loss (Income Statement) Calculations', () => {
    it('calculates turnover, cost of sales, gross profit, operating overheads, and net income accurately', () => {
      const pnl = AccountingService.calculateProfitAndLoss(
        'comp_savannah',
        '2026-09-01',
        '2026-09-30',
        { basis: 'accrual' }
      );

      // Verify Revenue
      expect(pnl.revenue.effectiveRevenueMinor).toBeGreaterThan(0);
      expect(pnl.revenue.salesCount).toBeGreaterThan(0);

      // Verify Cost of Sales
      expect(pnl.costOfSales.totalCostOfSalesMinor).toBeGreaterThan(0);

      // Verify Gross Profit = Revenue - Cost of Sales
      expect(pnl.grossProfitMinor).toBe(
        pnl.revenue.effectiveRevenueMinor - pnl.costOfSales.totalCostOfSalesMinor
      );

      // Verify Operating Expenses
      expect(pnl.operatingExpenses.totalMinor).toBeGreaterThan(0);
      expect(pnl.operatingExpenses.categories.length).toBeGreaterThan(0);

      // Verify Operating / Net Profit = Gross Profit - Operating Expenses
      expect(pnl.netProfitMinor).toBe(
        pnl.grossProfitMinor - pnl.operatingExpenses.totalMinor
      );

      // Verify VAT Position (Output VAT - Input VAT)
      expect(pnl.taxVatSummary.outputVatMinor).toBeGreaterThanOrEqual(0);
      expect(pnl.taxVatSummary.totalInputVatMinor).toBeGreaterThan(0);
      expect(pnl.taxVatSummary.netVatPayableMinor).toBe(
        pnl.taxVatSummary.outputVatMinor - pnl.taxVatSummary.totalInputVatMinor
      );
    });

    it('generates compliant report contract rows, totals, and export CSV', () => {
      const request = {
        companyId: 'comp_savannah',
        dateRange: {
          startDate: '2026-09-01',
          endDate: '2026-09-30',
          preset: 'this_month' as const,
        },
        filters: { basis: 'accrual' as const },
      };

      const rows = profitAndLossReport.rows('comp_savannah', request);
      expect(rows.length).toBeGreaterThan(5);

      const totals = profitAndLossReport.totals(rows, mockCompany, undefined, request);
      expect(totals.effectiveRevenueMinor).toBeGreaterThan(0);
      expect(totals.grossProfitMinor).toBeDefined();
      expect(totals.netProfitMinor).toBeDefined();

      const csv = profitAndLossReport.exportCsv(mockCompany, rows, totals, request.filters, request);
      expect(csv).toContain('PROFIT & LOSS STATEMENT');
      expect(csv).toContain('OPERATING REVENUE');
      expect(csv).toContain('TAX & VAT SUMMARY');
    });
  });
});
