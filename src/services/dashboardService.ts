import { Company } from '../types';
import { StorageService } from './storageService';
import { ReportingDateUtils } from './reportingDateUtils';

export interface DashboardStatCards {
  leadsCapturedThisMonth: number;
  openPipelineValueMinor: number;
  quotationsAwaitingDecisionCount: number;
  quotationsAwaitingDecisionValueMinor: number;
  invoicedThisMonthMinor: number;
  receivedThisMonthMinor: number;
  totalOutstandingMinor: number;
  overdueAmountMinor: number;
}

export interface MonthlyTrendData {
  monthKey: string; // YYYY-MM
  label: string; // e.g. "Sep 26"
  invoicedMinor: number;
  receivedMinor: number;
}

export interface PipelineStageChartData {
  stageId: string;
  stageName: string;
  order: number;
  leadsCount: number;
  unweightedValueMinor: number;
  weightedValueMinor: number;
  probabilityPercent: number;
}

export interface LeadSourceChartData {
  source: string;
  label: string;
  count: number;
  valueMinor: number;
  percentage: number;
}

export interface TopClientRevenueData {
  organisationId: string;
  organisationName: string;
  totalInvoicedMinor: number;
  totalPaidMinor: number;
  outstandingMinor: number;
}

export interface AgingBucketData {
  bucketKey: 'current' | '1_30' | '31_60' | '61_90' | '90_plus';
  label: string;
  amountMinor: number;
  count: number;
}

export interface OverdueInvoiceItem {
  id: string;
  number: string;
  organisationName: string;
  dueDate: string;
  daysOverdue: number;
  balanceDueMinor: number;
  totalMinor: number;
  currencyCode: string;
}

export interface ExpiringQuotationItem {
  id: string;
  number: string;
  organisationName: string;
  validUntil: string;
  daysRemaining: number;
  totalMinor: number;
  currencyCode: string;
  status: string;
}

export interface DueTaskItem {
  id: string;
  leadId: string;
  leadTitle: string;
  activityType: string;
  scheduledAt: string;
  isOverdue: boolean;
  notes?: string;
}

export interface OverdueMarketingActivityItem {
  id: string;
  planId: string;
  planName: string;
  name: string;
  channel: string;
  plannedEnd: string;
  daysOverdue: number;
  budgetMinor: number;
  actualCostMinor: number;
  status: string;
}

export interface DashboardData {
  company: Company;
  asOfDate: string;
  stats: DashboardStatCards;
  invoicedVsReceived12Months: MonthlyTrendData[];
  pipelineByStage: PipelineStageChartData[];
  leadSourcesQuarter: LeadSourceChartData[];
  top10ClientsRevenue: TopClientRevenueData[];
  agingBuckets: AgingBucketData[];
  overdueInvoices: OverdueInvoiceItem[];
  expiringQuotations: ExpiringQuotationItem[];
  dueTasks: DueTaskItem[];
  overdueMarketingActivities: OverdueMarketingActivityItem[];
}

