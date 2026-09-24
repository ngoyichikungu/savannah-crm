import {
  Company,
  ReportColumn,
  ReportContract,
  ReportParameter,
  ReportRequest,
  StatementLedgerEntry,
  ClientStatementTotals,
} from '../../types';
import { StorageService } from '../storageService';
import { ReportingDateUtils } from '../reportingDateUtils';
import { Money } from '../../support/money';

export const clientStatementReport: ReportContract<
  { client?: string },
  StatementLedgerEntry,
  ClientStatementTotals
> = {
  id: 'client-statement',
  name: 'Client Statement of Account',
  description: 'Formal chronological debtor ledger displaying running debit/credit entries, opening & closing balance reconciliation, and remittance instructions.',

  parameters: (company: Company): ReportParameter[] => {
    const db = StorageService.getDb();
    const orgs = (db.organisations || []).filter((o) => o.company_id === company.id);

    return [
      {
        id: 'client',
        label: 'Select Client / Debtor',
        type: 'select',
        options: orgs.map((o) => ({ label: o.name, value: o.id })),
        defaultValue: orgs[0]?.id || '',
      },
    ];
  },

  columns: (_filters, company: Company): ReportColumn<StatementLedgerEntry>[] => [
    { key: 'date', label: 'Date', sortable: true, width: '110px' },
    {
      key: 'type',
      label: 'Transaction',
      sortable: true,
      width: '120px',
      format: (v) => {
        const str = String(v).toUpperCase();
        if (str === 'INVOICE') return 'Tax Invoice';
        if (str === 'PAYMENT') return 'Payment Recv';
        if (str === 'CREDIT_NOTE') return 'Credit Note';
        return 'Opening Balance';
      },
    },
    { key: 'reference', label: 'Reference / Document #', sortable: true, width: '150px' },
    { key: 'description', label: 'Description / Narration', sortable: true },
    {
      key: 'debitMinor',
      label: `Debit (+ ${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '130px',
      format: (v) => (v > 0 ? new Money(v, company.currency_code).format() : '—'),
      csvFormat: (v) => ((v || 0) / 100).toFixed(2),
    },
    {
      key: 'creditMinor',
      label: `Credit (- ${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '130px',
      format: (v) => (v > 0 ? new Money(v, company.currency_code).format() : '—'),
      csvFormat: (v) => ((v || 0) / 100).toFixed(2),
    },
    {
      key: 'runningBalanceMinor',
      label: `Balance (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '140px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => ((v || 0) / 100).toFixed(2),
    },
  ],

  rows: (companyId: string, request: ReportRequest<{ client?: string }>): StatementLedgerEntry[] => {
    const db = StorageService.getDb();
    const orgs = (db.organisations || []).filter((o) => o.company_id === companyId);
    const selectedOrgId = request.filters?.client || orgs[0]?.id;

    if (!selectedOrgId) {
      return [];
    }

    const invoices = (db.invoices || []).filter((i) => i.company_id === companyId && i.organisation_id === selectedOrgId);
    const payments = (db.payments || []).filter((p) => p.company_id === companyId && p.organisation_id === selectedOrgId && !p.deleted_at);
    const creditNotes = (db.creditNotes || []).filter((cn) => {
      if (cn.company_id !== companyId || cn.status === 'void') return false;
      const inv = (db.invoices || []).find((i) => i.id === cn.invoice_id);
      return inv?.organisation_id === selectedOrgId;
    });

    const { startDate, endDate } = request.dateRange;

    // 1. Calculate Opening Balance before startDate
    const priorInvoiced = invoices.filter((i) => i.issue_date < startDate).reduce((acc, i) => acc + (i.total_minor || 0), 0);
    const priorPaid = payments.filter((p) => p.payment_date < startDate).reduce((acc, p) => acc + (p.amount_minor || 0), 0);
    const priorCredited = creditNotes.filter((cn) => cn.issue_date < startDate).reduce((acc, cn) => acc + (cn.total_minor || 0), 0);
    const openingBalanceMinor = Math.max(0, priorInvoiced - priorPaid - priorCredited);

    // 2. Gather chronological events in date range
    interface RawEvent {
      id: string;
      date: string;
      type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE';
      reference: string;
      description: string;
      debitMinor: number;
      creditMinor: number;
    }

    const events: RawEvent[] = [];

    for (const inv of invoices) {
      if (ReportingDateUtils.isInRangeInclusive(inv.issue_date, startDate, endDate)) {
        events.push({
          id: inv.id,
          date: inv.issue_date,
          type: 'INVOICE',
          reference: inv.number,
          description: inv.reference ? `Tax Invoice (${inv.reference})` : 'Tax Invoice for Goods / Services',
          debitMinor: inv.total_minor || 0,
          creditMinor: 0,
        });
      }
    }

    for (const p of payments) {
      if (ReportingDateUtils.isInRangeInclusive(p.payment_date, startDate, endDate)) {
        events.push({
          id: p.id,
          date: p.payment_date,
          type: 'PAYMENT',
          reference: p.receipt_number,
          description: p.reference
            ? `Cash Receipt / Settlement (${p.method} - Ref: ${p.reference})`
            : `Cash Receipt / Settlement (${p.method})`,
          debitMinor: 0,
          creditMinor: p.amount_minor || 0,
        });
      }
    }

    for (const cn of creditNotes) {
      if (ReportingDateUtils.isInRangeInclusive(cn.issue_date, startDate, endDate)) {
        events.push({
          id: cn.id,
          date: cn.issue_date,
          type: 'CREDIT_NOTE',
          reference: cn.number,
          description: cn.reason ? `Credit Note Adjustment: ${cn.reason}` : 'Credit Note Adjustment',
          debitMinor: 0,
          creditMinor: cn.total_minor || 0,
        });
      }
    }

    // Sort chronologically (earliest first, invoices before payments on same day)
    events.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      if (a.type === 'INVOICE' && b.type !== 'INVOICE') return -1;
      if (a.type !== 'INVOICE' && b.type === 'INVOICE') return 1;
      return a.reference.localeCompare(b.reference);
    });

    // Build final ledger with running balances
    const ledger: StatementLedgerEntry[] = [
      {
        id: 'opening_balance_row',
        date: startDate,
        type: 'OPENING',
        reference: 'OPENING BALANCE',
        description: `Balance brought forward prior to ${startDate}`,
        debitMinor: 0,
        creditMinor: 0,
        runningBalanceMinor: openingBalanceMinor,
      },
    ];

    let currentBalance = openingBalanceMinor;
    for (const ev of events) {
      currentBalance = currentBalance + ev.debitMinor - ev.creditMinor;
      ledger.push({
        id: ev.id,
        date: ev.date,
        type: ev.type,
        reference: ev.reference,
        description: ev.description,
        debitMinor: ev.debitMinor,
        creditMinor: ev.creditMinor,
        runningBalanceMinor: currentBalance,
      });
    }

    return ledger;
  },

  totals: (rows: StatementLedgerEntry[], _filters, _company, request?: ReportRequest<{ client?: string }>): ClientStatementTotals => {
    let totalDebits = 0;
    let totalCredits = 0;
    const openingBalance = rows[0]?.runningBalanceMinor || 0;

    for (let i = 1; i < rows.length; i++) {
      totalDebits += rows[i].debitMinor;
      totalCredits += rows[i].creditMinor;
    }

    const closingBalance = rows.length > 0 ? rows[rows.length - 1].runningBalanceMinor : openingBalance;

    const db = StorageService.getDb();
    const companyId = request?.companyId || db.currentCompanyId || '';
    const orgs = (db.organisations || []).filter((o) => o.company_id === companyId);
    const selectedOrgId = request?.filters?.client || orgs[0]?.id;
    const org = orgs.find((o) => o.id === selectedOrgId);

    // Aging breakdown
    const endDate = request?.dateRange?.endDate || new Date().toISOString().substring(0, 10);
    const invoices = (db.invoices || []).filter((i) => i.company_id === companyId && i.organisation_id === selectedOrgId && i.issue_date <= endDate);
    const allocations = (db.paymentAllocations || []).filter((a) => a.company_id === companyId && !a.is_reversed);
    const creditNotes = (db.creditNotes || []).filter((cn) => cn.company_id === companyId && cn.status !== 'void');

    let currentMinor = 0;
    let days1_30Minor = 0;
    let days31_60Minor = 0;
    let days61_90Minor = 0;
    let days90PlusMinor = 0;

    for (const inv of invoices) {
      const paid = allocations.filter((a) => a.invoice_id === inv.id).reduce((s, a) => s + a.amount_minor, 0);
      const credited = creditNotes.filter((cn) => cn.invoice_id === inv.id).reduce((s, cn) => s + cn.total_minor, 0);
      const unpaid = Math.max(0, inv.total_minor - paid - credited);
      if (unpaid <= 0) continue;

      const ageDays = ReportingDateUtils.daysBetween(inv.due_date, endDate);
      if (ageDays <= 0) {
        currentMinor += unpaid;
      } else if (ageDays <= 30) {
        days1_30Minor += unpaid;
      } else if (ageDays <= 60) {
        days31_60Minor += unpaid;
      } else if (ageDays <= 90) {
        days61_90Minor += unpaid;
      } else {
        days90PlusMinor += unpaid;
      }
    }

    return {
      organisation: org,
      clientCount: 1,
      openingBalanceMinor: openingBalance,
      totalOpeningBalanceMinor: openingBalance,
      debitsMinor: totalDebits,
      totalDebitsMinor: totalDebits,
      creditsMinor: totalCredits,
      totalCreditsMinor: totalCredits,
      closingBalanceMinor: closingBalance,
      totalClosingBalanceMinor: closingBalance,
      aging: {
        currentMinor,
        days1_30Minor,
        days1To30Minor: days1_30Minor,
        days31_60Minor,
        days31To60Minor: days31_60Minor,
        days61_90Minor,
        days61To90Minor: days61_90Minor,
        days90PlusMinor,
      },
    };
  },

  exportCsv: (company: Company, rows: StatementLedgerEntry[], totals: ClientStatementTotals): string => {
    const headers = [
      'Date',
      'Transaction Type',
      'Reference / Doc #',
      'Description / Narration',
      `Debit (+ ${company.currency_code})`,
      `Credit (- ${company.currency_code})`,
      `Running Balance (${company.currency_code})`,
    ];

    const csvRows = rows.map((r) => [
      `"${r.date}"`,
      `"${r.type}"`,
      `"${r.reference}"`,
      `"${r.description.replace(/"/g, '""')}"`,
      (r.debitMinor / 100).toFixed(2),
      (r.creditMinor / 100).toFixed(2),
      (r.runningBalanceMinor / 100).toFixed(2),
    ]);

    csvRows.push([
      '"CLOSING BALANCE"',
      '""',
      '""',
      '""',
      ((totals.debitsMinor || totals.totalDebitsMinor) / 100).toFixed(2),
      ((totals.creditsMinor || totals.totalCreditsMinor) / 100).toFixed(2),
      ((totals.closingBalanceMinor || totals.totalClosingBalanceMinor || 0) / 100).toFixed(2),
    ]);

    return [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  },

  exportPdfHtml: (company: Company, rows: StatementLedgerEntry[], totals: ClientStatementTotals, _filters, request): string => {
    const org = totals.organisation;
    const formattedClosing = new Money(totals.closingBalanceMinor || totals.totalClosingBalanceMinor || 0, company.currency_code).format();
    const formattedOpening = new Money(totals.openingBalanceMinor || totals.totalOpeningBalanceMinor || 0, company.currency_code).format();
    const aging = totals.aging || { currentMinor: 0, days1_30Minor: 0, days31_60Minor: 0, days61_90Minor: 0, days90PlusMinor: 0 };

    const tableRows = rows
      .map(
        (r) => `
      <tr class="border-b border-stone-200 text-xs">
        <td class="py-2.5 px-2 font-mono">${r.date}</td>
        <td class="py-2.5 px-2 font-medium text-stone-900">${r.type.toUpperCase()}</td>
        <td class="py-2.5 px-2 font-mono font-semibold">${escapeHtml(r.reference)}</td>
        <td class="py-2.5 px-2 text-stone-700">${escapeHtml(r.description)}</td>
        <td class="py-2.5 px-2 text-right font-mono">${r.debitMinor > 0 ? new Money(r.debitMinor, company.currency_code).format() : '—'}</td>
        <td class="py-2.5 px-2 text-right font-mono text-emerald-800">${r.creditMinor > 0 ? new Money(r.creditMinor, company.currency_code).format() : '—'}</td>
        <td class="py-2.5 px-2 text-right font-mono font-bold ${r.runningBalanceMinor > 0 ? 'text-stone-900' : 'text-emerald-700'}">${new Money(r.runningBalanceMinor, company.currency_code).format()}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="p-8 font-sans bg-white text-stone-900 max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex justify-between items-start border-b-2 border-stone-800 pb-6 mb-6">
          <div>
            <h1 class="text-2xl font-black tracking-tight text-stone-900">${escapeHtml(company.legal_name || company.name)}</h1>
            <p class="text-xs text-stone-600 mt-1">${escapeHtml(company.address_line1 || '')}, ${escapeHtml(company.city || '')}, ${escapeHtml(company.country || '')}</p>
            <p class="text-xs text-stone-500">TPIN: ${company.tpin || '—'} | Email: ${company.email || '—'}</p>
          </div>
          <div class="text-right">
            <h2 class="text-xl font-black text-stone-800 uppercase tracking-wider">Statement of Account</h2>
            <div class="text-xs text-stone-500 mt-1">Period: <span class="font-bold text-stone-800">${request.dateRange.startDate}</span> to <span class="font-bold text-stone-800">${request.dateRange.endDate}</span></div>
            <div class="text-xs text-stone-500 mt-0.5">Date of Issue: ${new Date().toISOString().substring(0, 10)}</div>
          </div>
        </div>

        <!-- Client Info & Balance Summary -->
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div class="p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div class="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Account Holder (Debtor)</div>
            <div class="text-base font-bold text-stone-900">${escapeHtml(org?.name || 'Valued Client')}</div>
            <div class="text-xs text-stone-600 mt-1">TPIN: ${org?.tpin || '—'}</div>
            <div class="text-xs text-stone-600">Email: ${org?.email || '—'} | Phone: ${org?.phone || '—'}</div>
            <div class="text-xs text-stone-600">${escapeHtml(org?.address_line1 || '')}</div>
          </div>

          <div class="p-4 bg-stone-900 text-white rounded-xl flex flex-col justify-between">
            <div class="flex justify-between items-center">
              <span class="text-xs text-stone-400 uppercase font-medium">Opening Balance</span>
              <span class="font-mono text-sm font-semibold">${formattedOpening}</span>
            </div>
            <div class="border-t border-stone-800 my-2 pt-2 flex justify-between items-baseline">
              <div>
                <div class="text-[11px] uppercase tracking-wider text-stone-400 font-bold">Total Amount Due</div>
                <div class="text-xs text-stone-400">Payable upon receipt</div>
              </div>
              <div class="text-2xl font-black font-mono text-emerald-400">${formattedClosing}</div>
            </div>
          </div>
        </div>

        <!-- Ledger Table -->
        <table class="w-full text-left border-collapse mb-6">
          <thead>
            <tr class="border-b-2 border-stone-800 text-[11px] uppercase tracking-wider text-stone-700 bg-stone-100">
              <th class="py-2.5 px-2">Date</th>
              <th class="py-2.5 px-2">Type</th>
              <th class="py-2.5 px-2">Reference</th>
              <th class="py-2.5 px-2">Description</th>
              <th class="py-2.5 px-2 text-right">Debit (+)</th>
              <th class="py-2.5 px-2 text-right">Credit (-)</th>
              <th class="py-2.5 px-2 text-right font-bold">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="7" class="text-center py-6 text-xs text-stone-400">No statement entries</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-stone-800 font-bold bg-stone-100 text-xs">
              <td colspan="4" class="py-2.5 px-2 text-stone-800 uppercase">Movement Totals & Closing Balance</td>
              <td class="py-2.5 px-2 text-right font-mono">${new Money(totals.totalDebitsMinor, company.currency_code).format()}</td>
              <td class="py-2.5 px-2 text-right font-mono text-emerald-800">${new Money(totals.totalCreditsMinor, company.currency_code).format()}</td>
              <td class="py-2.5 px-2 text-right font-mono font-black text-emerald-900">${formattedClosing}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Aging Analysis Strip -->
        <div class="p-4 bg-stone-50 rounded-xl border border-stone-200 mb-6">
          <div class="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">Aging Analysis of Outstanding Balance</div>
          <div class="grid grid-cols-5 gap-2 text-center">
            <div class="p-2 bg-white rounded border border-stone-200">
              <div class="text-[10px] text-stone-500 font-bold">Current (<30d)</div>
              <div class="font-mono text-xs font-bold mt-0.5">${new Money(aging.currentMinor, company.currency_code).format()}</div>
            </div>
            <div class="p-2 bg-white rounded border border-stone-200">
              <div class="text-[10px] text-stone-500 font-bold">1–30 Days</div>
              <div class="font-mono text-xs font-bold mt-0.5">${new Money(aging.days1_30Minor || aging.days1To30Minor || 0, company.currency_code).format()}</div>
            </div>
            <div class="p-2 bg-white rounded border border-stone-200">
              <div class="text-[10px] text-stone-500 font-bold">31–60 Days</div>
              <div class="font-mono text-xs font-bold text-amber-700 mt-0.5">${new Money(aging.days31_60Minor || aging.days31To60Minor || 0, company.currency_code).format()}</div>
            </div>
            <div class="p-2 bg-white rounded border border-stone-200">
              <div class="text-[10px] text-stone-500 font-bold">61–90 Days</div>
              <div class="font-mono text-xs font-bold text-rose-600 mt-0.5">${new Money(aging.days61_90Minor || aging.days61To90Minor || 0, company.currency_code).format()}</div>
            </div>
            <div class="p-2 bg-white rounded border border-stone-200">
              <div class="text-[10px] text-stone-500 font-bold">90+ Days</div>
              <div class="font-mono text-xs font-black text-rose-800 mt-0.5">${new Money(aging.days90PlusMinor, company.currency_code).format()}</div>
            </div>
          </div>
        </div>

        <!-- Remittance Instructions -->
        <div class="p-4 border border-dashed border-stone-300 rounded-xl text-xs text-stone-600 flex justify-between items-center">
          <div>
            <div class="font-bold text-stone-800 uppercase mb-1">Remittance & Settlement Details</div>
            <div>Bank: <span class="font-medium text-stone-900">${company.bank_name || 'Standard Chartered Bank'}</span> | Account: <span class="font-mono font-bold text-stone-900">${company.bank_account_number || '0100234567800'}</span></div>
            <div>Branch: <span class="text-stone-800">${company.bank_branch_code || 'Lusaka Main'}</span> | Swift: <span class="font-mono">${company.bank_swift || 'SCBLZMLX'}</span></div>
          </div>
          <div class="text-right">
            <div class="text-[10px] uppercase font-bold text-stone-500">Please quote your client reference</div>
            <div class="font-mono font-bold text-stone-900">${org?.name || 'SAVANNAH-STATEMENT'}</div>
          </div>
        </div>
      </div>
    `;
  },
};

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
