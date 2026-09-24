import React, { useState, useMemo } from 'react';
import { Company, MarketingPlan, User } from '../../types';
import { StorageService } from '../../services/storageService';
import { MarketingService } from '../../services/marketingService';
import { Money } from '../../support/money';
import { PlanModal } from './PlanModal';
import {
  Target,
  Plus,
  AlertTriangle,
  ChevronRight,
  Clock,
} from 'lucide-react';

interface PlanListProps {
  onSelectPlan: (planId: string) => void;
  company: Company;
  currentUser: User;
}

export const PlanList: React.FC<PlanListProps> = ({
  onSelectPlan,
  company,
  currentUser,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'completed'>('all');

  const plans = useMemo(() => {
    const all = StorageService.getMarketingPlans();
    if (statusFilter === 'all') return all;
    return all.filter((p) => p.status === statusFilter);
  }, [refreshKey, statusFilter]);

  const overdueActivities = useMemo(() => {
    return MarketingService.getOverdueActivities(company.id);
  }, [company.id, refreshKey]);

  const handleSaveNewPlan = (newPlan: MarketingPlan) => {
    StorageService.saveMarketingPlan(newPlan);
    setRefreshKey((k) => k + 1);
    onSelectPlan(newPlan.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Sales &amp; Marketing Plans</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Track campaign timelines, budgets, KPI targets, and real-time revenue attribution
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Marketing Plan
        </button>
      </div>

      {/* Overdue Alert Banner if any overdue activities across company */}
      {overdueActivities.length > 0 && (
        <div className="p-4 bg-amber-50/90 border border-amber-300/80 rounded-2xl flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900">
              {overdueActivities.length} Campaign Activities Overdue
            </h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Activities have passed their planned end dates without being marked completed. Check plans to reschedule or log outcomes.
            </p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        {(['all', 'active', 'draft', 'completed'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
              statusFilter === st
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {st === 'all' ? 'All Plans' : st}
          </button>
        ))}
      </div>

      {/* Plan Cards Grid */}
      {plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-200 p-8">
          <Target className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-stone-800">No Marketing Plans Found</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Create structured sales and marketing campaigns to organize channels, set KPI targets, and measure live ROI.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            Create Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const sum = MarketingService.calculatePlanSummary(plan.id);
            if (!sum) return null;

            return (
              <div
                key={plan.id}
                onClick={() => onSelectPlan(plan.id)}
                className="group bg-white p-5 rounded-2xl border border-stone-200/80 hover:border-emerald-700/60 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
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
                    <span className="text-[11px] font-mono text-stone-400">
                      {plan.start_date} → {plan.end_date}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                    {plan.objective || 'No objective specified.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-stone-100 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Budget</span>
                      <span className="font-mono font-bold text-stone-800 text-[11px]">
                        {new Money(sum.total_plan_budget_minor, company.currency_code).format()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Actual Cost</span>
                      <span className="font-mono font-bold text-stone-800 text-[11px]">
                        {new Money(sum.total_actual_cost_minor, company.currency_code).format()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Attributed Rev</span>
                      <span className="font-mono font-bold text-emerald-800 text-[11px]">
                        {new Money(sum.total_attributed_revenue_minor, company.currency_code).format()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      {sum.activities.length} Activities • {sum.targets.length} Targets
                    </span>
                    <span className="flex items-center gap-0.5 text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform">
                      View Tracker <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Creation Modal */}
      <PlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNewPlan}
        company={company}
        currentUser={currentUser}
      />
    </div>
  );
};
