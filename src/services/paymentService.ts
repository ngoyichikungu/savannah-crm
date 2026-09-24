import {
  Company,
  CurrencyCode,
  Invoice,
  Payment,
  PaymentAllocation,
  PaymentMethod,
  User,
} from '../types';
import { Money } from '../support/money';
import { StorageService } from './storageService';
import { InvoiceStatusResolver } from './invoiceStatusResolver';

export interface AllocationInput {
  invoice_id: string;
  amount_minor: number;
}

export interface RecordPaymentParams {
  company: Company;
  organisation_id: string;
  contact_id?: string;
  payment_date: string;
  method: PaymentMethod;
  reference?: string;
  currency_code: CurrencyCode;
  amount_minor: number;
  use_unallocated_credit_minor?: number;
  allocations: AllocationInput[];
  notes?: string;
  received_by_user_id: string;
  forceFailMidTransaction?: boolean; // For testing atomic rollback
}

export interface ClientAccountSummary {
  organisation_id: string;
  currency_code: CurrencyCode;
  total_invoiced_minor: number;
  total_paid_minor: number;
  total_outstanding_minor: number;
  unallocated_credit_minor: number;
  open_invoices_count: number;
  payments: Payment[];
  allocations: (PaymentAllocation & { invoice_number?: string; receipt_number?: string })[];
}

export class PaymentService {
  /**
   * Generates the next sequential atomic receipt number for a company.
   */
  static generateReceiptNumber(company: Company): { receiptNumber: string; updatedCompany: Company } {
    const prefix = company.receipt_prefix || 'REC-';
    const year = new Date().getFullYear();
    const seq = company.next_receipt_number || 1;
    const formatted = `${prefix}${year}-${String(seq).padStart(5, '0')}`;

    const updatedCompany: Company = {
      ...company,
      next_receipt_number: seq + 1,
    };

    return { receiptNumber: formatted, updatedCompany };
  }

