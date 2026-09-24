import { Company, ClientInvoiceRow, ClientInvoicesTotals, ReportColumn, ReportContract, ReportParameter, ReportRequest } from '../../types';
import { StorageService } from '../storageService';
import { ReportingDateUtils } from '../reportingDateUtils';
import { Money } from '../../support/money';

export const clientInvoicesReport: ReportContract<
  { client?: string; status?: string },
  ClientInvoiceRow,
  ClientInvoicesTotals
> = {
  id: 'client-invoices',
  name: 'Client Invoices Issued Report',
  description: 'Detailed commercial invoices audit including tax subtotals, VAT amounts, applied discounts, customer payment records, and aged balances.',

  parameters: (company: Company): ReportParameter[] => {
    const db = StorageService.getDb();
    const orgs = (db.organisations || []).filter((o) => o.company_id === company.id);

    return [
      {
        id: 'client',
        label: 'Client / Customer',
        type: 'select',
        options: [
          { label: 'All Clients', value: 'all' },
          ...orgs.map((o) => ({ label: o.name, value: o.id })),
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: 'Invoice Status',
        type: 'select',
        options: [
          { label: 'All Statuses', value: 'all' },
          { label: 'Draft', value: 'draft' },
          { label: 'Sent / Unpaid', value: 'sent' },
          { label: 'Partially Paid', value: 'partially_paid' },
          { label: 'Fully Paid', value: 'paid' },
          { label: 'Overdue', value: 'overdue' },
          { label: 'Cancelled / Void', value: 'cancelled' },
        ],
        defaultValue: 'all',
      },
    ];
  },

  columns: (_filters, company: Company): ReportColumn<ClientInvoiceRow>[] => [
    { key: 'invoiceNumber', label: 'Invoice #', sortable: true, width: '110px' },
    { key: 'issueDate', label: 'Issue Date', sortable: true, width: '100px' },
    { key: 'dueDate', label: 'Due Date', sortable: true, width: '100px' },
    { key: 'clientName', label: 'Client / Organisation', sortable: true },
    {
      key: 'subtotalMinor',
      label: `Subtotal (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '120px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'discountMinor',
      label: `Discount (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '110px',
      format: (v) => (v > 0 ? `-${new Money(v, company.currency_code).format()}` : '—'),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'vatMinor',
      label: `VAT (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '110px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'totalMinor',
      label: `Total (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '120px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'amountPaidMinor',
      label: `Paid (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '110px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'balanceDueMinor',
      label: `Balance Due (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '120px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '100px',
      format: (v) => String(v).replace(/_/g, ' ').toUpperCase(),
    },
  ],

  rows: (companyId: string, request: ReportRequest<{ client?: string; status?: string }>): ClientInvoiceRow[] => {
    const db = StorageService.getDb();
    const invoices = (db.invoices || []).filter((i) => i.company_id === companyId);
    const orgs = (db.organisations || []).filter((o) => o.company_id === companyId);

    const { startDate, endDate } = request.dateRange;
    const { client, status } = request.filters;
    const todayStr = new Date().toISOString().substring(0, 10);

    const filtered = invoices.filter((inv) => {
      if (!ReportingDateUtils.isInRangeInclusive(inv.issue_date, startDate, endDate)) {
        return false;
      }
      if (client && client !== 'all' && inv.organisation_id !== client) {
        return false;
      }
      if (status && status !== 'all') {
        if (status === 'overdue') {
          if (inv.balance_due_minor <= 0 || inv.due_date >= todayStr) return false;
        } else if (inv.status !== status) {
          return false;
        }
      }
      return true;
    });

    return filtered.map((inv) => {
      const org = orgs.find((o) => o.id === inv.organisation_id);
      const isOverdue = inv.balance_due_minor > 0 && inv.due_date < todayStr;
      const daysOverdue = isOverdue ? ReportingDateUtils.daysBetween(inv.due_date, todayStr) : 0;

      return {
        id: inv.id,
        invoiceNumber: inv.number,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        clientName: org?.name || '—',
        organisationName: org?.name || '—',
        clientId: inv.organisation_id,
        organisationId: inv.organisation_id,
        reference: inv.reference,
        subtotalMinor: inv.subtotal_minor || 0,
        discountMinor: inv.discount_minor || 0,
        vatMinor: inv.vat_minor || 0,
        totalMinor: inv.total_minor || 0,
        amountPaidMinor: inv.amount_paid_minor || 0,
        balanceDueMinor: inv.balance_due_minor || 0,
        status: isOverdue ? 'overdue' : inv.status,
        daysOverdue,
        ownerName: db.currentUser?.name || 'Admin',
      };
    });
  },

  totals: (rows: ClientInvoiceRow[]): ClientInvoicesTotals => {
    let subtotal = 0;
    let discount = 0;
    let vat = 0;
    let total = 0;
    let paid = 0;
    let balance = 0;

    const byClientMap: Record<
      string,
      {
        clientName: string;
        count: number;
        subtotalMinor: number;
        vatMinor: number;
        totalMinor: number;
        paidMinor: number;
        balanceMinor: number;
      }
    > = {};

    for (const r of rows) {
      subtotal += r.subtotalMinor;
      discount += r.discountMinor;
      vat += r.vatMinor;
      total += r.totalMinor;
      paid += r.amountPaidMinor;
      balance += r.balanceDueMinor;

      const cId = r.clientId || r.organisationId || 'unknown';
      const cName = r.clientName || r.organisationName || '—';

      if (!byClientMap[cId]) {
        byClientMap[cId] = {
          clientName: cName,
          count: 0,
          subtotalMinor: 0,
          vatMinor: 0,
          totalMinor: 0,
          paidMinor: 0,
          balanceMinor: 0,
        };
      }
      byClientMap[cId].count += 1;
      byClientMap[cId].subtotalMinor += r.subtotalMinor;
      byClientMap[cId].vatMinor += r.vatMinor;
      byClientMap[cId].totalMinor += r.totalMinor;
      byClientMap[cId].paidMinor += r.amountPaidMinor;
      byClientMap[cId].balanceMinor += r.balanceDueMinor;
    }

    const byClient = Object.entries(byClientMap).map(([clientId, data]) => ({
      clientId,
      clientName: data.clientName,
      count: data.count,
      subtotalMinor: data.subtotalMinor,
      vatMinor: data.vatMinor,
      totalMinor: data.totalMinor,
      paidMinor: data.paidMinor,
      balanceMinor: data.balanceMinor,
    }));

    return {
      count: rows.length,
      subtotalMinor: subtotal,
      totalSubtotalMinor: subtotal,
      discountMinor: discount,
      totalDiscountMinor: discount,
      vatMinor: vat,
      totalVatMinor: vat,
      grandTotalMinor: total,
      totalAmountMinor: total,
      totalPaidMinor: paid,
      totalOutstandingMinor: balance,
      byClient,
    };
  },

  exportCsv: (company: Company, rows: ClientInvoiceRow[], totals: ClientInvoicesTotals): string => {
    const headers = [
      'Invoice #',
      'Issue Date',
      'Due Date',
      'Client Name',
      `Subtotal (${company.currency_code})`,
      `Discount (${company.currency_code})`,
      `VAT (${company.currency_code})`,
      `Total (${company.currency_code})`,
      `Amount Paid (${company.currency_code})`,
      `Balance Due (${company.currency_code})`,
      'Status',
    ];

    const csvRows = rows.map((r) => [
      `"${r.invoiceNumber}"`,
      `"${r.issueDate}"`,
      `"${r.dueDate}"`,
      `"${(r.clientName || '').replace(/"/g, '""')}"`,
      (r.subtotalMinor / 100).toFixed(2),
      (r.discountMinor / 100).toFixed(2),
      (r.vatMinor / 100).toFixed(2),
      (r.totalMinor / 100).toFixed(2),
      (r.amountPaidMinor / 100).toFixed(2),
      (r.balanceDueMinor / 100).toFixed(2),
      `"${r.status.toUpperCase()}"`,
    ]);

    csvRows.push([
      `"TOTALS (${totals.count} Invoices)"`,
      '""',
      '""',
      '""',
      (totals.subtotalMinor / 100).toFixed(2),
      (totals.discountMinor / 100).toFixed(2),
      (totals.vatMinor / 100).toFixed(2),
      (totals.grandTotalMinor / 100).toFixed(2),
      (totals.totalPaidMinor / 100).toFixed(2),
      (totals.totalOutstandingMinor / 100).toFixed(2),
      '""',
    ]);

    return [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  },

  exportPdfHtml: (company: Company, rows: ClientInvoiceRow[], totals: ClientInvoicesTotals, _filters, request): string => {
    const formattedTotal = new Money(totals.grandTotalMinor, company.currency_code).format();
    const formattedPaid = new Money(totals.totalPaidMinor, company.currency_code).format();
    const formattedBal = new Money(totals.totalOutstandingMinor, company.currency_code).format();

    const tableRows = rows
      .map(
        (r, idx) => `
      <tr class="border-b border-stone-200 text-xs">
        <td class="py-2 px-2 text-stone-500 text-center">${idx + 1}</td>
        <td class="py-2 px-2 font-mono font-bold">${escapeHtml(r.invoiceNumber)}</td>
        <td class="py-2 px-2 font-mono">${r.issueDate}</td>
        <td class="py-2 px-2 font-medium text-stone-900">${escapeHtml(r.clientName)}</td>
        <td class="py-2 px-2 text-right font-mono">${new Money(r.subtotalMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-right font-mono">${new Money(r.vatMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-right font-mono font-bold">${new Money(r.totalMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-right font-mono text-emerald-800">${new Money(r.amountPaidMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-right font-mono font-bold ${r.balanceDueMinor > 0 ? 'text-rose-700' : 'text-stone-400'}">${new Money(r.balanceDueMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-center uppercase font-bold text-[10px]">${r.status}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="p-8 font-sans bg-white text-stone-900 max-w-5xl mx-auto">
        <div class="flex justify-between items-start border-b-2 border-stone-800 pb-4 mb-6">
          <div>
            <h1 class="text-xl font-black tracking-tight">${escapeHtml(company.legal_name || company.name)}</h1>
            <h2 class="text-sm font-bold text-stone-600 uppercase tracking-wider mt-1">Client Invoices Issued Report</h2>
            <p class="text-xs text-stone-500 mt-0.5">Period: ${request.dateRange.startDate} to ${request.dateRange.endDate} (Inclusive)</p>
          </div>
          <div class="text-right text-xs text-stone-500">
            <div>TPIN: ${company.tpin || '—'}</div>
            <div>Generated: ${new Date().toISOString().substring(0, 10)}</div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Invoices Count</div>
            <div class="text-2xl font-bold font-mono text-stone-900 mt-1">${totals.count}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Total Invoiced</div>
            <div class="text-xl font-bold font-mono text-stone-900 mt-1">${formattedTotal}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Total Collected</div>
            <div class="text-xl font-bold font-mono text-emerald-800 mt-1">${formattedPaid}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Total Outstanding</div>
            <div class="text-xl font-bold font-mono text-rose-700 mt-1">${formattedBal}</div>
          </div>
        </div>

        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b-2 border-stone-800 text-[11px] uppercase tracking-wider text-stone-700 bg-stone-100">
              <th class="py-2 px-2 text-center w-8">#</th>
              <th class="py-2 px-2">Invoice #</th>
              <th class="py-2 px-2">Date</th>
              <th class="py-2 px-2">Client</th>
              <th class="py-2 px-2 text-right">Subtotal</th>
              <th class="py-2 px-2 text-right">VAT</th>
              <th class="py-2 px-2 text-right">Total</th>
              <th class="py-2 px-2 text-right">Paid</th>
              <th class="py-2 px-2 text-right">Balance Due</th>
              <th class="py-2 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="10" class="text-center py-6 text-xs text-stone-400">No invoices recorded in period</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-stone-800 font-bold bg-stone-100 text-xs">
              <td colspan="4" class="py-2 px-2 text-stone-800 uppercase">Grand Totals (${totals.count} Invoices)</td>
              <td class="py-2 px-2 text-right font-mono">${new Money(totals.subtotalMinor, company.currency_code).format()}</td>
              <td class="py-2 px-2 text-right font-mono">${new Money(totals.vatMinor, company.currency_code).format()}</td>
              <td class="py-2 px-2 text-right font-mono">${formattedTotal}</td>
              <td class="py-2 px-2 text-right font-mono text-emerald-800">${formattedPaid}</td>
              <td class="py-2 px-2 text-right font-mono text-rose-700">${formattedBal}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },
};

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
