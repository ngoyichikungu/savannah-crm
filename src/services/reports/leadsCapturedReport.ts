import { Company, LeadsCapturedRow, LeadsCapturedTotals, ReportColumn, ReportContract, ReportParameter, ReportRequest } from '../../types';
import { StorageService } from '../storageService';
import { ReportingDateUtils } from '../reportingDateUtils';
import { Money } from '../../support/money';

export const leadsCapturedReport: ReportContract<
  { source?: string; owner?: string; pipeline?: string },
  LeadsCapturedRow,
  LeadsCapturedTotals
> = {
  id: 'leads-captured',
  name: 'Leads Captured Report',
  description: 'Inbound lead acquisition intelligence broken down by source channel, sales pipeline, and estimated commercial pipeline value.',

  parameters: (company: Company): ReportParameter[] => {
    const db = StorageService.getDb();
    const pipelines = (db.pipelines || []).filter((p) => p.company_id === company.id);

    return [
      {
        id: 'source',
        label: 'Source Channel',
        type: 'select',
        options: [
          { label: 'All Sources', value: 'all' },
          { label: 'Website Inbound', value: 'website' },
          { label: 'Referral', value: 'referral_drive' },
          { label: 'Exhibition / Expo', value: 'exhibition' },
          { label: 'Field Visit', value: 'field_visit' },
          { label: 'WhatsApp', value: 'whatsapp' },
          { label: 'Cold Outreach', value: 'cold_call' },
          { label: 'Email Campaign', value: 'email_campaign' },
          { label: 'Other', value: 'other' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'pipeline',
        label: 'Pipeline',
        type: 'select',
        options: [
          { label: 'All Pipelines', value: 'all' },
          ...pipelines.map((p) => ({ label: p.name, value: p.id })),
        ],
        defaultValue: 'all',
      },
      {
        id: 'owner',
        label: 'Lead Owner',
        type: 'select',
        options: [
          { label: 'All Owners', value: 'all' },
          { label: db.currentUser?.name || 'Current User', value: db.currentUser?.id || 'all' },
        ],
        defaultValue: 'all',
      },
    ];
  },

  columns: (_filters, company: Company): ReportColumn<LeadsCapturedRow>[] => [
    { key: 'dateCaptured', label: 'Date Captured', sortable: true, width: '110px' },
    { key: 'leadTitle', label: 'Lead / Prospect', sortable: true },
    { key: 'organisationName', label: 'Client / Organisation', sortable: true },
    { key: 'contactName', label: 'Contact Person', sortable: true },
    { key: 'source', label: 'Source Channel', sortable: true, width: '130px' },
    { key: 'currentStageName', label: 'Pipeline Stage', sortable: true, width: '120px' },
    {
      key: 'estimatedValueMinor',
      label: `Est. Value (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '130px',
      format: (val) => new Money(val, company.currency_code).format(),
      csvFormat: (val) => (val / 100).toFixed(2),
    },
    { key: 'ownerName', label: 'Owner', sortable: true, width: '120px' },
    { key: 'status', label: 'Status', sortable: true, width: '100px' },
  ],

  rows: (companyId: string, request: ReportRequest<{ source?: string; owner?: string; pipeline?: string }>): LeadsCapturedRow[] => {
    const db = StorageService.getDb();
    const leads = (db.leads || []).filter((l) => l.company_id === companyId && !l.deleted_at);
    const orgs = (db.organisations || []).filter((o) => o.company_id === companyId);
    const contacts = (db.contacts || []).filter((c) => c.company_id === companyId);
    const stages = (db.pipelineStages || []).filter((s) => s.company_id === companyId);

    const { startDate, endDate } = request.dateRange;
    const { source, owner, pipeline } = request.filters;

    const filtered = leads.filter((l) => {
      const createdDate = (l.captured_at || l.created_at).substring(0, 10);
      if (!ReportingDateUtils.isInRangeInclusive(createdDate, startDate, endDate)) {
        return false;
      }
      if (source && source !== 'all' && l.source !== source) {
        return false;
      }
      if (owner && owner !== 'all' && l.owner_user_id !== owner && l.assigned_user_id !== owner) {
        return false;
      }
      if (pipeline && pipeline !== 'all' && l.pipeline_id !== pipeline) {
        return false;
      }
      return true;
    });

    return filtered.map((l) => {
      const org = orgs.find((o) => o.id === l.organisation_id);
      const contact = contacts.find((c) => c.id === l.contact_id);
      const stage = stages.find((s) => s.id === l.stage_id);

      const contactName = contact
        ? `${contact.first_name} ${contact.last_name}`.trim()
        : '—';

      return {
        id: l.id,
        dateCaptured: (l.captured_at || l.created_at).substring(0, 10),
        leadTitle: l.title || 'Untitled Lead',
        organisationName: org?.name || '—',
        contactName,
        source: (l.source || 'other').replace(/_/g, ' '),
        sourceDetail: l.source_detail || '',
        estimatedValueMinor: l.estimated_value_minor || 0,
        ownerName: db.currentUser?.name || 'Unassigned',
        currentStageName: stage?.name || 'New',
        status: l.status,
      };
    });
  },

  totals: (rows: LeadsCapturedRow[]): LeadsCapturedTotals => {
    let totalValue = 0;
    const bySourceMap: Record<string, { count: number; value: number }> = {};

    for (const r of rows) {
      totalValue += r.estimatedValueMinor;
      const src = r.source || 'Other';
      if (!bySourceMap[src]) {
        bySourceMap[src] = { count: 0, value: 0 };
      }
      bySourceMap[src].count += 1;
      bySourceMap[src].value += r.estimatedValueMinor;
    }

    const bySource = Object.entries(bySourceMap).map(([source, data]) => ({
      source,
      count: data.count,
      valueMinor: data.value,
    }));

    // Identify top source
    let topSource = 'None';
    let maxCount = 0;
    for (const s of bySource) {
      if (s.count > maxCount) {
        maxCount = s.count;
        topSource = s.source;
      }
    }

    return {
      count: rows.length,
      totalLeads: rows.length,
      totalEstimatedValueMinor: totalValue,
      topSource,
      bySource,
    };
  },

  exportCsv: (company: Company, rows: LeadsCapturedRow[], totals: LeadsCapturedTotals): string => {
    const headers = [
      'Date Captured',
      'Lead Title',
      'Organisation',
      'Contact',
      'Source Channel',
      'Pipeline Stage',
      `Est Value (${company.currency_code})`,
      'Owner',
      'Status',
    ];

    const csvRows = rows.map((r) => [
      `"${r.dateCaptured}"`,
      `"${r.leadTitle.replace(/"/g, '""')}"`,
      `"${r.organisationName.replace(/"/g, '""')}"`,
      `"${r.contactName.replace(/"/g, '""')}"`,
      `"${r.source}"`,
      `"${r.currentStageName}"`,
      (r.estimatedValueMinor / 100).toFixed(2),
      `"${r.ownerName}"`,
      `"${r.status}"`,
    ]);

    csvRows.push([
      `"TOTALS (${totals.count} Leads)"`,
      '""',
      '""',
      '""',
      '""',
      '""',
      (totals.totalEstimatedValueMinor / 100).toFixed(2),
      '""',
      '""',
    ]);

    return [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  },

  exportPdfHtml: (company: Company, rows: LeadsCapturedRow[], totals: LeadsCapturedTotals, _filters, request): string => {
    const formattedTotal = new Money(totals.totalEstimatedValueMinor, company.currency_code).format();

    const tableRows = rows
      .map(
        (r, idx) => `
      <tr class="border-b border-stone-200 text-xs">
        <td class="py-2 px-2 text-stone-500 text-center">${idx + 1}</td>
        <td class="py-2 px-2 font-mono">${r.dateCaptured}</td>
        <td class="py-2 px-2 font-medium text-stone-900">${escapeHtml(r.leadTitle)}</td>
        <td class="py-2 px-2 text-stone-700">${escapeHtml(r.organisationName)}</td>
        <td class="py-2 px-2 capitalize text-stone-600">${escapeHtml(r.source)}</td>
        <td class="py-2 px-2">${escapeHtml(r.currentStageName)}</td>
        <td class="py-2 px-2 text-right font-mono font-semibold">${new Money(r.estimatedValueMinor, company.currency_code).format()}</td>
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
            <h2 class="text-sm font-bold text-stone-600 uppercase tracking-wider mt-1">Leads Captured Report</h2>
            <p class="text-xs text-stone-500 mt-0.5">Period: ${request.dateRange.startDate} to ${request.dateRange.endDate} (Inclusive)</p>
          </div>
          <div class="text-right text-xs text-stone-500">
            <div>TPIN: ${company.tpin || '—'}</div>
            <div>Generated: ${new Date().toISOString().substring(0, 10)}</div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Total Inbound Leads</div>
            <div class="text-2xl font-bold font-mono text-stone-900 mt-1">${totals.count}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Total Pipeline Value</div>
            <div class="text-2xl font-bold font-mono text-emerald-800 mt-1">${formattedTotal}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Top Source Channel</div>
            <div class="text-xl font-bold text-stone-900 mt-1">${totals.topSource || '—'}</div>
          </div>
        </div>

        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b-2 border-stone-800 text-[11px] uppercase tracking-wider text-stone-700 bg-stone-100">
              <th class="py-2 px-2 text-center w-8">#</th>
              <th class="py-2 px-2">Captured</th>
              <th class="py-2 px-2">Lead / Prospect</th>
              <th class="py-2 px-2">Organisation</th>
              <th class="py-2 px-2">Source</th>
              <th class="py-2 px-2">Stage</th>
              <th class="py-2 px-2 text-right">Est. Value</th>
              <th class="py-2 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="8" class="text-center py-6 text-xs text-stone-400">No leads captured in range</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-stone-800 font-bold bg-stone-100 text-xs">
              <td colspan="6" class="py-2 px-2 text-stone-800 uppercase">Grand Total (${totals.count} Leads)</td>
              <td class="py-2 px-2 text-right font-mono text-emerald-800">${formattedTotal}</td>
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
