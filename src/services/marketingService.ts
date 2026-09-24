import {
  Invoice,
  Lead,
  MarketingActivity,
  MarketingChannel,
  MarketingPlan,
  MarketingTarget,
  MarketingTargetMetric,
  Quotation,
} from '../types';
import { StorageService } from './storageService';

export interface TargetProgress {
  target: MarketingTarget;
  metric: MarketingTargetMetric;
  target_value: number;
  actual_value: number;
  achievement_percentage: number;
  status: 'achieved' | 'on_track' | 'lagging' | 'critical';
  period_label: string;
}

export interface ActivityWithAttribution extends MarketingActivity {
  attributed_revenue_minor: number;
  leads_count: number;
  quotations_count: number;
  invoices_count: number;
  is_overdue: boolean;
  overdue_days: number;
}

export interface PlanSummary {
  plan: MarketingPlan;
  activities: ActivityWithAttribution[];
  targets: TargetProgress[];
  total_plan_budget_minor: number;
  total_activity_budget_minor: number;
  total_actual_cost_minor: number;
  budget_variance_minor: number; // plan_budget - actual_cost
  budget_allocation_variance_minor: number; // plan_budget - activity_budget
  total_attributed_revenue_minor: number;
  total_leads_captured: number;
  total_quotations_sent: number;
  total_invoices_issued: number;
  overdue_activities_count: number;
  roi_percentage: number; // ((revenue - actual_cost) / actual_cost) * 100
}

export class MarketingService {
  /**
   * Check if a date string falls within a start and end boundary (both endpoints inclusive).
   */
  static isDateInPeriod(dateStr: string, periodStart: string, periodEnd: string): boolean {
    if (!dateStr) return false;
    const dateOnly = dateStr.slice(0, 10);
    const startOnly = periodStart.slice(0, 10);
    const endOnly = periodEnd.slice(0, 10);
    return dateOnly >= startOnly && dateOnly <= endOnly;
  }

  /**
   * Calculate attributed revenue for a single marketing activity.
   * Ensures NO double-counting if an invoice is reachable by multiple leads or paths.
   */
  static calculateActivityRevenue(
    activityId: string,
    periodStart?: string,
    periodEnd?: string
  ): {
    revenue_minor: number;
    leads: Lead[];
    quotations: Quotation[];
    invoices: Invoice[];
    traceable_invoices: Invoice[];
  } {
    const leads = StorageService.getLeads(activityId);
    const leadIds = new Set(leads.map((l) => l.id));
    const orgIdsWithLeads = new Set(leads.map((l) => l.organisation_id).filter(Boolean) as string[]);

    const allQuotations = StorageService.getQuotations();
    const linkedQuotations = allQuotations.filter((q) => {
      if (q.lead_id && leadIds.has(q.lead_id)) return true;
      if (q.organisation_id && orgIdsWithLeads.has(q.organisation_id)) return true;
      return false;
    });
    const quotationIds = new Set(linkedQuotations.map((q) => q.id));

    const allInvoices = StorageService.getInvoices();
    const processedInvoiceIds = new Set<string>();
    const traceableInvoices: Invoice[] = [];

    // Match invoices linked via quotations OR directly to lead organisations
    for (const inv of allInvoices) {
      if (processedInvoiceIds.has(inv.id)) continue;

      let isMatch = false;
      if (inv.quotation_id && quotationIds.has(inv.quotation_id)) {
        isMatch = true;
      } else if (inv.organisation_id && orgIdsWithLeads.has(inv.organisation_id)) {
        isMatch = true;
      }

      if (isMatch) {
        processedInvoiceIds.add(inv.id);

        if (periodStart && periodEnd) {
          const invDate = inv.issue_date || inv.created_at || '';
          const paidDate = inv.fully_paid_at || invDate;
          if (
            this.isDateInPeriod(invDate, periodStart, periodEnd) ||
            this.isDateInPeriod(paidDate, periodStart, periodEnd)
          ) {
            traceableInvoices.push(inv);
          }
        } else {
          traceableInvoices.push(inv);
        }
      }
    }

    // Sum paid amounts from unique traceable invoices
    let liveRevenueMinor = 0;
    for (const inv of traceableInvoices) {
      liveRevenueMinor += inv.amount_paid_minor || 0;
    }

    // Add manual activity_results revenue
    const manualResults = StorageService.getActivityResults(activityId);
    let manualRevenueMinor = 0;
    for (const res of manualResults) {
      if (periodStart && periodEnd) {
        if (this.isDateInPeriod(res.recorded_at, periodStart, periodEnd)) {
          manualRevenueMinor += res.revenue_attributed_minor || 0;
        }
      } else {
        manualRevenueMinor += res.revenue_attributed_minor || 0;
      }
    }

    // If live invoices exist, prefer live invoice data + any non-duplicated manual entry
    const totalRevenueMinor = liveRevenueMinor > 0 ? liveRevenueMinor : manualRevenueMinor;

    return {
      revenue_minor: totalRevenueMinor,
      leads,
      quotations: linkedQuotations,
      invoices: traceableInvoices,
      traceable_invoices: traceableInvoices,
    };
  }

