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
import { InvoiceStatusResolver } from './invoiceStatusResolver';

const BASE_STORAGE_KEY = 'savannah_crm_db_v1';

export function getCurrentInstanceId(): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlInstance = params.get('instance');
    if (urlInstance && urlInstance.trim()) {
      return urlInstance.trim().toLowerCase();
    }

    const localInstance = localStorage.getItem('savannah_active_instance_id');
    if (localInstance && localInstance.trim()) {
      return localInstance.trim().toLowerCase();
    }
  }

  const envInstance = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_INSTANCE_ID;
  if (envInstance && typeof envInstance === 'string' && envInstance.trim()) {
    return envInstance.trim().toLowerCase();
  }

  return 'default';
}

export function getStorageKey(instanceId?: string): string {
  const targetId = instanceId || getCurrentInstanceId();
  if (!targetId || targetId === 'default') {
    return BASE_STORAGE_KEY;
  }
  return `savannah_crm_db_${targetId}_v1`;
}

export interface AppDatabase {
  companies: Company[];
  currentCompanyId: string;
  currentUser: User;
  organisations: Organisation[];
  contacts: Contact[];
  items: Item[];
  quotations: Quotation[];
  invoices: Invoice[];
  creditNotes: CreditNote[];
  payments: Payment[];
  paymentAllocations: PaymentAllocation[];
  marketingPlans: MarketingPlan[];
  marketingTargets: MarketingTarget[];
  marketingActivities: MarketingActivity[];
  activityResults: ActivityResult[];
  leads: Lead[];
  pipelines: Pipeline[];
  pipelineStages: PipelineStage[];
  leadActivities: LeadActivity[];
  leadStageHistories: LeadStageHistory[];
  calendarEvents: CalendarEvent[];
}

const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp_savannah',
    name: 'Savannah Tech Solutions Ltd',
    legal_name: 'Savannah Technology Solutions Limited',
    tpin: '1002345678',
    is_vat_registered: true,
    vat_rate_bp: 1600, // 16.00%
    currency_code: 'ZMW',
    email: 'billing@savannahtech.co.zm',
    phone: '+260 211 254890',
    address_line1: 'Plot 4509, Great East Road, Arcades Office Park',
    address_line2: 'Block B, 2nd Floor',
    city: 'Lusaka',
    country: 'Zambia',
    bank_name: 'Stanbic Bank Zambia',
    bank_account_name: 'Savannah Technology Solutions Limited',
    bank_account_number: '9130004928172',
    bank_branch_code: '040002',
    bank_swift: 'SBICZMLX',
    momo_provider: 'Airtel Money Merchant',
    momo_account_number: '554921',
    default_invoice_terms: '1. Payment is strictly due within 30 days of invoice date.\n2. Overdue accounts accrue interest at 2.5% per month.\n3. Goods remain property of Savannah Tech until settled in full.',
    default_quotation_terms: '1. Quotation valid for 30 calendar days from issue date.\n2. Prices subject to exchange rate adjustment if variance exceeds 5%.\n3. 50% deposit required on purchase order confirmation.',
    invoice_prefix: 'INV-',
    quotation_prefix: 'QT-',
    credit_note_prefix: 'CN-',
    receipt_prefix: 'REC-',
    next_invoice_number: 108,
    next_quotation_number: 64,
    next_credit_note_number: 15,
    next_receipt_number: 104,
  },
  {
    id: 'comp_kafue',
    name: 'Kafue Agro-Ventures Ltd',
    legal_name: 'Kafue Agro-Ventures Enterprises Ltd',
    tpin: '2009876543',
    is_vat_registered: false, // Non-VAT Registered SME
    vat_rate_bp: 0,
    currency_code: 'ZMW',
    email: 'sales@kafueagro.co.zm',
    phone: '+260 211 312789',
    address_line1: 'Stand 12, Kafue Industrial Road',
    city: 'Kafue',
    country: 'Zambia',
    bank_name: 'ZANACO Bank',
    bank_account_name: 'Kafue Agro-Ventures Enterprises Ltd',
    bank_account_number: '5688920199201',
    bank_branch_code: '010045',
    momo_provider: 'MTN Mobile Money',
    momo_account_number: '0966881122',
    default_invoice_terms: '1. Payment due upon receipt of goods.\n2. Quality inspection within 48 hours of dispatch.',
    default_quotation_terms: '1. Quotation valid for 14 days due to grain price seasonality.',
    invoice_prefix: 'KAV-',
    quotation_prefix: 'KQT-',
    credit_note_prefix: 'KCN-',
    receipt_prefix: 'KRC-',
    next_invoice_number: 42,
    next_quotation_number: 19,
    next_credit_note_number: 4,
    next_receipt_number: 21,
  },
];

const INITIAL_USER: User = {
  id: 'user_ngoyi',
  name: 'Ngoyi Chikungu',
  email: 'ngoyi.chikungu@gmail.com',
  role: 'owner',
  company_ids: ['comp_savannah', 'comp_kafue'],
  current_company_id: 'comp_savannah',
};

const INITIAL_ORGANISATIONS: Organisation[] = [
  {
    id: 'org_copperbelt',
    company_id: 'comp_savannah',
    name: 'Copperbelt Energy Corporation Plc',
    tpin: '1000889211',
    email: 'procurement@cec.com.zm',
    phone: '+260 212 244000',
    address_line1: 'Central Park, 23rd Avenue',
    city: 'Kitwe',
    country: 'Zambia',
    is_active: true,
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
  },
  {
    id: 'org_lusaka_mill',
    company_id: 'comp_savannah',
    name: 'Lusaka Milling & Logistics Ltd',
    tpin: '1004512993',
    email: 'info@lusakamilling.co.zm',
    phone: '+260 211 228941',
    address_line1: 'Heavy Industrial Area, Lumumba Rd',
    city: 'Lusaka',
    country: 'Zambia',
    is_active: true,
    created_at: '2026-08-10T09:00:00Z',
    updated_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'org_mukuba',
    company_id: 'comp_savannah',
    name: 'Mukuba Retail Holdings Ltd',
    tpin: '1009944122',
    email: 'accounts@mukubaretail.co.zm',
    phone: '+260 212 612800',
    address_line1: 'Mukuba Mall Commercial Complex',
    city: 'Ndola',
    country: 'Zambia',
    is_active: true,
    created_at: '2026-08-15T11:00:00Z',
    updated_at: '2026-08-15T11:00:00Z',
  },
];

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'cont_mutale',
    company_id: 'comp_savannah',
    organisation_id: 'org_copperbelt',
    first_name: 'Mutale',
    last_name: 'Banda',
    email: 'm.banda@cec.com.zm',
    phone: '+260 977 445566',
    job_title: 'Head of IT Infrastructure',
    is_primary: true,
    is_active: true,
    created_at: '2026-08-01T08:30:00Z',
    updated_at: '2026-08-01T08:30:00Z',
  },
  {
    id: 'cont_chileshe',
    company_id: 'comp_savannah',
    organisation_id: 'org_lusaka_mill',
    first_name: 'Chileshe',
    last_name: 'Mwape',
    email: 'chileshe.m@lusakamilling.co.zm',
    phone: '+260 966 112233',
    job_title: 'Finance & Operations Director',
    is_primary: true,
    is_active: true,
    created_at: '2026-08-10T09:30:00Z',
    updated_at: '2026-08-10T09:30:00Z',
  },
  {
    id: 'cont_thandiwe',
    company_id: 'comp_savannah',
    organisation_id: 'org_mukuba',
    first_name: 'Thandiwe',
    last_name: 'Phiri',
    email: 'tphiri@mukubaretail.co.zm',
    phone: '+260 971 889900',
    job_title: 'Store Operations General Manager',
    is_primary: true,
    is_active: true,
    created_at: '2026-08-15T11:30:00Z',
    updated_at: '2026-08-15T11:30:00Z',
  },
];

