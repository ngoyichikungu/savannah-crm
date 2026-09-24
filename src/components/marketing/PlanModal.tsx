import React, { useState, useEffect } from 'react';
import { Company, MarketingPlan, MarketingPlanStatus, User } from '../../types';
import { Money } from '../../support/money';
import { X, Target, Calendar, DollarSign } from 'lucide-react';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: MarketingPlan) => void;
  planToEdit?: MarketingPlan | null;
  company: Company;
  currentUser: User;
}

export const PlanModal: React.FC<PlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  planToEdit,
  company,
  currentUser,
}) => {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetMajor, setBudgetMajor] = useState('');
  const [status, setStatus] = useState<MarketingPlanStatus>('active');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (planToEdit) {
      setName(planToEdit.name);
      setObjective(planToEdit.objective);
      setStartDate(planToEdit.start_date);
      setEndDate(planToEdit.end_date);
      setBudgetMajor((planToEdit.budget_minor / 100).toString());
      setStatus(planToEdit.status);
    } else {
      setName('');
      setObjective('');
      const today = new Date().toISOString().slice(0, 10);
      const nextQuarter = new Date();
      nextQuarter.setMonth(nextQuarter.getMonth() + 3);
      setStartDate(today);
      setEndDate(nextQuarter.toISOString().slice(0, 10));
      setBudgetMajor('50000');
      setStatus('active');
    }
    setError(null);
  }, [planToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Plan name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start and End dates are required.');
      return;
    }
    if (startDate > endDate) {
      setError('Start date cannot be after End date.');
      return;
    }

    const budgetMinor = Math.round((parseFloat(budgetMajor) || 0) * 100);

    const now = new Date().toISOString();
    const plan: MarketingPlan = {
      id: planToEdit ? planToEdit.id : `plan_${Date.now()}`,
      company_id: company.id,
      name: name.trim(),
      objective: objective.trim(),
      start_date: startDate,
      end_date: endDate,
      budget_minor: budgetMinor,
      owner_user_id: planToEdit ? planToEdit.owner_user_id : currentUser.id,
      status,
      created_at: planToEdit ? planToEdit.created_at : now,
      updated_at: now,
    };

    onSave(plan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700 text-white rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {planToEdit ? 'Edit Marketing Plan' : 'Create Sales & Marketing Plan'}
              </h2>
              <p className="text-xs text-stone-500">Define campaign objectives, duration, and allocated budget</p>
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
              Plan Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Mining & Commercial Expansion Campaign"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
              Strategic Objective
            </label>
            <textarea
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Describe target market, customer segment, and business outcomes..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Start Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
                <Calendar className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                End Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
                <Calendar className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Total Budget ({company.currency_code}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={budgetMajor}
                  onChange={(e) => setBudgetMajor(e.target.value)}
                  placeholder="50000.00"
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
                <DollarSign className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                {new Money(Math.round((parseFloat(budgetMajor) || 0) * 100), company.currency_code).format()}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Plan Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MarketingPlanStatus)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-700 focus:outline-none font-medium"
              >
                <option value="draft">Draft (Planning)</option>
                <option value="active">Active (In Execution)</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
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
              {planToEdit ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
