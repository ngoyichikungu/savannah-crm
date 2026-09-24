import React, { useState } from 'react';
import { ActivityResult, Company, MarketingActivity, User } from '../../types';
import { Money } from '../../support/money';
import { X, Award, Calendar, DollarSign, Users, PhoneCall, FileText } from 'lucide-react';

interface RecordResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (result: ActivityResult) => void;
  activity: MarketingActivity;
  company: Company;
  currentUser: User;
}

export const RecordResultModal: React.FC<RecordResultModalProps> = ({
  isOpen,
  onClose,
  onSave,
  activity,
  company,
  currentUser,
}) => {
  const [leadsGenerated, setLeadsGenerated] = useState('5');
  const [contactsMade, setContactsMade] = useState('15');
  const [quotationsIssued, setQuotationsIssued] = useState('2');
  const [revenueMajor, setRevenueMajor] = useState('0');
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 10));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const revMinor = Math.round((parseFloat(revenueMajor) || 0) * 100);

    const now = new Date().toISOString();
    const result: ActivityResult = {
      id: `res_${Date.now()}`,
      company_id: company.id,
      marketing_activity_id: activity.id,
      leads_generated: parseInt(leadsGenerated) || 0,
      contacts_made: parseInt(contactsMade) || 0,
      quotations_issued: parseInt(quotationsIssued) || 0,
      revenue_attributed_minor: revMinor,
      recorded_at: recordedAt ? `${recordedAt}T12:00:00Z` : now,
      recorded_by_user_id: currentUser.id,
      created_at: now,
      updated_at: now,
    };

    onSave(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700 text-white rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Log Activity Results</h2>
              <p className="text-xs text-stone-500 font-medium text-emerald-800">{activity.name}</p>
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
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
              Measurement Date *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              />
              <Calendar className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Leads Generated
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  value={leadsGenerated}
                  onChange={(e) => setLeadsGenerated(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
                <Users className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Contacts / Touchpoints
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  value={contactsMade}
                  onChange={(e) => setContactsMade(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
                <PhoneCall className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Quotations Issued
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  value={quotationsIssued}
                  onChange={(e) => setQuotationsIssued(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
                <FileText className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Attributed Revenue ({company.currency_code})
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={revenueMajor}
                  onChange={(e) => setRevenueMajor(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
                <DollarSign className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                {new Money(Math.round((parseFloat(revenueMajor) || 0) * 100), company.currency_code).format()}
              </span>
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
              Log Results
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