  /**
   * Allocation Mode 1: Auto Oldest First
   * Allocates funds to the oldest open invoices first until the amount is exhausted.
   */
  static calculateOldestFirst(
    openInvoices: Invoice[],
    totalToAllocateMinor: number
  ): AllocationInput[] {
    if (totalToAllocateMinor <= 0 || openInvoices.length === 0) {
      return [];
    }

    // Sort by issue_date ascending (or due_date)
    const sorted = [...openInvoices]
      .filter((inv) => inv.balance_due_minor > 0 && inv.status !== 'draft' && inv.status !== 'cancelled' && inv.status !== 'credited')
      .sort((a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime());

    const result: AllocationInput[] = [];
    let remainingToAllocate = totalToAllocateMinor;

    for (const inv of sorted) {
      if (remainingToAllocate <= 0) break;
      const allocAmount = Math.min(inv.balance_due_minor, remainingToAllocate);
      if (allocAmount > 0) {
        result.push({
          invoice_id: inv.id,
          amount_minor: allocAmount,
        });
        remainingToAllocate -= allocAmount;
      }
    }

    return result;
  }

  /**
   * Allocation Mode 2: Auto Proportional
   * Proportionally distributes funds across open invoices based on their balance due,
   * using Money.allocateByRatio so no minor unit (ngwee) is lost.
   */
  static calculateProportional(
    openInvoices: Invoice[],
    totalToAllocateMinor: number,
    currencyCode: CurrencyCode = 'ZMW'
  ): AllocationInput[] {
    if (totalToAllocateMinor <= 0 || openInvoices.length === 0) {
      return [];
    }

    const eligibleInvoices = openInvoices.filter(
      (inv) => inv.balance_due_minor > 0 && inv.status !== 'draft' && inv.status !== 'cancelled' && inv.status !== 'credited'
    );

    if (eligibleInvoices.length === 0) {
      return [];
    }

    const totalOpenBalance = eligibleInvoices.reduce((sum, inv) => sum + inv.balance_due_minor, 0);

    // If total to allocate meets or exceeds the entire balance, pay all fully
    if (totalToAllocateMinor >= totalOpenBalance) {
      return eligibleInvoices.map((inv) => ({
        invoice_id: inv.id,
        amount_minor: inv.balance_due_minor,
      }));
    }

    // Use Money.allocateByRatio with invoice balance dues as weights
    const ratios = eligibleInvoices.map((inv) => inv.balance_due_minor);
    const allocatedMoney = Money.allocateByRatio(totalToAllocateMinor, ratios, currencyCode);

    return eligibleInvoices.map((inv, idx) => {
      // Ensure we don't allocate more than invoice balance
      const minor = Math.min(inv.balance_due_minor, allocatedMoney[idx].amountMinor);
      return {
        invoice_id: inv.id,
        amount_minor: minor,
      };
    });
  }

  /**
   * Returns the current unallocated credit balance for a client across all prior payments.
   */
  static getClientUnallocatedCredit(companyId: string, organisationId: string): number {
    const payments = StorageService.getPayments(organisationId).filter(
      (p) => p.company_id === companyId && !p.deleted_at
    );
    return payments.reduce((sum, p) => sum + Math.max(0, p.unallocated_minor), 0);
  }

  /**
   * Record a payment and its allocations against client invoices atomically.
   */
  static recordPayment(params: RecordPaymentParams): {
    payment: Payment;
    allocations: PaymentAllocation[];
    invoices: Invoice[];
    updatedCompany: Company;
  } {
    const {
      company,
      organisation_id,
      contact_id,
      payment_date,
      method,
      reference,
      currency_code,
      amount_minor,
      use_unallocated_credit_minor = 0,
      allocations,
      notes,
      received_by_user_id,
      forceFailMidTransaction,
    } = params;

    if (amount_minor < 0) {
      throw new Error('Payment amount cannot be negative.');
    }
    if (use_unallocated_credit_minor < 0) {
      throw new Error('Unallocated credit to apply cannot be negative.');
    }

    const totalFundsAvailable = amount_minor + use_unallocated_credit_minor;
    if (totalFundsAvailable <= 0 && allocations.length > 0) {
      throw new Error('Total funds available must be greater than zero to allocate to invoices.');
    }

    // Calculate total requested allocation
    const totalAllocatedMinor = allocations.reduce((sum, a) => sum + a.amount_minor, 0);

    // Rule: Over-allocation beyond available funds is strictly rejected
    if (totalAllocatedMinor > totalFundsAvailable) {
      throw new Error(
        `Over-allocation rejected: requested allocation (${totalAllocatedMinor} minor) exceeds total available funds (${totalFundsAvailable} minor).`
      );
    }

    // Validate each allocation against invoice balance due and status
    const db = StorageService.getDb();
    const invoicesToUpdate: { invoice: Invoice; allocAmount: number }[] = [];

    for (const alloc of allocations) {
      if (alloc.amount_minor <= 0) continue;

      const invoice = db.invoices.find((i) => i.id === alloc.invoice_id && i.company_id === company.id);
      if (!invoice) {
        throw new Error(`Invoice #${alloc.invoice_id} not found for this company.`);
      }
      if (invoice.organisation_id !== organisation_id) {
        throw new Error(`Invoice ${invoice.number} does not belong to client #${organisation_id}.`);
      }
      if (invoice.status === 'draft') {
        throw new Error(`Cannot allocate payment to draft invoice ${invoice.number}. Invoice must be issued first.`);
      }
      if (invoice.status === 'cancelled' || invoice.status === 'credited') {
        throw new Error(`Cannot allocate payment to ${invoice.status} invoice ${invoice.number}.`);
      }

      // Rule: Allocation beyond an invoice's balance due is rejected
      if (alloc.amount_minor > invoice.balance_due_minor) {
        throw new Error(
          `Allocation exceeding balance rejected: requested ${alloc.amount_minor} minor for invoice ${invoice.number}, but balance due is only ${invoice.balance_due_minor} minor.`
        );
      }

      invoicesToUpdate.push({ invoice, allocAmount: alloc.amount_minor });
    }

    // Check existing credit availability if client credit is being consumed
    let remainingCreditToConsume = use_unallocated_credit_minor;
    if (remainingCreditToConsume > 0) {
      const clientCredit = this.getClientUnallocatedCredit(company.id, organisation_id);
      if (remainingCreditToConsume > clientCredit) {
        throw new Error(
          `Requested unallocated credit (${remainingCreditToConsume} minor) exceeds available client credit (${clientCredit} minor).`
        );
      }
    }

    // Execute everything inside an atomic transaction
    return StorageService.executeTransaction(() => {
      const now = new Date().toISOString();
      const { receiptNumber, updatedCompany } = this.generateReceiptNumber(company);

      const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Calculate allocation portion funded by new payment vs prior credit
      const allocatedFromPayment = Math.min(amount_minor, totalAllocatedMinor);
      const unallocatedMinor = Math.max(0, amount_minor - allocatedFromPayment);

      const payment: Payment = {
        id: paymentId,
        company_id: company.id,
        organisation_id,
        contact_id,
        receipt_number: receiptNumber,
        payment_date,
        method,
        reference,
        currency_code,
        amount_minor,
        allocated_minor: allocatedFromPayment,
        unallocated_minor: unallocatedMinor,
        notes,
        received_by_user_id,
        created_at: now,
        updated_at: now,
      };

      // Write Payment to storage
      StorageService.savePayment(payment, updatedCompany);

      // Deduct consumed credit from prior payments if requested
      if (remainingCreditToConsume > 0) {
        const priorPayments = StorageService.getPayments(organisation_id).filter(
          (p) => p.company_id === company.id && p.unallocated_minor > 0 && p.id !== paymentId
        );

        for (const priorP of priorPayments) {
          if (remainingCreditToConsume <= 0) break;
          const toDeduct = Math.min(priorP.unallocated_minor, remainingCreditToConsume);
          priorP.unallocated_minor -= toDeduct;
          priorP.allocated_minor += toDeduct;
          priorP.updated_at = now;
          StorageService.savePayment(priorP);
          remainingCreditToConsume -= toDeduct;
        }
      }

      // Write allocation ledger rows and update invoices
      const createdAllocations: PaymentAllocation[] = [];
      const updatedInvoices: Invoice[] = [];

      for (const { invoice, allocAmount } of invoicesToUpdate) {
        const allocId = `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const allocation: PaymentAllocation = {
          id: allocId,
          company_id: company.id,
          payment_id: payment.id,
          invoice_id: invoice.id,
          amount_minor: allocAmount,
          allocated_by_user_id: received_by_user_id,
          allocated_at: now,
          payment_method: method,
          reference,
          note: notes,
          is_reversed: false,
          created_at: now,
          updated_at: now,
        };

        createdAllocations.push(allocation);
        StorageService.savePaymentAllocation(allocation);

        // Update invoice balance and paid amounts
        const newAmountPaid = invoice.amount_paid_minor + allocAmount;
        const newBalanceDue = Math.max(0, invoice.total_minor - newAmountPaid);
        const isFullyPaid = newBalanceDue === 0;

        const updatedInvoice: Invoice = {
          ...invoice,
          amount_paid_minor: newAmountPaid,
          balance_due_minor: newBalanceDue,
          fully_paid_at: isFullyPaid ? now : invoice.fully_paid_at,
          updated_at: now,
        };

        // Re-resolve status
        updatedInvoice.status = InvoiceStatusResolver.resolve(updatedInvoice);
        StorageService.saveInvoice(updatedInvoice);
        updatedInvoices.push(updatedInvoice);
      }

      // Mid-transaction forced failure test hook
      if (forceFailMidTransaction) {
        throw new Error('Simulated transaction failure for atomic rollback verification.');
      }

      return {
        payment,
        allocations: createdAllocations,
        invoices: updatedInvoices,
        updatedCompany,
      };
    });
  }

  /**
   * Unallocates an allocation row (Reversal).
   * Permitted for owner and admin roles.
   * Never hard deletes the allocation row.
   */
  static unallocate(
    allocationId: string,
    currentUser: User,
    reason: string = 'User requested allocation reversal'
  ): {
    reversedAllocation: PaymentAllocation;
    updatedPayment: Payment;
    updatedInvoice: Invoice;
  } {
    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      throw new Error('Permission denied: only owners and administrators can unallocate payments.');
    }

    return StorageService.executeTransaction(() => {
      const db = StorageService.getDb();
      const alloc = db.paymentAllocations.find((a) => a.id === allocationId);
      if (!alloc) {
        throw new Error(`Allocation #${allocationId} not found.`);
      }
      if (alloc.is_reversed) {
        throw new Error(`Allocation #${allocationId} is already reversed.`);
      }

      const payment = db.payments.find((p) => p.id === alloc.payment_id);
      if (!payment) {
        throw new Error(`Associated payment #${alloc.payment_id} not found.`);
      }

      const invoice = db.invoices.find((i) => i.id === alloc.invoice_id);
      if (!invoice) {
        throw new Error(`Associated invoice #${alloc.invoice_id} not found.`);
      }

      const now = new Date().toISOString();

      // 1. Mark allocation as reversed
      const reversedAllocation: PaymentAllocation = {
        ...alloc,
        is_reversed: true,
        reversed_at: now,
        reversed_by_user_id: currentUser.id,
        reversal_reason: reason,
        updated_at: now,
      };
      StorageService.savePaymentAllocation(reversedAllocation);

      // 2. Adjust parent payment amounts (return to unallocated pool)
      const updatedPayment: Payment = {
        ...payment,
        allocated_minor: Math.max(0, payment.allocated_minor - alloc.amount_minor),
        unallocated_minor: payment.unallocated_minor + alloc.amount_minor,
        updated_at: now,
      };
      StorageService.savePayment(updatedPayment);

      // 3. Restore invoice balance & clear fully_paid_at if open
      const newAmountPaid = Math.max(0, invoice.amount_paid_minor - alloc.amount_minor);
      const newBalanceDue = Math.max(0, invoice.total_minor - newAmountPaid);

      const updatedInvoice: Invoice = {
        ...invoice,
        amount_paid_minor: newAmountPaid,
        balance_due_minor: newBalanceDue,
        fully_paid_at: newBalanceDue === 0 ? invoice.fully_paid_at : undefined,
        updated_at: now,
      };

      // Re-resolve invoice status
      updatedInvoice.status = InvoiceStatusResolver.resolve(updatedInvoice);
      StorageService.saveInvoice(updatedInvoice);

      return {
        reversedAllocation,
        updatedPayment,
        updatedInvoice,
      };
    });
  }

  /**
   * Returns a comprehensive client account overview for statement and ledger views.
   */
  static getClientAccountSummary(
    companyId: string,
    organisationId: string
  ): ClientAccountSummary {
    const db = StorageService.getDb();
    const invoices = db.invoices.filter(
      (inv) => inv.company_id === companyId && inv.organisation_id === organisationId && !inv.deleted_at
    );
    const payments = db.payments.filter(
      (p) => p.company_id === companyId && p.organisation_id === organisationId && !p.deleted_at
    );
    const allocations = db.paymentAllocations.filter(
      (a) => a.company_id === companyId && !a.is_reversed
    );

    const company = db.companies.find((c) => c.id === companyId) || db.companies[0];

    // Filter allocations relevant to this client's payments or invoices
    const clientPaymentIds = new Set(payments.map((p) => p.id));
    const clientInvoiceIds = new Set(invoices.map((i) => i.id));

    const enrichedAllocations = allocations
      .filter((a) => clientPaymentIds.has(a.payment_id) || clientInvoiceIds.has(a.invoice_id))
      .map((a) => {
        const inv = invoices.find((i) => i.id === a.invoice_id);
        const pmt = payments.find((p) => p.id === a.payment_id);
        return {
          ...a,
          invoice_number: inv?.number,
          receipt_number: pmt?.receipt_number,
        };
      });

    const nonDraftInvoices = invoices.filter((i) => i.status !== 'draft' && i.status !== 'cancelled');
    const totalInvoiced = nonDraftInvoices.reduce((sum, i) => sum + i.total_minor, 0);
    const totalPaid = nonDraftInvoices.reduce((sum, i) => sum + i.amount_paid_minor, 0);
    const totalOutstanding = nonDraftInvoices.reduce((sum, i) => sum + i.balance_due_minor, 0);
    const unallocatedCredit = payments.reduce((sum, p) => sum + Math.max(0, p.unallocated_minor), 0);
    const openCount = nonDraftInvoices.filter((i) => i.balance_due_minor > 0).length;

    return {
      organisation_id: organisationId,
      currency_code: company.currency_code,
      total_invoiced_minor: totalInvoiced,
      total_paid_minor: totalPaid,
      total_outstanding_minor: totalOutstanding,
      unallocated_credit_minor: unallocatedCredit,
      open_invoices_count: openCount,
      payments,
      allocations: enrichedAllocations,
    };
  }
}
