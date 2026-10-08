import { describe, it, expect, beforeEach } from 'vitest';
import { AccountingService } from '../services/accountingService';
import { StorageService } from '../services/storageService';
import { Company, Invoice } from '../types';

describe('Unit Tests: Accounting Edge Cases, Safeguards & Bug Checks', () => {
  const testCompany: Company = {
    id: 'comp_unit_test',
    name: 'Unit Test Technologies Ltd',
    legal_name: 'Unit Test Technologies Limited',
    tpin: '1099887766',
    is_vat_registered: true,
    vat_rate_bp: 1600, // 16% VAT
    currency_code: 'ZMW',
    email: 'info@unittest-tech.zm',
    phone: '+260 211 999888',
    address_line1: 'Kubu Road, Industrial Area',
    city: 'Ndola',
    country: 'Zambia',
    next_invoice_number: 1,
    next_quotation_number: 1,
    next_credit_note_number: 1,
  };

  beforeEach(() => {
    StorageService.resetToDefault();
    // Add company to storage
    StorageService.saveCompany(testCompany);
    StorageService.setCurrentCompany(testCompany.id);
  });

  describe('1. Multi-Category Split Lines on Purchase Invoices', () => {
    it('accurately divides split bill lines between COGS and separate OPEX categories without double counting', () => {
      const supplier = AccountingService.saveSupplier({
        id: 'supp_multi_dept',
        company_id: testCompany.id,
        name: 'Omni Corporate Suppliers Ltd',
        payment_terms_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Create a single purchase bill with:
      // Line 1: cost_of_goods (Hardware stock) -> K5,000 (500,000 minor)
      // Line 2: subcontractor (Direct site wiring labour) -> K2,000 (200,000 minor)
      // Line 3: office_supplies (Printing paper & toner) -> K1,500 (150,000 minor)
      // Line 4: rent_rates (Monthly server rack storage fee) -> K2,500 (250,000 minor)
      // Line 5: equipment_software (Annual Cloud backup licence) -> K1,000 (100,000 minor)
      // Subtotal: K12,000 (1,200,000 minor).
      // VAT 16%: K1,920 (192,000 minor). Total: K13,920 (1,392,000 minor).
      const bill = AccountingService.createPurchaseInvoice(testCompany, {
        supplier_id: supplier.id,
        invoice_number: 'OMNI-SPLIT-901',
        issue_date: '2026-10-01',
        due_date: '2026-10-31',
        lines: [
          {
            description: 'Core Network Switches for Client Site',
            category: 'cost_of_goods',
            quantity: 1,
            unit: 'unit',
            unit_price_minor: 500000,
            is_vatable: true,
          },
          {
            description: 'Subcontractor Fiber Splicing Specialist',
            category: 'subcontractor',
            quantity: 1,
            unit: 'service',
            unit_price_minor: 200000,
            is_vatable: true,
          },
          {
            description: 'Stationery & Office Toner Cartridges',
            category: 'office_supplies',
            quantity: 1,
            unit: 'lot',
            unit_price_minor: 150000,
            is_vatable: true,
          },
          {
            description: 'Storage Lockup Rental for Project Materials',
            category: 'rent_rates',
            quantity: 1,
            unit: 'month',
            unit_price_minor: 250000,
            is_vatable: true,
          },
          {
            description: 'Cloud Backup Subscription Seat',
            category: 'equipment_software',
            quantity: 1,
            unit: 'seat',
            unit_price_minor: 100000,
            is_vatable: true,
          },
        ],
        recorded_by_user_id: 'usr-tester-1',
      });

      expect(bill.subtotal_minor).toBe(1200000);
      expect(bill.vat_minor).toBe(192000);
      expect(bill.total_minor).toBe(1392000);

      // Now calculate P&L on accrual basis
      const pnl = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'accrual' }
      );

      // COGS must strictly equal cost_of_goods + subcontractor = 500,000 + 200,000 = 700,000 minor
      expect(pnl.costOfSales.purchaseBillsMinor).toBe(700000);
      expect(pnl.costOfSales.totalCostOfSalesMinor).toBe(700000);

      // OPEX categories must contain exactly office_supplies, rent_rates, and equipment_software
      const officeSupplies = pnl.operatingExpenses.categories.find((c) => c.category === 'office_supplies');
      const rentRates = pnl.operatingExpenses.categories.find((c) => c.category === 'rent_rates');
      const equipSoftware = pnl.operatingExpenses.categories.find((c) => c.category === 'equipment_software');

      expect(officeSupplies?.amountMinor).toBe(150000);
      expect(rentRates?.amountMinor).toBe(250000);
      expect(equipSoftware?.amountMinor).toBe(100000);

      // Total OPEX = 150,000 + 250,000 + 100,000 = 500,000 minor
      expect(pnl.operatingExpenses.totalMinor).toBe(500000);

      // Check sum integrity: COGS (700,000) + OPEX (500,000) = exactly the invoice subtotal (1,200,000)
      expect(pnl.costOfSales.totalCostOfSalesMinor + pnl.operatingExpenses.totalMinor).toBe(1200000);

      // Input VAT should be exactly 192,000
      expect(pnl.taxVatSummary.inputVatPurchasesMinor).toBe(192000);
    });
  });

  describe('2. Cash Basis vs Accrual Basis Accounting', () => {
    it('differentiates unpaid bills vs paid bills between cash and accrual reporting', () => {
      const supplier = AccountingService.saveSupplier({
        id: 'supp_cash_vs_accrual',
        company_id: testCompany.id,
        name: 'Bulk Cable Direct Ltd',
        payment_terms_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Create an invoice of K10,000 (1,000,000 minor) + K1,600 VAT = K11,600 total (1,160,000 minor)
      const bill = AccountingService.createPurchaseInvoice(testCompany, {
        supplier_id: supplier.id,
        invoice_number: 'CABLE-INV-551',
        issue_date: '2026-10-05',
        due_date: '2026-11-05',
        lines: [
          {
            description: 'Fiber Optic Cable Drum 1000M',
            category: 'cost_of_goods',
            quantity: 1,
            unit: 'drum',
            unit_price_minor: 1000000,
            is_vatable: true,
          },
        ],
        recorded_by_user_id: 'usr-tester-1',
      });

      // 1) When bill is unpaid:
      // Accrual basis should recognize full K10,000 COGS and K1,600 input VAT
      const accrualPnl = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'accrual' }
      );
      expect(accrualPnl.costOfSales.purchaseBillsMinor).toBe(1000000);
      expect(accrualPnl.taxVatSummary.inputVatPurchasesMinor).toBe(160000);

      // Cash basis should recognize 0 COGS and 0 input VAT because nothing has been paid!
      const cashPnlUnpaid = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'cash' }
      );
      expect(cashPnlUnpaid.costOfSales.purchaseBillsMinor).toBe(0);
      expect(cashPnlUnpaid.taxVatSummary.inputVatPurchasesMinor).toBe(0);

      // 2) Record a partial payment of 50% (K5,800 total = 580,000 minor):
      AccountingService.recordPurchasePayment(bill.id, {
        payment_date: '2026-10-15',
        amount_minor: 580000,
        payment_method: 'bank_transfer',
        reference: 'TXN-HALF-PAY',
        recorded_by_user_id: 'usr-tester-1',
      });

      const cashPnlHalfPaid = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'cash' }
      );
      // Net portion paid = 580,000 - 80,000 VAT = 500,000 minor
      expect(cashPnlHalfPaid.costOfSales.purchaseBillsMinor).toBe(500000);
      expect(cashPnlHalfPaid.taxVatSummary.inputVatPurchasesMinor).toBe(80000);

      // 3) Settle remaining balance (580,000 minor):
      AccountingService.recordPurchasePayment(bill.id, {
        payment_date: '2026-10-25',
        amount_minor: 580000,
        payment_method: 'bank_transfer',
        reference: 'TXN-FINAL-PAY',
        recorded_by_user_id: 'usr-tester-1',
      });

      const cashPnlFullyPaid = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'cash' }
      );
      expect(cashPnlFullyPaid.costOfSales.purchaseBillsMinor).toBe(1000000);
      expect(cashPnlFullyPaid.taxVatSummary.inputVatPurchasesMinor).toBe(160000);
    });

    it('excludes pending expenses on cash basis until paid', () => {
      // Pending expense
      AccountingService.createExpense(testCompany, {
        date: '2026-10-10',
        title: 'Unpaid Consultant Travel Claim',
        category: 'travel_transport',
        amount_minor: 50000, // K500
        payment_method: 'cash',
        payee_merchant: 'Driver Banda',
        status: 'pending',
        is_vatable: false,
        recorded_by_user_id: 'usr-tester-1',
      });

      const cashPnl = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'cash' }
      );
      expect(cashPnl.operatingExpenses.totalMinor).toBe(0);

      const accrualPnl = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'accrual' }
      );
      expect(accrualPnl.operatingExpenses.totalMinor).toBe(50000);
    });
  });

  describe('3. Credit Notes Revenue and Tax Deduction', () => {
    it('properly deducts credit notes from invoiced revenue and output VAT in P&L', () => {
      // Create a sales invoice for testCompany
      const invoice: Invoice = {
        id: 'inv_test_sale_1',
        company_id: testCompany.id,
        organisation_id: 'org_test_client',
        number: 'INV-2026-100',
        issue_date: '2026-10-02',
        due_date: '2026-11-02',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        discount_type: 'percent',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 1600,
        issued_by_user_id: 'usr-tester-1',
        status: 'sent',
        subtotal_minor: 1000000, // K10,000 net turnover
        vat_minor: 160000, // K1,600 output VAT
        total_minor: 1160000, // K11,600 gross
        amount_paid_minor: 0,
        balance_due_minor: 928000, // after K2,320 credit note
        lines: [],
        credit_notes: [
          {
            id: 'cn_test_1',
            company_id: testCompany.id,
            invoice_id: 'inv_test_sale_1',
            number: 'CN-101',
            issue_date: '2026-10-08',
            reason: 'Damaged item credit discount',
            amount_minor: 200000, // K2,000 net credit
            vat_minor: 32000, // K320 VAT credit
            total_minor: 232000, // K2,320 total credit
            status: 'issued',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      StorageService.saveInvoice(invoice);

      const pnl = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'accrual' }
      );

      // Invoiced revenue should be 1,000,000 - 200,000 = 800,000 minor (K8,000 net)
      expect(pnl.revenue.effectiveRevenueMinor).toBe(800000);
      expect(pnl.revenue.salesInvoicedMinor).toBe(800000);

      // Output VAT should be 160,000 - 32,000 = 128,000 minor (K1,280)
      expect(pnl.taxVatSummary.outputVatMinor).toBe(128000);
    });

    it('ignores voided credit notes when calculating net revenue', () => {
      const invoice: Invoice = {
        id: 'inv_test_sale_2',
        company_id: testCompany.id,
        organisation_id: 'org_test_client',
        number: 'INV-2026-101',
        issue_date: '2026-10-03',
        due_date: '2026-11-03',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        discount_type: 'percent',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 1600,
        issued_by_user_id: 'usr-tester-1',
        status: 'sent',
        subtotal_minor: 500000, // K5,000
        vat_minor: 80000,
        total_minor: 580000,
        amount_paid_minor: 0,
        balance_due_minor: 580000,
        lines: [],
        credit_notes: [
          {
            id: 'cn_void_1',
            company_id: testCompany.id,
            invoice_id: 'inv_test_sale_2',
            number: 'CN-102',
            issue_date: '2026-10-04',
            reason: 'Mistakenly issued',
            amount_minor: 100000,
            vat_minor: 16000,
            total_minor: 116000,
            status: 'void',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      StorageService.saveInvoice(invoice);

      const pnl = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'accrual' }
      );

      // Full K5,000 revenue preserved
      expect(pnl.revenue.effectiveRevenueMinor).toBe(500000);
      expect(pnl.taxVatSummary.outputVatMinor).toBe(80000);
    });
  });

  describe('4. Expense Updates and VAT Synchronisation', () => {
    it('recalculates net_amount_minor and vat_minor when an expense amount is updated', () => {
      const expense = AccountingService.createExpense(testCompany, {
        date: '2026-10-05',
        title: 'Office Cleaning Supplies',
        category: 'repairs_maintenance',
        amount_minor: 116000, // K1,160.00
        payment_method: 'cash',
        payee_merchant: 'Pick n Pay Supermarket',
        is_vatable: true,
        recorded_by_user_id: 'usr-tester-1',
      });

      expect(expense.net_amount_minor).toBe(100000);
      expect(expense.vat_minor).toBe(16000);

      // Now double the expense amount to K2,320 (232,000 minor)
      const updated = AccountingService.updateExpense(expense.id, {
        amount_minor: 232000,
      });

      expect(updated.amount_minor).toBe(232000);
      expect(updated.net_amount_minor).toBe(200000);
      expect(updated.vat_minor).toBe(32000);

      // Update to non-vatable
      const nonVat = AccountingService.updateExpense(expense.id, {
        is_vatable: false,
      });

      expect(nonVat.is_vatable).toBe(false);
      expect(nonVat.net_amount_minor).toBe(232000);
      expect(nonVat.vat_minor).toBe(0);
    });
  });

  describe('5. Validation Safeguards and Integrity Checks', () => {
    it('prevents deleting a purchase invoice that has recorded payments', () => {
      const supplier = AccountingService.saveSupplier({
        id: 'supp_safe_del',
        company_id: testCompany.id,
        name: 'Protected Vendor Ltd',
        payment_terms_days: 15,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const bill = AccountingService.createPurchaseInvoice(testCompany, {
        supplier_id: supplier.id,
        invoice_number: 'PROT-001',
        issue_date: '2026-10-01',
        due_date: '2026-10-15',
        lines: [
          {
            description: 'Item',
            quantity: 1,
            unit: 'pcs',
            unit_price_minor: 50000,
            is_vatable: false,
          },
        ],
        recorded_by_user_id: 'usr-tester-1',
      });

      // Before payment, deletion succeeds
      expect(AccountingService.getPurchaseInvoiceById(bill.id)).toBeDefined();

      // Record a payment
      AccountingService.recordPurchasePayment(bill.id, {
        payment_date: '2026-10-02',
        amount_minor: 25000,
        payment_method: 'cash',
        recorded_by_user_id: 'usr-tester-1',
      });

      // Attempting to delete must throw
      expect(() => AccountingService.deletePurchaseInvoice(bill.id)).toThrow(
        /Cannot delete purchase invoice with 1 recorded payment/
      );
    });

    it('rejects duplicate vendor invoice numbers for the same supplier', () => {
      const supplier = AccountingService.saveSupplier({
        id: 'supp_dup_check',
        company_id: testCompany.id,
        name: 'Duplicate Check Supplier',
        payment_terms_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      AccountingService.createPurchaseInvoice(testCompany, {
        supplier_id: supplier.id,
        invoice_number: 'INV-UNIQUE-101',
        issue_date: '2026-10-01',
        due_date: '2026-10-31',
        lines: [
          {
            description: 'Service',
            quantity: 1,
            unit: 'unit',
            unit_price_minor: 10000,
            is_vatable: false,
          },
        ],
        recorded_by_user_id: 'usr-tester-1',
      });

      // Attempting to create second bill with identical number for this supplier
      expect(() => {
        AccountingService.createPurchaseInvoice(testCompany, {
          supplier_id: supplier.id,
          invoice_number: 'INV-UNIQUE-101',
          issue_date: '2026-10-02',
          due_date: '2026-11-02',
          lines: [
            {
              description: 'Service 2',
              quantity: 1,
              unit: 'unit',
              unit_price_minor: 20000,
              is_vatable: false,
            },
          ],
          recorded_by_user_id: 'usr-tester-1',
        });
      }).toThrow(/already exists for this supplier/);
    });

    it('rejects purchase invoices with missing or invalid lines', () => {
      const supplier = AccountingService.saveSupplier({
        id: 'supp_invalid_lines',
        company_id: testCompany.id,
        name: 'Supplier For Invalid Lines',
        payment_terms_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Empty lines
      expect(() => {
        AccountingService.createPurchaseInvoice(testCompany, {
          supplier_id: supplier.id,
          invoice_number: 'INV-EMPTY-LINES',
          issue_date: '2026-10-01',
          due_date: '2026-10-31',
          lines: [],
          recorded_by_user_id: 'usr-tester-1',
        });
      }).toThrow(/At least one line item is required/);

      // Non-positive quantity
      expect(() => {
        AccountingService.createPurchaseInvoice(testCompany, {
          supplier_id: supplier.id,
          invoice_number: 'INV-BAD-QTY',
          issue_date: '2026-10-01',
          due_date: '2026-10-31',
          lines: [
            {
              description: 'Zero item',
              quantity: 0,
              unit: 'unit',
              unit_price_minor: 1000,
              is_vatable: false,
            },
          ],
          recorded_by_user_id: 'usr-tester-1',
        });
      }).toThrow(/Line item quantity must be greater than zero/);

      // Negative unit price
      expect(() => {
        AccountingService.createPurchaseInvoice(testCompany, {
          supplier_id: supplier.id,
          invoice_number: 'INV-NEG-PRICE',
          issue_date: '2026-10-01',
          due_date: '2026-10-31',
          lines: [
            {
              description: 'Negative price item',
              quantity: 1,
              unit: 'unit',
              unit_price_minor: -500,
              is_vatable: false,
            },
          ],
          recorded_by_user_id: 'usr-tester-1',
        });
      }).toThrow(/Line item unit price cannot be negative/);
    });

    it('rejects recording payments on cancelled purchase bills or with non-positive amounts', () => {
      const supplier = AccountingService.saveSupplier({
        id: 'supp_cancelled_check',
        company_id: testCompany.id,
        name: 'Cancelled Check Supplier',
        payment_terms_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const bill = AccountingService.createPurchaseInvoice(testCompany, {
        supplier_id: supplier.id,
        invoice_number: 'INV-TO-CANCEL',
        issue_date: '2026-10-01',
        due_date: '2026-10-31',
        lines: [
          {
            description: 'Item',
            quantity: 1,
            unit: 'unit',
            unit_price_minor: 50000,
            is_vatable: false,
          },
        ],
        recorded_by_user_id: 'usr-tester-1',
      });

      // Zero or negative payment
      expect(() => {
        AccountingService.recordPurchasePayment(bill.id, {
          payment_date: '2026-10-02',
          amount_minor: 0,
          payment_method: 'cash',
          recorded_by_user_id: 'usr-tester-1',
        });
      }).toThrow(/Payment amount must be greater than zero/);

      // Mark cancelled
      StorageService.savePurchaseInvoice({
        ...bill,
        status: 'cancelled',
      });

      expect(() => {
        AccountingService.recordPurchasePayment(bill.id, {
          payment_date: '2026-10-02',
          amount_minor: 10000,
          payment_method: 'cash',
          recorded_by_user_id: 'usr-tester-1',
        });
      }).toThrow(/Cannot record payment on a cancelled purchase invoice/);
    });

    it('validates expense creation with required title and positive amount', () => {
      expect(() => {
        AccountingService.createExpense(testCompany, {
          date: '2026-10-01',
          title: '   ',
          category: 'utilities',
          amount_minor: 10000,
          payment_method: 'cash',
          payee_merchant: 'ZESCO',
          recorded_by_user_id: 'usr-tester-1',
        });
      }).toThrow(/Expense title is required/);

      expect(() => {
        AccountingService.createExpense(testCompany, {
          date: '2026-10-01',
          title: 'Valid Title',
          category: 'utilities',
          amount_minor: -100,
          payment_method: 'cash',
          payee_merchant: 'ZESCO',
          recorded_by_user_id: 'usr-tester-1',
        });
      }).toThrow(/Expense amount must be greater than zero/);
    });
  });

  describe('6. Monotonic Expense Numbering', () => {
    it('generates strictly sequential expense numbers that avoid collisions even after deletions', () => {
      const e1 = AccountingService.createExpense(testCompany, {
        date: '2026-10-01',
        title: 'Expense 1',
        category: 'office_supplies',
        amount_minor: 10000,
        payment_method: 'cash',
        payee_merchant: 'Store',
        recorded_by_user_id: 'usr-tester-1',
      });

      const e2 = AccountingService.createExpense(testCompany, {
        date: '2026-10-02',
        title: 'Expense 2',
        category: 'office_supplies',
        amount_minor: 20000,
        payment_method: 'cash',
        payee_merchant: 'Store',
        recorded_by_user_id: 'usr-tester-1',
      });

      expect(e1.expense_number).toBe('EXP-2026-0001');
      expect(e2.expense_number).toBe('EXP-2026-0002');

      // Delete e2
      AccountingService.deleteExpense(e2.id);

      // Create e3: should not collide with e2 or regress to duplicate
      const e3 = AccountingService.createExpense(testCompany, {
        date: '2026-10-03',
        title: 'Expense 3',
        category: 'office_supplies',
        amount_minor: 30000,
        payment_method: 'cash',
        payee_merchant: 'Store',
        recorded_by_user_id: 'usr-tester-1',
      });

      // Even if e2 was deleted, e3 must receive a new non-conflicting number (e.g. 0002 or 0003)
      expect(e3.expense_number).toMatch(/^EXP-2026-\d{4}$/);
      expect(e3.id).not.toBe(e2.id);
    });
  });

  describe('7. Edge Cases: Zero Revenue & Loss Margin Calculations', () => {
    it('computes 0% margins without NaN when revenue is zero', () => {
      // No sales invoices recorded for testCompany
      AccountingService.createExpense(testCompany, {
        date: '2026-10-01',
        title: 'Sole Trader Internet Fibre',
        category: 'telecom_internet',
        amount_minor: 100000, // K1,000
        payment_method: 'bank_transfer',
        payee_merchant: 'Liquid Telecom',
        is_vatable: false,
        recorded_by_user_id: 'usr-tester-1',
      });

      const pnl = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'accrual' }
      );

      expect(pnl.revenue.effectiveRevenueMinor).toBe(0);
      expect(pnl.grossProfitMinor).toBe(0);
      expect(pnl.grossMarginPercent).toBe(0);
      expect(pnl.operatingExpenses.totalMinor).toBe(100000);
      expect(pnl.netProfitMinor).toBe(-100000);
      expect(pnl.netMarginPercent).toBe(0);
      expect(isNaN(pnl.grossMarginPercent)).toBe(false);
      expect(isNaN(pnl.netMarginPercent)).toBe(false);
    });

    it('correctly calculates negative net margin % when operating at a loss', () => {
      // Invoiced revenue: K2,000 net (200,000 minor)
      const invoice: Invoice = {
        id: 'inv_loss_1',
        company_id: testCompany.id,
        organisation_id: 'org_test_client',
        number: 'INV-LOSS-001',
        issue_date: '2026-10-05',
        due_date: '2026-11-05',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        discount_type: 'percent',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 1600,
        issued_by_user_id: 'usr-tester-1',
        status: 'sent',
        subtotal_minor: 200000,
        vat_minor: 32000,
        total_minor: 232000,
        amount_paid_minor: 0,
        balance_due_minor: 232000,
        lines: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      StorageService.saveInvoice(invoice);

      // Expenses: K5,000 (500,000 minor)
      AccountingService.createExpense(testCompany, {
        date: '2026-10-06',
        title: 'Office Rental',
        category: 'rent_rates',
        amount_minor: 500000,
        payment_method: 'bank_transfer',
        payee_merchant: 'Arcades Commercial Properties',
        is_vatable: false,
        recorded_by_user_id: 'usr-tester-1',
      });

      const pnl = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'accrual' }
      );

      expect(pnl.revenue.effectiveRevenueMinor).toBe(200000);
      expect(pnl.grossProfitMinor).toBe(200000);
      expect(pnl.operatingExpenses.totalMinor).toBe(500000);
      // Net profit = 200,000 - 500,000 = -300,000 minor (-K3,000)
      expect(pnl.netProfitMinor).toBe(-300000);
      // Net margin % = (-300,000 / 200,000) * 100 = -150%
      expect(pnl.netMarginPercent).toBe(-150);
    });
  });

  describe('8. VAT Position and Net Payable / Refund Calculation', () => {
    it('accurately computes net VAT payable when Output VAT exceeds Input VAT', () => {
      // Sales Invoice with K1,600 Output VAT
      const invoice: Invoice = {
        id: 'inv_vat_test_1',
        company_id: testCompany.id,
        organisation_id: 'org_test_client',
        number: 'INV-VAT-1',
        issue_date: '2026-10-10',
        due_date: '2026-11-10',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        discount_type: 'percent',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 1600,
        issued_by_user_id: 'usr-tester-1',
        status: 'sent',
        subtotal_minor: 1000000,
        vat_minor: 160000, // K1,600 Output VAT
        total_minor: 1160000,
        amount_paid_minor: 0,
        balance_due_minor: 1160000,
        lines: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      StorageService.saveInvoice(invoice);

      // Expense with K400 Input VAT (Gross K2,900 => Net K2,500 + VAT K400)
      AccountingService.createExpense(testCompany, {
        date: '2026-10-12',
        title: 'Hardware Tools',
        category: 'repairs_maintenance',
        amount_minor: 290000, // Net 250,000, VAT 40,000
        payment_method: 'cash',
        payee_merchant: 'Builders Warehouse',
        is_vatable: true,
        recorded_by_user_id: 'usr-tester-1',
      });

      const pnl = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'accrual' }
      );

      expect(pnl.taxVatSummary.outputVatMinor).toBe(160000);
      expect(pnl.taxVatSummary.inputVatExpensesMinor).toBe(40000);
      expect(pnl.taxVatSummary.totalInputVatMinor).toBe(40000);
      // Net VAT payable = 160,000 - 40,000 = 120,000 minor (K1,200)
      expect(pnl.taxVatSummary.netVatPayableMinor).toBe(120000);
    });

    it('accurately computes VAT refund position (negative payable) when Input VAT exceeds Output VAT', () => {
      // Sales invoice with K800 Output VAT
      const invoice: Invoice = {
        id: 'inv_vat_test_2',
        company_id: testCompany.id,
        organisation_id: 'org_test_client',
        number: 'INV-VAT-2',
        issue_date: '2026-10-15',
        due_date: '2026-11-15',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        discount_type: 'percent',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 1600,
        issued_by_user_id: 'usr-tester-1',
        status: 'sent',
        subtotal_minor: 500000,
        vat_minor: 80000, // K800 Output VAT
        total_minor: 580000,
        amount_paid_minor: 0,
        balance_due_minor: 580000,
        lines: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      StorageService.saveInvoice(invoice);

      // Large purchase bill with K1,600 Input VAT
      const supplier = AccountingService.saveSupplier({
        id: 'supp_vat_refund',
        company_id: testCompany.id,
        name: 'Heavy Telecoms Equipment Supplier',
        payment_terms_days: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      AccountingService.createPurchaseInvoice(testCompany, {
        supplier_id: supplier.id,
        invoice_number: 'HEAVY-INV-99',
        issue_date: '2026-10-16',
        due_date: '2026-11-16',
        lines: [
          {
            description: 'Fiber Splicing Machine',
            quantity: 1,
            unit: 'unit',
            unit_price_minor: 1000000, // K10,000 => K1,600 VAT
            is_vatable: true,
          },
        ],
        recorded_by_user_id: 'usr-tester-1',
      });

      const pnl = AccountingService.calculateProfitAndLoss(
        testCompany.id,
        '2026-10-01',
        '2026-10-31',
        { basis: 'accrual' }
      );

      expect(pnl.taxVatSummary.outputVatMinor).toBe(80000);
      expect(pnl.taxVatSummary.inputVatPurchasesMinor).toBe(160000);
      // Net VAT payable = 80,000 - 160,000 = -80,000 (Refund due of K800)
      expect(pnl.taxVatSummary.netVatPayableMinor).toBe(-80000);
    });
  });
});
