import { Company, LeadProgressionRow, LeadProgressionTotals, ReportColumn, ReportContract, ReportParameter, ReportRequest } from '../../types';
import { StorageService } from '../storageService';
import { ReportingDateUtils } from '../reportingDateUtils';
import { Money } from '../../support/money';

export const leadProgressionReport: ReportContract<
  { pipeline?: string },
  LeadProgressionRow,
  LeadProgressionTotals
> = {
  id: 'lead-progression',
  name: 'Lead Progression & Pipeline Flow Report',
  description: 'Stage transition velocity, probability-weighted pipeline valuations, and bottleneck identification across pipeline stages.',

  parameters: (company: Company): ReportParameter[] => {
    const db = StorageService.getDb();
    const pipelines = (db.pipelines || []).filter((p) => p.company_id === company.id);

    return [
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
    ];
  },

  columns: (_filters, company: Company): ReportColumn<LeadProgressionRow>[] => [
    { key: 'stageName', label: 'Pipeline Stage', sortable: true },
    { key: 'probabilityPercent', label: 'Probability', align: 'center', sortable: true, width: '100px', format: (v) => `${v}%` },
    { key: 'leadsCount', label: 'Active Leads', align: 'center', sortable: true, width: '110px' },
    {
      key: 'unweightedValueMinor',
      label: `Pipeline Value (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '150px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'weightedValueMinor',
      label: `Weighted Value (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '150px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    { key: 'transitionsInRange', label: 'Transitions in Period', align: 'center', sortable: true, width: '150px' },
    {
      key: 'avgDaysInStage',
      label: 'Avg Duration',
      align: 'right',
      sortable: true,
      width: '120px',
      format: (v) => (v === 0 ? '—' : `${v} day(s)`),
    },
  ],

  rows: (companyId: string, request: ReportRequest<{ pipeline?: string }>): LeadProgressionRow[] => {
    const db = StorageService.getDb();
    const stages = (db.pipelineStages || []).filter((s) => s.company_id === companyId);
    const leads = (db.leads || []).filter((l) => l.company_id === companyId && !l.deleted_at);
    const histories = (db.leadStageHistories || []).filter((h) => h.company_id === companyId);

    const { startDate, endDate } = request.dateRange;
    const { pipeline } = request.filters;

    const filteredStages = stages.filter((s) => {
      if (pipeline && pipeline !== 'all' && s.pipeline_id !== pipeline) {
        return false;
      }
      return true;
    });

    const results: LeadProgressionRow[] = [];

    for (const stage of filteredStages) {
      // Leads currently in this stage (and not won/lost)
      const stageLeads = leads.filter((l) => l.stage_id === stage.id && l.status !== 'won' && l.status !== 'lost');
      const unweighted = stageLeads.reduce((acc, l) => acc + (l.estimated_value_minor || 0), 0);
      const prob = stage.probability_percent || 0;
      const weighted = Math.round((unweighted * prob) / 100);

      // Transitions into this stage in the date range
      const inRangeHistories = histories.filter((h) => {
        if (h.to_stage_id !== stage.id) return false;
        const enteredDate = h.entered_at.substring(0, 10);
        return ReportingDateUtils.isInRangeInclusive(enteredDate, startDate, endDate);
      });

      // Average duration spent in this stage
      const stageDwellTimes = histories
        .filter((h) => h.to_stage_id === stage.id)
        .map((h) => {
          if (h.duration_days && h.duration_days > 0) return h.duration_days;
          if (h.exited_at) {
            return Math.max(0, ReportingDateUtils.daysBetween(h.entered_at.substring(0, 10), h.exited_at.substring(0, 10)));
          }
          return 0;
        })
        .filter((d) => d > 0);

      const avgDays =
        stageDwellTimes.length > 0
          ? Math.round((stageDwellTimes.reduce((a, b) => a + b, 0) / stageDwellTimes.length) * 10) / 10
          : 0;

      results.push({
        stageId: stage.id,
        stageName: stage.name,
        order: stage.order || 0,
        leadsCount: stageLeads.length,
        unweightedValueMinor: unweighted,
        weightedValueMinor: weighted,
        probabilityPercent: prob,
        transitionsInRange: inRangeHistories.length,
        avgDaysInStage: avgDays,
      });
    }

    return results;
  },

  totals: (rows: LeadProgressionRow[]): LeadProgressionTotals => {
    let totalOpenLeads = 0;
    let totalPipelineValueMinor = 0;
    let totalWeightedValueMinor = 0;
    let totalTransitions = 0;
    let totalDwellDays = 0;
    let dwellCount = 0;

    for (const r of rows) {
      totalOpenLeads += r.leadsCount;
      totalPipelineValueMinor += r.unweightedValueMinor;
      totalWeightedValueMinor += r.weightedValueMinor;
      totalTransitions += r.transitionsInRange;
      if (r.avgDaysInStage > 0) {
        totalDwellDays += r.avgDaysInStage;
        dwellCount += 1;
      }
    }

    const avgOverall = dwellCount > 0 ? Math.round((totalDwellDays / dwellCount) * 10) / 10 : 0;

    return {
      totalLeads: totalOpenLeads,
      totalOpenLeads,
      totalPipelineValueMinor,
      totalUnweightedValueMinor: totalPipelineValueMinor,
      totalWeightedValueMinor,
      totalTransitions,
      totalTransitionsInRange: totalTransitions,
      avgOverallDays: avgOverall,
      avgStageDurationDays: avgOverall,
      avgDaysInPipeline: avgOverall,
    };
  },

  exportCsv: (company: Company, rows: LeadProgressionRow[], totals: LeadProgressionTotals): string => {
    const headers = [
      'Stage Name',
      'Probability %',
      'Active Leads',
      `Pipeline Value (${company.currency_code})`,
      `Weighted Value (${company.currency_code})`,
      'Transitions in Range',
      'Avg Days in Stage',
    ];

    const csvRows = rows.map((r) => [
      `"${r.stageName.replace(/"/g, '""')}"`,
      `${r.probabilityPercent}%`,
      r.leadsCount,
      (r.unweightedValueMinor / 100).toFixed(2),
      (r.weightedValueMinor / 100).toFixed(2),
      r.transitionsInRange,
      r.avgDaysInStage,
    ]);

    csvRows.push([
      '"TOTALS / AVERAGES"',
      '""',
      totals.totalOpenLeads,
      (totals.totalPipelineValueMinor / 100).toFixed(2),
      (totals.totalWeightedValueMinor / 100).toFixed(2),
      totals.totalTransitions,
      totals.avgOverallDays,
    ]);

    return [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  },

  exportPdfHtml: (company: Company, rows: LeadProgressionRow[], totals: LeadProgressionTotals, _filters, request): string => {
    const formattedPipeline = new Money(totals.totalPipelineValueMinor, company.currency_code).format();
    const formattedWeighted = new Money(totals.totalWeightedValueMinor, company.currency_code).format();

    const tableRows = rows
      .map(
        (r, idx) => `
      <tr class="border-b border-stone-200 text-xs">
        <td class="py-2 px-2 text-stone-500 text-center">${idx + 1}</td>
        <td class="py-2 px-2 font-medium text-stone-900">${escapeHtml(r.stageName)}</td>
        <td class="py-2 px-2 text-center font-mono font-semibold">${r.probabilityPercent}%</td>
        <td class="py-2 px-2 text-center font-mono font-bold">${r.leadsCount}</td>
        <td class="py-2 px-2 text-right font-mono">${new Money(r.unweightedValueMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-right font-mono font-bold text-emerald-800">${new Money(r.weightedValueMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-center font-mono">${r.transitionsInRange}</td>
        <td class="py-2 px-2 text-right font-mono text-stone-600">${r.avgDaysInStage === 0 ? '—' : `${r.avgDaysInStage}d`}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="p-8 font-sans bg-white text-stone-900 max-w-5xl mx-auto">
        <div class="flex justify-between items-start border-b-2 border-stone-800 pb-4 mb-6">
          <div>
            <h1 class="text-xl font-black tracking-tight">${escapeHtml(company.legal_name || company.name)}</h1>
            <h2 class="text-sm font-bold text-stone-600 uppercase tracking-wider mt-1">Lead Progression & Pipeline Flow Report</h2>
            <p class="text-xs text-stone-500 mt-0.5">Period: ${request.dateRange.startDate} to ${request.dateRange.endDate} (Inclusive)</p>
          </div>
          <div class="text-right text-xs text-stone-500">
            <div>TPIN: ${company.tpin || '—'}</div>
            <div>Generated: ${new Date().toISOString().substring(0, 10)}</div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Active Open Leads</div>
            <div class="text-2xl font-bold font-mono text-stone-900 mt-1">${totals.totalOpenLeads}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Total Pipeline Value</div>
            <div class="text-xl font-bold font-mono text-stone-900 mt-1">${formattedPipeline}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Weighted Value</div>
            <div class="text-xl font-bold font-mono text-emerald-800 mt-1">${formattedWeighted}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Stage Transitions</div>
            <div class="text-2xl font-bold font-mono text-stone-900 mt-1">${totals.totalTransitions}</div>
          </div>
        </div>

        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b-2 border-stone-800 text-[11px] uppercase tracking-wider text-stone-700 bg-stone-100">
              <th class="py-2 px-2 text-center w-8">#</th>
              <th class="py-2 px-2">Pipeline Stage</th>
              <th class="py-2 px-2 text-center">Prob.</th>
              <th class="py-2 px-2 text-center">Active</th>
              <th class="py-2 px-2 text-right">Pipeline Value</th>
              <th class="py-2 px-2 text-right">Weighted Value</th>
              <th class="py-2 px-2 text-center">Transitions</th>
              <th class="py-2 px-2 text-right">Avg Dwell</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="8" class="text-center py-6 text-xs text-stone-400">No stage data available</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-stone-800 font-bold bg-stone-100 text-xs">
              <td colspan="3" class="py-2 px-2 text-stone-800 uppercase">Grand Totals</td>
              <td class="py-2 px-2 text-center font-mono">${totals.totalOpenLeads}</td>
              <td class="py-2 px-2 text-right font-mono">${formattedPipeline}</td>
              <td class="py-2 px-2 text-right font-mono text-emerald-800">${formattedWeighted}</td>
              <td class="py-2 px-2 text-center font-mono">${totals.totalTransitions}</td>
              <td class="py-2 px-2 text-right font-mono text-stone-700">${totals.avgOverallDays}d</td>
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
