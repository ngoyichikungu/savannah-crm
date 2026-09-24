import { StorageService } from './storageService';
import { CalendarEvent, CalendarEventStatus, CalendarEventType, ClientReminder, ReminderLeadTimeMinutes } from '../types';

export interface CalendarFilterOptions {
  companyId?: string;
  eventType?: CalendarEventType | 'all';
  status?: CalendarEventStatus | 'all';
  organisationId?: string;
  leadId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  searchQuery?: string;
}

export interface DayAgenda {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  events: CalendarEvent[];
}

export class CalendarReminderService {
  /**
   * Retrieves all calendar events for a company matching given filters.
   */
  public static getEvents(filters?: CalendarFilterOptions): CalendarEvent[] {
    const company = StorageService.getCurrentCompany();
    const compId = filters?.companyId || company?.id;
    let events = StorageService.getCalendarEvents({ companyId: compId });

    if (filters) {
      if (filters.eventType && filters.eventType !== 'all') {
        events = events.filter((e) => e.event_type === filters.eventType);
      }
      if (filters.status && filters.status !== 'all') {
        events = events.filter((e) => e.status === filters.status);
      }
      if (filters.organisationId) {
        events = events.filter((e) => e.organisation_id === filters.organisationId);
      }
      if (filters.leadId) {
        events = events.filter((e) => e.lead_id === filters.leadId);
      }
      if (filters.startDate) {
        events = events.filter((e) => e.start_time.substring(0, 10) >= filters.startDate!);
      }
      if (filters.endDate) {
        events = events.filter((e) => e.start_time.substring(0, 10) <= filters.endDate!);
      }
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        events = events.filter(
          (e) =>
            e.title.toLowerCase().includes(query) ||
            (e.description && e.description.toLowerCase().includes(query)) ||
            (e.location && e.location.toLowerCase().includes(query))
        );
      }
    }

    return events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  /**
   * Computes active and upcoming client reminders based on current system time or custom reference time.
   */
  public static getActiveReminders(companyId?: string, referenceTimeIso?: string): ClientReminder[] {
    const compId = companyId || StorageService.getCurrentCompany()?.id;
    const now = referenceTimeIso ? new Date(referenceTimeIso) : new Date();
    const nowMs = now.getTime();

    const events = StorageService.getCalendarEvents({ companyId: compId })
      .filter((e) => e.status === 'scheduled');

    const reminders: ClientReminder[] = [];

    for (const evt of events) {
      const eventTimeMs = new Date(evt.start_time).getTime();
      const leadTimes: ReminderLeadTimeMinutes[] = evt.reminder_minutes_before && evt.reminder_minutes_before.length > 0
        ? evt.reminder_minutes_before
        : [15]; // Default 15m lead time

      for (const mins of leadTimes) {
        const remindAtMs = eventTimeMs - mins * 60 * 1000;
        const remindAtDate = new Date(remindAtMs).toISOString();

        // Reminder window: triggered if now >= remindAtMs AND not yet dismissed AND event has not passed more than 2 hours ago
        const minutesDiff = Math.round((eventTimeMs - nowMs) / (60 * 1000));
        const isDue = nowMs >= remindAtMs;
        const isOverdue = nowMs > eventTimeMs;
        const hasPassedLongAgo = nowMs > eventTimeMs + 2 * 60 * 60 * 1000;

        if (isDue && !hasPassedLongAgo) {
          reminders.push({
            id: `rem_${evt.id}_${mins}`,
            event_id: evt.id,
            company_id: evt.company_id,
            title: evt.title,
            event_type: evt.event_type,
            scheduled_time: evt.start_time,
            remind_at: remindAtDate,
            organisation_id: evt.organisation_id,
            contact_id: evt.contact_id,
            lead_id: evt.lead_id,
            is_due: isDue,
            is_overdue: isOverdue,
            minutes_until_due: minutesDiff,
            is_dismissed: !!evt.is_reminder_dismissed,
          });
        }
      }
    }

    // Sort by soonest scheduled time
    return reminders.sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  }

  /**
   * Groups events into a calendar month grid with days, weeks, and indicators.
   */
  public static getMonthGrid(year: number, monthZeroIndexed: number, companyId?: string): {
    year: number;
    month: number;
    weeks: {
      date: string; // YYYY-MM-DD
      dayOfMonth: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEvent[];
    }[][];
  } {
    const compId = companyId || StorageService.getCurrentCompany()?.id;
    const events = StorageService.getCalendarEvents({ companyId: compId });
    const todayStr = new Date().toISOString().substring(0, 10);

    const firstDay = new Date(year, monthZeroIndexed, 1);
    const lastDay = new Date(year, monthZeroIndexed + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 for Sunday
    const totalDaysInMonth = lastDay.getDate();

    // Map events by date (YYYY-MM-DD)
    const eventMap = new Map<string, CalendarEvent[]>();
    for (const evt of events) {
      const dateKey = evt.start_time.substring(0, 10);
      if (!eventMap.has(dateKey)) {
        eventMap.set(dateKey, []);
      }
      eventMap.get(dateKey)!.push(evt);
    }

    const weeks: {
      date: string;
      dayOfMonth: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEvent[];
    }[][] = [];

    let currentWeek: {
      date: string;
      dayOfMonth: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEvent[];
    }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, monthZeroIndexed, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = monthZeroIndexed === 0 ? 11 : monthZeroIndexed - 1;
      const prevYear = monthZeroIndexed === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      currentWeek.push({
        date: dateStr,
        dayOfMonth: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: eventMap.get(dateStr) || [],
      });
    }

    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(monthZeroIndexed + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      currentWeek.push({
        date: dateStr,
        dayOfMonth: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: eventMap.get(dateStr) || [],
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Next month padding
    let nextMonthDay = 1;
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      const nextMonth = monthZeroIndexed === 11 ? 0 : monthZeroIndexed + 1;
      const nextYear = monthZeroIndexed === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`;
      currentWeek.push({
        date: dateStr,
        dayOfMonth: nextMonthDay,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: eventMap.get(dateStr) || [],
      });
      nextMonthDay++;
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return {
      year,
      month: monthZeroIndexed,
      weeks,
    };
  }

  /**
   * Builds an agenda grouped by day for a given date range.
   */
  public static getAgenda(startDateStr: string, daysCount: number = 7, companyId?: string): DayAgenda[] {
    const compId = companyId || StorageService.getCurrentCompany()?.id;
    const events = StorageService.getCalendarEvents({ companyId: compId });
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const start = new Date(startDateStr);
    const result: DayAgenda[] = [];

    for (let i = 0; i < daysCount; i++) {
      const cur = new Date(start.getTime() + i * 86400000);
      const dateStr = cur.toISOString().substring(0, 10);
      const dayOfWeek = dayNames[cur.getDay()];
      const dayEvents = events.filter((e) => e.start_time.substring(0, 10) === dateStr);

      result.push({
        date: dateStr,
        dayOfWeek,
        events: dayEvents,
      });
    }

    return result;
  }
}