  /**
   * Compute Target vs Actual for a single target over its period boundaries.
   */
  static calculateTargetActual(
    target: MarketingTarget,
    planActivities: MarketingActivity[]
  ): TargetProgress {
    const activityIds = new Set(planActivities.map((a) => a.id));
    const allLeads = StorageService.getLeads().filter(
      (l) => l.marketing_activity_id && activityIds.has(l.marketing_activity_id)
    );
    const allManualResults = StorageService.getActivityResults().filter((r) =>
      activityIds.has(r.marketing_activity_id)
    );

    let actualValue = 0;

    switch (target.metric) {
      case 'leads_captured': {
        const liveLeadsCount = allLeads.filter((l) =>
          this.isDateInPeriod(l.created_at, target.period_start, target.period_end)
        ).length;

        const manualLeadsCount = allManualResults
          .filter((r) => this.isDateInPeriod(r.recorded_at, target.period_start, target.period_end))
          .reduce((sum, r) => sum + (r.leads_generated || 0), 0);

        actualValue = Math.max(liveLeadsCount, manualLeadsCount);
        break;
      }

      case 'leads_contacted': {
        const liveContactedCount = allLeads.filter(
          (l) =>
            l.status !== 'new' &&
            this.isDateInPeriod(l.updated_at || l.created_at, target.period_start, target.period_end)
        ).length;

        const manualContactsCount = allManualResults
          .filter((r) => this.isDateInPeriod(r.recorded_at, target.period_start, target.period_end))
          .reduce((sum, r) => sum + (r.contacts_made || 0), 0);

        actualValue = Math.max(liveContactedCount, manualContactsCount);
        break;
      }

      case 'quotations_sent': {
        const leadIds = new Set(allLeads.map((l) => l.id));
        const orgIds = new Set(allLeads.map((l) => l.organisation_id).filter(Boolean) as string[]);
        const allQuotes = StorageService.getQuotations();

        const liveQuotes = allQuotes.filter((q) => {
          const isLinked = (q.lead_id && leadIds.has(q.lead_id)) || (q.organisation_id && orgIds.has(q.organisation_id));
          if (!isLinked) return false;
          const quoteDate = q.sent_at || q.issue_date || q.created_at;
          return this.isDateInPeriod(quoteDate, target.period_start, target.period_end);
        });

        const manualQuotesCount = allManualResults
          .filter((r) => this.isDateInPeriod(r.recorded_at, target.period_start, target.period_end))
          .reduce((sum, r) => sum + (r.quotations_issued || 0), 0);

        actualValue = Math.max(liveQuotes.length, manualQuotesCount);
        break;
      }

      case 'quotation_value': {
        const leadIds = new Set(allLeads.map((l) => l.id));
        const orgIds = new Set(allLeads.map((l) => l.organisation_id).filter(Boolean) as string[]);
        const allQuotes = StorageService.getQuotations();
        const countedQuoteIds = new Set<string>();

        let sumValueMinor = 0;
        for (const q of allQuotes) {
          if (countedQuoteIds.has(q.id)) continue;
          const isLinked = (q.lead_id && leadIds.has(q.lead_id)) || (q.organisation_id && orgIds.has(q.organisation_id));
          if (isLinked) {
            const quoteDate = q.sent_at || q.issue_date || q.created_at;
            if (this.isDateInPeriod(quoteDate, target.period_start, target.period_end)) {
              countedQuoteIds.add(q.id);
              sumValueMinor += q.total_minor;
            }
          }
        }
        actualValue = sumValueMinor;
        break;
      }

      case 'invoices_issued': {
        const leadIds = new Set(allLeads.map((l) => l.id));
        const orgIds = new Set(allLeads.map((l) => l.organisation_id).filter(Boolean) as string[]);
        const allInvoices = StorageService.getInvoices();
        const allQuotes = StorageService.getQuotations();
        const linkedQuoteIds = new Set(
          allQuotes
            .filter((q) => (q.lead_id && leadIds.has(q.lead_id)) || (q.organisation_id && orgIds.has(q.organisation_id)))
            .map((q) => q.id)
        );

        const countedInvIds = new Set<string>();
        for (const inv of allInvoices) {
          if (countedInvIds.has(inv.id)) continue;
          const isLinked =
            (inv.quotation_id && linkedQuoteIds.has(inv.quotation_id)) ||
            (inv.organisation_id && orgIds.has(inv.organisation_id));
          if (isLinked) {
            const invDate = inv.issue_date || inv.created_at;
            if (this.isDateInPeriod(invDate, target.period_start, target.period_end)) {
              countedInvIds.add(inv.id);
            }
          }
        }
        actualValue = countedInvIds.size;
        break;
      }

      case 'revenue': {
        let totalRevenue = 0;
        const countedInvoiceIds = new Set<string>();

        for (const act of planActivities) {
          const revData = this.calculateActivityRevenue(act.id, target.period_start, target.period_end);
          for (const inv of revData.traceable_invoices) {
            if (!countedInvoiceIds.has(inv.id)) {
              countedInvoiceIds.add(inv.id);
              totalRevenue += inv.amount_paid_minor;
            }
          }
        }

        // Check manual fallback if no live invoices found
        if (totalRevenue === 0) {
          totalRevenue = allManualResults
            .filter((r) => this.isDateInPeriod(r.recorded_at, target.period_start, target.period_end))
            .reduce((sum, r) => sum + (r.revenue_attributed_minor || 0), 0);
        }

        actualValue = totalRevenue;
        break;
      }

      case 'conversion_rate': {
        const periodLeads = allLeads.filter((l) =>
          this.isDateInPeriod(l.created_at, target.period_start, target.period_end)
        );
        const wonLeads = periodLeads.filter((l) => l.status === 'won');
        if (periodLeads.length > 0) {
          actualValue = Math.round((wonLeads.length / periodLeads.length) * 10000); // in basis points (100% = 10000)
        } else {
          actualValue = 0;
        }
        break;
      }
    }

    const achievementPercentage =
      target.target_value > 0 ? Math.round((actualValue / target.target_value) * 100) : 0;

    let status: 'achieved' | 'on_track' | 'lagging' | 'critical' = 'lagging';
    if (achievementPercentage >= 100) {
      status = 'achieved';
    } else if (achievementPercentage >= 75) {
      status = 'on_track';
    } else if (achievementPercentage >= 40) {
      status = 'lagging';
    } else {
      status = 'critical';
    }

    return {
      target,
      metric: target.metric,
      target_value: target.target_value,
      actual_value: actualValue,
      achievement_percentage: achievementPercentage,
      status,
      period_label: `${target.period.toUpperCase()} (${target.period_start} to ${target.period_end})`,
    };
  }

