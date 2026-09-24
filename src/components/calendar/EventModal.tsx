import React, { useState, useEffect } from 'react';
import { CalendarEvent, CalendarEventStatus, CalendarEventType, Company, User } from '../../types';
import { StorageService } from '../../services/storageService';
import { X, Calendar, Clock, MapPin, Video, AlertCircle } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  eventToEdit?: CalendarEvent | null;
  defaultDate?: string; // YYYY-MM-DD
  company: Company;
  currentUser: User;
}

const EVENT_TYPES: { id: CalendarEventType; label: string; desc: string }[] = [
  { id: 'meeting', label: 'Client Meeting', desc: 'In-person or general client meeting' },
  { id: 'client_call', label: 'Client Call', desc: 'Discovery, check-in, or follow-up phone call' },
  { id: 'site_visit', label: 'Site Inspection / Visit', desc: 'Engineering, audit, or physical site visit' },
  { id: 'proposal_presentation', label: 'Proposal & Demo Walkthrough', desc: 'Quotation walkthrough or product demo' },
  { id: 'payment_reminder', label: 'Payment Collection Touchpoint', desc: 'Invoice payment follow-up or reconciliation' },
  { id: 'contract_review', label: 'Contract & SLA Review', desc: 'SLA evaluation or agreement signing' },
  { id: 'follow_up', label: 'General Follow-up', desc: 'Routine account management follow-up' },
  { id: 'other', label: 'Other Activity', desc: 'Custom business operation event' },
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  eventToEdit,
  defaultDate,
  company,
  currentUser,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('meeting');
  const [organisationId, setOrganisationId] = useState('');
  const [contactId, setContactId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [status, setStatus] = useState<CalendarEventStatus>('scheduled');
  const [reminder15, setReminder15] = useState(true);
  const [reminder60, setReminder60] = useState(true);
  const [reminder1Day, setReminder1Day] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organisations = StorageService.getOrganisations();
  const contacts = StorageService.getContacts(organisationId || undefined);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || '');
      setEventType(eventToEdit.event_type);
      setOrganisationId(eventToEdit.organisation_id || '');
      setContactId(eventToEdit.contact_id || '');

      const start = new Date(eventToEdit.start_time);
      const end = new Date(eventToEdit.end_time);
      setStartDate(eventToEdit.start_time.substring(0, 10));
      setStartTime(start.toTimeString().substring(0, 5));
      setEndDate(eventToEdit.end_time.substring(0, 10));
      setEndTime(end.toTimeString().substring(0, 5));

      setLocation(eventToEdit.location || '');
      setMeetingUrl(eventToEdit.meeting_url || '');
      setPriority(eventToEdit.priority || 'medium');
      setStatus(eventToEdit.status);

      const reminders = eventToEdit.reminder_minutes_before || [];
      setReminder15(reminders.includes(15));
      setReminder60(reminders.includes(60));
      setReminder1Day(reminders.includes(1440));
    } else {
      const today = defaultDate || new Date().toISOString().substring(0, 10);
      setTitle('');
      setDescription('');
      setEventType('meeting');
      setOrganisationId(organisations[0]?.id || '');
      setContactId('');
      setStartDate(today);
      setStartTime('10:00');
      setEndDate(today);
      setEndTime('11:00');
      setLocation('');
      setMeetingUrl('');
      setPriority('medium');
      setStatus('scheduled');
      setReminder15(true);
      setReminder60(true);
      setReminder1Day(false);
    }
    setError(null);
  }, [eventToEdit, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Event title is required.');
      return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Please provide valid start and end dates and times.');
      return;
    }

    const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endIso = new Date(`${endDate}T${endTime}:00`).toISOString();

    if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
      setError('Event end time cannot be before start time.');
      return;
    }

    const reminders: (0 | 15 | 30 | 60 | 1440 | 2880)[] = [];
    if (reminder15) reminders.push(15);
    if (reminder60) reminders.push(60);
    if (reminder1Day) reminders.push(1440);

    const eventPayload: CalendarEvent = {
      id: eventToEdit ? eventToEdit.id : `evt_${Date.now()}`,
      company_id: company.id,
      title: title.trim(),
      description: description.trim() || undefined,
      event_type: eventType,
      organisation_id: organisationId || undefined,
      contact_id: contactId || undefined,
      start_time: startIso,
      end_time: endIso,
      location: location.trim() || undefined,
      meeting_url: meetingUrl.trim() || undefined,
      status,
      priority,
      assigned_user_id: currentUser.id,
      reminder_minutes_before: reminders,
      is_reminder_dismissed: eventToEdit ? eventToEdit.is_reminder_dismissed : false,
      created_at: eventToEdit ? eventToEdit.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(eventPayload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {eventToEdit ? 'Edit Client Activity' : 'Schedule Client Activity / Meeting'}
              </h2>
              <p className="text-xs text-stone-500">
                Sync meetings, follow-ups, calls, and configure automated reminders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Activity Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Cloud Infrastructure Strategy & Billing Review"
              className="w-full text-xs font-medium rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Activity Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Activity Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                className="w-full text-xs font-medium rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs font-medium rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Client Organisation & Contact Linkage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Client Organisation
              </label>
              <select
                value={organisationId}
                onChange={(e) => {
                  setOrganisationId(e.target.value);
                  setContactId('');
                }}
                className="w-full text-xs font-medium rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- None / Internal --</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Primary Contact
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                disabled={!organisationId}
                className="w-full text-xs font-medium rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-50"
              >
                <option value="">-- Select Contact Person --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.job_title || 'Contact'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule: Start & End */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Event Timing</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate || endDate < e.target.value) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full text-xs rounded-lg border border-stone-300 px-2.5 py-1.5 bg-white text-stone-900"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-xs rounded-lg border border-stone-300 px-2.5 py-1.5 bg-white text-stone-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-stone-300 px-2.5 py-1.5 bg-white text-stone-900"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-xs rounded-lg border border-stone-300 px-2.5 py-1.5 bg-white text-stone-900"
                  required
                />
              </div>
            </div>
          </div>

          {/* Location & Video Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-stone-500" />
                Physical Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Arcades Office Park, Lusaka"
                className="w-full text-xs font-medium rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Video className="w-3 h-3 text-stone-500" />
                Online Meeting Link
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full text-xs font-medium rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Reminder Preferences */}
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
            <span className="block text-xs font-bold text-emerald-950 mb-2">
              Automated Client Reminders
            </span>
            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-700">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder15}
                  onChange={(e) => setReminder15(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span>15 minutes before</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder60}
                  onChange={(e) => setReminder60(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span>1 hour before</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder1Day}
                  onChange={(e) => setReminder1Day(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span>24 hours before</span>
              </label>
            </div>
          </div>

          {/* Status (if editing) */}
          {eventToEdit && (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Event Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CalendarEventStatus)}
                className="w-full text-xs font-medium rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="scheduled">Scheduled / Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
            </div>
          )}

          {/* Description & Agenda Notes */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Agenda &amp; Discussion Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline deliverables, key attendees, or topics to be discussed..."
              className="w-full text-xs font-medium rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors"
            >
              {eventToEdit ? 'Save Changes' : 'Schedule Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
