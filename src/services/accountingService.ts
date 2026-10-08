import {
  BusinessExpense,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  ProfitAndLossStatement,
  PurchaseInvoice,
  PurchaseInvoiceLine,
  PurchasePaymentRecord,
  Supplier,
} from '../types/accounting';
import { Company, PaymentMethod } from '../types';
import { StorageService } from './storageService';

export class AccountingService {
  // ==========================================
  // 1. SUPPLIERS / VENDORS
  // ==========================================

  static getSuppliers(companyId?: string): Supplier[] {
    const suppliers = StorageService.getSuppliers();
    if (companyId) {
      return suppliers.filter((s) => s.company_id === companyId);
    }
    return suppliers;
  }

  static getSupplierById(id: string): Supplier | undefined {
    return StorageService.getSuppliers().find((s) => s.id === id);
  }

  static saveSupplier(supplier: Supplier): Supplier {
    const existing = this.getSupplierById(supplier.id);
    const now = new Date().toISOString();
    const updated: Supplier = {
      ...supplier,
      updated_at: now,
      created_at: existing ? existing.created_at : supplier.created_at || now,
    };
    StorageService.saveSupplier(updated);
    return updated;
  }

  static deleteSupplier(id: string): boolean {
    const bills = StorageService.getPurchaseInvoices().filter((p) => p.supplier_id === id);
    if (bills.length > 0) {
      throw new Error(`Cannot delete supplier with ${bills.length} linked purchase invoice(s).`);
    }
    return StorageService.deleteSupplier(id);
  }

  // ==========================================
  // 2. PURCHASE INVOICES (BILLS)
  // ==========================================

  static getPurchaseInvoices(options?: {
    companyId?: string;
    status?: string;
    supplierId?: string;
    search?: string;
  }): PurchaseInvoice[] {
    let list = StorageService.getPurchaseInvoices();
    if (options?.companyId) {
      list = list.filter((p) => p.company_id === options.companyId);
    }
    if (options?.status && options.status !== 'all') {
      list = list.filter((p) => p.status === options.status);
    }
    if (options?.supplierId && options.supplierId !== 'all') {
      list = list.filter((p) => p.supplier_id === options.supplierId);
    }
    if (options?.search && options.search.trim()) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.invoice_number.toLowerCase().includes(q) ||
          p.supplier_name.toLowerCase().includes(q) ||
          (p.internal_reference && p.internal_reference.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());
  }

  static getPurchaseInvoiceById(id: string): PurchaseInvoice | undefined {
    return StorageService.getPurchaseInvoices().find((p) => p.id === id);
  }

