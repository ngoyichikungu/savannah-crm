import React, { useState, useEffect } from 'react';
import {
  Company,
  MarketingActivity,
  MarketingActivityStatus,
  MarketingChannel,
  User,
} from '../../types';
import { Money } from '../../support/money';
import { MarketingService } from '../../services/marketingService';
import { X, Calendar, DollarSign, Activity } from 'lucide-react';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: MarketingActivity) => void;
  activityToEdit?: MarketingActivity | null;
  planId: string;
  company: Company;
  currentUser: User;
}

const ALL_CHANNELS: MarketingChannel[] = [
  'field_visit',
  'cold_call',
  'email_campaign',
  'whatsapp',
  'social',
  'radio',
  'print',
  'exhibition',
  'referral_drive',
  'other',
];

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  activityToEdit,
  planId,
  company,
  currentUser,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channel, setChannel] = useState<MarketingChannel>('exhibition');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [actualStart, setActualStart] = useState('');
  const [actualEnd, setActualEnd] = useState('');
  const [budgetMajor, setBudgetMajor] = useState('');
  const [actualCostMajor, setActualCostMajor] = useState('');
  const [status, setStatus] = useState<MarketingActivityStatus>('planned');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activityToEdit) {
      setName(activityToEdit.name);
      setDescription(activityToEdit.description || '');
      setChannel(activityToEdit.channel);
      setPlannedStart(activityToEdit.planned_start);
      setPlannedEnd(activityToEdit.planned_end);
      setActualStart(activityToEdit.actual_start || '');
      setActualEnd(activityToEdit.actual_end || '');
      setBudgetMajor((activityToEdit.budget_minor / 100).toString());
      setActualCostMajor((activityToEdit.actual_cost_minor / 100).toString());
      setStatus(activityToEdit.status);
      setOutcomeNotes(activityToEdit.outcome_notes || '');
    } else {
      setName('');
      setDescription('');
      setChannel('field_visit');
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setPlannedStart(today);
      setPlannedEnd(nextWeek.toISOString().slice(0, 10));
      setActualStart('');
      setActualEnd('');
      setBudgetMajor('10000');
      setActualCostMajor('0');
      setStatus('planned');
      setOutcomeNotes('');
    }
    setError(null);
  }, [activityToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Activity name is required.');
      return;
    }
    if (!plannedStart || !plannedEnd) {
      setError('Planned start and end dates are required.');
      return;
    }
    if (plannedStart > plannedEnd) {
      setError('Planned start date cannot be after planned end date.');
      return;
    }

    const budgetMinor = Math.round((parseFloat(budgetMajor) || 0) * 100);
    const actualCostMinor = Math.round((parseFloat(actualCostMajor) || 0) * 100);

    const now = new Date().toISOString();
    const activity: MarketingActivity = {
      id: activityToEdit ? activityToEdit.id : `act_${Date.now()}`,
      company_id: company.id,
      plan_id: planId,
      name: name.trim(),
      description: description.trim() || undefined,
      channel,
      planned_start: plannedStart,
      planned_end: plannedEnd,
      actual_start: actualStart || undefined,
      actual_end: actualEnd || undefined,
      budget_minor: budgetMinor,
      actual_cost_minor: actualCostMinor,
      status,
      owner_user_id: activityToEdit ? activityToEdit.owner_user_id : currentUser.id,
      outcome_notes: outcomeNotes.trim() || undefined,
      created_at: activityToEdit ? activityToEdit.created_at : now,
      updated_at: now,
    };

    onSave(activity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700 text-white rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {activityToEdit ? 'Edit Campaign Activity' : 'Add Campaign Activity'}
              </h2>
              <p className="text-xs text-stone-500">Schedule channel action, timeline, and allocated expenditure</p>
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
              Activity Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Copperbelt Industrial Expo Exhibition & Demo Booth"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Channel / Medium *
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as MarketingChannel)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              >
                {ALL_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {MarketingService.getChannelLabel(ch)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Execution Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MarketingActivityStatus)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              >
                <option value="planned">Planned (Scheduled)</option>
                <option value="in_progress">In Progress (Active)</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
              Timeline Schedule (Gantt Alignment)
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                  Planned Start Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={plannedStart}
                    onChange={(e) => setPlannedStart(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none"
                  />
                  <Calendar className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                  Planned End Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={plannedEnd}
                    onChange={(e) => setPlannedEnd(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none"
                  />
                  <Calendar className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2 pointer-events-none" />
                </div>
              </div>
            </div>

            {(status === 'in_progress' || status === 'completed') && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-200/60">
                <div>
                  <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                    Actual Start Date
                  </label>
                  <input
                    type="date"
                    value={actualStart}
                    onChange={(e) => setActualStart(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                    Actual End Date
                  </label>
                  <input
                    type="date"
                    value={actualEnd}
                    onChange={(e) => setActualEnd(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Budget & Spend */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Allocated Budget ({company.currency_code}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={budgetMajor}
                  onChange={(e) => setBudgetMajor(e.target.value)}
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
                Actual Cost Incurred ({company.currency_code})
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualCostMajor}
                  onChange={(e) => setActualCostMajor(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
                <DollarSign className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                {new Money(Math.round((parseFloat(actualCostMajor) || 0) * 100), company.currency_code).format()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
              Description &amp; Deliverables
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key deliverables, target personas, venue or platform details..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
              Outcome &amp; Field Notes
            </label>
            <textarea
              rows={2}
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Key leads gained, customer reactions, blockers, or lessons learned..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            />
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
              {activityToEdit ? 'Save Activity' : 'Add Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
