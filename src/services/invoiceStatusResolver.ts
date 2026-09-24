import { InvoiceStatus } from '../types';

export interface InvoiceStatusInput {
  status?: InvoiceStatus;
  total_minor: number;
  balance_due_minor: number;
  amount_paid_minor?: number;
  due_date: string; // YYYY-MM-DD
}

export class InvoiceStatusResolver {
  /**
   * Resolves the current status of an invoice based on balance, totals, and due date.
   * @param input Invoice data
   * @param asOfDate Date string in YYYY-MM-DD format (defaults to current date)
   */
  static resolve(input: InvoiceStatusInput, asOfDate?: string): InvoiceStatus {
    const currentStatus = input.status || 'draft';

    // Draft, cancelled, and credited statuses are administrative overrides
    if (currentStatus === 'draft') {
      return 'draft';
    }
    if (currentStatus === 'cancelled') {
      return 'cancelled';
    }
    if (currentStatus === 'credited') {
      return 'credited';
    }

    const totalMinor = input.total_minor;
    const balanceMinor = input.balance_due_minor;

    // 1. Balance zero (or paid in full) => 'paid'
    if (balanceMinor <= 0 && totalMinor > 0) {
      return 'paid';
    }

    const todayStr = asOfDate || new Date().toISOString().slice(0, 10);
    const isPastDueDate = input.due_date < todayStr;

    // 2. Past due date with non-zero balance => 'overdue'
    if (isPastDueDate && balanceMinor > 0) {
      return 'overdue';
    }

    // 3. Balance between zero and total (partially paid) => 'partially_paid'
    if (balanceMinor > 0 && balanceMinor < totalMinor) {
      return 'partially_paid';
    }

    // 4. Balance equal to total (not past due) => 'sent'
    if (balanceMinor >= totalMinor) {
      return 'sent';
    }

    return 'sent';
  }
}
