import {
  Company,
  CreditNote,
  DiscountType,
  Invoice,
  InvoiceLine,
  PaymentAllocation,
  PaymentMethod,
  Quotation,
} from '../types';
import { QuotationCalculator, RawLineInput } from './quotationCalculator';
import { InvoiceStatusResolver } from './invoiceStatusResolver';

export interface CreateInvoiceInput {
  company_id: string;
  quotation_id?: string;
  organisation_id: string;
  contact_id?: string;
  reference?: string;
  po_number?: string;
  issue_date: string;
  due_date: string;
  payment_terms_days?: number;
  currency_code?: 'ZMW' | 'USD' | 'EUR' | 'GBP' | 'ZAR';
  discount_type?: DiscountType;
  discount_value?: number;
  vat_rate_bp?: number;
  notes?: string;
  terms?: string;
  issued_by_user_id: string;
  lines: RawLineInput[];
}

export interface UpdateInvoiceInput {
  organisation_id?: string;
  contact_id?: string;
  reference?: string;
  po_number?: string;
  issue_date?: string;
  due_date?: string;
  payment_terms_days?: number;
  currency_code?: 'ZMW' | 'USD' | 'EUR' | 'GBP' | 'ZAR';
  discount_type?: DiscountType;
  discount_value?: number;
  vat_rate_bp?: number;
  notes?: string;
  terms?: string;
  lines?: RawLineInput[];
}

export interface RecordPaymentInput {
  amount_minor: number;
  payment_method?: PaymentMethod;
  reference?: string;
  note?: string;
  allocated_by_user_id?: string;
  allocated_at?: string;
}

export interface CreateCreditNoteInput {
  amount_minor: number;
  reason: string;
  issue_date?: string;
}

export interface BalanceDiscrepancy {
  invoice_id: string;
  invoice_number: string;
  stored_paid_minor: number;
  computed_paid_minor: number;
  stored_balance_due_minor: number;
  computed_balance_due_minor: number;
  total_minor: number;
}

export class InvoiceService {
  /**
   * Generates sequential atomic number for invoice or credit note
   */
  static generateNumber(company: Company, type: 'invoice' | 'credit_note' | 'quotation'): { number: string; updatedCompany: Company } {
    const year = new Date().getFullYear();
    const updatedCompany = { ...company };

    if (type === 'invoice') {
      const prefix = company.invoice_prefix || 'INV-';
      const seq = company.next_invoice_number || 1;
      const formattedSeq = String(seq).padStart(5, '0');
      const number = `${prefix}${year}-${formattedSeq}`;
      updatedCompany.next_invoice_number = seq + 1;
      return { number, updatedCompany };
    } else if (type === 'credit_note') {
      const prefix = company.credit_note_prefix || 'CN-';
      const seq = company.next_credit_note_number || 1;
      const formattedSeq = String(seq).padStart(5, '0');
      const number = `${prefix}${year}-${formattedSeq}`;
      updatedCompany.next_credit_note_number = seq + 1;
      return { number, updatedCompany };
    } else {
      const prefix = company.quotation_prefix || 'QT-';
      const seq = company.next_quotation_number || 1;
      const formattedSeq = String(seq).padStart(5, '0');
      const number = `${prefix}${year}-${formattedSeq}`;
      updatedCompany.next_quotation_number = seq + 1;
      return { number, updatedCompany };
    }
  }

