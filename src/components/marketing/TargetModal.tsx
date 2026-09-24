import React, { useState, useEffect } from 'react';
import {
  Company,
  MarketingPlan,
  MarketingTarget,
  MarketingTargetMetric,
  MarketingTargetPeriod,
} from '../../types';
import { MarketingService } from '../../services/marketingService';
import { Money } from '../../support/money';
import { X, Target, Calendar, BarChart3 } from 'lucide-react';

interface TargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (target: MarketingTarget) => void;
  plan: MarketingPlan;
  company: Company;
}

const ALL_METRICS: MarketingTargetMetric[] = [
  'leads_captured',
  'leads_contacted',
  'quotations_sent',
  'quotation_value',
  'invoices_issued',
  'revenue',
  'conversion_rate',
];

export const TargetModal: React.FC<TargetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  plan,
  company,
}) => {
  const [metric, setMetric] = useState<MarketingTargetMetric>('leads_captured');
  const [targetValueInput, setTargetValueInput] = useState('20');
  const [period, setPeriod] = useState<MarketingTargetPeriod>('quarterly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMetric('leads_captured');
      setTargetValueInput('20');
      setPeriod('quarterly');
      setPeriodStart(plan.start_date);
      setPeriodEnd(plan.end_date);
      setError(null);
    }
  }, [isOpen, plan]);

  if (!isOpen) return null;

  const isMonetaryMetric = metric === 'quotation_value' || metric === 'revenue';
  const isRateMetric = metric === 'conversion_rate';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd) {
      setError('Period start and end dates are required.');
      return;
    }
    if (periodStart > periodEnd) {
      setError('Period start date cannot be after period end date.');
      return;
    }

    const rawNum = parseFloat(targetValueInput) || 0;
    let targetValue = rawNum;

    if (isMonetaryMetric) {
      targetValue = Math.round(rawNum * 100); // Minor units
    } else if (isRateMetric) {
      targetValue = Math.round(rawNum * 100); // e.g. 35% => 3500 bp
    }

    const target: MarketingTarget = {
      id: `target_${Date.now()}`,
      company_id: company.id,
      plan_id: plan.id,
      metric,
      target_value: targetValue,
      period,
      period_start: periodStart,
      period_end: periodEnd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(target);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700 text-white rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Add Key Performance Target</h2>
              <p className="text-xs text-stone-500">Define quota metrics and tracking period</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
              Target Metric *
            </label>
            <select
              value={metric}
              onChange={(e) => {
                const nextMetric = e.target.value as MarketingTargetMetric;
                setMetric(nextMetric);
                if (nextMetric === 'revenue' || nextMetric === 'quotation_value') {
                  setTargetValueInput('100000');
                } else if (nextMetric === 'conversion_rate') {
                  setTargetValueInput('30');
                } else {
                  setTargetValueInput('15');
                }
              }}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white font-semibold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            >
              {ALL_METRICS.map((m) => (
                <option key={m} value={m}>
                  {MarketingService.getMetricLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
              Target Quota Value *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step={isMonetaryMetric ? '0.01' : isRateMetric ? '0.1' : '1'}
                required
                value={targetValueInput}
                onChange={(e) => setTargetValueInput(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
              <BarChart3 className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
            <span className="text-[10px] text-stone-500 mt-1 block">
              {isMonetaryMetric &&
                `Target: ${new Money(Math.round((parseFloat(targetValueInput) || 0) * 100), company.currency_code).format()}`}
              {isRateMetric && `Target: ${(parseFloat(targetValueInput) || 0).toFixed(1)}% Conversion Rate`}
              {!isMonetaryMetric &&
                !isRateMetric &&
                `Target: ${parseInt(targetValueInput) || 0} ${MarketingService.getMetricLabel(metric).toLowerCase()}`}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
              Measurement Period Type
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as MarketingTargetPeriod)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="total">Total Plan Duration</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Period Start (Inclusive) *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border border-stone-300 rounded-lg text-xs focus:outline-none"
                />
                <Calendar className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Period End (Inclusive) *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border border-stone-300 rounded-lg text-xs focus:outline-none"
                />
                <Calendar className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-sm transition-colors"
            >
              Set Target
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