  /**
   * Get all overdue activities for a company against planned_end.
   */
  static getOverdueActivities(companyId: string, referenceDateStr?: string): MarketingActivity[] {
    const todayStr = referenceDateStr || new Date().toISOString().slice(0, 10);
    const activities = StorageService.getMarketingActivities().filter(
      (a) => a.company_id === companyId && a.status !== 'completed' && a.status !== 'cancelled'
    );

    return activities.filter((a) => {
      const plannedEndOnly = a.planned_end.slice(0, 10);
      return plannedEndOnly < todayStr;
    });
  }

  /**
   * Full comprehensive plan calculation and aggregation.
   */
  static calculatePlanSummary(planId: string, referenceDateStr?: string): PlanSummary | null {
    const plan = StorageService.getMarketingPlanById(planId);
    if (!plan) return null;

    const todayStr = referenceDateStr || new Date().toISOString().slice(0, 10);
    const activities = StorageService.getMarketingActivities(planId);
    const targets = StorageService.getMarketingTargets(planId);

    // Calculate activities with live attribution & overdue status
    const activitiesWithAttribution: ActivityWithAttribution[] = activities.map((act) => {
      const revData = this.calculateActivityRevenue(act.id);
      const plannedEndOnly = act.planned_end.slice(0, 10);
      const isOverdue =
        act.status !== 'completed' && act.status !== 'cancelled' && plannedEndOnly < todayStr;

      let overdueDays = 0;
      if (isOverdue) {
        const diffMs = new Date(todayStr).getTime() - new Date(plannedEndOnly).getTime();
        overdueDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        ...act,
        attributed_revenue_minor: revData.revenue_minor,
        leads_count: revData.leads.length,
        quotations_count: revData.quotations.length,
        invoices_count: revData.invoices.length,
        is_overdue: isOverdue,
        overdue_days: overdueDays,
      };
    });

    // Compute targets vs actual
    const targetSummaries = targets.map((target) => this.calculateTargetActual(target, activities));

    // Budget aggregations
    const totalActivityBudgetMinor = activities.reduce((sum, a) => sum + (a.budget_minor || 0), 0);
    const totalActualCostMinor = activities.reduce((sum, a) => sum + (a.actual_cost_minor || 0), 0);
    const budgetVarianceMinor = plan.budget_minor - totalActualCostMinor;
    const budgetAllocationVarianceMinor = plan.budget_minor - totalActivityBudgetMinor;

    // Revenue and totals
    const totalAttributedRevenueMinor = activitiesWithAttribution.reduce(
      (sum, a) => sum + a.attributed_revenue_minor,
      0
    );
    const totalLeadsCaptured = activitiesWithAttribution.reduce((sum, a) => sum + a.leads_count, 0);
    const totalQuotationsSent = activitiesWithAttribution.reduce(
      (sum, a) => sum + a.quotations_count,
      0
    );
    const totalInvoicesIssued = activitiesWithAttribution.reduce(
      (sum, a) => sum + a.invoices_count,
      0
    );
    const overdueActivitiesCount = activitiesWithAttribution.filter((a) => a.is_overdue).length;

    let roiPercentage = 0;
    if (totalActualCostMinor > 0) {
      roiPercentage = Math.round(
        ((totalAttributedRevenueMinor - totalActualCostMinor) / totalActualCostMinor) * 100
      );
    }

    return {
      plan,
      activities: activitiesWithAttribution,
      targets: targetSummaries,
      total_plan_budget_minor: plan.budget_minor,
      total_activity_budget_minor: totalActivityBudgetMinor,
      total_actual_cost_minor: totalActualCostMinor,
      budget_variance_minor: budgetVarianceMinor,
      budget_allocation_variance_minor: budgetAllocationVarianceMinor,
      total_attributed_revenue_minor: totalAttributedRevenueMinor,
      total_leads_captured: totalLeadsCaptured,
      total_quotations_sent: totalQuotationsSent,
      total_invoices_issued: totalInvoicesIssued,
      overdue_activities_count: overdueActivitiesCount,
      roi_percentage: roiPercentage,
    };
  }