  /**
   * Creates a draft invoice
   */
  static createInvoice(
    company: Company,
    input: CreateInvoiceInput,
  ): { invoice: Invoice; updatedCompany: Company } {
    const { number, updatedCompany } = this.generateNumber(company, 'invoice');

    const vatRate = input.vat_rate_bp ?? (company.is_vat_registered ? company.vat_rate_bp : 0);
    const calcResult = QuotationCalculator.calculate(
      input.lines,
      input.discount_type || 'none',
      input.discount_value || 0,
      vatRate
    );

    const now = new Date().toISOString();
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const lines: InvoiceLine[] = calcResult.lines.map((l) => ({
      ...l,
      id: `inv_line_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      company_id: company.id,
      invoice_id: invoiceId,
      created_at: now,
      updated_at: now,
    }));

    const invoice: Invoice = {
      id: invoiceId,
      company_id: company.id,
      quotation_id: input.quotation_id,
      organisation_id: input.organisation_id,
      contact_id: input.contact_id,
      number,
      reference: input.reference,
      po_number: input.po_number,
      issue_date: input.issue_date,
      due_date: input.due_date,
      payment_terms_days: input.payment_terms_days || 30,
      currency_code: input.currency_code || company.currency_code || 'ZMW',
      subtotal_minor: calcResult.subtotal_minor,
      discount_type: input.discount_type || 'none',
      discount_value: input.discount_value || 0,
      discount_minor: calcResult.discount_minor,
      vat_rate_bp: vatRate,
      vat_minor: calcResult.vat_minor,
      total_minor: calcResult.total_minor,
      amount_paid_minor: 0,
      balance_due_minor: calcResult.total_minor,
      status: 'draft',
      notes: input.notes,
      terms: input.terms || company.default_invoice_terms,
      issued_by_user_id: input.issued_by_user_id,
      created_at: now,
      updated_at: now,
      lines,
      payments: [],
      credit_notes: [],
    };

    return { invoice, updatedCompany };
  }

  /**
   * Updates an invoice. CRITICAL RULE: Once sent, lines and totals are IMMUTABLE.
   */
  static updateInvoice(existing: Invoice, updates: UpdateInvoiceInput): Invoice {
    // Check immutability if invoice is not draft
    if (existing.status !== 'draft') {
      const isAttemptingLineEdit = updates.lines !== undefined;
      const isAttemptingDiscountEdit = updates.discount_type !== undefined || updates.discount_value !== undefined;
      const isAttemptingVatEdit = updates.vat_rate_bp !== undefined;

      if (isAttemptingLineEdit || isAttemptingDiscountEdit || isAttemptingVatEdit) {
        throw new Error(
          `Accounting Integrity Violation: Invoice ${existing.number} has status '${existing.status}'. Sent invoices are immutable; lines and totals cannot be edited. Corrections must occur via credit note or cancellation.`
        );
      }
    }

    const now = new Date().toISOString();
    let subtotalMinor = existing.subtotal_minor;
    let discountMinor = existing.discount_minor;
    let vatMinor = existing.vat_minor;
    let totalMinor = existing.total_minor;
    let lines = existing.lines;

    const discountType = updates.discount_type !== undefined ? updates.discount_type : existing.discount_type;
    const discountValue = updates.discount_value !== undefined ? updates.discount_value : existing.discount_value;
    const vatRate = updates.vat_rate_bp !== undefined ? updates.vat_rate_bp : existing.vat_rate_bp;

    if (updates.lines) {
      const calcResult = QuotationCalculator.calculate(updates.lines, discountType, discountValue, vatRate);
      subtotalMinor = calcResult.subtotal_minor;
      discountMinor = calcResult.discount_minor;
      vatMinor = calcResult.vat_minor;
      totalMinor = calcResult.total_minor;

      lines = calcResult.lines.map((l) => ({
        ...l,
        id: `inv_line_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        company_id: existing.company_id,
        invoice_id: existing.id,
        created_at: now,
        updated_at: now,
      }));
    }

    const balanceDue = totalMinor - existing.amount_paid_minor;