const INITIAL_ITEMS: Item[] = [
  {
    id: 'item_server_sla',
    company_id: 'comp_savannah',
    code: 'SLA-ENTERPRISE',
    name: 'Enterprise Server Maintenance SLA',
    description: 'Quarterly 24/7 on-call infrastructure and systems monitoring maintenance',
    unit: 'quarter',
    default_unit_price_minor: 1500000, // 15,000.00 ZMW
    is_vatable: true,
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'item_firewall',
    company_id: 'comp_savannah',
    code: 'SEC-FW-01',
    name: 'Unified Threat Management Firewall Appliance',
    description: 'Next-generation hardware firewall with dual WAN failover and VPN gateways',
    unit: 'unit',
    default_unit_price_minor: 2850000, // 28,500.00 ZMW
    is_vatable: true,
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'item_cloud_backup',
    company_id: 'comp_savannah',
    code: 'CLD-BKP-1TB',
    name: 'Encrypted Cloud Backup Storage (1TB/Mo)',
    description: 'Automated immutable disaster recovery cloud storage tier with daily snapshots',
    unit: 'month',
    default_unit_price_minor: 120000, // 1,200.00 ZMW
    is_vatable: true,
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'item_training',
    company_id: 'comp_savannah',
    code: 'TRN-CYBER',
    name: 'Staff Cyber Security Awareness Workshop',
    description: 'Full-day interactive staff training and phishing resilience simulation',
    unit: 'session',
    default_unit_price_minor: 650000, // 6,500.00 ZMW
    is_vatable: true,
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
];

const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'qt_101',
    company_id: 'comp_savannah',
    organisation_id: 'org_copperbelt',
    contact_id: 'cont_mutale',
    number: 'QT-2026-00062',
    title: 'Disaster Recovery and SLA Renewal 2026/27',
    reference: 'CEC-RFP-IT-881',
    issue_date: '2026-09-01',
    valid_until: '2026-10-01',
    currency_code: 'ZMW',
    subtotal_minor: 3000000,
    discount_type: 'percent',
    discount_value: 500,
    discount_minor: 150000,
    vat_rate_bp: 1600,
    vat_minor: 456000,
    total_minor: 3306000,
    status: 'accepted',
    revision_number: 0,
    prepared_by_user_id: 'user_ngoyi',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-05T10:00:00Z',
    lines: [
      {
        id: 'ql_101_1',
        company_id: 'comp_savannah',
        quotation_id: 'qt_101',
        sort_order: 1,
        item_code: 'SLA-ENTERPRISE',
        description: 'Enterprise Server Maintenance SLA (2 Quarters)',
        quantity_thousandths: 2000,
        unit: 'quarter',
        unit_price_minor: 1500000,
        discount_percent_bp: 0,
        line_subtotal_minor: 3000000,
        is_vatable: true,
        line_vat_minor: 480000,
        line_total_minor: 3480000,
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-01T08:00:00Z',
      },
    ],
    events: [
      {
        id: 'ev_1',
        company_id: 'comp_savannah',
        quotation_id: 'qt_101',
        event: 'created',
        occurred_at: '2026-09-01T08:00:00Z',
        user_name: 'Ngoyi Chikungu',
      },
      {
        id: 'ev_2',
        company_id: 'comp_savannah',
        quotation_id: 'qt_101',
        event: 'sent',
        occurred_at: '2026-09-01T09:15:00Z',
        note: 'Emailed official proposal to Mutale Banda',
      },
      {
        id: 'ev_3',
        company_id: 'comp_savannah',
        quotation_id: 'qt_101',
        event: 'accepted',
        occurred_at: '2026-09-05T10:00:00Z',
        note: 'Client approved PO issued #CEC-PO-99120',
      },
    ],
  },
  {
    id: 'qt_102',
    company_id: 'comp_savannah',
    organisation_id: 'org_lusaka_mill',
    contact_id: 'cont_chileshe',
    number: 'QT-2026-00063',
    title: 'Factory Branch Network Security & UTM Appliance',
    reference: 'LM-NET-2026',
    issue_date: '2026-09-12',
    valid_until: '2026-10-12',
    currency_code: 'ZMW',
    subtotal_minor: 3500000,
    discount_type: 'none',
    discount_value: 0,
    discount_minor: 0,
    vat_rate_bp: 1600,
    vat_minor: 560000,
    total_minor: 4060000,
    status: 'sent',
    sent_at: '2026-09-12T14:00:00Z',
    revision_number: 0,
    prepared_by_user_id: 'user_ngoyi',
    created_at: '2026-09-12T14:00:00Z',
    updated_at: '2026-09-12T14:00:00Z',
    lines: [
      {
        id: 'ql_102_1',
        company_id: 'comp_savannah',
        quotation_id: 'qt_102',
        sort_order: 1,
        item_code: 'SEC-FW-01',
        description: 'Unified Threat Management Firewall Appliance',
        quantity_thousandths: 1000,
        unit: 'unit',
        unit_price_minor: 2850000,
        discount_percent_bp: 0,
        line_subtotal_minor: 2850000,
        is_vatable: true,
        line_vat_minor: 456000,
        line_total_minor: 3306000,
        created_at: '2026-09-12T14:00:00Z',
        updated_at: '2026-09-12T14:00:00Z',
      },
      {
        id: 'ql_102_2',
        company_id: 'comp_savannah',
        quotation_id: 'qt_102',
        sort_order: 2,
        item_code: 'TRN-CYBER',
        description: 'Staff Cyber Security Awareness Workshop',
        quantity_thousandths: 1000,
        unit: 'session',
        unit_price_minor: 650000,
        discount_percent_bp: 0,
        line_subtotal_minor: 650000,
        is_vatable: true,
        line_vat_minor: 104000,
        line_total_minor: 754000,
        created_at: '2026-09-12T14:00:00Z',
        updated_at: '2026-09-12T14:00:00Z',
      },
    ],
    events: [
      {
        id: 'ev_4',
        company_id: 'comp_savannah',
        quotation_id: 'qt_102',
        event: 'sent',
        occurred_at: '2026-09-12T14:00:00Z',
        note: 'Sent proposal to Chileshe Mwape',
      },
    ],
  },
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv_101',
    company_id: 'comp_savannah',
    quotation_id: 'qt_101',
    organisation_id: 'org_copperbelt',
    contact_id: 'cont_mutale',
    number: 'INV-2026-00101',
    reference: 'PO #CEC-PO-99120',
    po_number: 'CEC-PO-99120',
    issue_date: '2026-08-15',
    due_date: '2026-09-14',
    payment_terms_days: 30,
    currency_code: 'ZMW',
    subtotal_minor: 3000000,
    discount_type: 'percent',
    discount_value: 500,
    discount_minor: 150000,
    vat_rate_bp: 1600,
    vat_minor: 456000,
    total_minor: 3306000,
    amount_paid_minor: 1500000,
    balance_due_minor: 1806000,
    status: 'overdue',
    sent_at: '2026-08-15T09:00:00Z',
    issued_by_user_id: 'user_ngoyi',
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-09-01T14:00:00Z',
    lines: [
      {
        id: 'inv_l_1',
        company_id: 'comp_savannah',
        invoice_id: 'inv_101',
        sort_order: 1,
        item_code: 'SLA-ENTERPRISE',
        description: 'Enterprise Server Maintenance SLA (2 Quarters)',
        quantity_thousandths: 2000,
        unit: 'quarter',
        unit_price_minor: 1500000,
        discount_percent_bp: 0,
        line_subtotal_minor: 3000000,
        is_vatable: true,
        line_vat_minor: 480000,
        line_total_minor: 3480000,
        created_at: '2026-08-15T09:00:00Z',
        updated_at: '2026-08-15T09:00:00Z',
      },
    ],
    payments: [],
    credit_notes: [],
  },
  {
    id: 'inv_102',
    company_id: 'comp_savannah',
    organisation_id: 'org_mukuba',
    contact_id: 'cont_thandiwe',
    number: 'INV-2026-00102',
    reference: 'Mukuba Mall CCTV Expansion',
    po_number: 'MK-2026-44',
    issue_date: '2026-09-05',
    due_date: '2026-10-05',
    payment_terms_days: 30,
    currency_code: 'ZMW',
    subtotal_minor: 2850000,
    discount_type: 'none',
    discount_value: 0,
    discount_minor: 0,
    vat_rate_bp: 1600,
    vat_minor: 456000,
    total_minor: 3306000,
    amount_paid_minor: 3306000,
    balance_due_minor: 0,
    status: 'paid',
    sent_at: '2026-09-05T10:00:00Z',
    fully_paid_at: '2026-09-18T16:20:00Z',
    issued_by_user_id: 'user_ngoyi',
    created_at: '2026-09-05T10:00:00Z',
    updated_at: '2026-09-18T16:20:00Z',
    lines: [
      {
        id: 'inv_l_2',
        company_id: 'comp_savannah',
        invoice_id: 'inv_102',
        sort_order: 1,
        item_code: 'SEC-FW-01',
        description: 'Unified Threat Management Firewall Appliance',
        quantity_thousandths: 1000,
        unit: 'unit',
        unit_price_minor: 2850000,
        discount_percent_bp: 0,
        line_subtotal_minor: 2850000,
        is_vatable: true,
        line_vat_minor: 456000,
        line_total_minor: 3306000,
        created_at: '2026-09-05T10:00:00Z',
        updated_at: '2026-09-05T10:00:00Z',
      },
    ],
    payments: [],
    credit_notes: [],
  },
  {
    id: 'inv_103',
    company_id: 'comp_savannah',
    organisation_id: 'org_lusaka_mill',
    contact_id: 'cont_chileshe',
    number: 'INV-2026-00103',
    reference: 'Monthly Cloud Infrastructure',
    issue_date: '2026-09-15',
    due_date: '2026-10-15',
    payment_terms_days: 30,
    currency_code: 'ZMW',
    subtotal_minor: 120000,
    discount_type: 'none',
    discount_value: 0,
    discount_minor: 0,
    vat_rate_bp: 1600,
    vat_minor: 19200,
    total_minor: 139200,
    amount_paid_minor: 0,
    balance_due_minor: 139200,
    status: 'sent',
    sent_at: '2026-09-15T11:00:00Z',
    issued_by_user_id: 'user_ngoyi',
    created_at: '2026-09-15T11:00:00Z',
    updated_at: '2026-09-15T11:00:00Z',
    lines: [
      {
        id: 'inv_l_3',
        company_id: 'comp_savannah',
        invoice_id: 'inv_103',
        sort_order: 1,
        item_code: 'CLD-BKP-1TB',
        description: 'Encrypted Cloud Backup Storage (1TB/Mo)',
        quantity_thousandths: 1000,
        unit: 'month',
        unit_price_minor: 120000,
        discount_percent_bp: 0,
        line_subtotal_minor: 120000,
        is_vatable: true,
        line_vat_minor: 19200,
        line_total_minor: 139200,
        created_at: '2026-09-15T11:00:00Z',
        updated_at: '2026-09-15T11:00:00Z',
      },
    ],
    payments: [],
    credit_notes: [],
  },
  {
    id: 'inv_104',
    company_id: 'comp_savannah',
    organisation_id: 'org_mukuba',
    contact_id: 'cont_thandiwe',
    number: 'INV-2026-00104',
    reference: 'Draft Consulting Scope',
    issue_date: '2026-09-21',
    due_date: '2026-10-21',
    payment_terms_days: 30,
    currency_code: 'ZMW',
    subtotal_minor: 650000,
    discount_type: 'none',
    discount_value: 0,
    discount_minor: 0,
    vat_rate_bp: 1600,
    vat_minor: 104000,
    total_minor: 754000,
    amount_paid_minor: 0,
    balance_due_minor: 754000,
    status: 'draft',
    issued_by_user_id: 'user_ngoyi',
    created_at: '2026-09-21T09:00:00Z',
    updated_at: '2026-09-21T09:00:00Z',
    lines: [
      {
        id: 'inv_l_4',
        company_id: 'comp_savannah',
        invoice_id: 'inv_104',
        sort_order: 1,
        item_code: 'TRN-CYBER',
        description: 'Staff Cyber Security Awareness Workshop',
        quantity_thousandths: 1000,
        unit: 'session',
        unit_price_minor: 650000,
        discount_percent_bp: 0,
        line_subtotal_minor: 650000,
        is_vatable: true,
        line_vat_minor: 104000,
        line_total_minor: 754000,
        created_at: '2026-09-21T09:00:00Z',
        updated_at: '2026-09-21T09:00:00Z',
      },
    ],
    payments: [],
    credit_notes: [],
  },
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pmt_101_1',
    company_id: 'comp_savannah',
    organisation_id: 'org_copperbelt',
    contact_id: 'cont_mutale',
    receipt_number: 'REC-2026-00101',
    payment_date: '2026-09-01',
    method: 'bank_transfer',
    reference: 'EFT-STANBIC-9921',
    currency_code: 'ZMW',
    amount_minor: 1500000,
    allocated_minor: 1500000,
    unallocated_minor: 0,
    notes: 'First tranche 50% deposit received',
    received_by_user_id: 'user_ngoyi',
    created_at: '2026-09-01T14:00:00Z',
    updated_at: '2026-09-01T14:00:00Z',
  },
  {
    id: 'pmt_102_1',
    company_id: 'comp_savannah',
    organisation_id: 'org_mukuba',
    contact_id: 'cont_thandiwe',
    receipt_number: 'REC-2026-00102',
    payment_date: '2026-09-18',
    method: 'bank_transfer',
    reference: 'MK-EFT-8812',
    currency_code: 'ZMW',
    amount_minor: 3306000,
    allocated_minor: 3306000,
    unallocated_minor: 0,
    notes: 'Full payment settled via Stanbic EFT',
    received_by_user_id: 'user_ngoyi',
    created_at: '2026-09-18T16:20:00Z',
    updated_at: '2026-09-18T16:20:00Z',
  },
  {
    id: 'pmt_103_credit',
    company_id: 'comp_savannah',
    organisation_id: 'org_lusaka_mill',
    contact_id: 'cont_chileshe',
    receipt_number: 'REC-2026-00103',
    payment_date: '2026-09-20',
    method: 'mobile_money',
    reference: 'MTN-MOMO-7729',
    currency_code: 'ZMW',
    amount_minor: 50000, // K500 unallocated retainer credit
    allocated_minor: 0,
    unallocated_minor: 50000,
    notes: 'Retainer prepayment for upcoming backup expansion',
    received_by_user_id: 'user_ngoyi',
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
];

