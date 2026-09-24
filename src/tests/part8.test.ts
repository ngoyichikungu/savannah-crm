import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../services/storageService';
import {
  leadsCapturedReport,
  clientInvoicesReport,
  clientPaymentsBalancesReport,
  clientStatementReport,
  marketingTrackerReport,
  ALL_REPORTS,
} from '../services/reports';
import {
  Company,
  Invoice,
  MarketingActivity,
  MarketingPlan,
  Organisation,
  Pipeline,
  PipelineStage,
  User,
} from '../types';

describe('Part 8: Executive Reporting Engine', () => {
  const companyA: Company = {
    id: 'comp_alpha',
    name: 'Savannah Alpha Corp',
    legal_name: 'Savannah Alpha Corporation Ltd',
    currency_code: 'ZMW',
    is_vat_registered: true,
    vat_rate_bp: 1600,
    email: 'alpha@savannah.co.zm',
    phone: '+260977000111',
    address_line1: 'Great East Road',
    city: 'Lusaka',
    country: 'Zambia',
    next_invoice_number: 100,
    next_quotation_number: 100,
    next_credit_note_number: 100,
  };

  const companyB: Company = {
    id: 'comp_beta_competitor',
    name: 'Beta Global Inc',
    legal_name: 'Beta Global Inc Ltd',
    currency_code: 'USD',
    is_vat_registered: false,
    vat_rate_bp: 0,
    email: 'beta@global.com',
    phone: '+123456789',
    address_line1: 'Main Street',
    city: 'New York',
    country: 'USA',
    next_invoice_number: 1,
    next_quotation_number: 1,
    next_credit_note_number: 1,
  };

  const userA: User = {
    id: 'user_analyst_1',
    name: 'Auditor Analyst',
    email: 'auditor@savannah.co.zm',
    role: 'admin',
    company_ids: [companyA.id],
    current_company_id: companyA.id,
  };

  const orgA1: Organisation = {
    id: 'org_a1',
    company_id: companyA.id,
    name: 'Kafue Mining Consortium',
    is_active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  };

  const orgA2: Organisation = {
    id: 'org_a2',
    company_id: companyA.id,
    name: 'Zambezi Agro Holdings',
    is_active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  };

  const orgB1: Organisation = {
    id: 'org_b1',
    company_id: companyB.id,
    name: 'Foreign Beta Org',
    is_active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  };

  const defaultPipeline: Pipeline = {
    id: 'pipe_default',
    company_id: companyA.id,
    name: 'Enterprise Software Pipeline',
    is_default: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  };

  const stages: PipelineStage[] = [
    { id: 'stg_new', company_id: companyA.id, pipeline_id: 'pipe_default', name: 'New Lead', order: 1, probability_percent: 10, is_won: false, is_lost: false, created_at: '', updated_at: '' },
    { id: 'stg_contact', company_id: companyA.id, pipeline_id: 'pipe_default', name: 'Contacted', order: 2, probability_percent: 25, is_won: false, is_lost: false, created_at: '', updated_at: '' },
    { id: 'stg_prop', company_id: companyA.id, pipeline_id: 'pipe_default', name: 'Proposal Sent', order: 3, probability_percent: 60, is_won: false, is_lost: false, created_at: '', updated_at: '' },
    { id: 'stg_won', company_id: companyA.id, pipeline_id: 'pipe_default', name: 'Closed Won', order: 4, probability_percent: 100, is_won: true, is_lost: false, created_at: '', updated_at: '' },
    { id: 'stg_lost', company_id: companyA.id, pipeline_id: 'pipe_default', name: 'Closed Lost', order: 5, probability_percent: 0, is_won: false, is_lost: true, created_at: '', updated_at: '' },
  ];

  beforeEach(() => {
    StorageService.resetToDefault();
    const db = StorageService.getDb();
    db.companies = [companyA, companyB];
    db.currentCompanyId = companyA.id;
    db.currentUser = userA;
    db.organisations = [orgA1, orgA2, orgB1];
    db.pipelines = [defaultPipeline];
    db.pipelineStages = stages;
    db.leads = [];
    db.leadActivities = [];
    db.leadStageHistories = [];
    db.marketingPlans = [];
    db.marketingActivities = [];
    db.activityResults = [];
    db.invoices = [];
    db.payments = [];
    db.paymentAllocations = [];
    db.creditNotes = [];
    db.quotations = [];
  });

  it('8.1 Engine requirements: All 8 reports implement the ReportContract correctly', () => {
    expect(ALL_REPORTS.length).toBe(8);

    for (const report of ALL_REPORTS) {
      expect(report.id).toBeDefined();
      expect(typeof report.name).toBe('string');
      expect(typeof report.description).toBe('string');
      expect(typeof report.parameters).toBe('function');
      expect(typeof report.columns).toBe('function');
      expect(typeof report.rows).toBe('function');
      expect(typeof report.totals).toBe('function');
      expect(typeof report.exportCsv).toBe('function');
      expect(typeof report.exportPdfHtml).toBe('function');

      const params = report.parameters(companyA);
      expect(Array.isArray(params)).toBe(true);

      const cols = report.columns({}, companyA);
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
    }
  });

  it('8.2 Tenant isolation: every report strictly filters by company_id and excludes foreign tenant rows', () => {
    const db = StorageService.getDb();

    // Add company A lead and company B lead
    db.leads = [
      {
        id: 'lead_a',
        company_id: companyA.id,
        title: 'Peter Kapata - Kafue Millers',
        source: 'exhibition',
        status: 'won',
        pipeline_id: 'pipe_default',
        stage_id: 'stg_new',
        estimated_value_minor: 5000000,
        created_at: '2026-08-10T10:00:00Z',
        updated_at: '2026-08-10T10:00:00Z',
      },
      {
        id: 'lead_b_spy',
        company_id: companyB.id,
        title: 'Spy Foreign - Beta Corp',
        source: 'exhibition',
        status: 'won',
        pipeline_id: 'pipe_default',
        stage_id: 'stg_new',
        estimated_value_minor: 99999999,
        created_at: '2026-08-10T10:00:00Z',
        updated_at: '2026-08-10T10:00:00Z',
      },
    ];

    // Add Company A & B invoices
    db.invoices = [
      {
        id: 'inv_a',
        company_id: companyA.id,
        organisation_id: orgA1.id,
        number: 'INV-A-001',
        issue_date: '2026-08-15',
        due_date: '2026-08-30',
        payment_terms_days: 15,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 1000000,
        discount_minor: 0,
        vat_minor: 160000,
        vat_rate_bp: 1600,
        total_minor: 1160000,
        amount_paid_minor: 0,
        balance_due_minor: 1160000,
        status: 'sent',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: '2026-08-15T10:00:00Z',
        updated_at: '2026-08-15T10:00:00Z',
      },
      {
        id: 'inv_b',
        company_id: companyB.id,
        organisation_id: orgB1.id,
        number: 'INV-B-001',
        issue_date: '2026-08-15',
        due_date: '2026-08-30',
        payment_terms_days: 15,
        currency_code: 'USD',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 5000000,
        discount_minor: 0,
        vat_minor: 0,
        vat_rate_bp: 0,
        total_minor: 5000000,
        amount_paid_minor: 0,
        balance_due_minor: 5000000,
        status: 'sent',
        issued_by_user_id: 'user_b',
        lines: [],
        created_at: '2026-08-15T10:00:00Z',
        updated_at: '2026-08-15T10:00:00Z',
      },
    ];

    const request = {
      companyId: companyA.id,
      dateRange: { startDate: '2026-08-01', endDate: '2026-08-31', preset: 'custom' as const },
      filters: {},
    };

    // 1. Leads Captured
    const leadRows = leadsCapturedReport.rows(companyA.id, request);
    expect(leadRows.length).toBe(1);
    expect(leadRows[0].id).toBe('lead_a');

    // 2. Client Invoices
    const invRows = clientInvoicesReport.rows(companyA.id, request);
    expect(invRows.length).toBe(1);
    expect(invRows[0].invoiceNumber).toBe('INV-A-001');

    // 3. Client Payments and Balances
    const balRows = clientPaymentsBalancesReport.rows(companyA.id, request);
    expect(balRows.some((b) => (b.organisationId || b.clientId) === orgB1.id)).toBe(false);
  });

  it('8.3 Date range semantics: inclusive of both start and end date', () => {
    const db = StorageService.getDb();
    db.invoices = [
      {
        id: 'inv_exact_start',
        company_id: companyA.id,
        organisation_id: orgA1.id,
        number: 'INV-001',
        issue_date: '2026-08-01', // Exact start date
        due_date: '2026-08-15',
        payment_terms_days: 14,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 100000,
        discount_minor: 0,
        vat_minor: 16000,
        vat_rate_bp: 1600,
        total_minor: 116000,
        amount_paid_minor: 0,
        balance_due_minor: 116000,
        status: 'sent',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
      {
        id: 'inv_exact_end',
        company_id: companyA.id,
        organisation_id: orgA1.id,
        number: 'INV-002',
        issue_date: '2026-08-31', // Exact end date
        due_date: '2026-09-15',
        payment_terms_days: 15,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 200000,
        discount_minor: 0,
        vat_minor: 32000,
        vat_rate_bp: 1600,
        total_minor: 232000,
        amount_paid_minor: 0,
        balance_due_minor: 232000,
        status: 'sent',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: '2026-08-31T23:59:59Z',
        updated_at: '2026-08-31T23:59:59Z',
      },
      {
        id: 'inv_out_of_range',
        company_id: companyA.id,
        organisation_id: orgA1.id,
        number: 'INV-003',
        issue_date: '2026-09-01', // Strictly outside range
        due_date: '2026-09-15',
        payment_terms_days: 14,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 300000,
        discount_minor: 0,
        vat_minor: 48000,
        vat_rate_bp: 1600,
        total_minor: 348000,
        amount_paid_minor: 0,
        balance_due_minor: 348000,
        status: 'sent',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ];

    const request = {
      companyId: companyA.id,
      dateRange: { startDate: '2026-08-01', endDate: '2026-08-31', preset: 'custom' as const },
      filters: {},
    };

    const rows = clientInvoicesReport.rows(companyA.id, request);
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.invoiceNumber)).toEqual(['INV-001', 'INV-002']);
  });

  it('8.4 Client Payments & Balances: reconciles opening, invoiced, received, closing, and aging buckets', () => {
    const db = StorageService.getDb();

    // 1. Prior Period Invoice (< 2026-08-01): 5,000 ZMW
    db.invoices.push({
      id: 'inv_prior',
      company_id: companyA.id,
      organisation_id: orgA1.id,
      number: 'INV-JULY-001',
      issue_date: '2026-07-15',
      due_date: '2026-07-30',
      payment_terms_days: 15,
      currency_code: 'ZMW',
      discount_type: 'none',
      discount_value: 0,
      subtotal_minor: 500000,
      discount_minor: 0,
      vat_minor: 0,
      vat_rate_bp: 0,
      total_minor: 500000,
      amount_paid_minor: 200000,
      balance_due_minor: 300000,
      status: 'partially_paid',
      issued_by_user_id: userA.id,
      lines: [],
      created_at: '2026-07-15T00:00:00Z',
      updated_at: '2026-07-15T00:00:00Z',
    });

    // 2. Prior Period Payment (< 2026-08-01): 2,000 ZMW
    db.payments.push({
      id: 'pmt_prior',
      company_id: companyA.id,
      organisation_id: orgA1.id,
      receipt_number: 'REC-JULY-001',
      payment_date: '2026-07-20',
      method: 'bank_transfer',
      reference: 'TXN-777',
      currency_code: 'ZMW',
      amount_minor: 200000,
      allocated_minor: 200000,
      unallocated_minor: 0,
      notes: '',
      received_by_user_id: userA.id,
      created_at: '2026-07-20T00:00:00Z',
      updated_at: '2026-07-20T00:00:00Z',
    });

    // Prior allocation
    db.paymentAllocations.push({
      id: 'alloc_prior',
      company_id: companyA.id,
      payment_id: 'pmt_prior',
      invoice_id: 'inv_prior',
      amount_minor: 200000,
      allocated_by_user_id: userA.id,
      allocated_at: '2026-07-20T00:00:00Z',
      created_at: '2026-07-20T00:00:00Z',
      updated_at: '2026-07-20T00:00:00Z',
    });

    // 3. Current Period Invoice in August: 10,000 ZMW
    db.invoices.push({
      id: 'inv_current',
      company_id: companyA.id,
      organisation_id: orgA1.id,
      number: 'INV-AUG-001',
      issue_date: '2026-08-10',
      due_date: '2026-08-25',
      payment_terms_days: 15,
      currency_code: 'ZMW',
      discount_type: 'none',
      discount_value: 0,
      subtotal_minor: 1000000,
      discount_minor: 0,
      vat_minor: 0,
      vat_rate_bp: 0,
      total_minor: 1000000,
      amount_paid_minor: 400000,
      balance_due_minor: 600000,
      status: 'partially_paid',
      issued_by_user_id: userA.id,
      lines: [],
      created_at: '2026-08-10T00:00:00Z',
      updated_at: '2026-08-10T00:00:00Z',
    });

    // 4. Current Period Payment in August: 4,000 ZMW
    db.payments.push({
      id: 'pmt_current',
      company_id: companyA.id,
      organisation_id: orgA1.id,
      receipt_number: 'REC-AUG-001',
      payment_date: '2026-08-15',
      method: 'bank_transfer',
      reference: 'TXN-888',
      currency_code: 'ZMW',
      amount_minor: 400000,
      allocated_minor: 400000,
      unallocated_minor: 0,
      notes: '',
      received_by_user_id: userA.id,
      created_at: '2026-08-15T00:00:00Z',
      updated_at: '2026-08-15T00:00:00Z',
    });

    db.paymentAllocations.push({
      id: 'alloc_current',
      company_id: companyA.id,
      payment_id: 'pmt_current',
      invoice_id: 'inv_current',
      amount_minor: 400000,
      allocated_by_user_id: userA.id,
      allocated_at: '2026-08-15T00:00:00Z',
      created_at: '2026-08-15T00:00:00Z',
      updated_at: '2026-08-15T00:00:00Z',
    });

    const request = {
      companyId: companyA.id,
      dateRange: { startDate: '2026-08-01', endDate: '2026-08-31', preset: 'custom' as const },
      filters: {},
    };

    const rows = clientPaymentsBalancesReport.rows(companyA.id, request);
    const totals = clientPaymentsBalancesReport.totals(rows, {}, companyA, request);

    const client1Row = rows.find((r) => (r.organisationId || r.clientId) === orgA1.id);
    expect(client1Row).toBeDefined();

    // Opening balance = 5,000 - 2,000 = 3,000 (300,000 minor)
    expect(client1Row?.openingBalanceMinor).toBe(300000);

    // Invoiced in range = 10,000 (1,000,000 minor)
    expect(client1Row?.invoicedInRangeMinor).toBe(1000000);

    // Received in range = 4,000 (400,000 minor)
    expect(client1Row?.receivedInRangeMinor).toBe(400000);

    // Closing balance = Opening + Invoiced - Received = 3,000 + 10,000 - 4,000 = 9,000 (900,000 minor)
    expect(client1Row?.closingBalanceMinor).toBe(900000);

    // Mathematical reconciliation:
    // 1. Closing = Opening + Invoiced - Received
    expect(totals.closingBalanceMinor).toBe(
      totals.openingBalanceMinor + totals.invoicedInRangeMinor - totals.receivedInRangeMinor
    );

    // 2. Sum of aging brackets equals closing balance
    const totalAging =
      (client1Row!.currentMinor ?? 0) +
      (client1Row!.days1_30Minor ?? 0) +
      (client1Row!.days31_60Minor ?? 0) +
      (client1Row!.days61_90Minor ?? 0) +
      (client1Row!.days90PlusMinor ?? 0);
    expect(totalAging).toBe(client1Row!.closingBalanceMinor);

    // 3. Closing balance matches sum of unpaid invoices at end date (300,000 + 600,000 = 900,000)
    expect(totals.closingBalanceMinor).toBe(900000);
  });

  it('8.5 Client Statement Generator: computes correct ledger, debit/credit flow, running balance, and remittance advice', () => {
    const db = StorageService.getDb();

    // Setup client invoice & payment
    db.invoices.push({
      id: 'inv_stmt_1',
      company_id: companyA.id,
      organisation_id: orgA1.id,
      number: 'INV-101',
      issue_date: '2026-08-05',
      due_date: '2026-08-20',
      payment_terms_days: 15,
      currency_code: 'ZMW',
      discount_type: 'none',
      discount_value: 0,
      subtotal_minor: 200000,
      discount_minor: 0,
      vat_minor: 32000,
      vat_rate_bp: 1600,
      total_minor: 232000,
      amount_paid_minor: 232000,
      balance_due_minor: 0,
      status: 'paid',
      issued_by_user_id: userA.id,
      lines: [],
      created_at: '2026-08-05T08:00:00Z',
      updated_at: '2026-08-05T08:00:00Z',
    });

    db.payments.push({
      id: 'pmt_stmt_1',
      company_id: companyA.id,
      organisation_id: orgA1.id,
      receipt_number: 'REC-101',
      payment_date: '2026-08-10',
      method: 'bank_transfer',
      reference: 'EFT-444',
      currency_code: 'ZMW',
      amount_minor: 232000,
      allocated_minor: 232000,
      unallocated_minor: 0,
      notes: '',
      received_by_user_id: userA.id,
      created_at: '2026-08-10T08:00:00Z',
      updated_at: '2026-08-10T08:00:00Z',
    });

    const request = {
      companyId: companyA.id,
      dateRange: { startDate: '2026-08-01', endDate: '2026-08-31', preset: 'custom' as const },
      filters: { client: orgA1.id },
    };

    const rows = clientStatementReport.rows(companyA.id, request);
    expect(rows.length).toBe(3); // Opening (0), Invoice (+2320), Payment (-2320)

    expect(rows[0].type).toBe('OPENING');
    expect(rows[0].runningBalanceMinor).toBe(0);

    expect(rows[1].type).toBe('INVOICE');
    expect(rows[1].debitMinor).toBe(232000);
    expect(rows[1].runningBalanceMinor).toBe(232000);

    expect(rows[2].type).toBe('PAYMENT');
    expect(rows[2].creditMinor).toBe(232000);
    expect(rows[2].runningBalanceMinor).toBe(0);

    const totals = clientStatementReport.totals(rows, request.filters, companyA, request);
    expect(totals.closingBalanceMinor || totals.totalClosingBalanceMinor).toBe(0);

    // Test PDF export format
    const html = clientStatementReport.exportPdfHtml(companyA, rows, totals, request.filters, request);
    expect(html).toContain('Statement of Account');
    expect(html).toContain(orgA1.name);
    expect(html).toContain('Remittance & Settlement Details');
  });

  it('8.6 Marketing Tracker Report: calculates ROI, cost per lead, and revenue attribution', () => {
    const db = StorageService.getDb();

    const plan: MarketingPlan = {
      id: 'plan_q3',
      company_id: companyA.id,
      name: 'Q3 Enterprise Growth',
      objective: 'Acquire 20 enterprise mining clients',
      start_date: '2026-07-01',
      end_date: '2026-09-30',
      budget_minor: 5000000,
      owner_user_id: userA.id,
      status: 'active',
      created_at: '2026-07-01T08:00:00Z',
      updated_at: '2026-07-01T08:00:00Z',
    };
    db.marketingPlans = [plan];

    const activity: MarketingActivity = {
      id: 'act_exhibition_1',
      company_id: companyA.id,
      plan_id: plan.id,
      name: 'Mining Expo 2026 Booth',
      description: 'Main pavilion booth',
      channel: 'exhibition',
      planned_start: '2026-08-01',
      planned_end: '2026-08-05',
      actual_start: '2026-08-01',
      actual_end: '2026-08-05',
      budget_minor: 2000000, // 20,000 ZMW
      actual_cost_minor: 1500000, // 15,000 ZMW
      status: 'completed',
      owner_user_id: userA.id,
      created_at: '2026-08-01T08:00:00Z',
      updated_at: '2026-08-01T08:00:00Z',
    };
    db.marketingActivities = [activity];

    db.activityResults = [
      {
        id: 'res_1',
        company_id: companyA.id,
        marketing_activity_id: activity.id,
        leads_generated: 15,
        contacts_made: 40,
        quotations_issued: 5,
        revenue_attributed_minor: 4500000, // 45,000 ZMW
        recorded_by_user_id: userA.id,
        recorded_at: '2026-08-10T08:00:00Z',
        created_at: '2026-08-10T08:00:00Z',
        updated_at: '2026-08-10T08:00:00Z',
      },
    ];

    const request = {
      companyId: companyA.id,
      dateRange: { startDate: '2026-08-01', endDate: '2026-08-31', preset: 'custom' as const },
      filters: {},
    };

    const rows = marketingTrackerReport.rows(companyA.id, request);
    expect(rows.length).toBe(1);

    const r = rows[0];
    expect(r.budgetMinor).toBe(2000000);
    expect(r.actualCostMinor).toBe(1500000);
    expect(r.varianceMinor).toBe(500000); // 20k - 15k = +5k favorable
    expect(r.leadsGenerated).toBe(15);
    expect(r.costPerLeadMinor).toBe(100000); // 15,000 / 15 = 1,000 ZMW per lead (100,000 minor)
    expect(r.revenueAttributedMinor).toBe(4500000);
    expect(r.roiPercent).toBe(200); // (45k - 15k) / 15k * 100% = 200% ROI

    const totals = marketingTrackerReport.totals(rows, {}, companyA, request);
    expect(totals.totalRevenueAttributedMinor).toBe(4500000);
    expect(totals.overallRoiPercent).toBe(200);
  });

  it('8.7 Performance constraint: processes 50,000 rows in under 2 seconds', () => {
    const db = StorageService.getDb();

    // Synthesize 50,000 invoices
    const count = 50000;
    const synthInvoices: Invoice[] = new Array(count);

    const startDate = '2026-08-01';
    const endDate = '2026-08-31';

    for (let i = 0; i < count; i++) {
      const day = ((i % 28) + 1).toString().padStart(2, '0');
      synthInvoices[i] = {
        id: `inv_perf_${i}`,
        company_id: i % 10 === 0 ? companyB.id : companyA.id, // Tenant mix
        organisation_id: i % 2 === 0 ? orgA1.id : orgA2.id,
        number: `INV-PERF-${i}`,
        issue_date: `2026-08-${day}`,
        due_date: `2026-09-${day}`,
        payment_terms_days: 15,
        currency_code: 'ZMW',
        discount_type: 'none',
        discount_value: 0,
        subtotal_minor: 100000,
        discount_minor: 0,
        vat_minor: 16000,
        vat_rate_bp: 1600,
        total_minor: 116000,
        amount_paid_minor: 58000,
        balance_due_minor: 58000,
        status: 'partially_paid',
        issued_by_user_id: userA.id,
        lines: [],
        created_at: `2026-08-${day}T00:00:00Z`,
        updated_at: `2026-08-${day}T00:00:00Z`,
      };
    }

    db.invoices = synthInvoices;

    const request = {
      companyId: companyA.id,
      dateRange: { startDate, endDate, preset: 'custom' as const },
      filters: {},
    };

    const startTime = performance.now();
    const rows = clientInvoicesReport.rows(companyA.id, request);
    const totals = clientInvoicesReport.totals(rows, {}, companyA, request);
    const durationMs = performance.now() - startTime;

    expect(rows.length).toBe(45000); // 90% belonged to Company A
    expect(totals.count).toBe(45000);
    expect(durationMs).toBeLessThan(2000); // Must run in under 2000ms (2s)
  });
});