    return {
      ...existing,
      organisation_id: updates.organisation_id !== undefined ? updates.organisation_id : existing.organisation_id,
      contact_id: updates.contact_id !== undefined ? updates.contact_id : existing.contact_id,
      reference: updates.reference !== undefined ? updates.reference : existing.reference,
      po_number: updates.po_number !== undefined ? updates.po_number : existing.po_number,
      issue_date: updates.issue_date !== undefined ? updates.issue_date : existing.issue_date,
      due_date: updates.due_date !== undefined ? updates.due_date : existing.due_date,
      payment_terms_days: updates.payment_terms_days !== undefined ? updates.payment_terms_days : existing.payment_terms_days,
      currency_code: updates.currency_code !== undefined ? updates.currency_code : existing.currency_code,
      subtotal_minor: subtotalMinor,
      discount_type: discountType,
      discount_value: discountValue,
      discount_minor: discountMinor,
      vat_rate_bp: vatRate,
      vat_minor: vatMinor,
      total_minor: totalMinor,
      balance_due_minor: balanceDue,
      notes: updates.notes !== undefined ? updates.notes : existing.notes,
      terms: updates.terms !== undefined ? updates.terms : existing.terms,
      lines,
      updated_at: now,
    };
  }

  /**
   * Marks a draft invoice as sent
   */
  static sendInvoice(invoice: Invoice, sentAt?: string): Invoice {
    if (invoice.status !== 'draft') {
      return invoice;
    }
    const now = sentAt || new Date().toISOString();
    const updated: Invoice = {
      ...invoice,
      status: 'sent',
      sent_at: now,
      updated_at: now,
    };
    updated.status = InvoiceStatusResolver.resolve(updated);
    return updated;
  }

  /**
   * Cancels an invoice. Rule: Cannot cancel if any payment is allocated until unallocated.
   */
  static cancelInvoice(invoice: Invoice, reason: string): Invoice {
    if (invoice.amount_paid_minor > 0 || (invoice.payments && invoice.payments.length > 0)) {
      throw new Error(
        `Cannot cancel invoice ${invoice.number}: It has payments allocated totaling ${invoice.amount_paid_minor / 100} ${invoice.currency_code}. Unallocate all payments before cancelling.`
      );
    }

    const now = new Date().toISOString();
    return {
      ...invoice,
      status: 'cancelled',
      cancelled_at: now,
      cancellation_reason: reason,
      updated_at: now,
    };
  }

  /**
   * Records a payment against an invoice and recalculates balance inside the transaction
   */
  static recordPayment(
    invoice: Invoice,
    paymentInput: RecordPaymentInput
  ): { invoice: Invoice; payment: PaymentAllocation } {
    if (invoice.status === 'cancelled') {
      throw new Error(`Cannot record payment on cancelled invoice ${invoice.number}`);
    }
    if (invoice.status === 'draft') {
      throw new Error(`Cannot record payment on draft invoice ${invoice.number}. Please send the invoice first.`);
    }
    if (paymentInput.amount_minor <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    if (paymentInput.amount_minor > invoice.balance_due_minor) {
      throw new Error(
        `Payment amount (${paymentInput.amount_minor / 100}) exceeds balance due (${invoice.balance_due_minor / 100})`
      );
    }

    const now = paymentInput.allocated_at || new Date().toISOString();
    const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payment: PaymentAllocation = {
      id: paymentId,
      company_id: invoice.company_id,
      invoice_id: invoice.id,
      payment_id: paymentId,
      amount_minor: paymentInput.amount_minor,
      allocated_at: now,
      allocated_by_user_id: paymentInput.allocated_by_user_id || 'usr-system',
      payment_method: paymentInput.payment_method,
      reference: paymentInput.reference,
      note: paymentInput.note,
    };

    const newAmountPaid = invoice.amount_paid_minor + paymentInput.amount_minor;
    const newBalanceDue = invoice.total_minor - newAmountPaid;

    const existingPayments = invoice.payments || [];
    const updatedPayments = [...existingPayments, payment];

    let updatedInvoice: Invoice = {
      ...invoice,
      amount_paid_minor: newAmountPaid,
      balance_due_minor: newBalanceDue,
      fully_paid_at: newBalanceDue === 0 ? now : invoice.fully_paid_at,
      payments: updatedPayments,
      updated_at: now,
    };

    updatedInvoice.status = InvoiceStatusResolver.resolve(updatedInvoice);

    return { invoice: updatedInvoice, payment };
  }

  /**
   * Issues a credit note against an invoice
   */
  static issueCreditNote(
    company: Company,
    invoice: Invoice,
    input: CreateCreditNoteInput
  ): { invoice: Invoice; creditNote: CreditNote; updatedCompany: Company } {
    if (invoice.status === 'cancelled') {
      throw new Error(`Cannot credit cancelled invoice ${invoice.number}`);
    }
    if (input.amount_minor <= 0) {
      throw new Error('Credit note amount must be positive');
    }
    if (input.amount_minor > invoice.balance_due_minor) {
      throw new Error(
        `Credit note amount (${input.amount_minor / 100}) exceeds remaining balance (${invoice.balance_due_minor / 100})`
      );
    }

    const { number, updatedCompany } = this.generateNumber(company, 'credit_note');
    const now = new Date().toISOString();

    const vatPortion = invoice.total_minor > 0
      ? Math.round((input.amount_minor * invoice.vat_minor) / invoice.total_minor)
      : 0;
    const netAmount = input.amount_minor - vatPortion;

    const creditNote: CreditNote = {
      id: `cn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      company_id: invoice.company_id,
      invoice_id: invoice.id,
      number,
      issue_date: input.issue_date || new Date().toISOString().slice(0, 10),
      reason: input.reason,
      amount_minor: netAmount,
      vat_minor: vatPortion,
      total_minor: input.amount_minor,
      status: 'issued',
      created_at: now,
      updated_at: now,
    };

    const newBalanceDue = invoice.balance_due_minor - input.amount_minor;
    const existingCreditNotes = invoice.credit_notes || [];

    const updatedInvoice: Invoice = {
      ...invoice,
      balance_due_minor: newBalanceDue,
      credit_notes: [...existingCreditNotes, creditNote],
      status: newBalanceDue === 0 && invoice.amount_paid_minor === 0 ? 'credited' : invoice.status,
      updated_at: now,
    };

    return { invoice: updatedInvoice, creditNote, updatedCompany };
  }

  /**
   * Converts a quotation to an invoice with identical stored totals
   */
  static convertQuotationToInvoice(
    company: Company,
    quotation: Quotation,
    issuedByUserId: string
  ): { invoice: Invoice; updatedCompany: Company } {
    const { number, updatedCompany } = this.generateNumber(company, 'invoice');
    const now = new Date().toISOString();
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const issueDate = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const invoiceLines: InvoiceLine[] = (quotation.lines || []).map((ql) => ({
      id: `inv_line_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      company_id: company.id,
      invoice_id: invoiceId,
      sort_order: ql.sort_order,
      item_code: ql.item_code,
      description: ql.description,
      quantity_thousandths: ql.quantity_thousandths,
      unit: ql.unit,
      unit_price_minor: ql.unit_price_minor,
      discount_percent_bp: ql.discount_percent_bp,
      line_subtotal_minor: ql.line_subtotal_minor,
      is_vatable: ql.is_vatable,
      line_vat_minor: ql.line_vat_minor,
      line_total_minor: ql.line_total_minor,
      created_at: now,
      updated_at: now,
    }));

    // Identical stored totals matching source quotation
    const invoice: Invoice = {
      id: invoiceId,
      company_id: company.id,
      quotation_id: quotation.id,
      organisation_id: quotation.organisation_id,
      contact_id: quotation.contact_id,
      number,
      reference: quotation.reference || `From Quote ${quotation.number}`,
      po_number: '',
      issue_date: issueDate,
      due_date: dueDate,
      payment_terms_days: 30,
      currency_code: quotation.currency_code,
      subtotal_minor: quotation.subtotal_minor,
      discount_type: quotation.discount_type,
      discount_value: quotation.discount_value,
      discount_minor: quotation.discount_minor,
      vat_rate_bp: quotation.vat_rate_bp,
      vat_minor: quotation.vat_minor,
      total_minor: quotation.total_minor,
      amount_paid_minor: 0,
      balance_due_minor: quotation.total_minor,
      status: 'draft',
      notes: quotation.notes,
      terms: quotation.terms || company.default_invoice_terms,
      issued_by_user_id: issuedByUserId,
      created_at: now,
      updated_at: now,
      lines: invoiceLines,
      payments: [],
      credit_notes: [],
    };

    return { invoice, updatedCompany };
  }

  /**
   * Recomputes from allocation ledger and reports any discrepancy (Equivalent to artisan invoices:verify-balances)
   */
  static verifyInvoiceBalances(invoices: Invoice[]): BalanceDiscrepancy[] {
    const discrepancies: BalanceDiscrepancy[] = [];

    for (const inv of invoices) {
      const payments = inv.payments || [];
      const computedPaid = payments.reduce((sum, p) => sum + p.amount_minor, 0);
      
      const creditNotes = inv.credit_notes || [];
      const totalCredited = creditNotes.reduce((sum, cn) => sum + cn.total_minor, 0);

      const computedBalanceDue = Math.max(0, inv.total_minor - computedPaid - totalCredited);

      const hasPaidDiscrepancy = inv.amount_paid_minor !== computedPaid;
      const hasBalanceDiscrepancy = inv.balance_due_minor !== computedBalanceDue;

      if (hasPaidDiscrepancy || hasBalanceDiscrepancy) {
        discrepancies.push({
          invoice_id: inv.id,
          invoice_number: inv.number,
          stored_paid_minor: inv.amount_paid_minor,
          computed_paid_minor: computedPaid,
          stored_balance_due_minor: inv.balance_due_minor,
          computed_balance_due_minor: computedBalanceDue,
          total_minor: inv.total_minor,
        });
      }
    }

    return discrepancies;
  }
}
