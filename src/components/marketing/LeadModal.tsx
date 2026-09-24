import React, { useState, useEffect } from 'react';
import { Company, Lead, LeadSource, LeadStatus, MarketingActivity, User } from '../../types';
import { StorageService } from '../../services/storageService';
import { Money } from '../../support/money';
import { X, UserCheck, DollarSign, Building2, User as UserIcon } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  leadToEdit?: Lead | null;
  defaultActivityId?: string;
  activities: MarketingActivity[];
  company: Company;
  currentUser: User;
}

const ALL_SOURCES: LeadSource[] = [
  'field_visit',
  'cold_call',
  'email_campaign',
  'whatsapp',
  'social',
  'radio',
  'print',
  'exhibition',
  'referral_drive',
  'website',
  'other',
];

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  leadToEdit,
  defaultActivityId,
  activities,
  company,
  currentUser,
}) => {
  const [title, setTitle] = useState('');
  const [organisationId, setOrganisationId] = useState('');
  const [contactId, setContactId] = useState('');
  const [source, setSource] = useState<LeadSource>('exhibition');
  const [sourceDetail, setSourceDetail] = useState('');
  const [marketingActivityId, setMarketingActivityId] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [estimatedValueMajor, setEstimatedValueMajor] = useState('25000');
  const [error, setError] = useState<string | null>(null);

  const organisations = StorageService.getOrganisations();
  const contacts = StorageService.getContacts(organisationId || undefined);

  useEffect(() => {
    if (leadToEdit) {
      setTitle(leadToEdit.title);
      setOrganisationId(leadToEdit.organisation_id || '');
      setContactId(leadToEdit.contact_id || '');
      setSource(leadToEdit.source || 'exhibition');
      setSourceDetail(leadToEdit.source_detail || '');
      setMarketingActivityId(leadToEdit.marketing_activity_id || '');
      setStatus(leadToEdit.status);
      setEstimatedValueMajor(((leadToEdit.estimated_value_minor || 0) / 100).toString());
    } else {
      setTitle('');
      setOrganisationId(organisations[0]?.id || '');
      setContactId('');
      setSource('exhibition');
      setSourceDetail('');
      setMarketingActivityId(defaultActivityId || activities[0]?.id || '');
      setStatus('new');
      setEstimatedValueMajor('25000');
    }
    setError(null);
  }, [leadToEdit, defaultActivityId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Lead title is required.');
      return;
    }

    const estMinor = Math.round((parseFloat(estimatedValueMajor) || 0) * 100);

    const now = new Date().toISOString();
    const lead: Lead = {
      id: leadToEdit ? leadToEdit.id : `lead_${Date.now()}`,
      company_id: company.id,
      organisation_id: organisationId || undefined,
      contact_id: contactId || undefined,
      title: title.trim(),
      source,
      source_detail: sourceDetail.trim() || undefined,
      marketing_activity_id: marketingActivityId || undefined,
      status,
      estimated_value_minor: estMinor,
      assigned_user_id: leadToEdit ? leadToEdit.assigned_user_id : currentUser.id,
      created_at: leadToEdit ? leadToEdit.created_at : now,
      updated_at: now,
    };

    onSave(lead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700 text-white rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {leadToEdit ? 'Edit Lead Attribution' : 'Capture & Attribute New Lead'}
              </h2>
              <p className="text-xs text-stone-500">Link customer opportunity to campaign activity</p>
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
              Opportunity / Deal Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Copper Mining ERP Upgrade Contract"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
              Marketing Campaign Attribution
            </span>
            <div>
              <label className="block text-[10px] font-semibold text-stone-700 mb-1">
                Attributed Marketing Activity *
              </label>
              <select
                value={marketingActivityId}
                onChange={(e) => setMarketingActivityId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-stone-800 focus:outline-none"
              >
                <option value="">-- No Direct Campaign Activity --</option>
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.name} ({act.channel})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-stone-700 mb-1">
                  Lead Channel Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as LeadSource)}
                  className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                >
                  {ALL_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-700 mb-1">
                  Source Specific Detail
                </label>
                <input
                  type="text"
                  value={sourceDetail}
                  onChange={(e) => setSourceDetail(e.target.value)}
                  placeholder="Booth #12, Direct WhatsApp, etc."
                  className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Client Organisation
              </label>
              <div className="relative">
                <select
                  value={organisationId}
                  onChange={(e) => {
                    setOrganisationId(e.target.value);
                    setContactId('');
                  }}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                >
                  <option value="">-- Select Organisation --</option>
                  {organisations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Primary Contact
              </label>
              <div className="relative">
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                >
                  <option value="">-- Select Contact --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} {c.job_title ? `(${c.job_title})` : ''}
                    </option>
                  ))}
                </select>
                <UserIcon className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Estimated Deal Value ({company.currency_code})
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedValueMajor}
                  onChange={(e) => setEstimatedValueMajor(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
                <DollarSign className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                {new Money(Math.round((parseFloat(estimatedValueMajor) || 0) * 100), company.currency_code).format()}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Sales Pipeline Stage
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              >
                <option value="new">New (Uncontacted)</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal Sent</option>
                <option value="won">Won (Deal Closed)</option>
                <option value="lost">Lost</option>
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
              {leadToEdit ? 'Save Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
