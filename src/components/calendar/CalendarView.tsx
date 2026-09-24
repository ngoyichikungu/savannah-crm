import React, { useState, useEffect, useMemo } from 'react';
import { CalendarReminderService } from '../../services/calendarReminderService';
import { StorageService } from '../../services/storageService';
import { CalendarEvent, CalendarEventStatus, CalendarEventType, Company, User } from '../../types';
import { EventModal } from './EventModal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Video,
  Bell,
  Search,
  Users,
  Building2,
  Trash2,
  Edit2,
  CheckSquare,
} from 'lucide-react';

interface CalendarViewProps {
  company: Company;
  currentUser: User;
  onNavigateTab?: (tab: any) => void;
  selectedEventId?: string | null;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  company,
  currentUser,
  onNavigateTab: _onNavigateTab,
  selectedEventId: initialSelectedEventId,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda' | 'list'>('month');
  const [selectedEventType, setSelectedEventType] = useState<CalendarEventType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<CalendarEventStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);

  // Selected event for quick inspector
  const [inspectedEventId, setInspectedEventId] = useState<string | null>(
    initialSelectedEventId || null
  );

  const [eventsTick, setEventsTick] = useState(0);

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setEventsTick((prev) => prev + 1);
    });
    return () => unsub();
  }, []);

  const organisations = useMemo(() => StorageService.getOrganisations(), [eventsTick, company.id]);
  const orgMap = useMemo(() => new Map(organisations.map((o) => [o.id, o.name])), [organisations]);
  const contacts = useMemo(() => StorageService.getContacts(), [eventsTick, company.id]);
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, `${c.first_name} ${c.last_name}`])), [contacts]);

  // Filtered Events
  const events = useMemo(() => {
    return CalendarReminderService.getEvents({
      companyId: company.id,
      eventType: selectedEventType,
      status: selectedStatus,
      searchQuery,
    });
  }, [company.id, selectedEventType, selectedStatus, searchQuery, eventsTick]);

  // Active Reminders Count
  const activeReminders = useMemo(() => {
    return CalendarReminderService.getActiveReminders(company.id);
  }, [company.id, eventsTick]);

  // Month Grid computation
  const monthGrid = useMemo(() => {
    return CalendarReminderService.getMonthGrid(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      company.id
    );
  }, [currentDate, company.id, eventsTick]);

  // Agenda computation
  const agendaList = useMemo(() => {
    return CalendarReminderService.getAgenda(selectedDateStr, 7, company.id);
  }, [selectedDateStr, company.id, eventsTick]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().substring(0, 10));
  };

  // CRUD actions
  const handleCreateNew = (dateStr?: string) => {
    setEventToEdit(null);
    if (dateStr) setSelectedDateStr(dateStr);
    setIsModalOpen(true);
  };

  const handleEdit = (event: CalendarEvent) => {
    setEventToEdit(event);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (savedEvent: CalendarEvent) => {
    StorageService.saveCalendarEvent(savedEvent);
    setIsModalOpen(false);
    setEventToEdit(null);
    setInspectedEventId(savedEvent.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this scheduled client activity?')) {
      StorageService.deleteCalendarEvent(id);
      if (inspectedEventId === id) setInspectedEventId(null);
    }
  };

  const handleToggleStatus = (event: CalendarEvent) => {
    const nextStatus: CalendarEventStatus = event.status === 'completed' ? 'scheduled' : 'completed';
    StorageService.saveCalendarEvent({
      ...event,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    });
  };

  const inspectedEvent = useMemo(() => {
    if (!inspectedEventId) return null;
    return StorageService.getCalendarEventById(inspectedEventId);
  }, [inspectedEventId, eventsTick, company.id]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics & Quick Action Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-black text-stone-900 tracking-tight">
                  Client Activities &amp; Meeting Calendar
                </h1>
                <p className="text-xs text-stone-500 font-medium">
                  Centralized scheduling, client touchpoints, follow-up agendas, and timely reminders
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Buttons */}
            <div className="bg-stone-100 p-1 rounded-xl flex items-center border border-stone-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'month'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Month Grid
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'agenda'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                7-Day Agenda
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Activities ({events.length})
              </button>
            </div>

            <button
              onClick={() => handleCreateNew(selectedDateStr)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Activity</span>
            </button>
          </div>
        </div>

        {/* Filters and Navigation Row */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Calendar Month Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-stone-900 min-w-[150px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="ml-2 text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors"
            >
              Today
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search meetings, clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 sm:w-52"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value as any)}
              className="text-xs rounded-xl border border-stone-300 py-1.5 px-2 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="all">All Event Types</option>
              <option value="meeting">Meetings</option>
              <option value="client_call">Calls</option>
              <option value="site_visit">Site Visits</option>
              <option value="proposal_presentation">Proposals &amp; Demos</option>
              <option value="payment_reminder">Payment Follow-ups</option>
              <option value="contract_review">SLA Reviews</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="text-xs rounded-xl border border-stone-300 py-1.5 px-2 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Calendar Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Month Grid or Agenda View */}
        <div className="lg:col-span-3 space-y-4">
          {viewMode === 'month' && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-200 text-center text-[11px] font-black text-stone-500 uppercase tracking-wider py-2.5">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Month Weeks */}
              <div className="divide-y divide-stone-100">
                {monthGrid.weeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-cols-7 divide-x divide-stone-100 min-h-[95px] sm:min-h-[115px]">
                    {week.map((day) => {
                      const isSelected = day.date === selectedDateStr;
                      return (
                        <div
                          key={day.date}
                          onClick={() => {
                            setSelectedDateStr(day.date);
                            if (day.events.length > 0) {
                              setInspectedEventId(day.events[0].id);
                            }
                          }}
                          className={`p-1.5 sm:p-2 transition-colors cursor-pointer flex flex-col justify-between ${
                            !day.isCurrentMonth
                              ? 'bg-stone-50/50 text-stone-400'
                              : 'bg-white hover:bg-stone-50/80 text-stone-800'
                          } ${isSelected ? 'ring-2 ring-emerald-600 ring-inset bg-emerald-50/20' : ''}`}
                        >
                          {/* Day Number and Badges */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                day.isToday
                                  ? 'bg-emerald-700 text-white font-black'
                                  : 'text-stone-700'
                              }`}
                            >
                              {day.dayOfMonth}
                            </span>

                            {day.events.length > 0 && (
                              <span className="text-[10px] font-mono font-bold text-stone-400">
                                {day.events.length}
                              </span>
                            )}
                          </div>

                          {/* Day Events Pills */}
                          <div className="mt-1 space-y-1 overflow-hidden">
                            {day.events.slice(0, 3).map((evt) => {
                              const isCompleted = evt.status === 'completed';
                              const orgName = evt.organisation_id ? orgMap.get(evt.organisation_id) : '';
                              return (
                                <div
                                  key={evt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectedEventId(evt.id);
                                    setSelectedDateStr(day.date);
                                  }}
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate border transition-colors ${
                                    isCompleted
                                      ? 'bg-stone-100 text-stone-500 border-stone-200 line-through'
                                      : evt.priority === 'urgent'
                                      ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
                                      : evt.event_type === 'meeting'
                                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                                      : evt.event_type === 'proposal_presentation'
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                  title={`${evt.title} ${orgName ? `(${orgName})` : ''}`}
                                >
                                  {new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                                  {evt.title}
                                </div>
                              );
                            })}
                            {day.events.length > 3 && (
                              <div className="text-[9px] font-bold text-stone-400 pl-1">
                                +{day.events.length - 3} more
                              </div>
                            )}
                          </div>

                          {/* Quick Add on Hover/Focus */}
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateNew(day.date);
                              }}
                              title="Add event on this date"
                              className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-[10px] text-stone-400 hover:text-emerald-700"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7-Day Agenda View */}
          {viewMode === 'agenda' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">7-Day Rolling Agenda</h3>
                  <p className="text-xs text-stone-500">Starting from {selectedDateStr}</p>
                </div>
                <input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="text-xs font-bold rounded-lg border border-stone-300 px-3 py-1.5 bg-stone-50 text-stone-900"
                />
              </div>

              <div className="space-y-3">
                {agendaList.map((day) => (
                  <div key={day.date} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">{day.dayOfWeek}</span>
                        <span className="text-xs font-mono text-stone-500">{day.date}</span>
                      </div>
                      <button
                        onClick={() => handleCreateNew(day.date)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                      >
                        + Schedule for {day.dayOfWeek}
                      </button>
                    </div>

                    {day.events.length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-2">
                        No client activities or meetings scheduled for this day.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {day.events.map((evt) => {
                          const orgName = evt.organisation_id ? orgMap.get(evt.organisation_id) : null;
                          const contactName = evt.contact_id ? contactMap.get(evt.contact_id) : null;
                          return (
                            <div
                              key={evt.id}
                              onClick={() => setInspectedEventId(evt.id)}
                              className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all cursor-pointer"
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleStatus(evt);
                                  }}
                                  className={`mt-0.5 ${
                                    evt.status === 'completed'
                                      ? 'text-emerald-600'
                                      : 'text-stone-300 hover:text-stone-500'
                                  }`}
                                >
                                  <CheckSquare className="w-4 h-4" />
                                </button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs font-bold ${
                                        evt.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-900'
                                      }`}
                                    >
                                      {evt.title}
                                    </span>
                                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                                      {evt.event_type.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-3">
                                    <span className="font-mono font-semibold">
                                      {new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                                      {new Date(evt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {orgName && (
                                      <span className="flex items-center gap-1 font-semibold text-stone-700">
                                        <Building2 className="w-3 h-3 text-stone-400" />
                                        {orgName}
                                      </span>
                                    )}
                                    {contactName && (
                                      <span className="flex items-center gap-1 text-stone-600">
                                        <Users className="w-3 h-3 text-stone-400" />
                                        {contactName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(evt);
                                  }}
                                  className="p-1 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(evt.id);
                                  }}
                                  className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List View of All Filtered Events */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-100">
                <h3 className="text-sm font-bold text-stone-900">
                  All Client Activities ({events.length})
                </h3>
              </div>

              {events.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-400">
                  No activities found matching your active filter.
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {events.map((evt) => {
                    const orgName = evt.organisation_id ? orgMap.get(evt.organisation_id) : 'Internal / General';
                    const isCompleted = evt.status === 'completed';
                    return (
                      <div
                        key={evt.id}
                        onClick={() => setInspectedEventId(evt.id)}
                        className="p-4 hover:bg-stone-50/80 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(evt);
                            }}
                            className={`mt-1 ${
                              isCompleted ? 'text-emerald-600' : 'text-stone-300 hover:text-stone-500'
                            }`}
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  isCompleted ? 'line-through text-stone-400' : 'text-stone-900'
                                }`}
                              >
                                {evt.title}
                              </span>
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold">
                                {evt.event_type.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-3 flex-wrap">
                              <span className="font-mono">
                                {evt.start_time.substring(0, 10)} (
                                {new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                                {new Date(evt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                              </span>
                              <span className="font-semibold text-stone-700">{orgName}</span>
                              {evt.location && (
                                <span className="flex items-center gap-1 text-stone-500">
                                  <MapPin className="w-3 h-3" />
                                  {evt.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(evt);
                            }}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(evt.id);
                            }}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Event Inspector & Reminder Panel */}
        <div className="space-y-4">
          {/* Active Reminders Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Reminders Active ({activeReminders.length})
                </h3>
              </div>
            </div>

            {activeReminders.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                No reminders due right now. Automated alerts trigger prior to scheduled meetings.
              </p>
            ) : (
              <div className="space-y-2">
                {activeReminders.map((rem) => {
                  const client = rem.organisation_id ? orgMap.get(rem.organisation_id) : null;
                  return (
                    <div
                      key={rem.id}
                      onClick={() => setInspectedEventId(rem.event_id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        rem.is_overdue
                          ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                          : 'bg-amber-50/70 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span className="font-mono">
                          {new Date(rem.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="uppercase text-[9px] px-1.5 py-0.5 rounded font-black bg-white/70">
                          {rem.is_overdue ? 'Due Now' : `in ${rem.minutes_until_due}m`}
                        </span>
                      </div>
                      <div className="font-bold truncate mt-1">{rem.title}</div>
                      {client && <div className="text-[10px] opacity-80">{client}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Event Details Inspector */}
          {inspectedEvent ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  Event Details
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    inspectedEvent.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {inspectedEvent.status}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-stone-900 leading-snug">
                  {inspectedEvent.title}
                </h4>
                <div className="text-xs text-stone-500 font-mono mt-1">
                  {inspectedEvent.start_time.substring(0, 10)} •{' '}
                  {new Date(inspectedEvent.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {new Date(inspectedEvent.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Client Info */}
              {inspectedEvent.organisation_id && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div className="font-bold text-stone-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>{orgMap.get(inspectedEvent.organisation_id)}</span>
                  </div>
                  {inspectedEvent.contact_id && (
                    <div className="text-stone-600 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>{contactMap.get(inspectedEvent.contact_id)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Location & Video Link */}
              <div className="space-y-2 text-xs">
                {inspectedEvent.location && (
                  <div className="flex items-start gap-2 text-stone-700">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <span>{inspectedEvent.location}</span>
                  </div>
                )}
                {inspectedEvent.meeting_url && (
                  <div className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <a
                      href={inspectedEvent.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:text-emerald-900 font-bold truncate underline"
                    >
                      Join Virtual Meeting →
                    </a>
                  </div>
                )}
              </div>

              {/* Notes */}
              {inspectedEvent.description && (
                <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <div className="font-bold text-stone-700 text-[11px] uppercase mb-1">
                    Agenda / Notes
                  </div>
                  <p className="whitespace-pre-line leading-relaxed">{inspectedEvent.description}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2 border-t border-stone-100">
                <button
                  onClick={() => handleToggleStatus(inspectedEvent)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors ${
                    inspectedEvent.status === 'completed'
                      ? 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  {inspectedEvent.status === 'completed' ? 'Reopen Event' : 'Mark Completed'}
                </button>
                <button
                  onClick={() => handleEdit(inspectedEvent)}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
                  title="Edit details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(inspectedEvent.id)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700"
                  title="Delete event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs text-center text-xs text-stone-400">
              <CalendarIcon className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              Select an activity from the calendar or agenda to view full meeting details, client contacts, and reminders.
            </div>
          )}
        </div>
      </div>

      {/* Schedule / Edit Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEventToEdit(null);
        }}
        onSave={handleSaveEvent}
        eventToEdit={eventToEdit}
        defaultDate={selectedDateStr}
        company={company}
        currentUser={currentUser}
      />
    </div>
  );
};
