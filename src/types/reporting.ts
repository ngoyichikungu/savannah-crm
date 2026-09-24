import { ReactNode } from 'react';
import { Company, LeadSource, LeadStatus, PaymentMethod } from './index';

export type ReportId =
  | 'leads-captured'
  | 'leads-contacted'
  | 'lead-progression'
  | 'lead-conversion'
  | 'client-invoices'
  | 'client-payments-balances'
  | 'client-statement'
  | 'marketing-tracker';

export type ReportPreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export interface ReportDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  preset: ReportPreset;
}

export interface ReportParameterOption {
  label: string;
  value: string;
}

export interface ReportParameter {
  id: string;
  label: string;
  type: 'select' | 'text' | 'boolean';
  options?: ReportParameterOption[];
  defaultValue?: any;
  placeholder?: string;
}

export interface ReportColumn<TRow = any> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string;
  format?: (val: any, row: TRow) => ReactNode | string;
  csvFormat?: (val: any, row: TRow) => string;
}

export interface ReportRequest<TFilters = Record<string, any>> {
  companyId?: string;
  dateRange: ReportDateRange;
  filters: TFilters;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ReportContract<TFilters = Record<string, any>, TRow = any, TTotals = any> {
  id: ReportId;
  name: string;
  description: string;
  parameters: (company: Company) => ReportParameter[];
  columns: (filters: TFilters, company: Company) => ReportColumn<TRow>[];
  rows: (companyId: string, request: ReportRequest<TFilters>) => TRow[];
  totals: (rows: TRow[], companyOrFilters?: any, companyArg?: any, request?: ReportRequest<TFilters>) => TTotals;
  exportCsv: (company: Company, rows: TRow[], totals: TTotals, filters: TFilters, request: ReportRequest<TFilters>) => string;
  exportPdfHtml: (company: Company, rows: TRow[], totals: TTotals, filters: TFilters, request: ReportRequest<TFilters>) => string;
}

// ==========================================
// 1. Leads Captured Report Types
// ==========================================
export interface LeadsCapturedRow {
  id: string;
  dateCaptured: string; // YYYY-MM-DD
  leadTitle: string;
  organisationName: string;
  contactName: string;
  source: LeadSource | string;
  sourceDetail: string;
  estimatedValueMinor: number;
  ownerName: string;
  currentStageName: string;
  status: LeadStatus;
}

export interface LeadsCapturedTotals {
  count: number;
  totalLeads?: number;
  totalEstimatedValueMinor: number;
  topSource?: string;
  bySource?: {
    source: string;
    count: number;
    valueMinor: number;
  }[];
}

// ==========================================
// 2. Leads Contacted Report Types
// ==========================================
export interface LeadsContactedRow {
  id: string;
  leadTitle: string;
  organisationName: string;
  dateCaptured: string;
  dateFirstContacted: string;
  daysToFirstContact: number;
  hoursToFirstContact?: number;
  activityCountInRange: number;
  lastActivityDate?: string;
  lastActivityType?: string;
  ownerName: string;
}

export interface LeadsContactedTotals {
  countContacted: number;
  totalContacted?: number;
  totalActivities?: number;
  avgTouchpointsPerLead?: number;
  avgHoursToFirstContact?: number;
  averageDaysToFirstContact: number;
  avgDaysToFirstContact?: number;
  countCapturedNeverContacted: number;
  countCapturedNotInRangeContacted?: number;
}

// ==========================================
// 3. Lead Progression / Stage Report Types
// ==========================================
export interface StageDistributionRow {
  stageId: string;
  stageName: string;
  order: number;
  probabilityPercent: number;
  openLeadsCount: number;
  totalEstimatedValueMinor: number;
  weightedValueMinor: number;
}

export interface StageMovementRow {
  stageId: string;
  stageName: string;
  order: number;
  transitionsIn: number;
  transitionsOut: number;
  avgDaysInStage: number;
}

export interface LeadProgressionRow {
  stageId: string;
  stageName: string;
  order?: number;
  leadsCount: number;
  unweightedValueMinor: number;
  weightedValueMinor: number;
  probabilityPercent: number;
  transitionsInRange: number;
  avgDaysInStage: number;
}

export interface LeadProgressionTotals {
  totalLeads?: number;
  totalOpenLeads: number;
  totalPipelineValueMinor: number;
  totalUnweightedValueMinor?: number;
  totalWeightedValueMinor: number;
  totalTransitions: number;
  totalTransitionsInRange?: number;
  avgOverallDays: number;
  avgStageDurationDays?: number;
  avgDaysInPipeline?: number;
}

// ==========================================
// 4. Lead Status / Conversion Report Types
// ==========================================
export interface LeadConversionRow {
  id: string;
  leadTitle: string;
  organisationName: string;
  capturedDate: string;
  decidedDate?: string;
  daysInPipeline: number;
  status: LeadStatus;
  lostReason?: string;
  estimatedValueMinor: number;
  actualInvoicedValueMinor: number;
}

export interface LostReasonRank {
  reason: string;
  count: number;
  valueMinor: number;
  percentage?: number;
}

export interface LeadConversionTotals {
  wonCount: number;
  totalWon?: number;
  wonValueMinor: number;
  totalWonValueMinor?: number;
  lostCount: number;
  totalLost?: number;
  lostValueMinor: number;
  totalLostValueMinor?: number;
  openCount: number;
  openValueMinor: number;
  conversionRatePercent: number; // e.g. won / (won + lost) * 100
  overallWinRatePercent?: number;
  conversionRateBp?: number;
  avgSalesCycleDays: number;
  avgDaysToClose?: number;
  lostReasons?: LostReasonRank[];
  lostReasonsRanked: LostReasonRank[];
}

// ==========================================
// 5. Client Invoices Report Types
// ==========================================
export interface ClientInvoiceRow {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientName?: string;
  organisationName?: string;
  clientId?: string;
  organisationId?: string;
  reference?: string;
  subtotalMinor: number;
  discountMinor: number;
  vatMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  balanceDueMinor: number;
  status: string;
  daysOverdue: number;
  ownerName?: string;
}

export type ClientInvoicesRow = ClientInvoiceRow;

export interface ClientInvoicesTotals {
  count: number;
  subtotalMinor: number;
  totalSubtotalMinor?: number;
  discountMinor: number;
  totalDiscountMinor?: number;
  vatMinor: number;
  totalVatMinor?: number;
  grandTotalMinor: number;
  totalAmountMinor?: number;
  totalPaidMinor: number;
  totalOutstandingMinor: number;
  byClient?: {
    clientId: string;
    clientName: string;
    count: number;
    subtotalMinor: number;
    vatMinor: number;
    totalMinor: number;
    paidMinor: number;
    balanceMinor: number;
  }[];
}

// ==========================================
// 6. Client Payments & Balances Report Types
// ==========================================
export interface PaymentReceivedRow {
  id: string;
  receiptNumber: string;
  date?: string;
  paymentDate?: string;
  clientName?: string;
  organisationName?: string;
  clientId?: string;
  organisationId?: string;
  method: PaymentMethod | string;
  reference?: string;
  amountMinor: number;
  invoicesAppliedTo?: string;
  invoicesApplied?: string;
}

export interface ClientBalanceRow {
  clientId?: string;
  organisationId?: string;
  clientName?: string;
  organisationName?: string;
  openingBalanceMinor: number;
  invoicedInRangeMinor: number;
  receivedInRangeMinor: number;
  closingBalanceMinor: number;
  ageingCurrentMinor?: number;
  currentMinor?: number;
  ageing1To30Minor?: number;
  days1_30Minor?: number;
  ageing31To60Minor?: number;
  days31_60Minor?: number;
  ageing61To90Minor?: number;
  days61_90Minor?: number;
  ageing90PlusMinor?: number;
  days90PlusMinor?: number;
}

export interface PaymentsAndBalancesTotals {
  paymentsReceived?: PaymentReceivedRow[];
  totalPaymentsCount: number;
  totalPaymentsReceivedMinor: number;
  totalOpeningMinor?: number;
  openingBalanceMinor: number;
  totalInvoicedMinor?: number;
  invoicedInRangeMinor: number;
  totalReceivedMinor?: number;
  receivedInRangeMinor: number;
  totalClosingMinor?: number;
  closingBalanceMinor: number;
  totalCurrentMinor?: number;
  ageingCurrentMinor: number;
  totalDays1_30Minor?: number;
  ageing1To30Minor: number;
  totalDays31_60Minor?: number;
  ageing31To60Minor: number;
  totalDays61_90Minor?: number;
  ageing61To90Minor: number;
  totalDays90PlusMinor?: number;
  ageing90PlusMinor: number;
  sumOfInvoiceBalancesMinor?: number;
  isReconciled?: boolean;
  varianceMinor?: number;
}

export type ClientPaymentsBalancesTotals = PaymentsAndBalancesTotals;

// ==========================================
// 7. Client Statement Report Types
// ==========================================
export interface StatementLedgerEntry {
  id?: string;
  date: string;
  type: 'invoice' | 'payment' | 'credit_note' | 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'OPENING';
  reference: string;
  description: string;
  debitMinor: number; // Invoices increase balance
  creditMinor: number; // Payments / Credit Notes reduce balance
  runningBalanceMinor: number;
}

export type StatementTransactionRow = StatementLedgerEntry;

export interface SingleClientStatement {
  company: Company;
  client: {
    id: string;
    name: string;
    tpin?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  periodStart: string;
  periodEnd: string;
  openingBalanceMinor: number;
  ledger: StatementLedgerEntry[];
  closingBalanceMinor: number;
  ageing: {
    currentMinor: number;
    days1To30Minor: number;
    days31To60Minor: number;
    days61To90Minor: number;
    days90PlusMinor: number;
  };
}

export interface ClientStatementTotals {
  organisation?: any;
  clientCount?: number;
  openingBalanceMinor?: number;
  totalOpeningBalanceMinor?: number;
  debitsMinor?: number;
  totalDebitsMinor: number;
  creditsMinor?: number;
  totalCreditsMinor: number;
  closingBalanceMinor?: number;
  totalClosingBalanceMinor?: number;
  aging?: {
    currentMinor: number;
    days1_30Minor?: number;
    days1To30Minor?: number;
    days31_60Minor?: number;
    days31To60Minor?: number;
    days61_90Minor?: number;
    days61To90Minor?: number;
    days90PlusMinor: number;
  };
}

// ==========================================
// 8. Sales & Marketing Plan Tracker Report Types
// ==========================================
export interface MarketingTrackerActivityRow {
  id?: string;
  planId?: string;
  planName: string;
  activityId?: string;
  activityName: string;
  channel: string;
  ownerName?: string;
  plannedDates?: string;
  actualDates?: string;
  dates?: string;
  budgetMinor: number;
  actualCostMinor: number;
  varianceMinor?: number;
  costVarianceMinor?: number; // budget - actualCost
  leadsGenerated: number;
  quotationsIssued: number;
  revenueAttributedMinor: number;
  costPerLeadMinor: number; // actualCost / leads (0 if 0 leads)
  roiPercent: number; // ((revenue - actualCost) / actualCost) * 100
  status: string;
}

export type MarketingTrackerRow = MarketingTrackerActivityRow;

export interface MarketingTrackerTotals {
  activityCount: number;
  totalBudgetMinor: number;
  totalActualCostMinor: number;
  totalVarianceMinor: number;
  totalLeadsGenerated: number;
  totalQuotationsIssued: number;
  totalRevenueAttributedMinor: number;
  overallCostPerLeadMinor: number;
  overallRoiPercent: number;
}