export class DashboardService {
  /**
   * Compute aggregate dashboard metrics for a company.
   * All queries are strictly company-scoped and computed via efficient aggregation.
   */
  public static getDashboardData(companyId: string, referenceDateStr?: string): DashboardData {
    const db = StorageService.getDb();
    const company = (db.companies || []).find((c) => c.id === companyId) || {
      id: companyId,
      name: 'Default Company',
      legal_name: 'Default Company Ltd',
      currency_code: 'ZMW',
    } as Company;

    const todayStr = referenceDateStr || new Date().toISOString().substring(0, 10);
    const currentYearMonth = todayStr.substring(0, 7);
    const startOfMonth = `${currentYearMonth}-01`;
    const refDateObj = new Date(todayStr);
    const endOfMonth = ReportingDateUtils.getPresetRange('this_month', refDateObj).endDate;

    // Filter company-scoped collections
    const leads = (db.leads || []).filter((l) => l.company_id === companyId && !l.deleted_at);
    const leadActivities = (db.leadActivities || []).filter((a) => a.company_id === companyId);
    const stages = (db.pipelineStages || []).filter((s) => s.company_id === companyId).sort((a, b) => (a.order || 0) - (b.order || 0));
    const quotes = (db.quotations || []).filter((q) => q.company_id === companyId && !q.deleted_at);
    const invoices = (db.invoices || []).filter((i) => i.company_id === companyId && !i.deleted_at && i.status !== 'draft' && i.status !== 'cancelled');
    const payments = (db.payments || []).filter((p) => p.company_id === companyId && !p.deleted_at);
    const orgs = (db.organisations || []).filter((o) => o.company_id === companyId);
    const orgMap = new Map<string, string>(orgs.map((o) => [o.id, o.name]));
    const plans = (db.marketingPlans || []).filter((p) => p.company_id === companyId && !p.deleted_at);
    const planMap = new Map<string, string>(plans.map((p) => [p.id, p.name]));
    const marketingActivities = (db.marketingActivities || []).filter((a) => a.company_id === companyId);

    // 1. STAT CARDS
    // Leads captured this month
    const leadsCapturedThisMonth = leads.filter((l) => {
      const capDate = (l.captured_at || l.created_at).substring(0, 10);
      return capDate >= startOfMonth && capDate <= endOfMonth;
    }).length;

    // Open pipeline value (leads that are not won and not lost)
    const openLeads = leads.filter((l) => l.status !== 'won' && l.status !== 'lost');
    const openPipelineValueMinor = openLeads.reduce((sum, l) => sum + (l.estimated_value_minor || 0), 0);

    // Quotations awaiting decision (sent / delivered / pending)
    const quotesAwaiting = quotes.filter((q) => q.status === 'sent');
    const quotationsAwaitingDecisionCount = quotesAwaiting.length;
    const quotationsAwaitingDecisionValueMinor = quotesAwaiting.reduce((sum, q) => sum + (q.total_minor || 0), 0);

    // Invoiced this month
    const invoicedThisMonthMinor = invoices
      .filter((i) => i.issue_date >= startOfMonth && i.issue_date <= endOfMonth)
      .reduce((sum, i) => sum + (i.total_minor || 0), 0);

    // Received this month
    const receivedThisMonthMinor = payments
      .filter((p) => p.payment_date >= startOfMonth && p.payment_date <= endOfMonth)
      .reduce((sum, p) => sum + (p.amount_minor || 0), 0);

    // Total outstanding balance
    const totalOutstandingMinor = invoices.reduce((sum, i) => sum + Math.max(0, i.balance_due_minor || 0), 0);

    // Overdue amount
    const overdueInvoicesList = invoices.filter((i) => i.due_date < todayStr && (i.balance_due_minor || 0) > 0);
    const overdueAmountMinor = overdueInvoicesList.reduce((sum, i) => sum + (i.balance_due_minor || 0), 0);

    const stats: DashboardStatCards = {
      leadsCapturedThisMonth,
      openPipelineValueMinor,
      quotationsAwaitingDecisionCount,
      quotationsAwaitingDecisionValueMinor,
      invoicedThisMonthMinor,
      receivedThisMonthMinor,
      totalOutstandingMinor,
      overdueAmountMinor,
    };

    // 2. LINE CHART: Invoiced vs Received (Last 12 Months)
    const invoicedVsReceived12Months: MonthlyTrendData[] = [];
    const [curYear, curMonth] = currentYearMonth.split('-').map(Number);

    for (let offset = 11; offset >= 0; offset--) {
      let targetMonth = curMonth - offset;
      let targetYear = curYear;
      while (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }
      const monthStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;
      const monthDate = new Date(targetYear, targetMonth - 1, 1);
      const label = monthDate.toLocaleString('default', { month: 'short' }) + ' ' + targetYear.toString().slice(2);

      const mInvoiced = invoices
        .filter((i) => i.issue_date.startsWith(monthStr))
        .reduce((sum, i) => sum + (i.total_minor || 0), 0);

      const mReceived = payments
        .filter((p) => p.payment_date.startsWith(monthStr))
        .reduce((sum, p) => sum + (p.amount_minor || 0), 0);

      invoicedVsReceived12Months.push({
        monthKey: monthStr,
        label,
        invoicedMinor: mInvoiced,
        receivedMinor: mReceived,
      });
    }

    // 3. FUNNEL/BAR CHART: Current Pipeline by Stage
    const pipelineByStage: PipelineStageChartData[] = stages.map((stage) => {
      const stageLeads = leads.filter((l) => l.stage_id === stage.id && l.status !== 'won' && l.status !== 'lost');
      const unweighted = stageLeads.reduce((sum, l) => sum + (l.estimated_value_minor || 0), 0);
      const prob = stage.probability_percent || 0;
      const weighted = Math.round((unweighted * prob) / 100);

      return {
        stageId: stage.id,
        stageName: stage.name,
        order: stage.order || 0,
        leadsCount: stageLeads.length,
        unweightedValueMinor: unweighted,
        weightedValueMinor: weighted,
        probabilityPercent: prob,
      };
    });

    // 4. DOUGHNUT: Lead Sources This Quarter
    const quarterRange = ReportingDateUtils.getPresetRange('this_quarter', refDateObj);
    const quarterLeads = leads.filter((l) => {
      const capDate = (l.captured_at || l.created_at).substring(0, 10);
      return ReportingDateUtils.isInRangeInclusive(capDate, quarterRange.startDate, quarterRange.endDate);
    });

    const sourceMap: Record<string, { count: number; value: number }> = {};
    for (const l of quarterLeads) {
      const src = l.source || 'other';
      if (!sourceMap[src]) {
        sourceMap[src] = { count: 0, value: 0 };
      }
      sourceMap[src].count += 1;
      sourceMap[src].value += l.estimated_value_minor || 0;
    }

    const totalQuarterLeads = quarterLeads.length;
    const leadSourcesQuarter: LeadSourceChartData[] = Object.entries(sourceMap)
      .map(([source, d]) => ({
        source,
        label: formatSourceLabel(source),
        count: d.count,
        valueMinor: d.value,
        percentage: totalQuarterLeads > 0 ? Math.round((d.count / totalQuarterLeads) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // If no quarter leads, provide standard placeholder sources for visualization
    if (leadSourcesQuarter.length === 0) {
      leadSourcesQuarter.push({ source: 'direct', label: 'Direct Inbound', count: 0, valueMinor: 0, percentage: 0 });
    }

    // 5. BAR: Top 10 Clients by Revenue
    const clientRevenueMap: Record<string, { invoiced: number; paid: number; outstanding: number }> = {};
    for (const inv of invoices) {
      const orgId = inv.organisation_id || 'unassigned';
      if (!clientRevenueMap[orgId]) {
        clientRevenueMap[orgId] = { invoiced: 0, paid: 0, outstanding: 0 };
      }
      clientRevenueMap[orgId].invoiced += inv.total_minor || 0;
      clientRevenueMap[orgId].paid += inv.amount_paid_minor || 0;
      clientRevenueMap[orgId].outstanding += Math.max(0, inv.balance_due_minor || 0);
    }

    const top10ClientsRevenue: TopClientRevenueData[] = Object.entries(clientRevenueMap)
      .map(([orgId, d]) => ({
        organisationId: orgId,
        organisationName: orgMap.get(orgId) || 'Unassigned Client',
        totalInvoicedMinor: d.invoiced,
        totalPaidMinor: d.paid,
        outstandingMinor: d.outstanding,
      }))
      .sort((a, b) => b.totalInvoicedMinor - a.totalInvoicedMinor)
      .slice(0, 10);

    // 6. BAR: Invoice Ageing Buckets
    const agingCounts = {
      current: { amount: 0, count: 0 },
      '1_30': { amount: 0, count: 0 },
      '31_60': { amount: 0, count: 0 },
      '61_90': { amount: 0, count: 0 },
      '90_plus': { amount: 0, count: 0 },
    };

    for (const inv of invoices) {
      const bal = inv.balance_due_minor || 0;
      if (bal <= 0) continue;

      if (inv.due_date >= todayStr) {
        agingCounts.current.amount += bal;
        agingCounts.current.count += 1;
      } else {
        const daysPast = ReportingDateUtils.daysBetween(inv.due_date, todayStr);
        if (daysPast <= 30) {
          agingCounts['1_30'].amount += bal;
          agingCounts['1_30'].count += 1;
        } else if (daysPast <= 60) {
          agingCounts['31_60'].amount += bal;
          agingCounts['31_60'].count += 1;
        } else if (daysPast <= 90) {
          agingCounts['61_90'].amount += bal;
          agingCounts['61_90'].count += 1;
        } else {
          agingCounts['90_plus'].amount += bal;
          agingCounts['90_plus'].count += 1;
        }
      }
    }

    const agingBuckets: AgingBucketData[] = [
      { bucketKey: 'current', label: 'Current (Not Due)', amountMinor: agingCounts.current.amount, count: agingCounts.current.count },
      { bucketKey: '1_30', label: '1–30 Days Overdue', amountMinor: agingCounts['1_30'].amount, count: agingCounts['1_30'].count },
      { bucketKey: '31_60', label: '31–60 Days Overdue', amountMinor: agingCounts['31_60'].amount, count: agingCounts['31_60'].count },
      { bucketKey: '61_90', label: '61–90 Days Overdue', amountMinor: agingCounts['61_90'].amount, count: agingCounts['61_90'].count },
      { bucketKey: '90_plus', label: '90+ Days Overdue', amountMinor: agingCounts['90_plus'].amount, count: agingCounts['90_plus'].count },
    ];

    // 7. LISTS
    // Overdue Invoices
    const overdueInvoices: OverdueInvoiceItem[] = overdueInvoicesList
      .map((inv) => ({
        id: inv.id,
        number: inv.number,
        organisationName: orgMap.get(inv.organisation_id) || 'Client',
        dueDate: inv.due_date,
        daysOverdue: Math.max(1, ReportingDateUtils.daysBetween(inv.due_date, todayStr)),
        balanceDueMinor: inv.balance_due_minor || 0,
        totalMinor: inv.total_minor || 0,
        currencyCode: inv.currency_code || company.currency_code,
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Quotations Expiring in 7 Days (relative to reference todayStr)
    const in7DaysDate = new Date(refDateObj.getTime() + 7 * 86400000).toISOString().substring(0, 10);
    const expiringQuotations: ExpiringQuotationItem[] = quotes
      .filter((q) => q.status === 'sent' && q.valid_until && q.valid_until >= todayStr && q.valid_until <= in7DaysDate)
      .map((q) => {
        const daysRem = ReportingDateUtils.daysBetween(todayStr, q.valid_until);
        return {
          id: q.id,
          number: q.number,
          organisationName: orgMap.get(q.organisation_id) || 'Client',
          validUntil: q.valid_until,
          daysRemaining: daysRem,
          totalMinor: q.total_minor || 0,
          currencyCode: q.currency_code || company.currency_code,
          status: q.status,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Tasks / Lead Activities Due Today & Overdue
    const dueTasks: DueTaskItem[] = leadActivities
      .filter((a: any) => {
        if (a.completed) return false;
        const sched = a.scheduled_at || a.performed_at;
        if (!sched) return false;
        const schedDate = sched.substring(0, 10);
        return schedDate <= todayStr;
      })
      .map((a: any) => {
        const lead = leads.find((l) => l.id === a.lead_id);
        const sched = a.scheduled_at || a.performed_at || todayStr;
        const schedDate = sched.substring(0, 10);
        return {
          id: a.id,
          leadId: a.lead_id,
          leadTitle: lead?.title || 'Lead Prospect',
          activityType: a.type || a.activity_type || 'task',
          scheduledAt: schedDate,
          isOverdue: schedDate < todayStr,
          notes: a.notes || a.description,
        };
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

    // Overdue Marketing Activities
    const overdueMarketingActivities: OverdueMarketingActivityItem[] = marketingActivities
      .filter((act) => {
        if (act.status === 'completed' || act.status === 'cancelled') return false;
        return act.planned_end && act.planned_end < todayStr;
      })
      .map((act) => ({
        id: act.id,
        planId: act.plan_id,
        planName: planMap.get(act.plan_id) || 'Marketing Plan',
        name: act.name,
        channel: act.channel,
        plannedEnd: act.planned_end,
        daysOverdue: ReportingDateUtils.daysBetween(act.planned_end, todayStr),
        budgetMinor: act.budget_minor || 0,
        actualCostMinor: act.actual_cost_minor || 0,
        status: act.status,
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    return {
      company,
      asOfDate: todayStr,
      stats,
      invoicedVsReceived12Months,
      pipelineByStage,
      leadSourcesQuarter,
      top10ClientsRevenue,
      agingBuckets,
      overdueInvoices,
      expiringQuotations,
      dueTasks,
      overdueMarketingActivities,
    };
  }
}

function formatSourceLabel(source: string): string {
  switch (source) {
    case 'field_visit':
      return 'Field Visits';
    case 'cold_call':
      return 'Cold Calls';
    case 'email_campaign':
      return 'Email Campaigns';
    case 'whatsapp':
      return 'WhatsApp Marketing';
    case 'social':
      return 'Social Media';
    case 'radio':
      return 'Radio Broadcast';
    case 'print':
      return 'Print Publications';
    case 'exhibition':
      return 'Industry Exhibitions';
    case 'referral_drive':
      return 'Referral Drive';
    case 'website':
      return 'Website / Direct';
    default:
      return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
