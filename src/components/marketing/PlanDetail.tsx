import React, { useState, useMemo } from 'react';
import {
  ActivityResult,
  Company,
  Lead,
  MarketingActivity,
  MarketingPlan,
  MarketingTarget,
  User,
} from '../../types';
import { StorageService } from '../../services/storageService';
import { MarketingService } from '../../services/marketingService';
import { Money } from '../../support/money';
import { PlanModal } from './PlanModal';
import { ActivityModal } from './ActivityModal';
import { TargetModal } from './TargetModal';
import { RecordResultModal } from './RecordResultModal';
import { LeadModal } from './LeadModal';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  Target,
  Activity,
  UserCheck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  FileSpreadsheet,
} from 'lucide-react';

interface PlanDetailProps {
  planId: string;
  onBack: () => void;
  company: Company;
  currentUser: User;
}

export const PlanDetail: React.FC<PlanDetailProps> = ({
  planId,
  onBack,
  company,
  currentUser,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<MarketingActivity | null>(null);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedActivityForResult, setSelectedActivityForResult] = useState<MarketingActivity | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadDefaultActivityId, setLeadDefaultActivityId] = useState<string | undefined>(undefined);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'targets' | 'activities' | 'leads'>('timeline');

  // Compute plan summary
  const summary = useMemo(() => {
    return MarketingService.calculatePlanSummary(planId);
  }, [planId, refreshKey]);

  if (!summary) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200">
        <p className="text-stone-600 font-semibold mb-3">Marketing plan not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold"
        >
          Return to Plans
        </button>
      </div>
    );
  }

  const { plan, activities, targets } = summary;

  const handleSavePlan = (updatedPlan: MarketingPlan) => {
    StorageService.saveMarketingPlan(updatedPlan);
    setRefreshKey((k) => k + 1);
  };

  const handleSaveActivity = (activity: MarketingActivity) => {
    StorageService.saveMarketingActivity(activity);
    setRefreshKey((k) => k + 1);
  };

  const handleSaveTarget = (target: MarketingTarget) => {
    StorageService.saveMarketingTarget(target);
    setRefreshKey((k) => k + 1);
  };

  const handleSaveResult = (result: ActivityResult) => {
    StorageService.saveActivityResult(result);
    setRefreshKey((k) => k + 1);
  };

  const handleSaveLead = (lead: Lead) => {
    StorageService.saveLead(lead);
    setRefreshKey((k) => k + 1);
  };

  const allLeadsForPlan = StorageService.getLeads().filter((l) =>
    activities.some((a) => a.id === l.marketing_activity_id)
  );

  // Timeline Date calculations for Gantt layout
  const planStartMs = new Date(plan.start_date).getTime();
  const planEndMs = new Date(plan.end_date).getTime();
  const planDurationDays = Math.max(1, Math.round((planEndMs - planStartMs) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-6">
      {/* Top Navigation & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl border border-stone-200 bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">{plan.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  plan.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : plan.status === 'completed'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : plan.status === 'cancelled'
                    ? 'bg-stone-200 text-stone-700'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {plan.status}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5 max-w-3xl line-clamp-1">{plan.objective}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPlanModalOpen(true)}
            className="px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5 text-stone-500" />
            Edit Plan
          </button>
          <button
            onClick={() => setIsTargetModalOpen(true)}
            className="px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Target className="w-3.5 h-3.5 text-emerald-700" />
            Add Target
          </button>
          <button
            onClick={() => {
              setLeadDefaultActivityId(activities[0]?.id);
              setLeadToEdit(null);
              setIsLeadModalOpen(true);
            }}
            className="px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
            Add Lead
          </button>
          <button
            onClick={() => {
              setActivityToEdit(null);
              setIsActivityModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Activity
          </button>
        </div>
      </div>

      {/* Overdue Activities Banner */}
      {summary.overdue_activities_count > 0 && (
        <div className="p-4 bg-amber-50/90 border border-amber-300/80 rounded-2xl flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900">
              {summary.overdue_activities_count} Activity Past Due Date
            </h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Activities scheduled past their planned completion date have been flagged. Update actual status or log completed results.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('activities')}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Review Overdue
          </button>
        </div>
      )}

      {/* Executive Financial & Attribution Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Budget vs Spend */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Plan Budget &amp; Spend</span>
            <div className="p-2 bg-stone-100 rounded-xl text-stone-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-900 font-mono">
              {new Money(summary.total_actual_cost_minor, company.currency_code).format()}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              of <span className="font-semibold text-stone-700">{new Money(summary.total_plan_budget_minor, company.currency_code).format()}</span> Budget
            </div>
          </div>
          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                summary.total_actual_cost_minor > summary.total_plan_budget_minor
                  ? 'bg-rose-500'
                  : 'bg-emerald-600'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  summary.total_plan_budget_minor > 0
                    ? Math.round((summary.total_actual_cost_minor / summary.total_plan_budget_minor) * 100)
                    : 0
                )}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-100">
            <span>Allocated: {new Money(summary.total_activity_budget_minor, company.currency_code).format()}</span>
            <span className={summary.budget_variance_minor >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
              {summary.budget_variance_minor >= 0 ? 'Under' : 'Over'} Budget
            </span>
          </div>
        </div>

        {/* Card 2: Attributed Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Attributed Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-800 font-mono">
              {new Money(summary.total_attributed_revenue_minor, company.currency_code).format()}
            </div>
            <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
              <span>ROI:</span>
              <span className={`font-bold ${summary.roi_percentage >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {summary.roi_percentage >= 0 ? `+${summary.roi_percentage}%` : `${summary.roi_percentage}%`}
              </span>
            </div>
          </div>
          <div className="pt-2 text-[11px] text-stone-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Traceable through linked client invoices</span>
          </div>
        </div>

        {/* Card 3: Leads Captured & Conversion */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Leads &amp; Conversion</span>
            <div className="p-2 bg-sky-50 text-sky-800 rounded-xl">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-900 font-mono">
              {allLeadsForPlan.length} Leads
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              <span className="font-semibold text-emerald-700 font-mono">
                {allLeadsForPlan.filter((l) => l.status === 'won').length} Won Deals
              </span>
            </div>
          </div>
          <div className="pt-2 text-[10px] text-stone-500 flex justify-between border-t border-stone-100">
            <span>Win Rate:</span>
            <span className="font-bold text-stone-800">
              {allLeadsForPlan.length > 0
                ? `${Math.round((allLeadsForPlan.filter((l) => l.status === 'won').length / allLeadsForPlan.length) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Card 4: Quotations & Pipeline */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pipeline Output</span>
            <div className="p-2 bg-purple-50 text-purple-800 rounded-xl">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-900 font-mono">
              {summary.total_quotations_sent} Quotes
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              <span className="font-semibold text-stone-700">{summary.total_invoices_issued} Invoices Billed</span>
            </div>
          </div>
          <div className="pt-2 text-[10px] text-stone-500 flex justify-between border-t border-stone-100">
            <span>Duration:</span>
            <span className="font-semibold text-stone-800">{plan.start_date} to {plan.end_date}</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-stone-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'timeline'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Gantt Activity Timeline ({activities.length})
        </button>
        <button
          onClick={() => setActiveTab('targets')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'targets'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Target className="w-4 h-4" />
          Target vs. Actual Performance ({targets.length})
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'activities'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Activities &amp; Expenditure ({activities.length})
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'leads'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Attributed Leads &amp; Deals ({allLeadsForPlan.length})
        </button>
      </div>

      {/* TAB 1: Gantt Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Campaign Execution Timeline</h3>
              <p className="text-xs text-stone-500">
                Visualizing activity schedules against the campaign span ({plan.start_date} to {plan.end_date})
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium text-stone-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-600" /> Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-sky-500" /> In Progress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-stone-300" /> Planned
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-500" /> Overdue
              </span>
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
              <Calendar className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-600">No activities scheduled yet</p>
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="mt-3 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold"
              >
                Schedule First Activity
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline Header Bounds */}
              <div className="flex justify-between text-[11px] font-mono text-stone-400 border-b border-stone-100 pb-2">
                <span>Start: {plan.start_date}</span>
                <span>Plan Span: {planDurationDays} Days</span>
                <span>End: {plan.end_date}</span>
              </div>

              {/* Gantt Bars List */}
              <div className="space-y-3">
                {activities.map((act) => {
                  const actStartMs = new Date(act.planned_start).getTime();
                  const actEndMs = new Date(act.planned_end).getTime();

                  // Percentage calculations relative to plan range
                  const startOffsetDays = Math.max(0, (actStartMs - planStartMs) / (1000 * 60 * 60 * 24));
                  const actDurationDays = Math.max(1, (actEndMs - actStartMs) / (1000 * 60 * 60 * 24));

                  const leftPercent = Math.min(100, Math.max(0, (startOffsetDays / planDurationDays) * 100));
                  const widthPercent = Math.min(100 - leftPercent, Math.max(3, (actDurationDays / planDurationDays) * 100));

                  const barBg =
                    act.is_overdue
                      ? 'bg-amber-500 border-amber-600'
                      : act.status === 'completed'
                      ? 'bg-emerald-600 border-emerald-700'
                      : act.status === 'in_progress'
                      ? 'bg-sky-500 border-sky-600'
                      : 'bg-stone-300 border-stone-400';

                  return (
                    <div
                      key={act.id}
                      className="p-3 bg-stone-50/70 hover:bg-stone-100/70 rounded-xl border border-stone-200/60 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">{act.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-700 text-[10px] font-semibold">
                            {MarketingService.getChannelLabel(act.channel)}
                          </span>
                          {act.is_overdue && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Overdue by {act.overdue_days}d
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-stone-500">
                          {act.planned_start} → {act.planned_end} ({Math.round(actDurationDays)} days)
                        </div>
                      </div>

                      {/* Bar Track */}
                      <div className="w-full bg-stone-200/70 h-5 rounded-md relative overflow-hidden">
                        <div
                          className={`absolute top-0 bottom-0 rounded-md border text-[10px] text-white font-bold flex items-center px-2 truncate shadow-xs transition-all ${barBg}`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                        >
                          <span className="truncate">{act.status.toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1.5">
                        <span>
                          Budget: <strong className="text-stone-700">{new Money(act.budget_minor, company.currency_code).format()}</strong>
                        </span>
                        <span>
                          Actual Spend: <strong className="text-stone-700">{new Money(act.actual_cost_minor, company.currency_code).format()}</strong>
                        </span>
                        <span>
                          Attributed Revenue: <strong className="text-emerald-800">{new Money(act.attributed_revenue_minor, company.currency_code).format()}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Targets vs Actuals */}
      {activeTab === 'targets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-stone-200/80">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Key Performance Indicators &amp; Targets</h3>
              <p className="text-xs text-stone-500">Real-time target attainment calculated from CRM pipeline</p>
            </div>
            <button
              onClick={() => setIsTargetModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Target
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targets.map((t) => {
              const isMonetary = t.metric === 'quotation_value' || t.metric === 'revenue';
              const isRate = t.metric === 'conversion_rate';

              const formattedTarget = isMonetary
                ? new Money(t.target_value, company.currency_code).format()
                : isRate
                ? `${(t.target_value / 100).toFixed(1)}%`
                : `${t.target_value}`;

              const formattedActual = isMonetary
                ? new Money(t.actual_value, company.currency_code).format()
                : isRate
                ? `${(t.actual_value / 100).toFixed(1)}%`
                : `${t.actual_value}`;

              const badgeColor =
                t.status === 'achieved'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : t.status === 'on_track'
                  ? 'bg-sky-100 text-sky-800 border-sky-300'
                  : t.status === 'lagging'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300';

              return (
                <div
                  key={t.target.id}
                  className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        {t.period_label}
                      </span>
                      <h4 className="text-sm font-bold text-stone-900 mt-0.5">
                        {MarketingService.getMetricLabel(t.metric)}
                      </h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                      {t.status.toUpperCase()} ({t.achievement_percentage}%)
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-stone-400 block">Actual Attained</span>
                      <span className="text-lg font-bold text-stone-900 font-mono">{formattedActual}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-stone-400 block">Target Quota</span>
                      <span className="text-sm font-semibold text-stone-600 font-mono">{formattedTarget}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        t.achievement_percentage >= 100
                          ? 'bg-emerald-600'
                          : t.achievement_percentage >= 75
                          ? 'bg-sky-500'
                          : t.achievement_percentage >= 40
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, t.achievement_percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Activities & Expenditure */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Campaign Activities Breakdown</h3>
              <p className="text-xs text-stone-500">Track channel investments, outcomes, and progress</p>
            </div>
            <button
              onClick={() => {
                setActivityToEdit(null);
                setIsActivityModalOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Activity
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold tracking-wider border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Timeline</th>
                  <th className="px-4 py-3 text-right">Budget</th>
                  <th className="px-4 py-3 text-right">Actual Cost</th>
                  <th className="px-4 py-3 text-right">Attributed Rev.</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {activities.map((act) => (
                  <tr key={act.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-stone-900">{act.name}</div>
                      {act.description && (
                        <div className="text-[11px] text-stone-500 line-clamp-1">{act.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-semibold">
                        {MarketingService.getChannelLabel(act.channel)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] font-mono text-stone-500">
                      {act.planned_start} → {act.planned_end}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-stone-800">
                      {new Money(act.budget_minor, company.currency_code).format()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-stone-800">
                      {new Money(act.actual_cost_minor, company.currency_code).format()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-800">
                      {new Money(act.attributed_revenue_minor, company.currency_code).format()}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          act.is_overdue
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : act.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : act.status === 'in_progress'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {act.is_overdue ? `OVERDUE (${act.overdue_days}d)` : act.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedActivityForResult(act);
                            setIsResultModalOpen(true);
                          }}
                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          Log Results
                        </button>
                        <button
                          onClick={() => {
                            setActivityToEdit(act);
                            setIsActivityModalOpen(true);
                          }}
                          className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Attributed Leads Matrix */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Attributed Campaign Opportunities &amp; Leads</h3>
              <p className="text-xs text-stone-500">Directly attributed to marketing activities for ROI tracing</p>
            </div>
            <button
              onClick={() => {
                setLeadDefaultActivityId(activities[0]?.id);
                setLeadToEdit(null);
                setIsLeadModalOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Capture Lead
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold tracking-wider border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Lead / Deal</th>
                  <th className="px-4 py-3">Organisation</th>
                  <th className="px-4 py-3">Attributed Activity</th>
                  <th className="px-4 py-3">Source Channel</th>
                  <th className="px-4 py-3 text-right">Est. Value</th>
                  <th className="px-4 py-3 text-center">Pipeline Stage</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {allLeadsForPlan.map((l) => {
                  const act = activities.find((a) => a.id === l.marketing_activity_id);
                  const org = StorageService.getOrganisations().find((o) => o.id === l.organisation_id);

                  return (
                    <tr key={l.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-stone-900">{l.title}</td>
                      <td className="px-4 py-3.5 text-stone-600">{org ? org.name : '—'}</td>
                      <td className="px-4 py-3.5 text-stone-800 font-semibold">{act ? act.name : '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-semibold">
                          {l.source}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-stone-800">
                        {new Money(l.estimated_value_minor || 0, company.currency_code).format()}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            l.status === 'won'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'proposal'
                              ? 'bg-sky-100 text-sky-800'
                              : l.status === 'lost'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setLeadToEdit(l);
                            setIsLeadModalOpen(true);
                          }}
                          className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSave={handleSavePlan}
        planToEdit={plan}
        company={company}
        currentUser={currentUser}
      />

      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSave={handleSaveActivity}
        activityToEdit={activityToEdit}
        planId={plan.id}
        company={company}
        currentUser={currentUser}
      />

      <TargetModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        onSave={handleSaveTarget}
        plan={plan}
        company={company}
      />

      {selectedActivityForResult && (
        <RecordResultModal
          isOpen={isResultModalOpen}
          onClose={() => {
            setIsResultModalOpen(false);
            setSelectedActivityForResult(null);
          }}
          onSave={handleSaveResult}
          activity={selectedActivityForResult}
          company={company}
          currentUser={currentUser}
        />
      )}

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => {
          setIsLeadModalOpen(false);
          setLeadToEdit(null);
        }}
        onSave={handleSaveLead}
        leadToEdit={leadToEdit}
        defaultActivityId={leadDefaultActivityId}
        activities={activities}
        company={company}
        currentUser={currentUser}
      />
    </div>
  );
};