const INITIAL_ALLOCATIONS: PaymentAllocation[] = [
  {
    id: 'alloc_101_1',
    company_id: 'comp_savannah',
    payment_id: 'pmt_101_1',
    invoice_id: 'inv_101',
    amount_minor: 1500000,
    allocated_by_user_id: 'user_ngoyi',
    allocated_at: '2026-09-01T14:00:00Z',
    payment_method: 'bank_transfer',
    reference: 'EFT-STANBIC-9921',
    note: 'First tranche 50% deposit received',
    is_reversed: false,
    created_at: '2026-09-01T14:00:00Z',
    updated_at: '2026-09-01T14:00:00Z',
  },
  {
    id: 'alloc_102_1',
    company_id: 'comp_savannah',
    payment_id: 'pmt_102_1',
    invoice_id: 'inv_102',
    amount_minor: 3306000,
    allocated_by_user_id: 'user_ngoyi',
    allocated_at: '2026-09-18T16:20:00Z',
    payment_method: 'bank_transfer',
    reference: 'MK-EFT-8812',
    note: 'Full payment settled',
    is_reversed: false,
    created_at: '2026-09-18T16:20:00Z',
    updated_at: '2026-09-18T16:20:00Z',
  },
];

const INITIAL_MARKETING_PLANS: MarketingPlan[] = [
  {
    id: 'plan_q3_2026',
    company_id: 'comp_savannah',
    name: 'Q3 Enterprise Digital Transformation Campaign',
    objective: 'Drive corporate SaaS and ERP adoption among manufacturing and mining enterprises across Lusaka and the Copperbelt.',
    start_date: '2026-07-01',
    end_date: '2026-09-30',
    budget_minor: 15000000, // K150,000.00
    owner_user_id: 'user_ngoyi',
    status: 'active',
    created_at: '2026-06-25T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'plan_agri_2026',
    company_id: 'comp_savannah',
    name: 'Agri-Tech & Commercial Farming Roadshow',
    objective: 'Expand smart metering and cloud inventory tools into large farming syndicates in Mkushi and Chisamba.',
    start_date: '2026-08-01',
    end_date: '2026-10-31',
    budget_minor: 8500000, // K85,000.00
    owner_user_id: 'user_ngoyi',
    status: 'active',
    created_at: '2026-07-20T08:00:00Z',
    updated_at: '2026-08-15T08:00:00Z',
  },
];

const INITIAL_MARKETING_TARGETS: MarketingTarget[] = [
  {
    id: 'target_q3_leads',
    company_id: 'comp_savannah',
    plan_id: 'plan_q3_2026',
    metric: 'leads_captured',
    target_value: 20,
    period: 'quarterly',
    period_start: '2026-07-01',
    period_end: '2026-09-30',
    created_at: '2026-06-25T08:00:00Z',
    updated_at: '2026-06-25T08:00:00Z',
  },
  {
    id: 'target_q3_quotes',
    company_id: 'comp_savannah',
    plan_id: 'plan_q3_2026',
    metric: 'quotations_sent',
    target_value: 12,
    period: 'quarterly',
    period_start: '2026-07-01',
    period_end: '2026-09-30',
    created_at: '2026-06-25T08:00:00Z',
    updated_at: '2026-06-25T08:00:00Z',
  },
  {
    id: 'target_q3_quote_val',
    company_id: 'comp_savannah',
    plan_id: 'plan_q3_2026',
    metric: 'quotation_value',
    target_value: 25000000, // K250,000.00
    period: 'quarterly',
    period_start: '2026-07-01',
    period_end: '2026-09-30',
    created_at: '2026-06-25T08:00:00Z',
    updated_at: '2026-06-25T08:00:00Z',
  },
  {
    id: 'target_q3_invoices',
    company_id: 'comp_savannah',
    plan_id: 'plan_q3_2026',
    metric: 'invoices_issued',
    target_value: 8,
    period: 'quarterly',
    period_start: '2026-07-01',
    period_end: '2026-09-30',
    created_at: '2026-06-25T08:00:00Z',
    updated_at: '2026-06-25T08:00:00Z',
  },
  {
    id: 'target_q3_revenue',
    company_id: 'comp_savannah',
    plan_id: 'plan_q3_2026',
    metric: 'revenue',
    target_value: 10000000, // K100,000.00
    period: 'quarterly',
    period_start: '2026-07-01',
    period_end: '2026-09-30',
    created_at: '2026-06-25T08:00:00Z',
    updated_at: '2026-06-25T08:00:00Z',
  },
  {
    id: 'target_q3_conv',
    company_id: 'comp_savannah',
    plan_id: 'plan_q3_2026',
    metric: 'conversion_rate',
    target_value: 3500, // 35.00% (in basis points)
    period: 'quarterly',
    period_start: '2026-07-01',
    period_end: '2026-09-30',
    created_at: '2026-06-25T08:00:00Z',
    updated_at: '2026-06-25T08:00:00Z',
  },
];

