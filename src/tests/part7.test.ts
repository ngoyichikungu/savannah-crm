import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../services/storageService';
import { MarketingService } from '../services/marketingService';
import {
  Company,
  Invoice,
  Lead,
  MarketingActivity,
  MarketingPlan,
  MarketingTarget,
  Organisation,
  Quotation,
  User,
} from '../types';

describe('Part 7: Sales and Marketing Plan Tracker Engine', () => {
  const mockCompany: Company = {
    id: 'comp_test_marketing',
    name: 'Savannah Tech Ltd',
    legal_name: 'Savannah Tech Ltd',
    currency_code: 'ZMW',
    is_vat_registered: true,
    vat_rate_bp: 1600,
    email: 'info@savannah.co.zm',
    phone: '+260977000111',
    address_line1: 'Great East Road',
    city: 'Lusaka',
    country: 'Zambia',
    next_invoice_number: 1,
    next_quotation_number: 1,
    next_credit_note_number: 1,
  };

  const adminUser: User = {
    id: 'user_mktg_admin',
    name: 'Marketing Lead',
    email: 'mktg@savannah.co.zm',
    role: 'admin',
    company_ids: [mockCompany.id],
    current_company_id: mockCompany.id,
  };

  const clientOrg: Organisation = {
    id: 'org_copper_client',
    company_id: mockCompany.id,
    name: 'Copperbelt Mines PLC',
    is_active: true,
    created_at: '2026-07-01T08:00:00Z',
    updated_at: '2026-07-01T08:00:00Z',
  };

  beforeEach(() => {
    StorageService.resetToDefault();
    const db = StorageService.getDb();
    db.companies = [mockCompany];
    db.currentCompanyId = mockCompany.id;
    db.currentUser = adminUser;
    db.organisations = [clientOrg];
    db.contacts = [];
    db.items = [];
    db.quotations = [];
    db.invoices = [];
    db.creditNotes = [];
    db.payments = [];
    db.paymentAllocations = [];
    db.marketingPlans = [];
    db.marketingTargets = [];
    db.marketingActivities = [];
    db.activityResults = [];
    db.leads = [];
  });

  describe('7.3.1: Target vs Actual Computes Correctly for Each Metric Type Over Period Boundaries', () => {
    it('accurately computes target progress and actuals across all 7 supported metric types', () => {
      const plan: MarketingPlan = {
        id: 'plan_q3_test',
        company_id: mockCompany.id,
        name: 'Q3 Growth Plan',
        objective: 'Scale B2B customer acquisition',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        budget_minor: 10000000, // K100,000.00
        owner_user_id: adminUser.id,
        status: 'active',
        created_at: '2026-06-25T08:00:00Z',
        updated_at: '2026-06-25T08:00:00Z',
      };
      StorageService.saveMarketingPlan(plan);

      const activity: MarketingActivity = {
        id: 'act_mining_expo',
        company_id: mockCompany.id,
        plan_id: plan.id,
        name: 'Mining Expo',
        channel: 'exhibition',
        planned_start: '2026-07-01',
        planned_end: '2026-07-15',
        budget_minor: 5000000,
        actual_cost_minor: 4500000,
        status: 'completed',
        owner_user_id: adminUser.id,
        created_at: '2026-06-25T08:00:00Z',
        updated_at: '2026-07-16T08:00:00Z',
      };
      StorageService.saveMarketingActivity(activity);

      // Seed 2 leads: 1 created on start boundary (2026-07-01), 1 created on end boundary (2026-09-30)
      const lead1: Lead = {
        id: 'lead_bnd_start',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        title: 'Start Boundary Lead',
        marketing_activity_id: activity.id,
        status: 'won',
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-05T00:00:00Z',
      };
      const lead2: Lead = {
        id: 'lead_bnd_end',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        title: 'End Boundary Lead',
        marketing_activity_id: activity.id,
        status: 'contacted',
        created_at: '2026-09-30T23:59:59Z',
        updated_at: '2026-09-30T23:59:59Z',
      };
      StorageService.saveLead(lead1);
      StorageService.saveLead(lead2);

      // Seed quotation
      const quote: Quotation = {
        id: 'qt_test_1',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        lead_id: lead1.id,
        number: 'QT-2026-0001',
        title: 'ERP Quote',
        issue_date: '2026-07-10',
        valid_until: '2026-08-10',
        currency_code: 'ZMW',
        subtotal_minor: 5000000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 1600,
        vat_minor: 800000,
        total_minor: 5800000,
        status: 'accepted',
        revision_number: 0,
        prepared_by_user_id: adminUser.id,
        created_at: '2026-07-10T10:00:00Z',
        updated_at: '2026-07-10T10:00:00Z',
      };
      StorageService.saveQuotation(quote);

      // Seed invoice with payment
      const inv: Invoice = {
        id: 'inv_test_1',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        quotation_id: quote.id,
        number: 'INV-2026-0001',
        issue_date: '2026-07-15',
        due_date: '2026-08-15',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 5000000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 1600,
        vat_minor: 800000,
        total_minor: 5800000,
        amount_paid_minor: 5800000,
        balance_due_minor: 0,
        status: 'paid',
        fully_paid_at: '2026-07-20T10:00:00Z',
        issued_by_user_id: adminUser.id,
        created_at: '2026-07-15T10:00:00Z',
        updated_at: '2026-07-20T10:00:00Z',
      };
      StorageService.saveInvoice(inv);

      // Test Metric: leads_captured
      const targetLeads: MarketingTarget = {
        id: 't_leads',
        company_id: mockCompany.id,
        plan_id: plan.id,
        metric: 'leads_captured',
        target_value: 2,
        period: 'quarterly',
        period_start: '2026-07-01',
        period_end: '2026-09-30',
        created_at: '2026-06-25T08:00:00Z',
        updated_at: '2026-06-25T08:00:00Z',
      };
      const resLeads = MarketingService.calculateTargetActual(targetLeads, [activity]);
      expect(resLeads.actual_value).toBe(2);
      expect(resLeads.achievement_percentage).toBe(100);
      expect(resLeads.status).toBe('achieved');

      // Test Metric: leads_contacted
      const targetContacted: MarketingTarget = {
        id: 't_contacted',
        company_id: mockCompany.id,
        plan_id: plan.id,
        metric: 'leads_contacted',
        target_value: 2,
        period: 'quarterly',
        period_start: '2026-07-01',
        period_end: '2026-09-30',
        created_at: '2026-06-25T08:00:00Z',
        updated_at: '2026-06-25T08:00:00Z',
      };
      const resContacted = MarketingService.calculateTargetActual(targetContacted, [activity]);
      expect(resContacted.actual_value).toBe(2); // 1 won + 1 contacted

      // Test Metric: quotations_sent & quotation_value
      const targetQuotes: MarketingTarget = {
        id: 't_quotes',
        company_id: mockCompany.id,
        plan_id: plan.id,
        metric: 'quotations_sent',
        target_value: 1,
        period: 'quarterly',
        period_start: '2026-07-01',
        period_end: '2026-09-30',
        created_at: '2026-06-25T08:00:00Z',
        updated_at: '2026-06-25T08:00:00Z',
      };
      const resQuotes = MarketingService.calculateTargetActual(targetQuotes, [activity]);
      expect(resQuotes.actual_value).toBe(1);

      const targetQuoteVal: MarketingTarget = {
        id: 't_quote_val',
        company_id: mockCompany.id,
        plan_id: plan.id,
        metric: 'quotation_value',
        target_value: 5800000,
        period: 'quarterly',
        period_start: '2026-07-01',
        period_end: '2026-09-30',
        created_at: '2026-06-25T08:00:00Z',
        updated_at: '2026-06-25T08:00:00Z',
      };
      const resQuoteVal = MarketingService.calculateTargetActual(targetQuoteVal, [activity]);
      expect(resQuoteVal.actual_value).toBe(5800000);

      // Test Metric: invoices_issued
      const targetInv: MarketingTarget = {
        id: 't_inv',
        company_id: mockCompany.id,
        plan_id: plan.id,
        metric: 'invoices_issued',
        target_value: 1,
        period: 'quarterly',
        period_start: '2026-07-01',
        period_end: '2026-09-30',
        created_at: '2026-06-25T08:00:00Z',
        updated_at: '2026-06-25T08:00:00Z',
      };
      const resInv = MarketingService.calculateTargetActual(targetInv, [activity]);
      expect(resInv.actual_value).toBe(1);

      // Test Metric: revenue
      const targetRev: MarketingTarget = {
        id: 't_rev',
        company_id: mockCompany.id,
        plan_id: plan.id,
        metric: 'revenue',
        target_value: 5000000,
        period: 'quarterly',
        period_start: '2026-07-01',
        period_end: '2026-09-30',
        created_at: '2026-06-25T08:00:00Z',
        updated_at: '2026-06-25T08:00:00Z',
      };
      const resRev = MarketingService.calculateTargetActual(targetRev, [activity]);
      expect(resRev.actual_value).toBe(5800000);
      expect(resRev.achievement_percentage).toBe(116);
      expect(resRev.status).toBe('achieved');

      // Test Metric: conversion_rate (1 won out of 2 total = 50% = 5000 bp)
      const targetConv: MarketingTarget = {
        id: 't_conv',
        company_id: mockCompany.id,
        plan_id: plan.id,
        metric: 'conversion_rate',
        target_value: 4000, // 40%
        period: 'quarterly',
        period_start: '2026-07-01',
        period_end: '2026-09-30',
        created_at: '2026-06-25T08:00:00Z',
        updated_at: '2026-06-25T08:00:00Z',
      };
      const resConv = MarketingService.calculateTargetActual(targetConv, [activity]);
      expect(resConv.actual_value).toBe(5000); // 50.00%
      expect(resConv.achievement_percentage).toBe(125);
    });
  });

  describe('7.3.2: Attributed Revenue Deduplication (No Double Counting Across Multiple Paths)', () => {
    it('activity attributed revenue equals the sum of paid invoices traceable through linked leads, and does NOT double count an invoice reachable by two paths', () => {
      const activity: MarketingActivity = {
        id: 'act_multi_path',
        company_id: mockCompany.id,
        plan_id: 'plan_test',
        name: 'Executive Roadshow',
        channel: 'field_visit',
        planned_start: '2026-08-01',
        planned_end: '2026-08-10',
        budget_minor: 5000000,
        actual_cost_minor: 4000000,
        status: 'completed',
        owner_user_id: adminUser.id,
        created_at: '2026-07-20T08:00:00Z',
        updated_at: '2026-08-11T08:00:00Z',
      };
      StorageService.saveMarketingActivity(activity);

      // Two distinct leads from the same activity for the same organisation
      const leadA: Lead = {
        id: 'lead_path_A',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        title: 'Mining ERP Phase 1',
        marketing_activity_id: activity.id,
        status: 'won',
        created_at: '2026-08-02T10:00:00Z',
        updated_at: '2026-08-10T10:00:00Z',
      };
      const leadB: Lead = {
        id: 'lead_path_B',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        title: 'Mining Wi-Fi Expansion Phase 2',
        marketing_activity_id: activity.id,
        status: 'won',
        created_at: '2026-08-03T10:00:00Z',
        updated_at: '2026-08-10T10:00:00Z',
      };
      StorageService.saveLead(leadA);
      StorageService.saveLead(leadB);

      // Quotation linked to Lead A
      const quoteA: Quotation = {
        id: 'quote_A',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        lead_id: leadA.id,
        number: 'QT-2026-0010',
        title: 'Combined Solution',
        issue_date: '2026-08-05',
        valid_until: '2026-09-05',
        currency_code: 'ZMW',
        subtotal_minor: 10000000, // K100,000.00
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 1600,
        vat_minor: 1600000,
        total_minor: 11600000,
        status: 'accepted',
        revision_number: 0,
        prepared_by_user_id: adminUser.id,
        created_at: '2026-08-05T10:00:00Z',
        updated_at: '2026-08-05T10:00:00Z',
      };
      StorageService.saveQuotation(quoteA);

      // Single invoice that is reachable via:
      // Path 1: invoice.quotation_id -> quoteA.lead_id -> leadA
      // Path 2: invoice.organisation_id -> clientOrg.id -> leadB
      const sharedInvoice: Invoice = {
        id: 'inv_shared_1',
        company_id: mockCompany.id,
        organisation_id: clientOrg.id,
        quotation_id: quoteA.id,
        number: 'INV-2026-0010',
        issue_date: '2026-08-10',
        due_date: '2026-09-10',
        payment_terms_days: 30,
        currency_code: 'ZMW',
        subtotal_minor: 10000000,
        discount_type: 'none',
        discount_value: 0,
        discount_minor: 0,
        vat_rate_bp: 1600,
        vat_minor: 1600000,
        total_minor: 11600000, // K116,000.00
        amount_paid_minor: 11600000, // Fully paid
        balance_due_minor: 0,
        status: 'paid',
        fully_paid_at: '2026-08-15T12:00:00Z',
        issued_by_user_id: adminUser.id,
        created_at: '2026-08-10T10:00:00Z',
        updated_at: '2026-08-15T12:00:00Z',
      };
      StorageService.saveInvoice(sharedInvoice);

      // Execute attribution calculation
      const attributionResult = MarketingService.calculateActivityRevenue(activity.id);

      // Must be EXACTLY K116,000.00 (11600000 minor) and NOT 2x (23200000 minor)
      expect(attributionResult.revenue_minor).toBe(11600000);
      expect(attributionResult.traceable_invoices.length).toBe(1);
      expect(attributionResult.traceable_invoices[0].id).toBe('inv_shared_1');
    });
  });

  describe('7.3.3: Budget Aggregation Across Activities Equals Plan Total', () => {
    it('computes aggregated activity budgets, actual costs, and variances accurately', () => {
      const plan: MarketingPlan = {
        id: 'plan_budget_test',
        company_id: mockCompany.id,
        name: 'Annual Marketing Strategy 2026',
        objective: 'Comprehensive multi-channel outreach',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        budget_minor: 25000000, // K250,000.00
        owner_user_id: adminUser.id,
        status: 'active',
        created_at: '2026-01-01T08:00:00Z',
        updated_at: '2026-01-01T08:00:00Z',
      };
      StorageService.saveMarketingPlan(plan);

      // Activity 1: Exhibition (K100k budget, K95k actual)
      const act1: MarketingActivity = {
        id: 'act_1',
        company_id: mockCompany.id,
        plan_id: plan.id,
        name: 'Agritech Expo',
        channel: 'exhibition',
        planned_start: '2026-04-10',
        planned_end: '2026-04-14',
        budget_minor: 10000000,
        actual_cost_minor: 9500000,
        status: 'completed',
        owner_user_id: adminUser.id,
        created_at: '2026-01-05T08:00:00Z',
        updated_at: '2026-04-15T08:00:00Z',
      };

      // Activity 2: Radio Campaign (K80k budget, K80k actual)
      const act2: MarketingActivity = {
        id: 'act_2',
        company_id: mockCompany.id,
        plan_id: plan.id,
        name: 'Radio Spots',
        channel: 'radio',
        planned_start: '2026-05-01',
        planned_end: '2026-05-31',
        budget_minor: 8000000,
        actual_cost_minor: 8000000,
        status: 'completed',
        owner_user_id: adminUser.id,
        created_at: '2026-01-05T08:00:00Z',
        updated_at: '2026-06-01T08:00:00Z',
      };

      // Activity 3: WhatsApp Drip (K70k budget, K50k actual)
      const act3: MarketingActivity = {
        id: 'act_3',
        company_id: mockCompany.id,
        plan_id: plan.id,
        name: 'Direct Messaging Drive',
        channel: 'whatsapp',
        planned_start: '2026-09-01',
        planned_end: '2026-09-30',
        budget_minor: 7000000,
        actual_cost_minor: 5000000,
        status: 'in_progress',
        owner_user_id: adminUser.id,
        created_at: '2026-01-05T08:00:00Z',
        updated_at: '2026-09-10T08:00:00Z',
      };

      StorageService.saveMarketingActivity(act1);
      StorageService.saveMarketingActivity(act2);
      StorageService.saveMarketingActivity(act3);

      const summary = MarketingService.calculatePlanSummary(plan.id)!;

      // Assert sum of activity budgets equals total plan budget (100k + 80k + 70k = 250k)
      expect(summary.total_activity_budget_minor).toBe(25000000);
      expect(summary.total_plan_budget_minor).toBe(25000000);
      expect(summary.budget_allocation_variance_minor).toBe(0);

      // Assert actual spend (95k + 80k + 50k = 225k)
      expect(summary.total_actual_cost_minor).toBe(22500000);
      expect(summary.budget_variance_minor).toBe(2500000); // K25,000 unspent budget under plan
    });
  });

  describe('7.3.4: Period Filters Inclusive of Both Endpoints (Boundary Date Assertions)', () => {
    it('isDateInPeriod and target computation correctly includes items on the exact period start and period end dates', () => {
      const periodStart = '2026-08-01';
      const periodEnd = '2026-08-31';

      // 1. Exactly on Start Date
      expect(MarketingService.isDateInPeriod('2026-08-01', periodStart, periodEnd)).toBe(true);
      expect(MarketingService.isDateInPeriod('2026-08-01T00:00:00Z', periodStart, periodEnd)).toBe(true);
      expect(MarketingService.isDateInPeriod('2026-08-01T23:59:59Z', periodStart, periodEnd)).toBe(true);

      // 2. Exactly on End Date
      expect(MarketingService.isDateInPeriod('2026-08-31', periodStart, periodEnd)).toBe(true);
      expect(MarketingService.isDateInPeriod('2026-08-31T00:00:00Z', periodStart, periodEnd)).toBe(true);
      expect(MarketingService.isDateInPeriod('2026-08-31T23:59:59Z', periodStart, periodEnd)).toBe(true);

      // 3. Middle date
      expect(MarketingService.isDateInPeriod('2026-08-15T12:00:00Z', periodStart, periodEnd)).toBe(true);

      // 4. One day before start date (Should be excluded)
      expect(MarketingService.isDateInPeriod('2026-07-31', periodStart, periodEnd)).toBe(false);
      expect(MarketingService.isDateInPeriod('2026-07-31T23:59:59Z', periodStart, periodEnd)).toBe(false);

      // 5. One day after end date (Should be excluded)
      expect(MarketingService.isDateInPeriod('2026-09-01', periodStart, periodEnd)).toBe(false);
      expect(MarketingService.isDateInPeriod('2026-09-01T00:00:00Z', periodStart, periodEnd)).toBe(false);
    });
  });

  describe('7.3.5: Overdue Activity Detection', () => {
    it('surfaces activities that are past their planned_end date and not completed or cancelled', () => {
      // Reference date: 2026-09-22
      const referenceDate = '2026-09-22';

      // Activity 1: Planned end 2026-09-15, status 'planned' => OVERDUE by 7 days
      const actOverdue1: MarketingActivity = {
        id: 'act_overdue_1',
        company_id: mockCompany.id,
        plan_id: 'plan_od',
        name: 'Overdue Radio Ads',
        channel: 'radio',
        planned_start: '2026-09-01',
        planned_end: '2026-09-15',
        budget_minor: 3000000,
        actual_cost_minor: 0,
        status: 'planned',
        owner_user_id: adminUser.id,
        created_at: '2026-08-20T08:00:00Z',
        updated_at: '2026-08-20T08:00:00Z',
      };

      // Activity 2: Planned end 2026-09-10, status 'completed' => NOT overdue because completed
      const actCompleted: MarketingActivity = {
        id: 'act_completed_2',
        company_id: mockCompany.id,
        plan_id: 'plan_od',
        name: 'Completed Breakfast Meeting',
        channel: 'field_visit',
        planned_start: '2026-09-01',
        planned_end: '2026-09-10',
        actual_end: '2026-09-10',
        budget_minor: 4000000,
        actual_cost_minor: 4000000,
        status: 'completed',
        owner_user_id: adminUser.id,
        created_at: '2026-08-20T08:00:00Z',
        updated_at: '2026-09-10T08:00:00Z',
      };

      // Activity 3: Planned end 2026-09-30, status 'in_progress' => NOT overdue because planned_end is in the future
      const actFuture: MarketingActivity = {
        id: 'act_future_3',
        company_id: mockCompany.id,
        plan_id: 'plan_od',
        name: 'Future Social Campaign',
        channel: 'social',
        planned_start: '2026-09-15',
        planned_end: '2026-09-30',
        budget_minor: 2000000,
        actual_cost_minor: 1000000,
        status: 'in_progress',
        owner_user_id: adminUser.id,
        created_at: '2026-08-20T08:00:00Z',
        updated_at: '2026-09-15T08:00:00Z',
      };

      StorageService.saveMarketingActivity(actOverdue1);
      StorageService.saveMarketingActivity(actCompleted);
      StorageService.saveMarketingActivity(actFuture);

      const overdueList = MarketingService.getOverdueActivities(mockCompany.id, referenceDate);
      expect(overdueList.length).toBe(1);
      expect(overdueList[0].id).toBe('act_overdue_1');
    });
  });
});
