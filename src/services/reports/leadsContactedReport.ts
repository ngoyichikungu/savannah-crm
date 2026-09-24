import { Company, LeadsContactedRow, LeadsContactedTotals, ReportColumn, ReportContract, ReportParameter, ReportRequest } from '../../types';
import { StorageService } from '../storageService';
import { ReportingDateUtils } from '../reportingDateUtils';

export const leadsContactedReport: ReportContract<
  { owner?: string; activityType?: string },
  LeadsContactedRow,
  LeadsContactedTotals
> = {
  id: 'leads-contacted',
  name: 'Leads Contacted Report',
  description: 'Outreach speed and responsiveness analysis. Measures time from lead capture to first touchpoint and ongoing engagement density.',

  parameters: (_company: Company): ReportParameter[] => {
    const db = StorageService.getDb();
    return [
      {
        id: 'owner',
        label: 'Sales Rep / Owner',
        type: 'select',
        options: [
          { label: 'All Reps', value: 'all' },
          { label: db.currentUser?.name || 'Current User', value: db.currentUser?.id || 'all' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'activityType',
        label: 'Outreach Type',
        type: 'select',
        options: [
          { label: 'All Activities', value: 'all' },
          { label: 'Phone Call', value: 'call' },
          { label: 'Email', value: 'email' },
          { label: 'Meeting / Demo', value: 'meeting' },
          { label: 'WhatsApp', value: 'whatsapp' },
          { label: 'Field Visit', value: 'site_visit' },
        ],
        defaultValue: 'all',
      },
    ];
  },

  columns: (): ReportColumn<LeadsContactedRow>[] => [
    { key: 'dateCaptured', label: 'Captured On', sortable: true, width: '110px' },
    { key: 'leadTitle', label: 'Lead / Prospect', sortable: true },
    { key: 'organisationName', label: 'Client / Organisation', sortable: true },
    { key: 'dateFirstContacted', label: 'First Touchpoint', sortable: true, width: '120px' },
    {
      key: 'daysToFirstContact',
      label: 'Days to Contact',
      align: 'right',
      sortable: true,
      width: '120px',
      format: (val) => (val < 0 ? '—' : val === 0 ? 'Same Day (<24h)' : `${val} day(s)`),
    },
    {
      key: 'activityCountInRange',
      label: 'Touches in Period',
      align: 'center',
      sortable: true,
      width: '130px',
    },
    { key: 'lastActivityType', label: 'Last Activity', sortable: true, width: '110px' },
    { key: 'ownerName', label: 'Owner', sortable: true, width: '120px' },
  ],

  rows: (companyId: string, request: ReportRequest<{ owner?: string; activityType?: string }>): LeadsContactedRow[] => {
    const db = StorageService.getDb();
    const leads = (db.leads || []).filter((l) => l.company_id === companyId && !l.deleted_at);
    const orgs = (db.organisations || []).filter((o) => o.company_id === companyId);
    const activities = (db.leadActivities || []).filter((a) => a.company_id === companyId);

    const { startDate, endDate } = request.dateRange;
    const { owner, activityType } = request.filters;

    const results: LeadsContactedRow[] = [];

    for (const lead of leads) {
      if (owner && owner !== 'all' && lead.owner_user_id !== owner && lead.assigned_user_id !== owner) {
        continue;
      }

      // Filter activities for this lead
      const leadActs = activities
        .filter((a) => a.lead_id === lead.id)
        .sort((a, b) => (a.performed_at || a.created_at).localeCompare(b.performed_at || b.created_at));

      // Find first ever contact activity
      const firstAct = leadActs[0];

      // Activities within the report window
      const inRangeActs = leadActs.filter((a) => {
        const actDate = (a.performed_at || a.created_at).substring(0, 10);
        if (!ReportingDateUtils.isInRangeInclusive(actDate, startDate, endDate)) {
          return false;
        }
        if (activityType && activityType !== 'all' && a.activity_type !== activityType) {
          return false;
        }
        return true;
      });

      // Check if lead was either captured in range OR had outreach in range
      const capturedDate = (lead.captured_at || lead.created_at).substring(0, 10);
      const isCapturedInRange = ReportingDateUtils.isInRangeInclusive(capturedDate, startDate, endDate);
      const hasOutreachInRange = inRangeActs.length > 0;

      if (!isCapturedInRange && !hasOutreachInRange) {
        continue;
      }

      const org = orgs.find((o) => o.id === lead.organisation_id);

      let daysToContact = -1;
      let firstContactDateStr = 'Never Contacted';

      if (lead.first_contacted_at) {
        firstContactDateStr = lead.first_contacted_at.substring(0, 10);
        daysToContact = ReportingDateUtils.daysBetween(capturedDate, firstContactDateStr);
        if (daysToContact < 0) daysToContact = 0;
      } else if (firstAct) {
        firstContactDateStr = (firstAct.performed_at || firstAct.created_at).substring(0, 10);
        daysToContact = ReportingDateUtils.daysBetween(capturedDate, firstContactDateStr);
        if (daysToContact < 0) daysToContact = 0;
      }

      const lastAct = inRangeActs.length > 0 ? inRangeActs[inRangeActs.length - 1] : firstAct;

      results.push({
        id: lead.id,
        leadTitle: lead.title || 'Untitled Lead',
        organisationName: org?.name || '—',
        dateCaptured: capturedDate,
        dateFirstContacted: firstContactDateStr,
        daysToFirstContact: daysToContact,
        activityCountInRange: inRangeActs.length,
        lastActivityDate: lastAct ? (lastAct.performed_at || lastAct.created_at).substring(0, 10) : undefined,
        lastActivityType: lastAct ? lastAct.activity_type.replace(/_/g, ' ') : '—',
        ownerName: db.currentUser?.name || 'Unassigned',
      });
    }

    return results;
  },

  totals: (rows: LeadsContactedRow[]): LeadsContactedTotals => {
    let totalDays = 0;
    let contactedCount = 0;
    let neverContactedCount = 0;
    let totalActivities = 0;

    for (const r of rows) {
      totalActivities += r.activityCountInRange;
      if (r.daysToFirstContact >= 0) {
        totalDays += r.daysToFirstContact;
        contactedCount += 1;
      } else {
        neverContactedCount += 1;
      }
    }

    const avgDays = contactedCount > 0 ? Math.round((totalDays / contactedCount) * 10) / 10 : 0;
    const avgTouch = rows.length > 0 ? Math.round((totalActivities / rows.length) * 10) / 10 : 0;

    return {
      countContacted: contactedCount,
      totalContacted: contactedCount,
      totalActivities,
      avgTouchpointsPerLead: avgTouch,
      averageDaysToFirstContact: avgDays,
      avgDaysToFirstContact: avgDays,
      countCapturedNeverContacted: neverContactedCount,
      countCapturedNotInRangeContacted: neverContactedCount,
    };
  },

  exportCsv: (_company: Company, rows: LeadsContactedRow[], totals: LeadsContactedTotals): string => {
    const headers = [
      'Captured Date',
      'Lead Title',
      'Organisation',
      'First Contacted',
      'Days to First Contact',
      'Touches in Period',
      'Last Activity Type',
      'Owner',
    ];

    const csvRows = rows.map((r) => [
      `"${r.dateCaptured}"`,
      `"${r.leadTitle.replace(/"/g, '""')}"`,
      `"${r.organisationName.replace(/"/g, '""')}"`,
      `"${r.dateFirstContacted}"`,
      r.daysToFirstContact < 0 ? 'N/A' : r.daysToFirstContact,
      r.activityCountInRange,
      `"${r.lastActivityType}"`,
      `"${r.ownerName}"`,
    ]);

    csvRows.push([
      `"AVERAGE SPEED: ${totals.averageDaysToFirstContact} days"`,
      '""',
      '""',
      '""',
      `"Never Contacted: ${totals.countCapturedNeverContacted}"`,
      `"Total Activities: ${totals.totalActivities || 0}"`,
      '""',
      '""',
    ]);

    return [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  },

  exportPdfHtml: (company: Company, rows: LeadsContactedRow[], totals: LeadsContactedTotals, _filters, request): string => {
    const tableRows = rows
      .map(
        (r, idx) => `
      <tr class="border-b border-stone-200 text-xs">
        <td class="py-2 px-2 text-stone-500 text-center">${idx + 1}</td>
        <td class="py-2 px-2 font-mono">${r.dateCaptured}</td>
        <td class="py-2 px-2 font-medium text-stone-900">${escapeHtml(r.leadTitle)}</td>
        <td class="py-2 px-2 text-stone-700">${escapeHtml(r.organisationName)}</td>
        <td class="py-2 px-2">${r.dateFirstContacted}</td>
        <td class="py-2 px-2 text-right font-mono font-semibold">${r.daysToFirstContact < 0 ? '<span class="text-rose-600">Pending</span>' : r.daysToFirstContact === 0 ? 'Same Day' : `${r.daysToFirstContact}d`}</td>
        <td class="py-2 px-2 text-center font-mono font-bold">${r.activityCountInRange}</td>
        <td class="py-2 px-2 capitalize text-stone-600">${r.lastActivityType || '—'}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="p-8 font-sans bg-white text-stone-900 max-w-5xl mx-auto">
        <div class="flex justify-between items-start border-b-2 border-stone-800 pb-4 mb-6">
          <div>
            <h1 class="text-xl font-black tracking-tight">${escapeHtml(company.legal_name || company.name)}</h1>
            <h2 class="text-sm font-bold text-stone-600 uppercase tracking-wider mt-1">Leads Contacted & Outreach Speed Report</h2>
            <p class="text-xs text-stone-500 mt-0.5">Period: ${request.dateRange.startDate} to ${request.dateRange.endDate} (Inclusive)</p>
          </div>
          <div class="text-right text-xs text-stone-500">
            <div>TPIN: ${company.tpin || '—'}</div>
            <div>Generated: ${new Date().toISOString().substring(0, 10)}</div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Average Days to First Contact</div>
            <div class="text-2xl font-bold font-mono text-stone-900 mt-1">${totals.averageDaysToFirstContact} <span class="text-sm font-normal text-stone-500">days</span></div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Contacted Leads</div>
            <div class="text-2xl font-bold font-mono text-emerald-800 mt-1">${totals.countContacted} <span class="text-xs text-stone-500 font-normal">(${rows.length > 0 ? Math.round((totals.countContacted / rows.length) * 100) : 0}%)</span></div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Awaiting Outreach</div>
            <div class="text-2xl font-bold font-mono text-rose-700 mt-1">${totals.countCapturedNeverContacted}</div>
          </div>
        </div>

        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b-2 border-stone-800 text-[11px] uppercase tracking-wider text-stone-700 bg-stone-100">
              <th class="py-2 px-2 text-center w-8">#</th>
              <th class="py-2 px-2">Captured</th>
              <th class="py-2 px-2">Lead / Prospect</th>
              <th class="py-2 px-2">Organisation</th>
              <th class="py-2 px-2">First Outreach</th>
              <th class="py-2 px-2 text-right">Speed (Days)</th>
              <th class="py-2 px-2 text-center">Touches</th>
              <th class="py-2 px-2">Last Action</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="8" class="text-center py-6 text-xs text-stone-400">No leads recorded</td></tr>'}
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