  /**
   * Helper to format metric name for UI presentation.
   */
  static getMetricLabel(metric: MarketingTargetMetric): string {
    switch (metric) {
      case 'leads_captured':
        return 'Leads Captured';
      case 'leads_contacted':
        return 'Leads Contacted';
      case 'quotations_sent':
        return 'Quotations Sent';
      case 'quotation_value':
        return 'Quotation Pipeline Value';
      case 'invoices_issued':
        return 'Invoices Issued';
      case 'revenue':
        return 'Attributed Revenue';
      case 'conversion_rate':
        return 'Lead Conversion Rate';
      default:
        return metric;
    }
  }

  /**
   * Helper to format channel label.
   */
  static getChannelLabel(channel: MarketingChannel): string {
    switch (channel) {
      case 'field_visit':
        return 'Field Visit & Meetings';
      case 'cold_call':
        return 'Outbound Calling';
      case 'email_campaign':
        return 'Email Marketing';
      case 'whatsapp':
        return 'WhatsApp Direct';
      case 'social':
        return 'Social Media Ads';
      case 'radio':
        return 'Radio Broadcasting';
      case 'print':
        return 'Print & Banners';
      case 'exhibition':
        return 'Trade Expo / Conference';
      case 'referral_drive':
        return 'Referral Incentive Drive';
      case 'other':
        return 'Other Channel';
      default:
        return channel;
    }
  }
}
