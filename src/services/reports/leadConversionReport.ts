import { Company, LeadConversionRow, LeadConversionTotals, ReportColumn, ReportContract, ReportParameter, ReportRequest } from '../../types';
import { StorageService } from '../storageService';
import { ReportingDateUtils } from '../reportingDateUtils';
import { Money } from '../../support/money';

export const leadConversionReport: ReportContract<
  { status?: string },
  LeadConversionRow,
  LeadConversionTotals
> = {
  id: 'lead-conversion',
  name: 'Lead Conversion & Win-Loss Analytics',
  description: 'Conversion rates, average sales velocity cycles, and ranked loss reason Pareto analysis.',

  parameters: (): ReportParameter[] => [
    {
      id: 'status',
      label: 'Outcome Status',
      type: 'select',
      options: [
        { label: 'All Decided & Open Leads', value: 'all' },
        { label: 'Closed Won Only', value: 'won' },
        { label: 'Closed Lost Only', value: 'lost' },
        { label: 'Active Open Leads', value: 'open' },
      ],
      defaultValue: 'all',
    },
  ],

  columns: (_filters, company: Company): ReportColumn<LeadConversionRow>[] => [
    { key: 'capturedDate', label: 'Captured On', sortable: true, width: '110px' },
    { key: 'leadTitle', label: 'Lead / Prospect', sortable: true },
    { key: 'organisationName', label: 'Organisation', sortable: true },
    {
      key: 'status',
      label: 'Outcome',
      sortable: true,
      width: '120px',
      format: (val) => {
        const str = String(val).toUpperCase();
        if (str === 'WON') return 'WON';
        if (str === 'LOST') return 'LOST';
        return 'OPEN';
      },
    },
    {
      key: 'estimatedValueMinor',
      label: `Est. Value (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '130px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'actualInvoicedValueMinor',
      label: `Invoiced Value (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '140px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'daysInPipeline',
      label: 'Cycle Time',
      align: 'right',
      sortable: true,
      width: '110px',
      format: (v) => `${v} days`,
    },
    { key: 'lostReason', label: 'Lost Reason / Notes', sortable: true },
  ],

  rows: (companyId: string, request: ReportRequest<{ status?: string }>): LeadConversionRow[] => {
    const db = StorageService.getDb();
    const leads = (db.leads || []).filter((l) => l.company_id === companyId && !l.deleted_at);
    const orgs = (db.organisations || []).filter((o) => o.company_id === companyId);
    const invoices = (db.invoices || []).filter((i) => i.company_id === companyId);
    const quotations = (db.quotations || []).filter((q) => q.company_id === companyId);

    const { startDate, endDate } = request.dateRange;
    const { status } = request.filters;

    const results: LeadConversionRow[] = [];

    for (const lead of leads) {
      const isWon = lead.status === 'won';
      const isLost = lead.status === 'lost';
      const isOpen = !isWon && !isLost;

      if (status && status !== 'all') {
        if (status === 'won' && !isWon) continue;
        if (status === 'lost' && !isLost) continue;
        if (status === 'open' && !isOpen) continue;
      }

      const capturedDate = (lead.captured_at || lead.created_at).substring(0, 10);
      const decidedDate = lead.decided_at || lead.updated_at;
      const decidedDateStr = decidedDate.substring(0, 10);

      // Evaluate date range against either capture date or decision date
      const inRange =
        ReportingDateUtils.isInRangeInclusive(decidedDateStr, startDate, endDate) ||
        ReportingDateUtils.isInRangeInclusive(capturedDate, startDate, endDate);

      if (!inRange) {
        continue;
      }

      const org = orgs.find((o) => o.id === lead.organisation_id);

      // Measure days in pipeline
      const endCalcDate = isOpen ? new Date().toISOString().substring(0, 10) : decidedDateStr;
      const days = ReportingDateUtils.daysBetween(capturedDate, endCalcDate);

      // Invoiced value attributed to this lead via converted invoices / quotations
      const leadQuotes = quotations.filter((q) => q.lead_id === lead.id);
      const leadQuoteIds = new Set(leadQuotes.map((q) => q.id));
      const leadInvoices = invoices.filter(
        (i) =>
          (i.quotation_id && leadQuoteIds.has(i.quotation_id)) ||
          (lead.organisation_id && i.organisation_id === lead.organisation_id && i.issue_date >= capturedDate)
      );

      const actualInvoiced = leadInvoices.reduce((acc, inv) => acc + (inv.total_minor || 0), 0);

      results.push({
        id: lead.id,
        leadTitle: lead.title || 'Untitled Lead',
        organisationName: org?.name || '—',
        capturedDate,
        decidedDate: isOpen ? undefined : decidedDateStr,
        daysInPipeline: Math.max(0, days),
        status: lead.status,
        lostReason: lead.lost_reason || undefined,
        estimatedValueMinor: lead.estimated_value_minor || 0,
        actualInvoicedValueMinor: actualInvoiced,
      });
    }

    return results;
  },

  totals: (rows: LeadConversionRow[]): LeadConversionTotals => {
    let wonCount = 0;
    let wonValue = 0;
    let lostCount = 0;
    let lostValue = 0;
    let openCount = 0;
    let openValue = 0;
    let totalCycleDays = 0;
    let decidedCount = 0;

    const lostReasonsMap: Record<string, { count: number; value: number }> = {};

    for (const r of rows) {
      if (r.status === 'won') {
        wonCount += 1;
        wonValue += r.actualInvoicedValueMinor || r.estimatedValueMinor;
        totalCycleDays += r.daysInPipeline;
        decidedCount += 1;
      } else if (r.status === 'lost') {
        lostCount += 1;
        lostValue += r.estimatedValueMinor;
        totalCycleDays += r.daysInPipeline;
        decidedCount += 1;

        const reasonKey = r.lostReason || 'Unspecified Reason';
        if (!lostReasonsMap[reasonKey]) {
          lostReasonsMap[reasonKey] = { count: 0, value: 0 };
        }
        lostReasonsMap[reasonKey].count += 1;
        lostReasonsMap[reasonKey].value += r.estimatedValueMinor;
      } else {
        openCount += 1;
        openValue += r.estimatedValueMinor;
      }
    }

    const decidedTotal = wonCount + lostCount;
    const winRate = decidedTotal > 0 ? Math.round((wonCount / decidedTotal) * 1000) / 10 : 0;
    const avgCycle = decidedCount > 0 ? Math.round((totalCycleDays / decidedCount) * 10) / 10 : 0;

    const lostReasonsRanked = Object.entries(lostReasonsMap)
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        valueMinor: data.value,
        percentage: lostCount > 0 ? Math.round((data.count / lostCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      wonCount,
      totalWon: wonCount,
      wonValueMinor: wonValue,
      totalWonValueMinor: wonValue,
      lostCount,
      totalLost: lostCount,
      lostValueMinor: lostValue,
      totalLostValueMinor: lostValue,
      openCount,
      openValueMinor: openValue,
      conversionRatePercent: winRate,
      overallWinRatePercent: winRate,
      conversionRateBp: Math.round(winRate * 100),
      avgSalesCycleDays: avgCycle,
      avgDaysToClose: avgCycle,
      lostReasons: lostReasonsRanked,
      lostReasonsRanked,
    };
  },

  exportCsv: (company: Company, rows: LeadConversionRow[], totals: LeadConversionTotals): string => {
    const headers = [
      'Captured Date',
      'Lead Title',
      'Organisation',
      'Status',
      `Est Value (${company.currency_code})`,
      `Invoiced Value (${company.currency_code})`,
      'Cycle (Days)',
      'Lost Reason',
    ];

    const csvRows = rows.map((r) => [
      `"${r.capturedDate}"`,
      `"${r.leadTitle.replace(/"/g, '""')}"`,
      `"${r.organisationName.replace(/"/g, '""')}"`,
      `"${r.status.toUpperCase()}"`,
      (r.estimatedValueMinor / 100).toFixed(2),
      (r.actualInvoicedValueMinor / 100).toFixed(2),
      r.daysInPipeline,
      `"${(r.lostReason || '').replace(/"/g, '""')}"`,
    ]);

    csvRows.push([
      `"WIN RATE: ${totals.conversionRatePercent}%"`,
      '""',
      '""',
      `"Won: ${totals.wonCount} | Lost: ${totals.lostCount}"`,
      (totals.openValueMinor / 100).toFixed(2),
      (totals.wonValueMinor / 100).toFixed(2),
      totals.avgSalesCycleDays,
      '""',
    ]);

    return [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  },

  exportPdfHtml: (company: Company, rows: LeadConversionRow[], totals: LeadConversionTotals, _filters, request): string => {
    const formattedWon = new Money(totals.wonValueMinor, company.currency_code).format();
    const formattedLost = new Money(totals.lostValueMinor, company.currency_code).format();

    const tableRows = rows
      .map(
        (r, idx) => `
      <tr class="border-b border-stone-200 text-xs">
        <td class="py-2 px-2 text-stone-500 text-center">${idx + 1}</td>
        <td class="py-2 px-2 font-mono">${r.capturedDate}</td>
        <td class="py-2 px-2 font-medium text-stone-900">${escapeHtml(r.leadTitle)}</td>
        <td class="py-2 px-2 text-stone-700">${escapeHtml(r.organisationName)}</td>
        <td class="py-2 px-2 text-center uppercase font-bold text-[10px] ${
          r.status === 'won' ? 'text-emerald-700' : r.status === 'lost' ? 'text-rose-700' : 'text-amber-700'
        }">${r.status}</td>
        <td class="py-2 px-2 text-right font-mono">${new Money(r.estimatedValueMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-right font-mono font-bold ${r.actualInvoicedValueMinor > 0 ? 'text-emerald-800' : 'text-stone-400'}">${new Money(r.actualInvoicedValueMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-right font-mono">${r.daysInPipeline}d</td>
        <td class="py-2 px-2 text-stone-500 italic">${escapeHtml(r.lostReason || '—')}</td>
      </tr>
    `
      )
      .join('');

    const reasonRows = (totals.lostReasonsRanked || [])
      .map(
        (lr) => `
      <div class="flex justify-between items-center py-1 border-b border-stone-100 text-xs">
        <span class="text-stone-700">${escapeHtml(lr.reason)}</span>
        <span class="font-mono font-semibold">${lr.count} leads (${lr.percentage}%)</span>
      </div>
    `
      )
      .join('');

    return `
      <div class="p-8 font-sans bg-white text-stone-900 max-w-5xl mx-auto">
        <div class="flex justify-between items-start border-b-2 border-stone-800 pb-4 mb-6">
          <div>
            <h1 class="text-xl font-black tracking-tight">${escapeHtml(company.legal_name || company.name)}</h1>
            <h2 class="text-sm font-bold text-stone-600 uppercase tracking-wider mt-1">Lead Conversion & Win-Loss Report</h2>
            <p class="text-xs text-stone-500 mt-0.5">Period: ${request.dateRange.startDate} to ${request.dateRange.endDate} (Inclusive)</p>
          </div>
          <div class="text-right text-xs text-stone-500">
            <div>TPIN: ${company.tpin || '—'}</div>
            <div>Generated: ${new Date().toISOString().substring(0, 10)}</div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Win Rate</div>
            <div class="text-2xl font-bold font-mono text-emerald-800 mt-1">${totals.conversionRatePercent}%</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Revenue Won</div>
            <div class="text-xl font-bold font-mono text-emerald-800 mt-1">${formattedWon}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Value Lost</div>
            <div class="text-xl font-bold font-mono text-rose-800 mt-1">${formattedLost}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Avg Sales Cycle</div>
            <div class="text-2xl font-bold font-mono text-stone-900 mt-1">${totals.avgSalesCycleDays} <span class="text-xs font-normal text-stone-500">days</span></div>
          </div>
        </div>

        ${
          reasonRows
            ? `<div class="mb-6 p-4 bg-rose-50/50 border border-rose-200 rounded-xl">
                 <div class="text-xs font-bold text-rose-900 uppercase mb-2">Loss Reason Breakdown</div>
                 <div class="grid grid-cols-2 gap-x-6">${reasonRows}</div>
               </div>`
            : ''
        }

        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b-2 border-stone-800 text-[11px] uppercase tracking-wider text-stone-700 bg-stone-100">
              <th class="py-2 px-2 text-center w-8">#</th>
              <th class="py-2 px-2">Captured</th>
              <th class="py-2 px-2">Lead / Prospect</th>
              <th class="py-2 px-2">Organisation</th>
              <th class="py-2 px-2 text-center">Outcome</th>
              <th class="py-2 px-2 text-right">Est. Value</th>
              <th class="py-2 px-2 text-right">Invoiced</th>
              <th class="py-2 px-2 text-right">Cycle</th>
              <th class="py-2 px-2">Lost Reason</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="9" class="text-center py-6 text-xs text-stone-400">No leads recorded</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  },
};

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
