import React, { useState, useEffect } from 'react';
import { CalendarReminderService } from '../../services/calendarReminderService';
import { StorageService } from '../../services/storageService';
import { ClientReminder, Company } from '../../types';
import { Bell, Clock, Calendar, X, AlertTriangle } from 'lucide-react';

interface ReminderBannerProps {
  company: Company;
  onOpenCalendar: () => void;
  onSelectEvent?: (eventId: string) => void;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  company,
  onOpenCalendar,
  onSelectEvent,
}) => {
  const [reminders, setReminders] = useState<ClientReminder[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const refreshReminders = () => {
    const list = CalendarReminderService.getActiveReminders(company.id);
    setReminders(list.filter((r) => !r.is_dismissed));
  };

  useEffect(() => {
    refreshReminders();
    const interval = setInterval(refreshReminders, 15000); // Check every 15s
    const unsubscribe = StorageService.subscribe(refreshReminders);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [company.id]);

  if (reminders.length === 0) return null;

  const topReminder = reminders[0];
  const organisations = StorageService.getOrganisations();
  const orgMap = new Map(organisations.map((o) => [o.id, o.name]));

  const handleDismiss = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    StorageService.dismissEventReminder(eventId);
    refreshReminders();
  };

  const orgName = topReminder.organisation_id ? orgMap.get(topReminder.organisation_id) : null;

  return (
    <div className="no-print bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white border-b border-amber-600 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Reminder Alert Main */}
          <div
            onClick={onOpenCalendar}
            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
          >
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-black tracking-wider bg-black/20 px-2 py-0.5 rounded-full">
                  Upcoming Activity Reminder
                </span>
                {topReminder.is_overdue && (
                  <span className="text-[10px] uppercase font-black tracking-wider bg-rose-900/60 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-300" />
                    Due Now
                  </span>
                )}
                <span className="text-xs font-mono font-bold text-amber-100">
                  {new Date(topReminder.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-xs font-bold truncate mt-0.5 text-white">
                {topReminder.title} {orgName && <span className="opacity-80 font-normal">({orgName})</span>}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {reminders.length > 1 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[11px] font-bold bg-white/15 hover:bg-white/25 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              >
                +{reminders.length - 1} more
              </button>
            )}

            <button
              onClick={onOpenCalendar}
              className="text-[11px] font-bold bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-lg transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              View Calendar
            </button>

            <button
              onClick={(e) => handleDismiss(e, topReminder.event_id)}
              title="Dismiss reminder"
              className="text-[11px] font-bold bg-black/20 hover:bg-black/30 text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded Drawer for multiple reminders */}
        {isExpanded && reminders.length > 1 && (
          <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5 animate-in fade-in duration-150">
            {reminders.slice(1).map((r) => {
              const client = r.organisation_id ? orgMap.get(r.organisation_id) : null;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-xs bg-black/15 p-2 rounded-lg gap-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Clock className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                    <span className="font-mono text-amber-200 font-semibold">
                      {new Date(r.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-medium truncate">{r.title}</span>
                    {client && <span className="opacity-75 text-[11px]">({client})</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        if (onSelectEvent) onSelectEvent(r.event_id);
                        onOpenCalendar();
                      }}
                      className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded cursor-pointer"
                    >
                      Open
                    </button>
                    <button
                      onClick={(e) => handleDismiss(e, r.event_id)}
                      className="text-[10px] font-bold hover:text-amber-200 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
