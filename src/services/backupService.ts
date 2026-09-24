import { StorageService } from './storageService';
import {
  ActivityResult,
  CalendarEvent,
  Company,
  Contact,
  CreditNote,
  Invoice,
  Item,
  Lead,
  LeadActivity,
  LeadStageHistory,
  MarketingActivity,
  MarketingPlan,
  MarketingTarget,
  Organisation,
  Payment,
  PaymentAllocation,
  Pipeline,
  PipelineStage,
  Quotation,
  User,
} from '../types';

export interface BackupArchive {
  version: string;
  app: string;
  timestamp: string;
  checksum: string;
  data: {
    companies: Company[];
    users: User[];
    organisations: Organisation[];
    contacts: Contact[];
    items: Item[];
    leads: Lead[];
    leadActivities: LeadActivity[];
    leadStageHistories?: LeadStageHistory[];
    pipelines?: Pipeline[];
    pipelineStages?: PipelineStage[];
    quotations: Quotation[];
    invoices: Invoice[];
    creditNotes?: CreditNote[];
    payments: Payment[];
    paymentAllocations: PaymentAllocation[];
    marketingPlans: MarketingPlan[];
    marketingTargets?: MarketingTarget[];
    marketingActivities: MarketingActivity[];
    activityResults?: ActivityResult[];
    calendarEvents?: CalendarEvent[];
  };
}

export class BackupService {
  private static STORAGE_BACKUPS_KEY = 'savannah_backup_history';

  /**
   * Generates a complete timestamped backup snapshot.
   */
  public static createBackup(): BackupArchive {
    const db = StorageService.getDb();
    const data = {
      companies: db.companies || [],
      users: db.currentUser ? [db.currentUser] : [],
      organisations: db.organisations || [],
      contacts: db.contacts || [],
      items: db.items || [],
      leads: db.leads || [],
      leadActivities: db.leadActivities || [],
      leadStageHistories: db.leadStageHistories || [],
      pipelines: db.pipelines || [],
      pipelineStages: db.pipelineStages || [],
      quotations: db.quotations || [],
      invoices: db.invoices || [],
      creditNotes: db.creditNotes || [],
      payments: db.payments || [],
      paymentAllocations: db.paymentAllocations || [],
      marketingPlans: db.marketingPlans || [],
      marketingTargets: db.marketingTargets || [],
      marketingActivities: db.marketingActivities || [],
      activityResults: db.activityResults || [],
      calendarEvents: db.calendarEvents || [],
    };

    const dataJson = JSON.stringify(data);
    let checksum = 0;
    for (let i = 0; i < dataJson.length; i++) {
      checksum = (checksum + dataJson.charCodeAt(i) * (i + 1)) % 1000000007;
    }

    const archive: BackupArchive = {
      version: '1.0.0',
      app: 'Savannah CRM & Business Operations',
      timestamp: new Date().toISOString(),
      checksum: checksum.toString(16),
      data,
    };

    this.recordBackupHistory(archive);
    return archive;
  }

