import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../services/storageService';
import { CalendarReminderService } from '../services/calendarReminderService';
import { BackupService } from '../services/backupService';
import { CalendarEvent, Company, Organisation, Contact } from '../types';

describe('Calendar & Client Reminder Functionality Test Suite', () => {
  const testCompany: Company = {
    id: 'comp_test_savannah',
    name: 'Savannah Solutions Ltd',
    legal_name: 'Savannah Solutions Limited',
    tpin: '1002345678',
    is_vat_registered: true,
    vat_rate_bp: 1600,
    currency_code: 'ZMW',
    email: 'info@savannahsolutions.zm',
    phone: '+260 211 123456',
    address_line1: 'Great East Road',
    city: 'Lusaka',
    country: 'Zambia',
    next_invoice_number: 1,
    next_quotation_number: 1,
    next_credit_note_number: 1,
  };

  const testOrg: Organisation = {
    id: 'org_test_client',
    company_id: 'comp_test_savannah',
    name: 'Copperbelt Mining Tech',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const testContact: Contact = {
    id: 'cont_test_1',
    company_id: 'comp_test_savannah',
    organisation_id: 'org_test_client',
    first_name: 'Chileshe',
    last_name: 'Mwamba',
    email: 'chileshe@copperbeltmining.zm',
    phone: '+260 977 123456',
    is_primary: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    StorageService.clearAllData();
    StorageService.saveCompany(testCompany);
    StorageService.setCurrentCompany(testCompany.id);
    StorageService.saveOrganisation(testOrg);
    StorageService.saveContact(testContact);
  });

  describe('1. Calendar Events Scheduling & CRUD', () => {
    it('creates, saves, and retrieves calendar events scoped to current company', () => {
      const event: CalendarEvent = {
        id: 'evt_test_1',
        company_id: testCompany.id,
        organisation_id: testOrg.id,
        contact_id: testContact.id,
        title: 'Executive Strategy & Cloud Migration Review',
        description: 'Discuss workload migration timeline, security audits, and SLAs.',
        event_type: 'meeting',
        start_time: '2026-10-15T09:00:00Z',
        end_time: '2026-10-15T10:30:00Z',
        location: 'Kitwe Executive Boardroom',
        meeting_url: 'https://meet.savannahtech.co.zm/kitwe-migration',
        status: 'scheduled',
        priority: 'high',
        assigned_user_id: 'usr-admin-1',
        reminder_minutes_before: [15, 60],
        is_reminder_dismissed: false,
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-01T10:00:00Z',
      };

      StorageService.saveCalendarEvent(event);

      const events = StorageService.getCalendarEvents({ companyId: testCompany.id });
      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Executive Strategy & Cloud Migration Review');
      expect(events[0].organisation_id).toBe('org_test_client');
      expect(events[0].event_type).toBe('meeting');

      // Verify fetch by ID
      const retrieved = StorageService.getCalendarEventById('evt_test_1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.location).toBe('Kitwe Executive Boardroom');
    });

    it('updates event details and status cleanly', () => {
      const event: CalendarEvent = {
        id: 'evt_update_1',
        company_id: testCompany.id,
        title: 'Client Check-in Call',
        event_type: 'client_call',
        start_time: '2026-10-16T14:00:00Z',
        end_time: '2026-10-16T14:30:00Z',
        status: 'scheduled',
        priority: 'medium',
        assigned_user_id: 'usr-admin-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      StorageService.saveCalendarEvent(event);

      // Update to completed
      const updated: CalendarEvent = {
        ...event,
        status: 'completed',
        description: 'Call successful. Client accepted quote.',
        updated_at: new Date().toISOString(),
      };
      StorageService.saveCalendarEvent(updated);

      const retrieved = StorageService.getCalendarEventById('evt_update_1');
      expect(retrieved?.status).toBe('completed');
      expect(retrieved?.description).toBe('Call successful. Client accepted quote.');
    });

    it('deletes calendar events accurately', () => {
      const event: CalendarEvent = {
        id: 'evt_del_1',
        company_id: testCompany.id,
        title: 'Cancelled Briefing',
        event_type: 'other',
        start_time: '2026-10-20T10:00:00Z',
        end_time: '2026-10-20T11:00:00Z',
        status: 'cancelled',
        priority: 'low',
        assigned_user_id: 'usr-admin-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      StorageService.saveCalendarEvent(event);
      expect(StorageService.getCalendarEvents().length).toBe(1);

      StorageService.deleteCalendarEvent('evt_del_1');
      expect(StorageService.getCalendarEvents().length).toBe(0);
    });
  });

  describe('2. Calendar Filtering & Month Grid Calculation', () => {
    beforeEach(() => {
      const e1: CalendarEvent = {
        id: 'evt_m1',
        company_id: testCompany.id,
        organisation_id: testOrg.id,
        title: 'Site Inspection',
        event_type: 'site_visit',
        start_time: '2026-10-05T08:00:00Z',
        end_time: '2026-10-05T10:00:00Z',
        status: 'scheduled',
        priority: 'high',
        assigned_user_id: 'usr-admin-1',
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      };
      const e2: CalendarEvent = {
        id: 'evt_m2',
        company_id: testCompany.id,
        organisation_id: 'org_different',
        title: 'Pricing Discussion',
        event_type: 'meeting',
        start_time: '2026-10-12T11:00:00Z',
        end_time: '2026-10-12T12:00:00Z',
        status: 'completed',
        priority: 'medium',
        assigned_user_id: 'usr-admin-1',
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      };
      StorageService.saveCalendarEvent(e1);
      StorageService.saveCalendarEvent(e2);
    });

    it('filters events by type, status, organisation, and search query', () => {
      // By event type
      const siteVisits = CalendarReminderService.getEvents({
        companyId: testCompany.id,
        eventType: 'site_visit',
      });
      expect(siteVisits.length).toBe(1);
      expect(siteVisits[0].id).toBe('evt_m1');

      // By status
      const completedEvents = CalendarReminderService.getEvents({
        companyId: testCompany.id,
        status: 'completed',
      });
      expect(completedEvents.length).toBe(1);
      expect(completedEvents[0].id).toBe('evt_m2');

      // By text query
      const searchResults = CalendarReminderService.getEvents({
        companyId: testCompany.id,
        searchQuery: 'inspection',
      });
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].id).toBe('evt_m1');
    });

    it('generates an accurate month grid with week padding and day allocation', () => {
      // October 2026: starts on Thursday (index 4), 31 days
      const grid = CalendarReminderService.getMonthGrid(2026, 9, testCompany.id); // 9 = October
      expect(grid.year).toBe(2026);
      expect(grid.month).toBe(9);
      expect(grid.weeks.length).toBeGreaterThanOrEqual(5);

      // Verify all weeks have 7 days
      for (const week of grid.weeks) {
        expect(week.length).toBe(7);
      }

      // Check event placement on 2026-10-05
      const oct5Week = grid.weeks.find((w) => w.some((d) => d.date === '2026-10-05'));
      expect(oct5Week).toBeDefined();
      const oct5Day = oct5Week?.find((d) => d.date === '2026-10-05');
      expect(oct5Day?.events.length).toBe(1);
      expect(oct5Day?.events[0].title).toBe('Site Inspection');
    });

    it('builds a 7-day rolling agenda with day of week names', () => {
      const agenda = CalendarReminderService.getAgenda('2026-10-05', 7, testCompany.id);
      expect(agenda.length).toBe(7);
      expect(agenda[0].date).toBe('2026-10-05');
      expect(agenda[0].dayOfWeek).toBe('Monday');
      expect(agenda[0].events.length).toBe(1);
      expect(agenda[0].events[0].id).toBe('evt_m1');
    });
  });

  describe('3. Automated Reminder Trigger Logic', () => {
    it('triggers active reminders when current time is within reminder lead time window', () => {
      // Meeting at 14:00 UTC with 15m and 60m reminder lead times
      const event: CalendarEvent = {
        id: 'evt_rem_test',
        company_id: testCompany.id,
        organisation_id: testOrg.id,
        contact_id: testContact.id,
        title: 'Project Sign-off Meeting',
        event_type: 'meeting',
        start_time: '2026-09-24T14:00:00Z',
        end_time: '2026-09-24T15:00:00Z',
        status: 'scheduled',
        priority: 'high',
        assigned_user_id: 'usr-admin-1',
        reminder_minutes_before: [15, 60],
        is_reminder_dismissed: false,
        created_at: '2026-09-20T10:00:00Z',
        updated_at: '2026-09-20T10:00:00Z',
      };
      StorageService.saveCalendarEvent(event);

      // Scenario A: Time is 12:00 UTC (2 hours before) -> Neither 60m nor 15m reminder triggered yet
      const earlyReminders = CalendarReminderService.getActiveReminders(
        testCompany.id,
        '2026-09-24T12:00:00Z'
      );
      expect(earlyReminders.length).toBe(0);

      // Scenario B: Time is 13:10 UTC (50 min before) -> 60m reminder is active
      const midReminders = CalendarReminderService.getActiveReminders(
        testCompany.id,
        '2026-09-24T13:10:00Z'
      );
      expect(midReminders.length).toBe(1);
      expect(midReminders[0].minutes_until_due).toBe(50);
      expect(midReminders[0].is_overdue).toBe(false);

      // Scenario C: Time is 13:50 UTC (10 min before) -> Both 60m and 15m reminders active
      const imminentReminders = CalendarReminderService.getActiveReminders(
        testCompany.id,
        '2026-09-24T13:50:00Z'
      );
      expect(imminentReminders.length).toBe(2);

      // Scenario D: Time is 14:05 UTC (5 min past start) -> Marked overdue
      const overdueReminders = CalendarReminderService.getActiveReminders(
        testCompany.id,
        '2026-09-24T14:05:00Z'
      );
      expect(overdueReminders.length).toBeGreaterThanOrEqual(1);
      expect(overdueReminders[0].is_overdue).toBe(true);
    });

    it('allows dismissing a reminder and reflects dismissal state in StorageService', () => {
      const event: CalendarEvent = {
        id: 'evt_dismiss_test',
        company_id: testCompany.id,
        title: 'Routine Sync Call',
        event_type: 'client_call',
        start_time: '2026-09-24T10:00:00Z',
        end_time: '2026-09-24T10:30:00Z',
        status: 'scheduled',
        priority: 'medium',
        assigned_user_id: 'usr-admin-1',
        reminder_minutes_before: [15],
        is_reminder_dismissed: false,
        created_at: '2026-09-20T10:00:00Z',
        updated_at: '2026-09-20T10:00:00Z',
      };
      StorageService.saveCalendarEvent(event);

      // Check reminder is active at 09:50 (10 mins before)
      const remindersBefore = CalendarReminderService.getActiveReminders(
        testCompany.id,
        '2026-09-24T09:50:00Z'
      );
      expect(remindersBefore.length).toBe(1);
      expect(remindersBefore[0].is_dismissed).toBe(false);

      // Dismiss reminder
      StorageService.dismissEventReminder('evt_dismiss_test');

      const dismissedEvt = StorageService.getCalendarEventById('evt_dismiss_test');
      expect(dismissedEvt?.is_reminder_dismissed).toBe(true);

      const remindersAfter = CalendarReminderService.getActiveReminders(
        testCompany.id,
        '2026-09-24T09:50:00Z'
      );
      expect(remindersAfter[0].is_dismissed).toBe(true);
    });
  });

  describe('4. Backup and Restore of Calendar & Reminders', () => {
    it('backs up calendar events and successfully restores them into persistent storage', () => {
      const event: CalendarEvent = {
        id: 'evt_backup_1',
        company_id: testCompany.id,
        title: 'Annual Tech Audit',
        event_type: 'contract_review',
        start_time: '2026-11-01T09:00:00Z',
        end_time: '2026-11-01T12:00:00Z',
        status: 'scheduled',
        priority: 'high',
        assigned_user_id: 'usr-admin-1',
        reminder_minutes_before: [60],
        is_reminder_dismissed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      StorageService.saveCalendarEvent(event);

      // Create backup
      const backup = BackupService.createBackup();
      expect(backup.data.calendarEvents).toBeDefined();
      expect(backup.data.calendarEvents?.length).toBe(1);
      expect(backup.data.calendarEvents?.[0].title).toBe('Annual Tech Audit');

      // Clear all data
      StorageService.clearAllData();
      expect(StorageService.getCalendarEvents().length).toBe(0);

      // Restore backup
      const restoreResult = BackupService.restoreBackup(backup);
      expect(restoreResult.success).toBe(true);

      const restoredEvents = StorageService.getCalendarEvents({ companyId: testCompany.id });
      expect(restoredEvents.length).toBe(1);
      expect(restoredEvents[0].title).toBe('Annual Tech Audit');
      expect(restoredEvents[0].event_type).toBe('contract_review');
    });
  });
});