  static createPurchaseInvoice(
    company: Company,
    input: {
      supplier_id: string;
      invoice_number: string;
      internal_reference?: string;
      issue_date: string;
      due_date: string;
      payment_terms_days?: number;
      category?: ExpenseCategory;
      lines: Array<{
        description: string;
        category?: ExpenseCategory;
        quantity: number;
        unit: string;
        unit_price_minor: number;
        is_vatable: boolean;
      }>;
      notes?: string;
      recorded_by_user_id: string;
    }
  ): PurchaseInvoice {
    const supplier = this.getSupplierById(input.supplier_id);
    if (!supplier) {
      throw new Error('Supplier not found.');
    }

    if (!input.invoice_number || !input.invoice_number.trim()) {
      throw new Error('Invoice number is required.');
    }

    if (!input.lines || input.lines.length === 0) {
      throw new Error('At least one line item is required.');
    }

    for (const line of input.lines) {
      if (line.quantity <= 0) {
        throw new Error('Line item quantity must be greater than zero.');
      }
      if (line.unit_price_minor < 0) {
        throw new Error('Line item unit price cannot be negative.');
      }
    }

    // Check duplicate invoice number for the same supplier
    const existingBills = this.getPurchaseInvoices({
      companyId: company.id,
      supplierId: input.supplier_id,
    });
    const trimmedNumber = input.invoice_number.trim().toLowerCase();
    const isDuplicate = existingBills.some(
      (b) => b.invoice_number.toLowerCase() === trimmedNumber && b.status !== 'cancelled'
    );
    if (isDuplicate) {
      throw new Error(`A purchase invoice with number "${input.invoice_number.trim()}" already exists for this supplier.`);
    }

    const id = `pi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const vatRateBp = company.is_vat_registered ? company.vat_rate_bp || 1600 : 0;

    let subtotalMinor = 0;
    let vatMinor = 0;

    const lines: PurchaseInvoiceLine[] = input.lines.map((l, idx) => {
      const qtyThousandths = Math.round(l.quantity * 1000);
      const lineSubtotal = Math.round((l.quantity * l.unit_price_minor));
      const lineVat = l.is_vatable && company.is_vat_registered
        ? Math.round((lineSubtotal * vatRateBp) / 10000)
        : 0;
      const lineTotal = lineSubtotal + lineVat;

      subtotalMinor += lineSubtotal;
      vatMinor += lineVat;

      return {
        id: `pil_${id}_${idx + 1}`,
        purchase_invoice_id: id,
        description: l.description,
        category: l.category || input.category || 'cost_of_goods',
        quantity_thousandths: qtyThousandths,
        unit: l.unit || 'unit',
        unit_price_minor: l.unit_price_minor,
        is_vatable: l.is_vatable,
        vat_rate_bp: l.is_vatable ? vatRateBp : 0,
        line_subtotal_minor: lineSubtotal,
        line_vat_minor: lineVat,
        line_total_minor: lineTotal,
      };
    });

    const totalMinor = subtotalMinor + vatMinor;
    const now = new Date().toISOString();

    const invoice: PurchaseInvoice = {
      id,
      company_id: company.id,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_tpin: supplier.tpin,
      invoice_number: input.invoice_number.trim(),
      internal_reference: input.internal_reference?.trim(),
      issue_date: input.issue_date,
      due_date: input.due_date,
      payment_terms_days: input.payment_terms_days ?? supplier.payment_terms_days ?? 30,
      currency_code: company.currency_code,
      lines,
      subtotal_minor: subtotalMinor,
      vat_rate_bp: vatRateBp,
      vat_minor: vatMinor,
      total_minor: totalMinor,
      amount_paid_minor: 0,
      balance_due_minor: totalMinor,
      status: 'received',
      category: input.category || 'cost_of_goods',
      notes: input.notes,
      payments: [],
      recorded_by_user_id: input.recorded_by_user_id,
      created_at: now,
      updated_at: now,
    };

    StorageService.savePurchaseInvoice(invoice);
    return invoice;
  }

  static recordPurchasePayment(
    invoiceId: string,
    input: {
      payment_date: string;
      amount_minor: number;
      payment_method: PaymentMethod;
      reference?: string;
      notes?: string;
      recorded_by_user_id: string;
    }
  ): PurchaseInvoice {
    const invoice = this.getPurchaseInvoiceById(invoiceId);
    if (!invoice) throw new Error('Purchase invoice not found.');

    if (invoice.status === 'cancelled') {
      throw new Error('Cannot record payment on a cancelled purchase invoice.');
    }

    if (input.amount_minor <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (input.amount_minor > invoice.balance_due_minor) {
      throw new Error('Payment amount cannot exceed outstanding balance.');
    }

    const paymentRecord: PurchasePaymentRecord = {
      id: `pip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      purchase_invoice_id: invoice.id,
      company_id: invoice.company_id,
      payment_date: input.payment_date,
      amount_minor: input.amount_minor,
      payment_method: input.payment_method,
      reference: input.reference?.trim(),
      notes: input.notes?.trim(),
      recorded_by_user_id: input.recorded_by_user_id,
      created_at: new Date().toISOString(),
    };

    const updatedPayments = [...(invoice.payments || []), paymentRecord];
    const newAmountPaid = invoice.amount_paid_minor + input.amount_minor;
    const newBalance = Math.max(0, invoice.total_minor - newAmountPaid);

    let status = invoice.status;
    if (newBalance === 0) {
      status = 'paid';
    } else if (newAmountPaid > 0) {
      status = 'partially_paid';
    }

    const updated: PurchaseInvoice = {
      ...invoice,
      payments: updatedPayments,
      amount_paid_minor: newAmountPaid,
      balance_due_minor: newBalance,
      status,
      updated_at: new Date().toISOString(),
    };