  /**
   * Downloads backup archive as a JSON file in the browser.
   */
  public static downloadBackupFile(archive?: BackupArchive): void {
    const backup = archive || this.createBackup();
    const fileName = `savannah_backup_${backup.timestamp.replace(/[:.]/g, '-')}.json`;
    const jsonStr = JSON.stringify(backup, null, 2);

    if (typeof document !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Restores database state from a backup archive with structure validation.
   */
  public static restoreBackup(archiveData: any): { success: boolean; message: string; restoredCount: number } {
    if (!archiveData || typeof archiveData !== 'object' || !archiveData.data) {
      return { success: false, message: 'Invalid backup file structure: missing data payload.', restoredCount: 0 };
    }

    const d = archiveData.data;

    try {
      StorageService.clearAllData();

      if (Array.isArray(d.companies)) {
        d.companies.forEach((c: Company) => StorageService.saveCompany(c));
      }
      if (Array.isArray(d.users) && d.users.length > 0) {
        StorageService.saveUser(d.users[0]);
      }
      if (Array.isArray(d.organisations)) {
        d.organisations.forEach((o: Organisation) => StorageService.saveOrganisation(o));
      }
      if (Array.isArray(d.contacts)) {
        d.contacts.forEach((c: Contact) => StorageService.saveContact(c));
      }
      if (Array.isArray(d.items)) {
        d.items.forEach((i: Item) => StorageService.saveItem(i));
      }
      if (Array.isArray(d.leads)) {
        d.leads.forEach((l: Lead) => StorageService.saveLead(l));
      }
      if (Array.isArray(d.leadActivities)) {
        d.leadActivities.forEach((la: LeadActivity) => StorageService.saveLeadActivity(la));
      }
      if (Array.isArray(d.leadStageHistories)) {
        d.leadStageHistories.forEach((lsh: LeadStageHistory) => StorageService.saveLeadStageHistory(lsh));
      }
      if (Array.isArray(d.pipelines)) {
        d.pipelines.forEach((p: Pipeline) => StorageService.savePipeline(p));
      }
      if (Array.isArray(d.pipelineStages)) {
        d.pipelineStages.forEach((ps: PipelineStage) => StorageService.savePipelineStage(ps));
      }
      if (Array.isArray(d.quotations)) {
        d.quotations.forEach((q: Quotation) => StorageService.saveQuotation(q));
      }
      if (Array.isArray(d.invoices)) {
        d.invoices.forEach((inv: Invoice) => StorageService.saveInvoice(inv));
      }
      if (Array.isArray(d.creditNotes)) {
        d.creditNotes.forEach((cn: CreditNote) => StorageService.saveCreditNote(cn));
      }
      if (Array.isArray(d.payments)) {
        d.payments.forEach((p: Payment) => StorageService.savePayment(p));
      }
      if (Array.isArray(d.paymentAllocations)) {
        d.paymentAllocations.forEach((pa: PaymentAllocation) => StorageService.savePaymentAllocation(pa));
      }
      if (Array.isArray(d.marketingPlans)) {
        d.marketingPlans.forEach((mp: MarketingPlan) => StorageService.saveMarketingPlan(mp));
      }
      if (Array.isArray(d.marketingTargets)) {
        d.marketingTargets.forEach((mt: MarketingTarget) => StorageService.saveMarketingTarget(mt));
      }
      if (Array.isArray(d.marketingActivities)) {
        d.marketingActivities.forEach((ma: MarketingActivity) => StorageService.saveMarketingActivity(ma));
      }
      if (Array.isArray(d.activityResults)) {
        d.activityResults.forEach((ar: ActivityResult) => StorageService.saveActivityResult(ar));
      }
      if (Array.isArray(d.calendarEvents)) {
        d.calendarEvents.forEach((ce: CalendarEvent) => StorageService.saveCalendarEvent(ce));
      }

      const totalCount =
        (d.companies?.length || 0) +
        (d.organisations?.length || 0) +
        (d.invoices?.length || 0) +
        (d.quotations?.length || 0) +
        (d.payments?.length || 0) +
        (d.leads?.length || 0) +
        (d.marketingPlans?.length || 0) +
        (d.calendarEvents?.length || 0);

      return {
        success: true,
        message: `Database successfully restored from backup snapshot (${archiveData.timestamp || 'unknown date'}).`,
        restoredCount: totalCount,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Restore failed: ${err?.message || 'Data format error'}`,
        restoredCount: 0,
      };
    }
  }

  /**
   * Store backup history with retention count limiting.
   */
  private static recordBackupHistory(archive: BackupArchive, retentionMax: number = 10): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const historyStr = localStorage.getItem(this.STORAGE_BACKUPS_KEY);
      let history: { timestamp: string; checksum: string; recordCount: number }[] = historyStr
        ? JSON.parse(historyStr)
        : [];

      const recordCount =
        archive.data.companies.length +
        archive.data.invoices.length +
        archive.data.quotations.length +
        archive.data.payments.length;

      history.unshift({
        timestamp: archive.timestamp,
        checksum: archive.checksum,
        recordCount,
      });

      if (history.length > retentionMax) {
        history = history.slice(0, retentionMax);
      }

      localStorage.setItem(this.STORAGE_BACKUPS_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage errors in non-browser context
    }
  }

  /**
   * Retrieves list of recorded backups.
   */
  public static getBackupHistory(): { timestamp: string; checksum: string; recordCount: number }[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const historyStr = localStorage.getItem(this.STORAGE_BACKUPS_KEY);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch {
      return [];
    }
  }
}
