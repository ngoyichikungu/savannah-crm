export type CurrencyCode = 'ZMW' | 'USD' | 'EUR' | 'GBP' | 'ZAR';

export type DiscountType = 'none' | 'percent' | 'fixed';

export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'superseded';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'credited';

export type CreditNoteStatus = 'draft' | 'issued' | 'applied' | 'void';

export interface Company {
  id: string;
  name: string;
  legal_name: string;
  tpin?: string;
  is_vat_registered: boolean;
  vat_rate_bp: number; // e.g. 1600 = 16.00%
  currency_code: CurrencyCode;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  country: string;
  logo_url?: string;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_branch_code?: string;
  bank_swift?: string;
  momo_provider?: string;
  momo_account_number?: string;
  default_invoice_terms?: string;
  default_quotation_terms?: string;
  invoice_prefix?: string;
  quotation_prefix?: string;
  credit_note_prefix?: string;
  receipt_prefix?: string;
  next_invoice_number: number;
  next_quotation_number: number;
  next_credit_note_number: number;
  next_receipt_number?: number;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  password?: string;
  role: 'owner' | 'admin' | 'sales_rep' | 'accountant';
  company_ids: string[];
  current_company_id: string;
}

export interface Organisation {
  id: string;
  company_id: string;
  name: string;
  tpin?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  country?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  organisation_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  default_unit_price_minor: number;
  is_vatable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentLineCalculation {
  sort_order: number;
  item_code: string;
  description: string;
  quantity_thousandths: number; // qty * 1000 (e.g. 2.5 => 2500)
  unit: string;
  unit_price_minor: number; // e.g. 10000 = 100.00
  discount_percent_bp: number; // basis points (e.g. 500 = 5.00%)
  line_subtotal_minor: number;
  is_vatable: boolean;
  line_vat_minor: number;
  line_total_minor: number;
}

export interface QuotationLine extends DocumentLineCalculation {
  id: string;
  company_id: string;
  quotation_id: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationEvent {
  id: string;
  company_id: string;
  quotation_id: string;
  event: 'created' | 'sent' | 'viewed' | 'followed_up' | 'accepted' | 'rejected' | 'reopened' | 'expired' | 'revised' | 'converted';
  note?: string;
  user_id?: string;
  user_name?: string;
  occurred_at: string;
}

export interface Quotation {
  id: string;
  company_id: string;
  lead_id?: string;
  organisation_id: string;
  contact_id?: string;
  number: string;
  title: string;
  reference?: string;
  issue_date: string;
  valid_until: string;
  currency_code: CurrencyCode;
  subtotal_minor: number;
  discount_type: DiscountType;
  discount_value: number; // bp if percent, minor if fixed
  discount_minor: number;
  vat_rate_bp: number;
  vat_minor: number;
  total_minor: number;
  status: QuotationStatus;
  sent_at?: string;
  decided_at?: string;
  rejection_reason?: string;
  terms?: string;
  notes?: string;
  payment_terms?: string;
  delivery_terms?: string;
  revision_of_quotation_id?: string;
  revision_number: number;
  prepared_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  lines?: QuotationLine[];
  events?: QuotationEvent[];
}

export interface InvoiceLine extends DocumentLineCalculation {
  id: string;
  company_id: string;
  invoice_id: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'cheque'
  | 'mobile_money'
  | 'card'
  | 'other';

export interface Payment {
  id: string;
  company_id: string;
  organisation_id: string;
  contact_id?: string;
  receipt_number: string;
  payment_date: string;
  method: PaymentMethod;
  reference?: string;
  currency_code: CurrencyCode;
  amount_minor: number;
  allocated_minor: number;
  unallocated_minor: number;
  notes?: string;
  received_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface PaymentAllocation {
  id: string;
  company_id: string;
  payment_id: string;
  invoice_id: string;
  amount_minor: number;
  allocated_by_user_id: string;
  allocated_at: string;
  payment_method?: PaymentMethod;
  reference?: string;
  note?: string;
  is_reversed?: boolean;
  reversed_at?: string;
  reversed_by_user_id?: string;
  reversal_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreditNote {
  id: string;
  company_id: string;
  invoice_id: string;
  number: string;
  issue_date: string;
  reason: string;
  amount_minor: number;
  vat_minor: number;
  total_minor: number;
  status: CreditNoteStatus;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  quotation_id?: string;
  organisation_id: string;
  contact_id?: string;
  number: string;
  reference?: string;
  po_number?: string;
  issue_date: string;
  due_date: string;
  payment_terms_days: number;
  currency_code: CurrencyCode;
  subtotal_minor: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_minor: number;
  vat_rate_bp: number;
  vat_minor: number;
  total_minor: number;
  amount_paid_minor: number;
  balance_due_minor: number;
  status: InvoiceStatus;
  sent_at?: string;
  fully_paid_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  notes?: string;
  terms?: string;
  issued_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  lines?: InvoiceLine[];
  payments?: PaymentAllocation[];
  credit_notes?: CreditNote[];
}

export type AgeingBucket = 'current' | '1_30' | '31_60' | '61_90' | '90_plus';

// ==========================================
// PART 7: Sales & Marketing Plan Tracker
// ==========================================

export type MarketingPlanStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export type MarketingTargetMetric =
  | 'leads_captured'
  | 'leads_contacted'
  | 'quotations_sent'
  | 'quotation_value'
  | 'invoices_issued'
  | 'revenue'
  | 'conversion_rate';

export type MarketingTargetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'total';

export type MarketingChannel =
  | 'field_visit'
  | 'cold_call'
  | 'email_campaign'
  | 'whatsapp'
  | 'social'
  | 'radio'
  | 'print'
  | 'exhibition'
  | 'referral_drive'
  | 'other';

export type MarketingActivityStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface MarketingPlan {
  id: string;
  company_id: string;
  name: string;
  objective: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  budget_minor: number;
  owner_user_id: string;
  status: MarketingPlanStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface MarketingTarget {
  id: string;
  company_id: string;
  plan_id: string;
  metric: MarketingTargetMetric;
  target_value: number; // e.g. count, minor for monetary amount, or bp for conversion rate
  period: MarketingTargetPeriod;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface MarketingActivity {
  id: string;
  company_id: string;
  plan_id: string;
  name: string;
  description?: string;
  channel: MarketingChannel;
  planned_start: string; // YYYY-MM-DD
  planned_end: string; // YYYY-MM-DD
  actual_start?: string;
  actual_end?: string;
  budget_minor: number;
  actual_cost_minor: number;
  status: MarketingActivityStatus;
  owner_user_id: string;
  outcome_notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ActivityResult {
  id: string;
  company_id: string;
  marketing_activity_id: string;
  leads_generated: number;
  contacts_made: number;
  quotations_issued: number;
  revenue_attributed_minor: number;
  recorded_at: string;
  recorded_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  company_id: string;
  name: string;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  company_id: string;
  pipeline_id: string;
  name: string;
  order: number;
  probability_percent: number;
  is_won?: boolean;
  is_lost?: boolean;
  created_at: string;
  updated_at: string;
}

export type LeadActivityType = 'call' | 'email' | 'meeting' | 'whatsapp' | 'demo' | 'site_visit' | 'note' | 'other';

export interface LeadActivity {
  id: string;
  company_id: string;
  lead_id: string;
  activity_type: LeadActivityType;
  description?: string;
  performed_at: string; // ISO or YYYY-MM-DD
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type CalendarEventType =
  | 'meeting'
  | 'client_call'
  | 'site_visit'
  | 'follow_up'
  | 'proposal_presentation'
  | 'payment_reminder'
  | 'contract_review'
  | 'other';

export type CalendarEventStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

export type ReminderLeadTimeMinutes = 0 | 15 | 30 | 60 | 1440 | 2880; // 0m, 15m, 30m, 1h, 1 day, 2 days

export interface CalendarEvent {
  id: string;
  company_id: string;
  organisation_id?: string;
  contact_id?: string;
  lead_id?: string;
  quotation_id?: string;
  invoice_id?: string;
  title: string;
  description?: string;
  event_type: CalendarEventType;
  start_time: string; // ISO string e.g. 2026-09-25T10:00:00Z
  end_time: string; // ISO string e.g. 2026-09-25T11:00:00Z
  location?: string;
  meeting_url?: string;
  status: CalendarEventStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_user_id?: string;
  
  // Reminder configurations
  reminder_minutes_before?: ReminderLeadTimeMinutes[];
  is_reminder_dismissed?: boolean;
  reminder_notes?: string;

  created_at: string;
  updated_at: string;
}

export interface ClientReminder {
  id: string;
  event_id: string;
  company_id: string;
  title: string;
  event_type: CalendarEventType;
  scheduled_time: string;
  remind_at: string;
  organisation_id?: string;
  contact_id?: string;
  lead_id?: string;
  is_due: boolean;
  is_overdue: boolean;
  minutes_until_due: number;
  is_dismissed: boolean;
}

export interface LeadStageHistory {
  id: string;
  company_id: string;
  lead_id: string;
  from_stage_id?: string;
  to_stage_id: string;
  entered_at: string; // ISO or YYYY-MM-DD
  exited_at?: string; // ISO or YYYY-MM-DD
  duration_days?: number;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadSource = MarketingChannel | 'website' | 'other';

export interface Lead {
  id: string;
  company_id: string;
  organisation_id?: string;
  contact_id?: string;
  title: string;
  source?: LeadSource;
  source_detail?: string;
  marketing_activity_id?: string; // Links lead to a marketing activity for true attribution
  status: LeadStatus;
  estimated_value_minor?: number;
  assigned_user_id?: string;
  owner_user_id?: string;
  pipeline_id?: string;
  stage_id?: string;
  captured_at?: string; // YYYY-MM-DD or ISO
  first_contacted_at?: string; // YYYY-MM-DD or ISO
  decided_at?: string; // YYYY-MM-DD or ISO
  lost_reason?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export * from './reporting';