    StorageService.savePurchaseInvoice(updated);
    return updated;
  }

  static deletePurchaseInvoice(id: string): boolean {
    const invoice = this.getPurchaseInvoiceById(id);
    if (invoice && invoice.payments && invoice.payments.length > 0) {
      throw new Error(`Cannot delete purchase invoice with ${invoice.payments.length} recorded payment(s).`);
    }
    return StorageService.deletePurchaseInvoice(id);
  }

  // ==========================================
  // 3. BUSINESS EXPENSES
  // ==========================================

  static getExpenses(options?: {
    companyId?: string;
    category?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): BusinessExpense[] {
    let list = StorageService.getBusinessExpenses();
    if (options?.companyId) {
      list = list.filter((e) => e.company_id === options.companyId);
    }
    if (options?.category && options.category !== 'all') {
      list = list.filter((e) => e.category === options.category);
    }
    if (options?.status && options.status !== 'all') {
      list = list.filter((e) => e.status === options.status);
    }
    if (options?.startDate) {
      list = list.filter((e) => e.date >= options.startDate!);
    }
    if (options?.endDate) {
      list = list.filter((e) => e.date <= options.endDate!);
    }
    if (options?.search && options.search.trim()) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.payee_merchant.toLowerCase().includes(q) ||
          e.expense_number.toLowerCase().includes(q) ||
          (e.reference && e.reference.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  static getExpenseById(id: string): BusinessExpense | undefined {
    return StorageService.getBusinessExpenses().find((e) => e.id === id);
  }

  static generateNextExpenseNumber(companyId: string): string {
    const list = StorageService.getBusinessExpenses().filter((e) => e.company_id === companyId);
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;
    let maxSeq = 0;
    for (const exp of list) {
      if (exp.expense_number && exp.expense_number.startsWith(prefix)) {
        const numPart = parseInt(exp.expense_number.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    }
    const nextSeq = Math.max(list.length + 1, maxSeq + 1);
    return `EXP-${year}-${String(nextSeq).padStart(4, '0')}`;
  }

  static createExpense(
    company: Company,
    input: {
      date: string;
      title: string;
      description?: string;
      category: ExpenseCategory;
      amount_minor: number;
      payment_method: PaymentMethod;
      payee_merchant: string;
      supplier_id?: string;
      reference?: string;
      is_tax_deductible?: boolean;
      is_vatable?: boolean;
      status?: 'paid' | 'pending' | 'reimbursed';
      receipt_ref?: string;
      recorded_by_user_id: string;
    }
  ): BusinessExpense {
    if (!input.title || !input.title.trim()) {
      throw new Error('Expense title is required.');
    }
    if (input.amount_minor <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }

    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const vatRateBp = company.is_vat_registered && input.is_vatable
      ? company.vat_rate_bp || 1600
      : 0;

    // In expense receipts, total paid is amount_minor.
    // If vatable, net = total / (1 + vatRate), vat = total - net
    let vatMinor = 0;
    let netMinor = input.amount_minor;

    if (input.is_vatable && vatRateBp > 0) {
      const rateMultiplier = 1 + vatRateBp / 10000;
      netMinor = Math.round(input.amount_minor / rateMultiplier);
      vatMinor = input.amount_minor - netMinor;
    }

    const expenseNumber = this.generateNextExpenseNumber(company.id);
    const now = new Date().toISOString();

    const expense: BusinessExpense = {
      id,
      company_id: company.id,
      expense_number: expenseNumber,
      date: input.date,
      title: input.title.trim(),
      description: input.description?.trim(),
      category: input.category,
      amount_minor: input.amount_minor,
      currency_code: company.currency_code,
      payment_method: input.payment_method,
      payee_merchant: input.payee_merchant.trim(),
      supplier_id: input.supplier_id,
      reference: input.reference?.trim(),
      is_tax_deductible: input.is_tax_deductible ?? true,
      is_vatable: input.is_vatable ?? false,
      vat_rate_bp: vatRateBp,
      vat_minor: vatMinor,
      net_amount_minor: netMinor,
      status: input.status || 'paid',
      receipt_ref: input.receipt_ref?.trim(),
      recorded_by_user_id: input.recorded_by_user_id,
      created_at: now,
      updated_at: now,
    };

    StorageService.saveBusinessExpense(expense);
    return expense;
  }

  static updateExpense(
    id: string,
    updates: Partial<BusinessExpense>
  ): BusinessExpense {
    const existing = this.getExpenseById(id);
    if (!existing) throw new Error('Expense record not found.');

    const company = StorageService.getCompanies().find((c) => c.id === existing.company_id);
    const amountMinor = updates.amount_minor ?? existing.amount_minor;
    if (amountMinor <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }

    const isVatable = updates.is_vatable ?? existing.is_vatable;
    const vatRateBp = company?.is_vat_registered && isVatable
      ? updates.vat_rate_bp ?? existing.vat_rate_bp ?? (company.vat_rate_bp || 1600)
      : 0;

    let netMinor = amountMinor;
    let vatMinor = 0;

    if (isVatable && vatRateBp > 0) {
      const rateMultiplier = 1 + vatRateBp / 10000;
      netMinor = Math.round(amountMinor / rateMultiplier);
      vatMinor = amountMinor - netMinor;
    }

    const updated: BusinessExpense = {
      ...existing,
      ...updates,
      amount_minor: amountMinor,
      is_vatable: isVatable,
      vat_rate_bp: vatRateBp,
      net_amount_minor: netMinor,
      vat_minor: vatMinor,
      updated_at: new Date().toISOString(),
    };

    StorageService.saveBusinessExpense(updated);
    return updated;
  }

  static deleteExpense(id: string): boolean {
    return StorageService.deleteBusinessExpense(id);
  }

  // ==========================================
  // 4. PROFIT & LOSS (INCOME STATEMENT)
  // ==========================================

  static calculateProfitAndLoss(
    companyId: string,
    startDate: string,
    endDate: string,
    options?: {
      basis?: 'accrual' | 'cash';
      preset?: string;
    }
  ): ProfitAndLossStatement {
    const basis = options?.basis || 'accrual';
    const preset = options?.preset || 'custom';

    const company = StorageService.getCompanies().find((c) => c.id === companyId) || {
      currency_code: 'ZMW' as const,
    };

    // 1. REVENUE CALCULATION
    const invoices = StorageService.getInvoices(companyId);
    let salesInvoicedMinor = 0;
    let salesPaidMinor = 0;
    let salesCount = 0;
    let outputVatMinor = 0;

    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue;

      // Check date range
      const inRangeIssue = inv.issue_date >= startDate && inv.issue_date <= endDate;
      if (inRangeIssue) {
        // Exclude VAT from gross revenue if business is VAT registered (Net Turnover)
        salesInvoicedMinor += inv.subtotal_minor;
        outputVatMinor += inv.vat_minor;
        salesCount++;

        // Deduct credit notes issued on this invoice in the period
        if (inv.credit_notes && inv.credit_notes.length > 0) {
          for (const cn of inv.credit_notes) {
            if (cn.status !== 'void') {
              salesInvoicedMinor -= cn.amount_minor;
              outputVatMinor -= cn.vat_minor;
            }
          }
        }
      }

      // Check paid amount in period
      if (inv.payments && inv.payments.length > 0) {
        for (const p of inv.payments) {
          const pDate = p.allocated_at ? p.allocated_at.split('T')[0] : inv.issue_date;
          if (pDate >= startDate && pDate <= endDate && !p.is_reversed) {
            // Net portion of payment based on ratio of subtotal to total
            const ratio = inv.total_minor > 0 ? inv.subtotal_minor / inv.total_minor : 1;
            salesPaidMinor += Math.round(p.amount_minor * ratio);
          }
        }
      }
    }

    const effectiveRevenueMinor = basis === 'accrual' ? Math.max(0, salesInvoicedMinor) : salesPaidMinor;

    // 2. COST OF SALES (COGS) & OPERATING EXPENSES (OPEX)
    const categoryTotals: Record<ExpenseCategory, { amountMinor: number; count: number }> = {} as any;
    EXPENSE_CATEGORIES.forEach((c) => {
      categoryTotals[c.id] = { amountMinor: 0, count: 0 };
    });

    const purchaseInvoices = StorageService.getPurchaseInvoices().filter(
      (p) => p.company_id === companyId && p.status !== 'cancelled'
    );

    let purchaseBillsCogsMinor = 0;
    let inputVatPurchasesMinor = 0;

    for (const pi of purchaseInvoices) {
      if (basis === 'accrual') {
        const inRange = pi.issue_date >= startDate && pi.issue_date <= endDate;
        if (inRange) {
          inputVatPurchasesMinor += pi.vat_minor;

          if (pi.lines && pi.lines.length > 0) {
            for (const line of pi.lines) {
              const lineCat = line.category || pi.category || 'cost_of_goods';
              if (lineCat === 'cost_of_goods' || lineCat === 'subcontractor') {
                purchaseBillsCogsMinor += line.line_subtotal_minor;
              } else {
                if (!categoryTotals[lineCat]) {
                  categoryTotals[lineCat] = { amountMinor: 0, count: 0 };
                }
                categoryTotals[lineCat].amountMinor += line.line_subtotal_minor;
                categoryTotals[lineCat].count += 1;
              }
            }
          } else {
            const billCat = pi.category || 'cost_of_goods';
            if (billCat === 'cost_of_goods' || billCat === 'subcontractor') {
              purchaseBillsCogsMinor += pi.subtotal_minor;
            } else {
              if (!categoryTotals[billCat]) {
                categoryTotals[billCat] = { amountMinor: 0, count: 0 };
              }
              categoryTotals[billCat].amountMinor += pi.subtotal_minor;
              categoryTotals[billCat].count += 1;
            }
          }
        }
      } else {
        // Cash basis: count payments recorded against purchase bills within date range
        if (pi.payments && pi.payments.length > 0) {
          for (const pmt of pi.payments) {
            if (pmt.payment_date >= startDate && pmt.payment_date <= endDate) {
              const ratio = pi.total_minor > 0 ? pmt.amount_minor / pi.total_minor : 1;
              const inputVatPaid = Math.round(pi.vat_minor * ratio);
              inputVatPurchasesMinor += inputVatPaid;
              const netPaid = pmt.amount_minor - inputVatPaid;

              if (pi.lines && pi.lines.length > 0 && pi.subtotal_minor > 0) {
                for (const line of pi.lines) {
                  const lineShare = Math.round((line.line_subtotal_minor / pi.subtotal_minor) * netPaid);
                  const lineCat = line.category || pi.category || 'cost_of_goods';
                  if (lineCat === 'cost_of_goods' || lineCat === 'subcontractor') {
                    purchaseBillsCogsMinor += lineShare;
                  } else {
                    if (!categoryTotals[lineCat]) {
                      categoryTotals[lineCat] = { amountMinor: 0, count: 0 };
                    }
                    categoryTotals[lineCat].amountMinor += lineShare;
                    categoryTotals[lineCat].count += 1;
                  }
                }
              } else {
                const billCat = pi.category || 'cost_of_goods';
                if (billCat === 'cost_of_goods' || billCat === 'subcontractor') {
                  purchaseBillsCogsMinor += netPaid;
                } else {
                  if (!categoryTotals[billCat]) {
                    categoryTotals[billCat] = { amountMinor: 0, count: 0 };
                  }
                  categoryTotals[billCat].amountMinor += netPaid;
                  categoryTotals[billCat].count += 1;
                }
              }
            }
          }
        }
      }
    }

    // Direct expenses
    const expenses = StorageService.getBusinessExpenses().filter((e) => e.company_id === companyId);
    let directExpensesCogsMinor = 0;
    let inputVatExpensesMinor = 0;

    for (const exp of expenses) {
      if (exp.date >= startDate && exp.date <= endDate) {
        if (basis === 'cash' && exp.status === 'pending') continue;

        inputVatExpensesMinor += exp.vat_minor;

        if (exp.category === 'cost_of_goods' || exp.category === 'subcontractor') {
          directExpensesCogsMinor += exp.net_amount_minor;
        } else {
          if (!categoryTotals[exp.category]) {
            categoryTotals[exp.category] = { amountMinor: 0, count: 0 };
          }
          categoryTotals[exp.category].amountMinor += exp.net_amount_minor;
          categoryTotals[exp.category].count += 1;
        }
      }
    }

    const totalCostOfSalesMinor = purchaseBillsCogsMinor + directExpensesCogsMinor;
    const grossProfitMinor = effectiveRevenueMinor - totalCostOfSalesMinor;
    const grossMarginPercent = effectiveRevenueMinor > 0
      ? (grossProfitMinor / effectiveRevenueMinor) * 100
      : 0;

    let totalOpexMinor = 0;
    const opexList: {
      category: ExpenseCategory;
      label: string;
      group: string;
      amountMinor: number;
      percentageOfExpenses: number;
      percentageOfRevenue: number;
      count: number;
    }[] = [];

    EXPENSE_CATEGORIES.forEach((catMeta) => {
      if (catMeta.id === 'cost_of_goods' || catMeta.id === 'subcontractor') return;
      const data = categoryTotals[catMeta.id];
      if (data && data.amountMinor > 0) {
        totalOpexMinor += data.amountMinor;
      }
    });

    EXPENSE_CATEGORIES.forEach((catMeta) => {
      if (catMeta.id === 'cost_of_goods' || catMeta.id === 'subcontractor') return;
      const data = categoryTotals[catMeta.id] || { amountMinor: 0, count: 0 };
      if (data.amountMinor > 0) {
        opexList.push({
          category: catMeta.id,
          label: catMeta.name,
          group: catMeta.group,
          amountMinor: data.amountMinor,
          percentageOfExpenses: totalOpexMinor > 0 ? (data.amountMinor / totalOpexMinor) * 100 : 0,
          percentageOfRevenue: effectiveRevenueMinor > 0 ? (data.amountMinor / effectiveRevenueMinor) * 100 : 0,
          count: data.count,
        });
      }
    });

    opexList.sort((a, b) => b.amountMinor - a.amountMinor);

    // 4. OPERATING & NET PROFIT
    const operatingProfitMinor = grossProfitMinor - totalOpexMinor;
    const operatingMarginPercent = effectiveRevenueMinor > 0
      ? (operatingProfitMinor / effectiveRevenueMinor) * 100
      : 0;

    const netProfitMinor = operatingProfitMinor;
    const netMarginPercent = effectiveRevenueMinor > 0
      ? (netProfitMinor / effectiveRevenueMinor) * 100
      : 0;

    // 5. TAX / VAT SUMMARY
    const totalInputVatMinor = inputVatPurchasesMinor + inputVatExpensesMinor;
    const netVatPayableMinor = outputVatMinor - totalInputVatMinor;

    return {
      companyId,
      currencyCode: (company as Company).currency_code || 'ZMW',
      periodStart: startDate,
      periodEnd: endDate,
      preset,
      basis,
      revenue: {
        salesInvoicedMinor,
        salesPaidMinor,
        effectiveRevenueMinor,
        salesCount,
      },
      costOfSales: {
        purchaseBillsMinor: purchaseBillsCogsMinor,
        directExpensesMinor: directExpensesCogsMinor,
        totalCostOfSalesMinor,
        items: [
          {
            name: 'Direct Hardware, Materials & Inventory',
            amountMinor: purchaseBillsCogsMinor,
            percentage: totalCostOfSalesMinor > 0 ? (purchaseBillsCogsMinor / totalCostOfSalesMinor) * 100 : 0,
          },
          {
            name: 'Direct Project Consumables & Field Labour',
            amountMinor: directExpensesCogsMinor,
            percentage: totalCostOfSalesMinor > 0 ? (directExpensesCogsMinor / totalCostOfSalesMinor) * 100 : 0,
          },
        ].filter((i) => i.amountMinor > 0),
      },
      grossProfitMinor,
      grossMarginPercent,
      operatingExpenses: {
        totalMinor: totalOpexMinor,
        categories: opexList,
      },
      operatingProfitMinor,
      operatingMarginPercent,
      netProfitMinor,
      netMarginPercent,
      taxVatSummary: {
        outputVatMinor,
        inputVatPurchasesMinor,
        inputVatExpensesMinor,
        totalInputVatMinor,
        netVatPayableMinor,
      },
    };
  }
}