const INITIAL_MARKETING_ACTIVITIES: MarketingActivity[] = [
  {
    id: 'act_copperbelt_expo',
    company_id: 'comp_savannah',
    plan_id: 'plan_q3_2026',
    name: 'Copperbelt Mining & Industrial Expo Booth',
    description: 'Direct exhibition and live demonstration booth at Kitwe Showgrounds.',
    channel: 'exhibition',
    planned_start: '2026-07-10',
    planned_end: '2026-07-15',
    actual_start: '2026-07-10',
    actual_end: '2026-07-15',
    budget_minor: 6000000, // K60,000
    actual_cost_minor: 5800000, // K58,000
    status: 'completed',
    owner_user_id: 'user_ngoyi',
    outcome_notes: 'Generated 14 qualified executive leads; Mukuba Mining deal initiated from booth meeting.',
    created_at: '2026-06-28T09:00:00Z',
    updated_at: '2026-07-16T14:00:00Z',
  },
  {
    id: 'act_cfo_roundtable',
    company_id: 'comp_savannah',
    plan_id: 'plan_q3_2026',
    name: 'Lusaka CFO Executive Breakfast Roundtable',
    description: 'Exclusive 20-seat breakfast at Taj Pamodzi Hotel on Statutory E-Invoicing and Cloud ERP.',
    channel: 'field_visit',
    planned_start: '2026-08-12',
    planned_end: '2026-08-12',
    actual_start: '2026-08-12',
    actual_end: '2026-08-12',
    budget_minor: 4000000, // K40,000
    actual_cost_minor: 4200000, // K42,000
    status: 'completed',
    owner_user_id: 'user_ngoyi',
    outcome_notes: '18 CFOs attended. High interest in Smart Invoice integration modules.',
    created_at: '2026-07-15T09:00:00Z',
    updated_at: '2026-08-13T10:00:00Z',
  },
  {
    id: 'act_whatsapp_drip',
    company_id: 'comp_savannah',
    plan_id: 'plan_q3_2026',
    name: 'WhatsApp Direct Outreach to ZACCI Members',
    description: 'Targeted broadcast and direct engagement with Zambia Chamber of Commerce member businesses.',
    channel: 'whatsapp',
    planned_start: '2026-08-20',
    planned_end: '2026-09-10',
    actual_start: '2026-08-20',
    budget_minor: 2000000, // K20,000
    actual_cost_minor: 1500000, // K15,000
    status: 'in_progress',
    owner_user_id: 'user_ngoyi',
    outcome_notes: 'Ongoing messaging pipeline; 8 active quotation requests generated.',
    created_at: '2026-08-10T09:00:00Z',
    updated_at: '2026-08-25T11:00:00Z',
  },
  {
    id: 'act_radio_ad',
    company_id: 'comp_savannah',
    plan_id: 'plan_q3_2026',
    name: 'Money FM Business Morning Sponsorship Spot',
    description: '30-day peak breakfast sponsorship on SME compliance and inventory software.',
    channel: 'radio',
    planned_start: '2026-09-01',
    planned_end: '2026-09-15',
    budget_minor: 3000000, // K30,000
    actual_cost_minor: 0,
    status: 'planned', // Overdue against planned_end (2026-09-15 vs current 2026-09-22)
    owner_user_id: 'user_ngoyi',
    outcome_notes: 'Pending audio recording clearance.',
    created_at: '2026-08-20T09:00:00Z',
    updated_at: '2026-08-20T09:00:00Z',
  },
];

const INITIAL_ACTIVITY_RESULTS: ActivityResult[] = [
  {
    id: 'res_expo_1',
    company_id: 'comp_savannah',
    marketing_activity_id: 'act_copperbelt_expo',
    leads_generated: 14,
    contacts_made: 35,
    quotations_issued: 4,
    revenue_attributed_minor: 3306000, // Traceable to Mukuba Mining invoice
    recorded_at: '2026-07-20T10:00:00Z',
    recorded_by_user_id: 'user_ngoyi',
    created_at: '2026-07-20T10:00:00Z',
    updated_at: '2026-07-20T10:00:00Z',
  },
];

const INITIAL_PIPELINES: Pipeline[] = [
  {
    id: 'pipe_default',
    company_id: 'comp_savannah',
    name: 'Enterprise Direct Sales Pipeline',
    is_default: true,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
];

const INITIAL_PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'stage_lead',
    company_id: 'comp_savannah',
    pipeline_id: 'pipe_default',
    name: 'New Lead',
    order: 1,
    probability_percent: 10,
    is_won: false,
    is_lost: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'stage_contact',
    company_id: 'comp_savannah',
    pipeline_id: 'pipe_default',
    name: 'Discovery & Contact',
    order: 2,
    probability_percent: 25,
    is_won: false,
    is_lost: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'stage_qual',
    company_id: 'comp_savannah',
    pipeline_id: 'pipe_default',
    name: 'Technical Qualification',
    order: 3,
    probability_percent: 50,
    is_won: false,
    is_lost: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'stage_prop',
    company_id: 'comp_savannah',
    pipeline_id: 'pipe_default',
    name: 'Proposal & Quotation',
    order: 4,
    probability_percent: 75,
    is_won: false,
    is_lost: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'stage_won',
    company_id: 'comp_savannah',
    pipeline_id: 'pipe_default',
    name: 'Closed Won',
    order: 5,
    probability_percent: 100,
    is_won: true,
    is_lost: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'stage_lost',
    company_id: 'comp_savannah',
    pipeline_id: 'pipe_default',
    name: 'Closed Lost',
    order: 6,
    probability_percent: 0,
    is_won: false,
    is_lost: true,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
];

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead_mukuba_1',
    company_id: 'comp_savannah',
    organisation_id: 'org_mukuba',
    contact_id: 'cont_bwalya',
    title: 'Mukuba Mining IT Modernization & Network Upgrade',
    source: 'exhibition',
    source_detail: 'Kitwe Mining Expo Booth #14',
    marketing_activity_id: 'act_copperbelt_expo',
    pipeline_id: 'pipe_default',
    stage_id: 'stage_won',
    status: 'won',
    estimated_value_minor: 3500000,
    assigned_user_id: 'user_ngoyi',
    owner_user_id: 'user_ngoyi',
    captured_at: '2026-07-12',
    first_contacted_at: '2026-07-14',
    decided_at: '2026-08-20',
    created_at: '2026-07-12T14:00:00Z',
    updated_at: '2026-08-20T14:00:00Z',
  },
  {
    id: 'lead_zambezi_1',
    company_id: 'comp_savannah',
    organisation_id: 'org_zambezi',
    contact_id: 'cont_mutale',
    title: 'Zambezi Agri-Commodities Cloud ERP Deployment',
    source: 'field_visit',
    source_detail: 'Lusaka CFO Breakfast Roundtable',
    marketing_activity_id: 'act_cfo_roundtable',
    pipeline_id: 'pipe_default',
    stage_id: 'stage_prop',
    status: 'proposal',
    estimated_value_minor: 2800000,
    assigned_user_id: 'user_ngoyi',
    owner_user_id: 'user_ngoyi',
    captured_at: '2026-08-14',
    first_contacted_at: '2026-08-15',
    created_at: '2026-08-14T09:30:00Z',
    updated_at: '2026-08-15T11:00:00Z',
  },
  {
    id: 'lead_chibuluma_1',
    company_id: 'comp_savannah',
    organisation_id: 'org_mukuba',
    contact_id: 'cont_bwalya',
    title: 'Chibuluma Branch Wi-Fi & VoIP Expansion',
    source: 'whatsapp',
    source_detail: 'Direct outreach from ZACCI list',
    marketing_activity_id: 'act_whatsapp_drip',
    pipeline_id: 'pipe_default',
    stage_id: 'stage_qual',
    status: 'qualified',
    estimated_value_minor: 1200000,
    assigned_user_id: 'user_ngoyi',
    owner_user_id: 'user_ngoyi',
    captured_at: '2026-08-25',
    first_contacted_at: '2026-08-26',
    created_at: '2026-08-25T15:00:00Z',
    updated_at: '2026-08-28T16:00:00Z',
  },
  {
    id: 'lead_uncontacted_1',
    company_id: 'comp_savannah',
    organisation_id: 'org_copperbelt',
    contact_id: 'cont_mutale',
    title: 'Copperbelt High-Density Server Racks',
    source: 'website',
    source_detail: 'Inbound Web Form',
    pipeline_id: 'pipe_default',
    stage_id: 'stage_lead',
    status: 'new',
    estimated_value_minor: 1800000,
    assigned_user_id: 'user_ngoyi',
    owner_user_id: 'user_ngoyi',
    captured_at: '2026-09-05',
    created_at: '2026-09-05T10:00:00Z',
    updated_at: '2026-09-05T10:00:00Z',
  },
  {
    id: 'lead_lost_1',
    company_id: 'comp_savannah',
    organisation_id: 'org_lusaka_mill',
    contact_id: 'cont_chileshe',
    title: 'Lusaka Mill Secondary Power Backup UPS',
    source: 'cold_call',
    source_detail: 'Industrial Directory Call',
    pipeline_id: 'pipe_default',
    stage_id: 'stage_lost',
    status: 'lost',
    lost_reason: 'Competitor Price',
    estimated_value_minor: 950000,
    assigned_user_id: 'user_ngoyi',
    owner_user_id: 'user_ngoyi',
    captured_at: '2026-07-20',
    first_contacted_at: '2026-07-22',
    decided_at: '2026-08-10',
    created_at: '2026-07-20T09:00:00Z',
    updated_at: '2026-08-10T14:00:00Z',
  },
];

