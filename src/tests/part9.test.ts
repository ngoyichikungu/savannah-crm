import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardService } from '../services/dashboardService';
import { StorageService } from '../services/storageService';
import {
  Company,
  MarketingPlan,
  Organisation,
  PipelineStage,
  User,
} from '../types';

describe('Part 9: Dashboard and Analytics Engine Tests', () => {
  const companyA: Company = {
    id: 'comp_alpha',
    name: 'Savannah Agribusiness',
    legal_name: 'Savannah Agribusiness Ltd',
    tpin: '1002345678',
    is_vat_registered: true,
    vat_rate_bp: 1600,
    currency_code: 'ZMW',
    invoice_prefix: 'SAV-',
    next_invoice_number: 101,
    credit_note_prefix: 'CN-',
    next_credit_note_number: 1,
    receipt_prefix: 'REC-',
    next_receipt_number: 1,
    quotation_prefix: 'QT-',
    next_quotation_number: 1,
    address_line1: 'Plot 101, Great North Road, Lusaka',
    address_line2: 'PO Box 30001, Lusaka',
    city: 'Lusaka',
    country: 'Zambia',
    email: 'accounts@savannah.co.zm',
    phone: '+260 211 123456',
  };

  const companyB: Company = {
    id: 'comp_beta',
    name: 'Foreign Corp',
    legal_name: 'Foreign Corp Ltd',
    currency_code: 'USD',
    is_vat_registered: false,
    vat_rate_bp: 0,
    invoice_prefix: 'FC-',
    next_invoice_number: 1,
    credit_note_prefix: 'FCN-',
    next_credit_note_number: 1,
    receipt_prefix: 'FREC-',
    next_receipt_number: 1,
    quotation_prefix: 'QT-',
    next_quotation_number: 1,
    city: 'Lusaka',
    country: 'Zambia',
    email: 'info@foreign.com',
    phone: '+1 555 0192',
    address_line1: 'Financial District',
  };

  const userA: User = {
    id: 'usr_owner',
    name: 'Chileshe Mwamba',
    email: 'chileshe@savannah.co.zm',
    role: 'owner',
    company_ids: [companyA.id],
    current_company_id: companyA.id,
  };

  const org1: Organisation = {
    id: 'org_1',
    company_id: companyA.id,
    name: 'Zambezi Milling Corp',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const org2: Organisation = {
    id: 'org_2',
    company_id: companyA.id,
    name: 'Luangwa Feeds Ltd',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const orgB: Organisation = {
    id: 'org_b',
    company_id: companyB.id,
    name: 'Beta Client',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const stages: PipelineStage[] = [
    { id: 'stg_new', company_id: companyA.id, pipeline_id: 'pipe_1', name: 'New Lead', order: 1, probability_percent: 10, is_won: false, is_lost: false, created_at: '', updated_at: '' },
    { id: 'stg_qual', company_id: companyA.id, pipeline_id: 'pipe_1', name: 'Qualified', order: 2, probability_percent: 30, is_won: false, is_lost: false, created_at: '', updated_at: '' },
    { id: 'stg_prop', company_id: companyA.id, pipeline_id: 'pipe_1', name: 'Proposal Sent', order: 3, probability_percent: 60, is_won: false, is_lost: false, created_at: '', updated_at: '' },
    { id: 'stg_won', company_id: companyA.id, pipeline_id: 'pipe_1', name: 'Won', order: 4, probability_percent: 100, is_won: true, is_lost: false, created_at: '', updated_at: '' },
    { id: 'stg_lost', company_id: companyA.id, pipeline_id: 'pipe_1', name: 'Lost', order: 5, probability_percent: 0, is_won: false, is_lost: true, created_at: '', updated_at: '' },
  ];

  beforeEach(() => {
    StorageService.resetToDefault();
    const db = StorageService.getDb();
    db.companies = [companyA, companyB];
    db.currentCompanyId = companyA.id;
    db.currentUser = userA;
    db.organisations = [org1, org2, orgB];
    db.pipelineStages = stages;
    db.leads = [];
    db.leadActivities = [];
    db.quotations = [];
    db.invoices = [];
    db.payments = [];
    db.marketingPlans = [];
    db.marketingActivities = [];
  });

  it('9.1 Stat cards: aggregate queries compute accurate month and total metrics', () => {
    const db = StorageService.getDb();
    const refDate = '2026-08-15';

    // 1. Leads this month (August 2026) vs previous month
    db.leads = [
      {
        id: 'lead_aug_1',
        company_id: companyA.id,
        title: 'Lead August 1',
        source: 'exhibition',
        status: 'new',
        pipeline_id: 'pipe_1',
        stage_id: 'stg_new',
        estimated_value_minor: 1000000, // 10,000 ZMW
        captured_at: '2026-08-05T09:00:00Z',
        created_at: '2026-08-05T09:00:00Z',
        updated_at: '2026-08-05T09:00:00Z',
      },
      {
        id: 'lead_aug_2',
        company_id: companyA.id,
        title: 'Lead August 2',
        source: 'whatsapp',
        status: 'new',
        pipeline_id: 'pipe_1',
        stage_id: 'stg_prop',
        estimated_value_minor: 2500000, // 25,000 ZMW
        captured_at: '2026-08-12T14:00:00Z',
        created_at: '2026-08-12T14:00:00Z',
        updated_at: '2026-08-12T14:00:00Z',
      },
      {
        id: 'lead_july',
        company_id: companyA.id,
        title: 'Lead July',
        source: 'cold_call',
        status: 'new',
        pipeline_id: 'pipe_1',
        stage_id: 'stg_qual',
        estimated_value_minor: 500000, // 5,000 ZMW
        captured_at: '2026-07-20T10:00:00Z',
        created_at: '2026-07-20T10:00:00Z',
        updated_at: '2026-07-20T10:00:00Z',
      },
    ];

    // 2. Quotations awaiting decision
    db.quotations = [
      {
        id: 'q_sent_1',
        company_id: companyA.id,
        organisation_id: org1.id,
        title: 'Quote 1',
        revision_number: 1,
        prepared_by_user_id: userA.id,
        number: 'QT-101',
        status: 'sent',
        valid_until: '2026-08-20',
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 3000000,
        discount_minor: 0,
        vat_minor: 0,
        vat_rate_bp: 0,
        total_minor: 3000000,
        issue_date: '2026-08-10',
        lines: [],
        created_at: '2026-08-10T00:00:00Z',
        updated_at: '2026-08-10T00:00:00Z',
      },
      {
        id: 'q_draft',
        company_id: companyA.id,
        organisation_id: org2.id,
        title: 'Quote 2',
        revision_number: 1,
        prepared_by_user_id: userA.id,
        number: 'QT-102',
        status: 'draft',
        valid_until: '2026-08-30',
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 1000000,
        discount_minor: 0,
        vat_minor: 0,
        vat_rate_bp: 0,
        total_minor: 1000000,
        issue_date: '2026-08-11',
        lines: [],
        created_at: '2026-08-11T00:00:00Z',
        updated_at: '2026-08-11T00:00:00Z',
      },
    ];

    // 3. Invoices (current month, past overdue, and future)
    db.invoices = [
      {
        id: 'inv_aug_1',
        company_id: companyA.id,
        organisation_id: org1.id,
        number: 'INV-101',
        issue_date: '2026-08-05',
        due_date: '2026-08-20', // Not overdue as of Aug 15
        payment_terms_days: 15,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 4000000,
        discount_minor: 0,
        vat_minor: 640000,
        vat_rate_bp: 1600,
        total_minor: 4640000,
        amount_paid_minor: 1000000,
        balance_due_minor: 3640000,
        status: 'partially_paid',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: '2026-08-05T00:00:00Z',
        updated_at: '2026-08-05T00:00:00Z',
      },
      {
        id: 'inv_july_overdue',
        company_id: companyA.id,
        organisation_id: org2.id,
        number: 'INV-100',
        issue_date: '2026-07-01',
        due_date: '2026-07-16', // Overdue as of Aug 15
        payment_terms_days: 15,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 2000000,
        discount_minor: 0,
        vat_minor: 320000,
        vat_rate_bp: 1600,
        total_minor: 2320000,
        amount_paid_minor: 0,
        balance_due_minor: 2320000,
        status: 'sent',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    // 4. Payments received this month
    db.payments = [
      {
        id: 'pmt_aug',
        company_id: companyA.id,
        organisation_id: org1.id,
        receipt_number: 'REC-101',
        payment_date: '2026-08-08',
        method: 'bank_transfer',
        reference: 'FT-991',
        currency_code: 'ZMW',
        amount_minor: 1000000,
        allocated_minor: 1000000,
        unallocated_minor: 0,
        notes: '',
        received_by_user_id: userA.id,
        created_at: '2026-08-08T00:00:00Z',
        updated_at: '2026-08-08T00:00:00Z',
      },
    ];

    const data = DashboardService.getDashboardData(companyA.id, refDate);

    // Assertions
    expect(data.stats.leadsCapturedThisMonth).toBe(2);
    expect(data.stats.openPipelineValueMinor).toBe(4000000); // 10k + 25k + 5k = 40,000 ZMW
    expect(data.stats.quotationsAwaitingDecisionCount).toBe(1);
    expect(data.stats.quotationsAwaitingDecisionValueMinor).toBe(3000000);
    expect(data.stats.invoicedThisMonthMinor).toBe(4640000);
    expect(data.stats.receivedThisMonthMinor).toBe(1000000);
    expect(data.stats.totalOutstandingMinor).toBe(5960000); // 3,640,000 + 2,320,000
    expect(data.stats.overdueAmountMinor).toBe(2320000); // Only July invoice
  });

  it('9.2 Line & Bar Chart Aggregations: computes trailing 12-month trends, pipeline stages, and aging buckets', () => {
    const db = StorageService.getDb();
    const refDate = '2026-08-15';

    // Invoices across multiple months
    db.invoices = [
      {
        id: 'inv_1',
        company_id: companyA.id,
        organisation_id: org1.id,
        number: 'INV-1',
        issue_date: '2026-08-01',
        due_date: '2026-08-15',
        payment_terms_days: 14,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 1000000,
        discount_minor: 0,
        vat_minor: 0,
        vat_rate_bp: 0,
        total_minor: 1000000,
        amount_paid_minor: 0,
        balance_due_minor: 1000000,
        status: 'sent',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
      {
        id: 'inv_2',
        company_id: companyA.id,
        organisation_id: org2.id,
        number: 'INV-2',
        issue_date: '2026-07-01',
        due_date: '2026-07-15', // 31 days overdue as of Aug 15
        payment_terms_days: 14,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 2000000,
        discount_minor: 0,
        vat_minor: 0,
        vat_rate_bp: 0,
        total_minor: 2000000,
        amount_paid_minor: 0,
        balance_due_minor: 2000000,
        status: 'sent',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    // Pipeline leads
    db.leads = [
      {
        id: 'l_prop',
        company_id: companyA.id,
        title: 'Big Deal',
        source: 'exhibition',
        status: 'proposal',
        pipeline_id: 'pipe_1',
        stage_id: 'stg_prop', // 60% probability
        estimated_value_minor: 10000000, // 100,000 ZMW
        captured_at: '2026-08-01T00:00:00Z',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
    ];

    const data = DashboardService.getDashboardData(companyA.id, refDate);

    // 12-month trend array length
    expect(data.invoicedVsReceived12Months.length).toBe(12);
    const augEntry = data.invoicedVsReceived12Months.find((m) => m.monthKey === '2026-08');
    expect(augEntry).toBeDefined();
    expect(augEntry?.invoicedMinor).toBe(1000000);

    const julyEntry = data.invoicedVsReceived12Months.find((m) => m.monthKey === '2026-07');
    expect(julyEntry).toBeDefined();
    expect(julyEntry?.invoicedMinor).toBe(2000000);

    // Pipeline by stage
    const propStage = data.pipelineByStage.find((s) => s.stageId === 'stg_prop');
    expect(propStage).toBeDefined();
    expect(propStage?.unweightedValueMinor).toBe(10000000);
    expect(propStage?.weightedValueMinor).toBe(6000000); // 60% of 100,000

    // Aging Buckets
    const currentBucket = data.agingBuckets.find((b) => b.bucketKey === 'current');
    const bucket31_60 = data.agingBuckets.find((b) => b.bucketKey === '31_60');
    expect(currentBucket?.amountMinor).toBe(1000000);
    expect(bucket31_60?.amountMinor).toBe(2000000);
  });

  it('9.3 Actionable Watch Lists: generates accurate overdue invoices, expiring quotes, due tasks, and overdue marketing', () => {
    const db = StorageService.getDb();
    const refDate = '2026-08-15';

    // 1. Overdue Invoice
    db.invoices = [
      {
        id: 'inv_late',
        company_id: companyA.id,
        organisation_id: org1.id,
        number: 'INV-OVERDUE-1',
        issue_date: '2026-07-20',
        due_date: '2026-08-05', // 10 days overdue
        payment_terms_days: 16,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 500000,
        discount_minor: 0,
        vat_minor: 0,
        vat_rate_bp: 0,
        total_minor: 500000,
        amount_paid_minor: 0,
        balance_due_minor: 500000,
        status: 'sent',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: '2026-07-20T00:00:00Z',
        updated_at: '2026-07-20T00:00:00Z',
      },
    ];

    // 2. Expiring Quotation in 4 days
    db.quotations = [
      {
        id: 'q_expiring',
        company_id: companyA.id,
        organisation_id: org2.id,
        number: 'QT-EXP-1',
        title: 'Expiring Quote',
        revision_number: 1,
        prepared_by_user_id: userA.id,
        status: 'sent',
        valid_until: '2026-08-19', // 4 days remaining from Aug 15
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 800000,
        discount_minor: 0,
        vat_minor: 0,
        vat_rate_bp: 0,
        total_minor: 800000,
        issue_date: '2026-08-01',
        lines: [],
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
    ];

    // 3. Due Task for today
    db.leadActivities = [
      {
        id: 'act_followup',
        company_id: companyA.id,
        lead_id: 'lead_1',
        activity_type: 'call',
        user_id: userA.id,
        performed_at: '2026-08-15T11:00:00Z',
        created_at: '2026-08-10T00:00:00Z',
        updated_at: '2026-08-10T00:00:00Z',
      } as any,
    ];

    // 4. Overdue Marketing Activity
    const plan: MarketingPlan = {
      id: 'plan_1',
      company_id: companyA.id,
      name: 'Trade Exhibition 2026',
      objective: 'Brand awareness',
      start_date: '2026-07-01',
      end_date: '2026-08-31',
      budget_minor: 1000000,
      owner_user_id: userA.id,
      status: 'active',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };
    db.marketingPlans = [plan];

    db.marketingActivities = [
      {
        id: 'mact_late',
        company_id: companyA.id,
        plan_id: plan.id,
        name: 'Booth Banner Printing',
        description: 'Print vinyl banners',
        channel: 'print',
        planned_start: '2026-08-01',
        planned_end: '2026-08-10', // 5 days overdue as of Aug 15
        budget_minor: 200000,
        actual_cost_minor: 180000,
        status: 'in_progress',
        owner_user_id: userA.id,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
    ];

    const data = DashboardService.getDashboardData(companyA.id, refDate);

    // Overdue Invoices list
    expect(data.overdueInvoices.length).toBe(1);
    expect(data.overdueInvoices[0].number).toBe('INV-OVERDUE-1');
    expect(data.overdueInvoices[0].daysOverdue).toBe(10);

    // Expiring Quotations list
    expect(data.expiringQuotations.length).toBe(1);
    expect(data.expiringQuotations[0].number).toBe('QT-EXP-1');
    expect(data.expiringQuotations[0].daysRemaining).toBe(4);

    // Due Tasks list
    expect(data.dueTasks.length).toBe(1);
    expect(data.dueTasks[0].activityType).toBe('call');

    // Overdue Marketing Activities list
    expect(data.overdueMarketingActivities.length).toBe(1);
    expect(data.overdueMarketingActivities[0].name).toBe('Booth Banner Printing');
    expect(data.overdueMarketingActivities[0].daysOverdue).toBe(5);
  });

  it('9.4 Tenant Isolation: dashboard queries strictly exclude foreign tenant records', () => {
    const db = StorageService.getDb();
    const refDate = '2026-08-15';

    // Company A records
    db.leads = [
      {
        id: 'lead_a',
        company_id: companyA.id,
        title: 'Company A Lead',
        source: 'exhibition',
        status: 'new',
        pipeline_id: 'pipe_1',
        stage_id: 'stg_new',
        estimated_value_minor: 100000,
        captured_at: '2026-08-01T00:00:00Z',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
      // Company B foreign records
      {
        id: 'lead_b_spy',
        company_id: companyB.id,
        title: 'Foreign Spy Lead',
        source: 'exhibition',
        status: 'new',
        pipeline_id: 'pipe_1',
        stage_id: 'stg_new',
        estimated_value_minor: 99999999,
        captured_at: '2026-08-01T00:00:00Z',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
    ];

    db.invoices = [
      {
        id: 'inv_a',
        company_id: companyA.id,
        organisation_id: org1.id,
        number: 'INV-A',
        issue_date: '2026-08-01',
        due_date: '2026-08-15',
        payment_terms_days: 14,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 100000,
        discount_minor: 0,
        vat_minor: 0,
        vat_rate_bp: 0,
        total_minor: 100000,
        amount_paid_minor: 0,
        balance_due_minor: 100000,
        status: 'sent',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
      {
        id: 'inv_b',
        company_id: companyB.id,
        organisation_id: orgB.id,
        number: 'INV-B',
        issue_date: '2026-08-01',
        due_date: '2026-08-15',
        payment_terms_days: 14,
        currency_code: 'USD',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 88888888,
        discount_minor: 0,
        vat_minor: 0,
        vat_rate_bp: 0,
        total_minor: 88888888,
        amount_paid_minor: 0,
        balance_due_minor: 88888888,
        status: 'sent',
        issued_by_user_id: 'usr_foreign',
        lines: [],
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
    ];

    const data = DashboardService.getDashboardData(companyA.id, refDate);

    expect(data.stats.leadsCapturedThisMonth).toBe(1);
    expect(data.stats.openPipelineValueMinor).toBe(100000);
    expect(data.stats.invoicedThisMonthMinor).toBe(100000);
    expect(data.stats.totalOutstandingMinor).toBe(100000);

    // Ensure foreign clients are not listed in top clients
    expect(data.top10ClientsRevenue.some((c) => c.organisationId === orgB.id)).toBe(false);
  });
});