const INITIAL_LEAD_ACTIVITIES: LeadActivity[] = [
  {
    id: 'lact_1',
    company_id: 'comp_savannah',
    lead_id: 'lead_mukuba_1',
    activity_type: 'meeting',
    description: 'Initial booth demo and requirement discovery at Kitwe Expo',
    performed_at: '2026-07-14T10:00:00Z',
    user_id: 'user_ngoyi',
    created_at: '2026-07-14T10:00:00Z',
    updated_at: '2026-07-14T10:00:00Z',
  },
  {
    id: 'lact_2',
    company_id: 'comp_savannah',
    lead_id: 'lead_mukuba_1',
    activity_type: 'site_visit',
    description: 'Technical site inspection at Mukuba headquarters',
    performed_at: '2026-07-25T14:00:00Z',
    user_id: 'user_ngoyi',
    created_at: '2026-07-25T14:00:00Z',
    updated_at: '2026-07-25T14:00:00Z',
  },
  {
    id: 'lact_3',
    company_id: 'comp_savannah',
    lead_id: 'lead_zambezi_1',
    activity_type: 'meeting',
    description: 'CFO breakfast follow-up meeting on ERP modules',
    performed_at: '2026-08-15T09:00:00Z',
    user_id: 'user_ngoyi',
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-08-15T09:00:00Z',
  },
  {
    id: 'lact_4',
    company_id: 'comp_savannah',
    lead_id: 'lead_chibuluma_1',
    activity_type: 'whatsapp',
    description: 'Sent quotation draft and hardware specs over WhatsApp',
    performed_at: '2026-08-26T11:00:00Z',
    user_id: 'user_ngoyi',
    created_at: '2026-08-26T11:00:00Z',
    updated_at: '2026-08-26T11:00:00Z',
  },
  {
    id: 'lact_5',
    company_id: 'comp_savannah',
    lead_id: 'lead_lost_1',
    activity_type: 'call',
    description: 'Cold call discovery call with factory manager',
    performed_at: '2026-07-22T14:30:00Z',
    user_id: 'user_ngoyi',
    created_at: '2026-07-22T14:30:00Z',
    updated_at: '2026-07-22T14:30:00Z',
  },
];

const INITIAL_LEAD_STAGE_HISTORIES: LeadStageHistory[] = [
  {
    id: 'lsh_1',
    company_id: 'comp_savannah',
    lead_id: 'lead_mukuba_1',
    from_stage_id: undefined,
    to_stage_id: 'stage_lead',
    entered_at: '2026-07-12T14:00:00Z',
    exited_at: '2026-07-14T10:00:00Z',
    duration_days: 2,
    created_at: '2026-07-12T14:00:00Z',
    updated_at: '2026-07-14T10:00:00Z',
  },
  {
    id: 'lsh_2',
    company_id: 'comp_savannah',
    lead_id: 'lead_mukuba_1',
    from_stage_id: 'stage_lead',
    to_stage_id: 'stage_contact',
    entered_at: '2026-07-14T10:00:00Z',
    exited_at: '2026-07-25T14:00:00Z',
    duration_days: 11,
    created_at: '2026-07-14T10:00:00Z',
    updated_at: '2026-07-25T14:00:00Z',
  },
  {
    id: 'lsh_3',
    company_id: 'comp_savannah',
    lead_id: 'lead_mukuba_1',
    from_stage_id: 'stage_contact',
    to_stage_id: 'stage_prop',
    entered_at: '2026-07-25T14:00:00Z',
    exited_at: '2026-08-20T14:00:00Z',
    duration_days: 26,
    created_at: '2026-07-25T14:00:00Z',
    updated_at: '2026-08-20T14:00:00Z',
  },
  {
    id: 'lsh_4',
    company_id: 'comp_savannah',
    lead_id: 'lead_mukuba_1',
    from_stage_id: 'stage_prop',
    to_stage_id: 'stage_won',
    entered_at: '2026-08-20T14:00:00Z',
    duration_days: 0,
    created_at: '2026-08-20T14:00:00Z',
    updated_at: '2026-08-20T14:00:00Z',
  },
  {
    id: 'lsh_5',
    company_id: 'comp_savannah',
    lead_id: 'lead_zambezi_1',
    from_stage_id: undefined,
    to_stage_id: 'stage_lead',
    entered_at: '2026-08-14T09:30:00Z',
    exited_at: '2026-08-15T09:00:00Z',
    duration_days: 1,
    created_at: '2026-08-14T09:30:00Z',
    updated_at: '2026-08-15T09:00:00Z',
  },
  {
    id: 'lsh_6',
    company_id: 'comp_savannah',
    lead_id: 'lead_zambezi_1',
    from_stage_id: 'stage_lead',
    to_stage_id: 'stage_prop',
    entered_at: '2026-08-15T09:00:00Z',
    duration_days: 38,
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-08-15T09:00:00Z',
  },
  {
    id: 'lsh_7',
    company_id: 'comp_savannah',
    lead_id: 'lead_chibuluma_1',
    from_stage_id: undefined,
    to_stage_id: 'stage_lead',
    entered_at: '2026-08-25T15:00:00Z',
    exited_at: '2026-08-26T11:00:00Z',
    duration_days: 1,
    created_at: '2026-08-25T15:00:00Z',
    updated_at: '2026-08-26T11:00:00Z',
  },
  {
    id: 'lsh_8',
    company_id: 'comp_savannah',
    lead_id: 'lead_chibuluma_1',
    from_stage_id: 'stage_lead',
    to_stage_id: 'stage_qual',
    entered_at: '2026-08-26T11:00:00Z',
    duration_days: 27,
    created_at: '2026-08-26T11:00:00Z',
    updated_at: '2026-08-26T11:00:00Z',
  },
];

const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'evt_1',
    company_id: 'comp_savannah',
    organisation_id: 'org_mukuba',
    contact_id: 'cont_bwalya',
    lead_id: 'lead_mukuba_1',
    title: 'Quarterly Infrastructure Review & SLA Evaluation',
    description: 'Review uptime, network traffic analytics, and Q4 infrastructure scaling roadmap with IT leadership.',
    event_type: 'meeting',
    start_time: '2026-09-25T09:00:00Z',
    end_time: '2026-09-25T10:30:00Z',
    location: 'Mukuba Mall Commercial Complex, Ndola / Boardroom 2',
    meeting_url: 'https://meet.savannahtech.co.zm/mukuba-sla',
    status: 'scheduled',
    priority: 'high',
    assigned_user_id: 'user_ngoyi',
    reminder_minutes_before: [15, 60, 1440],
    is_reminder_dismissed: false,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'evt_2',
    company_id: 'comp_savannah',
    organisation_id: 'org_lusaka_mill',
    contact_id: 'cont_chileshe',
    invoice_id: 'inv_103',
    title: 'Cloud Backup Settlement & Expansion Follow-up Call',
    description: 'Check in with Chileshe regarding INV-2026-00103 verification and additional offsite storage tier.',
    event_type: 'client_call',
    start_time: '2026-09-24T14:30:00Z',
    end_time: '2026-09-24T15:00:00Z',
    location: 'Phone Call / Direct Dial',
    status: 'scheduled',
    priority: 'medium',
    assigned_user_id: 'user_ngoyi',
    reminder_minutes_before: [15, 30],
    is_reminder_dismissed: false,
    created_at: '2026-09-21T08:00:00Z',
    updated_at: '2026-09-21T08:00:00Z',
  },
  {
    id: 'evt_3',
    company_id: 'comp_savannah',
    organisation_id: 'org_copperbelt',
    contact_id: 'cont_mutale',
    lead_id: 'lead_uncontacted_1',
    title: 'High-Density Server Racks Technical Site Inspection',
    description: 'On-site engineering inspection of server room cooling, power redundancy, and rack dimensions.',
    event_type: 'site_visit',
    start_time: '2026-09-28T11:00:00Z',
    end_time: '2026-09-28T13:00:00Z',
    location: 'CEC Complex, Kitwe',
    status: 'scheduled',
    priority: 'high',
    assigned_user_id: 'user_ngoyi',
    reminder_minutes_before: [60, 1440],
    is_reminder_dismissed: false,
    created_at: '2026-09-22T11:00:00Z',
    updated_at: '2026-09-22T11:00:00Z',
  },
  {
    id: 'evt_4',
    company_id: 'comp_savannah',
    organisation_id: 'org_zambezi',
    contact_id: 'cont_mutale',
    lead_id: 'lead_zambezi_1',
    quotation_id: 'qt_101',
    title: 'ERP Quotation QT-2026-00051 Executive Walkthrough',
    description: 'Detailed presentation of quotation line items, cloud SLA schedule, and milestone billing plan.',
    event_type: 'proposal_presentation',
    start_time: '2026-09-29T10:00:00Z',
    end_time: '2026-09-29T11:30:00Z',
    location: 'Zambezi Agri Executive Boardroom, Lusaka',
    meeting_url: 'https://teams.microsoft.com/l/meetup-join/savannah-zambezi',
    status: 'scheduled',
    priority: 'urgent',
    assigned_user_id: 'user_ngoyi',
    reminder_minutes_before: [30, 60, 1440],
    is_reminder_dismissed: false,
    created_at: '2026-09-22T14:00:00Z',
    updated_at: '2026-09-22T14:00:00Z',
  },
];

export class StorageService {
  private static db: AppDatabase | null = null;
  private static listeners: Array<() => void> = [];

  static getDb(): AppDatabase {
    if (!this.db) {
      this.load();
    }
    return this.db!;
  }

  static getStorageKey(): string {
    return getStorageKey();
  }

  static getInstanceId(): string {
    return getCurrentInstanceId();
  }

  static setInstanceId(id: string): void {
    if (typeof localStorage !== 'undefined') {
      if (id && id !== 'default') {
        localStorage.setItem('savannah_active_instance_id', id);
      } else {
        localStorage.removeItem('savannah_active_instance_id');
      }
    }
    this.db = null;
    this.load();
    this.notify();
  }

  static listKnownInstances(): string[] {
    const instances = new Set<string>();
    instances.add('default');
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          if (key === 'savannah_crm_db_v1') {
            instances.add('default');
          } else if (key.startsWith('savannah_crm_db_') && key.endsWith('_v1')) {
            const inst = key.replace('savannah_crm_db_', '').replace('_v1', '');
            if (inst) instances.add(inst);
          }
        }
      }
    }
    return Array.from(instances);
  }

  private static load(): void {
    const currentKey = this.getStorageKey();
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(currentKey) : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Ensure migration backward compatibility
        if (parsed) {
          if (!parsed.payments) parsed.payments = INITIAL_PAYMENTS;
          if (!parsed.paymentAllocations) parsed.paymentAllocations = INITIAL_ALLOCATIONS;
          if (!parsed.marketingPlans) parsed.marketingPlans = INITIAL_MARKETING_PLANS;
          if (!parsed.marketingTargets) parsed.marketingTargets = INITIAL_MARKETING_TARGETS;
          if (!parsed.marketingActivities) parsed.marketingActivities = INITIAL_MARKETING_ACTIVITIES;
          if (!parsed.activityResults) parsed.activityResults = INITIAL_ACTIVITY_RESULTS;
          if (!parsed.leads) parsed.leads = INITIAL_LEADS;
          if (!parsed.pipelines) parsed.pipelines = INITIAL_PIPELINES;
          if (!parsed.pipelineStages) parsed.pipelineStages = INITIAL_PIPELINE_STAGES;
          if (!parsed.leadActivities) parsed.leadActivities = INITIAL_LEAD_ACTIVITIES;
          if (!parsed.leadStageHistories) parsed.leadStageHistories = INITIAL_LEAD_STAGE_HISTORIES;
          if (!parsed.calendarEvents) parsed.calendarEvents = INITIAL_CALENDAR_EVENTS;
          
          parsed.invoices = parsed.invoices.map((inv: Invoice) => ({
            ...inv,
            status: InvoiceStatusResolver.resolve(inv),
          }));

          this.db = parsed;
          return;
        }
      } catch {
        // Fallback to init
      }
    }

    this.db = {
      companies: INITIAL_COMPANIES,
      currentCompanyId: 'comp_savannah',
      currentUser: INITIAL_USER,
      organisations: INITIAL_ORGANISATIONS,
      contacts: INITIAL_CONTACTS,
      items: INITIAL_ITEMS,
      quotations: INITIAL_QUOTATIONS,
      invoices: INITIAL_INVOICES,
      creditNotes: [],
      payments: INITIAL_PAYMENTS,
      paymentAllocations: INITIAL_ALLOCATIONS,
      marketingPlans: INITIAL_MARKETING_PLANS,
      marketingTargets: INITIAL_MARKETING_TARGETS,
      marketingActivities: INITIAL_MARKETING_ACTIVITIES,
      activityResults: INITIAL_ACTIVITY_RESULTS,
      leads: INITIAL_LEADS,
      pipelines: INITIAL_PIPELINES,
      pipelineStages: INITIAL_PIPELINE_STAGES,
      leadActivities: INITIAL_LEAD_ACTIVITIES,
      leadStageHistories: INITIAL_LEAD_STAGE_HISTORIES,
      calendarEvents: INITIAL_CALENDAR_EVENTS,
    };
    this.save();
  }

  static save(): void {
    if (this.db && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.db));
    }
    this.notify();
  }

  static resetToDefault(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.getStorageKey());
    }
    this.db = null;
    this.load();
    this.notify();
  }

  static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notify(): void {
    this.listeners.forEach((l) => l());
  }

  /**
   * Execute atomic database transaction. If work() throws, snapshot state is restored.
   */
  static executeTransaction<T>(work: () => T): T {
    const db = this.getDb();
    const snapshot = JSON.stringify(db);
    try {
      const result = work();
      this.save();
      return result;
    } catch (err) {
      // Rollback
      this.db = JSON.parse(snapshot);
      throw err;
    }
  }

  // Active Company & Context Helpers
  static getCompanies(): Company[] {
    const db = this.getDb();
    return db.companies;
  }

  static getCurrentCompany(): Company {
    const db = this.getDb();
    return db.companies.find((c) => c.id === db.currentCompanyId) || db.companies[0];
  }

  static getCurrentUser(): User {
    const db = this.getDb();
    return db.currentUser;
  }

  static setCurrentCompany(companyId: string): void {
    const db = this.getDb();
    if (db.companies.some((c) => c.id === companyId)) {
      db.currentCompanyId = companyId;
      db.currentUser.current_company_id = companyId;
      this.save();
    }
  }

  static updateCompany(updated: Company): void {
    const db = this.getDb();
    db.companies = db.companies.map((c) => (c.id === updated.id ? updated : c));
    this.save();
  }

  static saveCompany(company: Company): void {
    const db = this.getDb();
    if (!db.companies) db.companies = [];
    const index = db.companies.findIndex((c) => c.id === company.id);
    if (index >= 0) {
      db.companies[index] = company;
    } else {
      db.companies.push(company);
      if (db.currentUser) {
        if (!db.currentUser.company_ids) db.currentUser.company_ids = [];
        if (!db.currentUser.company_ids.includes(company.id)) {
          db.currentUser.company_ids.push(company.id);
        }
      }
    }
    if (!db.currentCompanyId) {
      db.currentCompanyId = company.id;
    }
    this.save();
  }

  static deleteCompany(companyId: string): boolean {
    const db = this.getDb();
    if (db.companies.length <= 1) {
      return false; // Do not delete the last remaining company
    }
    db.companies = db.companies.filter((c) => c.id !== companyId);
    if (db.currentUser?.company_ids) {
      db.currentUser.company_ids = db.currentUser.company_ids.filter((id) => id !== companyId);
    }
    if (db.currentCompanyId === companyId) {
      db.currentCompanyId = db.companies[0].id;
      if (db.currentUser) {
        db.currentUser.current_company_id = db.companies[0].id;
      }
    }
    this.save();
    return true;
  }

  static setCurrentUser(user: User): void {
    const db = this.getDb();
    db.currentUser = user;
    this.save();
  }

  // Invoices
  static getInvoices(): Invoice[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.invoices.filter((inv) => inv.company_id === company.id && !inv.deleted_at);
  }

  static getInvoiceById(id: string): Invoice | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.invoices.find((inv) => inv.id === id && inv.company_id === company.id && !inv.deleted_at);
  }

  static saveInvoice(invoice: Invoice, updatedCompany?: Company): void {
    const db = this.getDb();
    const index = db.invoices.findIndex((inv) => inv.id === invoice.id);
    if (index >= 0) {
      db.invoices[index] = invoice;
    } else {
      db.invoices.unshift(invoice);
    }

    if (updatedCompany) {
      this.updateCompany(updatedCompany);
    } else {
      this.save();
    }
  }

  // Quotations
  static getQuotations(): Quotation[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.quotations.filter((q) => q.company_id === company.id && !q.deleted_at);
  }

  static getQuotationById(id: string): Quotation | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.quotations.find((q) => q.id === id && q.company_id === company.id && !q.deleted_at);
  }

  static saveQuotation(quotation: Quotation, updatedCompany?: Company): void {
    const db = this.getDb();
    const index = db.quotations.findIndex((q) => q.id === quotation.id);
    if (index >= 0) {
      db.quotations[index] = quotation;
    } else {
      db.quotations.unshift(quotation);
    }

    if (updatedCompany) {
      this.updateCompany(updatedCompany);
    } else {
      this.save();
    }
  }

  // Credit Notes
  static getCreditNotes(invoiceId?: string): CreditNote[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    const notesMap = new Map<string, CreditNote>();

    // 1. Direct credit notes
    (db.creditNotes || []).forEach((cn) => {
      if (cn.company_id === company.id && (!invoiceId || cn.invoice_id === invoiceId)) {
        notesMap.set(cn.id, cn);
      }
    });

    // 2. Embedded invoice credit notes
    (db.invoices || []).forEach((inv) => {
      if (inv.company_id === company.id && (!invoiceId || inv.id === invoiceId)) {
        (inv.credit_notes || []).forEach((cn) => {
          if (!notesMap.has(cn.id)) {
            notesMap.set(cn.id, cn);
          }
        });
      }
    });

    return Array.from(notesMap.values());
  }

  static getCreditNoteById(id: string): CreditNote | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    const direct = (db.creditNotes || []).find((cn) => cn.id === id && cn.company_id === company.id);
    if (direct) return direct;

    for (const inv of db.invoices || []) {
      if (inv.company_id === company.id && inv.credit_notes) {
        const found = inv.credit_notes.find((cn) => cn.id === id);
        if (found) return found;
      }
    }
    return undefined;
  }

  static saveCreditNote(creditNote: CreditNote, updatedCompany?: Company): void {
    const db = this.getDb();
    if (!db.creditNotes) db.creditNotes = [];
    const index = db.creditNotes.findIndex((cn) => cn.id === creditNote.id);
    if (index >= 0) {
      db.creditNotes[index] = creditNote;
    } else {
      db.creditNotes.unshift(creditNote);
    }

    if (updatedCompany) {
      this.updateCompany(updatedCompany);
    } else {
      this.save();
    }
  }

  // Payments (Ledger separation)
  static getPayments(organisationId?: string): Payment[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.payments.filter((p) => {
      const matchCompany = p.company_id === company.id && !p.deleted_at;
      if (!organisationId) return matchCompany;
      return matchCompany && p.organisation_id === organisationId;
    });
  }

  static getPaymentById(id: string): Payment | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.payments.find((p) => p.id === id && p.company_id === company.id && !p.deleted_at);
  }

  static savePayment(payment: Payment, updatedCompany?: Company): void {
    const db = this.getDb();
    const index = db.payments.findIndex((p) => p.id === payment.id);
    if (index >= 0) {
      db.payments[index] = payment;
    } else {
      db.payments.unshift(payment);
    }

    if (updatedCompany) {
      this.updateCompany(updatedCompany);
    } else {
      this.save();
    }
  }

  // Payment Allocations (Append-oriented ledger)
  static getPaymentAllocations(paymentId?: string, invoiceId?: string): PaymentAllocation[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.paymentAllocations.filter((a) => {
      if (a.company_id !== company.id) return false;
      if (paymentId && a.payment_id !== paymentId) return false;
      if (invoiceId && a.invoice_id !== invoiceId) return false;
      return true;
    });
  }

  static savePaymentAllocation(allocation: PaymentAllocation): void {
    const db = this.getDb();
    const index = db.paymentAllocations.findIndex((a) => a.id === allocation.id);
    if (index >= 0) {
      db.paymentAllocations[index] = allocation;
    } else {
      db.paymentAllocations.unshift(allocation);
    }
    this.save();
  }

  // Organisations & Contacts
  static getOrganisations(): Organisation[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.organisations.filter((org) => org.company_id === company.id && org.is_active);
  }

  static getOrganisationById(id: string): Organisation | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.organisations.find((org) => org.id === id && org.company_id === company.id && org.is_active);
  }

  static saveOrganisation(org: Organisation): void {
    const db = this.getDb();
    if (!db.organisations) db.organisations = [];
    const index = db.organisations.findIndex((o) => o.id === org.id);
    if (index >= 0) {
      db.organisations[index] = org;
    } else {
      db.organisations.push(org);
    }
    this.save();
  }

  static deleteOrganisation(id: string): void {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    const org = db.organisations.find((o) => o.id === id && o.company_id === company.id);
    if (org) {
      org.is_active = false;
      org.updated_at = new Date().toISOString();
      this.save();
    }
  }

  static getContacts(organisationId?: string): Contact[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.contacts.filter((c) => {
      const matchesCompany = c.company_id === company.id && c.is_active;
      if (!organisationId) return matchesCompany;
      return matchesCompany && c.organisation_id === organisationId;
    });
  }

  static getContactById(id: string): Contact | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.contacts.find((c) => c.id === id && c.company_id === company.id && c.is_active);
  }

  static saveContact(contact: Contact): void {
    const db = this.getDb();
    if (!db.contacts) db.contacts = [];
    const index = db.contacts.findIndex((c) => c.id === contact.id);
    if (index >= 0) {
      db.contacts[index] = contact;
    } else {
      db.contacts.push(contact);
    }
    this.save();
  }

  static deleteContact(id: string): void {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    const contact = db.contacts.find((c) => c.id === id && c.company_id === company.id);
    if (contact) {
      contact.is_active = false;
      contact.updated_at = new Date().toISOString();
      this.save();
    }
  }

  // Items
  static getItems(): Item[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.items.filter((item) => item.company_id === company.id && item.is_active);
  }

  static getItemById(id: string): Item | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return db.items.find((i) => i.id === id && i.company_id === company.id && i.is_active);
  }

  static saveItem(item: Item): void {
    const db = this.getDb();
    if (!db.items) db.items = [];
    const index = db.items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      db.items[index] = item;
    } else {
      db.items.push(item);
    }
    this.save();
  }

  static deleteItem(id: string): void {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    const item = db.items.find((i) => i.id === id && i.company_id === company.id);
    if (item) {
      item.is_active = false;
      item.updated_at = new Date().toISOString();
      this.save();
    }
  }

  // Marketing Plans
  static getMarketingPlans(): MarketingPlan[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return (db.marketingPlans || []).filter((p) => p.company_id === company.id && !p.deleted_at);
  }

  static getMarketingPlanById(id: string): MarketingPlan | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return (db.marketingPlans || []).find((p) => p.id === id && p.company_id === company.id && !p.deleted_at);
  }

  static saveMarketingPlan(plan: MarketingPlan): void {
    const db = this.getDb();
    if (!db.marketingPlans) db.marketingPlans = [];
    const index = db.marketingPlans.findIndex((p) => p.id === plan.id);
    if (index >= 0) {
      db.marketingPlans[index] = plan;
    } else {
      db.marketingPlans.unshift(plan);
    }
    this.save();
  }

  // Marketing Targets
  static getMarketingTargets(planId?: string): MarketingTarget[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return (db.marketingTargets || []).filter((t) => {
      const matchComp = t.company_id === company.id;
      if (!planId) return matchComp;
      return matchComp && t.plan_id === planId;
    });
  }

  static saveMarketingTarget(target: MarketingTarget): void {
    const db = this.getDb();
    if (!db.marketingTargets) db.marketingTargets = [];
    const index = db.marketingTargets.findIndex((t) => t.id === target.id);
    if (index >= 0) {
      db.marketingTargets[index] = target;
    } else {
      db.marketingTargets.push(target);
    }
    this.save();
  }

  // Marketing Activities
  static getMarketingActivities(planId?: string): MarketingActivity[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return (db.marketingActivities || []).filter((act) => {
      const matchComp = act.company_id === company.id && !act.deleted_at;
      if (!planId) return matchComp;
      return matchComp && act.plan_id === planId;
    });
  }

  static getMarketingActivityById(id: string): MarketingActivity | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return (db.marketingActivities || []).find((act) => act.id === id && act.company_id === company.id && !act.deleted_at);
  }

  static saveMarketingActivity(activity: MarketingActivity): void {
    const db = this.getDb();
    if (!db.marketingActivities) db.marketingActivities = [];
    const index = db.marketingActivities.findIndex((a) => a.id === activity.id);
    if (index >= 0) {
      db.marketingActivities[index] = activity;
    } else {
      db.marketingActivities.unshift(activity);
    }
    this.save();
  }

  // Activity Results
  static getActivityResults(activityId?: string): ActivityResult[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return (db.activityResults || []).filter((res) => {
      const matchComp = res.company_id === company.id;
      if (!activityId) return matchComp;
      return matchComp && res.marketing_activity_id === activityId;
    });
  }

  static saveActivityResult(result: ActivityResult): void {
    const db = this.getDb();
    if (!db.activityResults) db.activityResults = [];
    const index = db.activityResults.findIndex((r) => r.id === result.id);
    if (index >= 0) {
      db.activityResults[index] = result;
    } else {
      db.activityResults.unshift(result);
    }
    this.save();
  }

  // Leads
  static getLeads(activityId?: string): Lead[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return (db.leads || []).filter((l) => {
      const matchComp = l.company_id === company.id && !l.deleted_at;
      if (!activityId) return matchComp;
      return matchComp && l.marketing_activity_id === activityId;
    });
  }

  static getLeadById(id: string): Lead | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return (db.leads || []).find((l) => l.id === id && l.company_id === company.id && !l.deleted_at);
  }

  static saveLead(lead: Lead): void {
    const db = this.getDb();
    if (!db.leads) db.leads = [];
    const index = db.leads.findIndex((l) => l.id === lead.id);
    if (index >= 0) {
      db.leads[index] = lead;
    } else {
      db.leads.unshift(lead);
    }
    this.save();
  }

  // Pipelines
  static getPipelines(companyId?: string): Pipeline[] {
    const db = this.getDb();
    const targetCompId = companyId || this.getCurrentCompany().id;
    return (db.pipelines || []).filter((p) => p.company_id === targetCompId);
  }

  static savePipeline(pipeline: Pipeline): void {
    const db = this.getDb();
    if (!db.pipelines) db.pipelines = [];
    const index = db.pipelines.findIndex((p) => p.id === pipeline.id);
    if (index >= 0) {
      db.pipelines[index] = pipeline;
    } else {
      db.pipelines.unshift(pipeline);
    }
    this.save();
  }

  // Pipeline Stages
  static getPipelineStages(pipelineId?: string, companyId?: string): PipelineStage[] {
    const db = this.getDb();
    const targetCompId = companyId || this.getCurrentCompany().id;
    return (db.pipelineStages || [])
      .filter((s) => {
        const matchComp = s.company_id === targetCompId;
        if (!pipelineId) return matchComp;
        return matchComp && s.pipeline_id === pipelineId;
      })
      .sort((a, b) => a.order - b.order);
  }

  static savePipelineStage(stage: PipelineStage): void {
    const db = this.getDb();
    if (!db.pipelineStages) db.pipelineStages = [];
    const index = db.pipelineStages.findIndex((s) => s.id === stage.id);
    if (index >= 0) {
      db.pipelineStages[index] = stage;
    } else {
      db.pipelineStages.push(stage);
    }
    this.save();
  }

  // Lead Activities
  static getLeadActivities(leadId?: string, companyId?: string): LeadActivity[] {
    const db = this.getDb();
    const targetCompId = companyId || this.getCurrentCompany().id;
    return (db.leadActivities || [])
      .filter((a) => {
        const matchComp = a.company_id === targetCompId;
        if (!leadId) return matchComp;
        return matchComp && a.lead_id === leadId;
      })
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
  }

  static saveLeadActivity(activity: LeadActivity): void {
    const db = this.getDb();
    if (!db.leadActivities) db.leadActivities = [];
    const index = db.leadActivities.findIndex((a) => a.id === activity.id);
    if (index >= 0) {
      db.leadActivities[index] = activity;
    } else {
      db.leadActivities.unshift(activity);
    }
    this.save();
  }

  // Lead Stage Histories
  static getLeadStageHistories(leadId?: string, companyId?: string): LeadStageHistory[] {
    const db = this.getDb();
    const targetCompId = companyId || this.getCurrentCompany().id;
    return (db.leadStageHistories || [])
      .filter((h) => {
        const matchComp = h.company_id === targetCompId;
        if (!leadId) return matchComp;
        return matchComp && h.lead_id === leadId;
      })
      .sort((a, b) => new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime());
  }

  static saveLeadStageHistory(history: LeadStageHistory): void {
    const db = this.getDb();
    if (!db.leadStageHistories) db.leadStageHistories = [];
    const index = db.leadStageHistories.findIndex((h) => h.id === history.id);
    if (index >= 0) {
      db.leadStageHistories[index] = history;
    } else {
      db.leadStageHistories.push(history);
    }
    this.save();
  }

  // Users
  static getUsers(): User[] {
    const db = this.getDb();
    return db.currentUser ? [db.currentUser] : [];
  }

  static saveUser(user: User): void {
    const db = this.getDb();
    db.currentUser = user;
    this.save();
  }

  // Calendar Events & Activities / Reminders
  static getCalendarEvents(options?: {
    companyId?: string;
    organisationId?: string;
    leadId?: string;
    status?: string;
  }): CalendarEvent[] {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    const targetCompId = options?.companyId || company?.id;
    return (db.calendarEvents || [])
      .filter((evt) => {
        if (targetCompId && evt.company_id !== targetCompId) return false;
        if (options?.organisationId && evt.organisation_id !== options.organisationId) return false;
        if (options?.leadId && evt.lead_id !== options.leadId) return false;
        if (options?.status && evt.status !== options.status) return false;
        return true;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  static getCalendarEventById(id: string): CalendarEvent | undefined {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    return (db.calendarEvents || []).find((evt) => {
      if (evt.id !== id) return false;
      if (company && evt.company_id !== company.id) return false;
      return true;
    });
  }

  static saveCalendarEvent(event: CalendarEvent): void {
    const db = this.getDb();
    if (!db.calendarEvents) db.calendarEvents = [];
    const index = db.calendarEvents.findIndex((e) => e.id === event.id);
    if (index >= 0) {
      db.calendarEvents[index] = event;
    } else {
      db.calendarEvents.push(event);
    }
    this.save();
  }

  static deleteCalendarEvent(id: string): void {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    if (!db.calendarEvents) return;
    db.calendarEvents = db.calendarEvents.filter((e) => {
      if (e.id !== id) return true;
      if (company && e.company_id !== company.id) return true;
      return false;
    });
    this.save();
  }

  static dismissEventReminder(eventId: string): void {
    const db = this.getDb();
    const company = this.getCurrentCompany();
    const evt = (db.calendarEvents || []).find((e) => {
      if (e.id !== eventId) return false;
      if (company && e.company_id !== company.id) return false;
      return true;
    });
    if (evt) {
      evt.is_reminder_dismissed = true;
      evt.updated_at = new Date().toISOString();
      this.save();
    }
  }

  // Database Wipe / Reset for Installer & Restore
  static clearAllData(): void {
    const emptyDb: AppDatabase = {
      companies: [],
      currentCompanyId: '',
      currentUser: {
        id: 'usr-admin-1',
        name: 'Chikungu Ngoyi',
        email: 'owner@savannah.co.zm',
        role: 'owner',
        company_ids: [],
        current_company_id: '',
      },
      organisations: [],
      contacts: [],
      items: [],
      quotations: [],
      invoices: [],
      creditNotes: [],
      payments: [],
      paymentAllocations: [],
      marketingPlans: [],
      marketingTargets: [],
      marketingActivities: [],
      activityResults: [],
      leads: [],
      pipelines: [],
      pipelineStages: [],
      leadActivities: [],
      leadStageHistories: [],
      calendarEvents: [],
    };
    this.db = emptyDb;
    this.save();
  }

  // Seed Default Pipeline & Stages for New Company
  static seedPipelineStages(companyId: string): void {
    const pipeline: Pipeline = {
      id: `pipe_${companyId}`,
      company_id: companyId,
      name: 'Standard Sales Pipeline',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.savePipeline(pipeline);

    const stages: PipelineStage[] = [
      {
        id: `stg_new_${companyId}`,
        company_id: companyId,
        pipeline_id: pipeline.id,
        name: 'New Lead',
        order: 1,
        probability_percent: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `stg_qual_${companyId}`,
        company_id: companyId,
        pipeline_id: pipeline.id,
        name: 'Qualified',
        order: 2,
        probability_percent: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `stg_prop_${companyId}`,
        company_id: companyId,
        pipeline_id: pipeline.id,
        name: 'Proposal / Quote Sent',
        order: 3,
        probability_percent: 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `stg_won_${companyId}`,
        company_id: companyId,
        pipeline_id: pipeline.id,
        name: 'Closed Won',
        order: 4,
        probability_percent: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `stg_lost_${companyId}`,
        company_id: companyId,
        pipeline_id: pipeline.id,
        name: 'Closed Lost',
        order: 5,
        probability_percent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    stages.forEach((s) => this.savePipelineStage(s));
  }
}
