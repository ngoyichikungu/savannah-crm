import { CurrencyCode, PaymentMethod } from './index';

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tpin?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  payment_terms_days: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory =
  | 'cost_of_goods'
  | 'subcontractor'
  | 'rent_rates'
  | 'utilities'
  | 'salaries_wages'
  | 'telecom_internet'
  | 'advertising_marketing'
  | 'travel_transport'
  | 'office_supplies'
  | 'professional_fees'
  | 'bank_charges'
  | 'repairs_maintenance'
  | 'licences_insurance'
  | 'meals_entertainment'
  | 'equipment_software'
  | 'other_operating';

export interface ExpenseCategoryMeta {
  id: ExpenseCategory;
  name: string;
  group: 'cogs' | 'operating' | 'admin' | 'financial';
  description: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryMeta[] = [
  { id: 'cost_of_goods', name: 'Cost of Goods & Materials', group: 'cogs', description: 'Raw materials, direct inventory, direct supplies' },
  { id: 'subcontractor', name: 'Subcontractors & Direct Labor', group: 'cogs', description: 'Direct project labor and third-party fulfillment' },
  { id: 'rent_rates', name: 'Rent, Rates & Premises', group: 'operating', description: 'Office lease, workshop rent, council rates' },
  { id: 'utilities', name: 'Electricity & Utilities', group: 'operating', description: 'Power/ZESCO, water, generator fuel' },
  { id: 'salaries_wages', name: 'Salaries & Staff Wages', group: 'operating', description: 'Employee payroll, allowances, contractor fees' },
  { id: 'telecom_internet', name: 'Internet & Telecoms', group: 'operating', description: 'Fiber, mobile data, VoIP, communication tools' },
  { id: 'advertising_marketing', name: 'Advertising & Marketing', group: 'operating', description: 'Campaigns, printing, sponsorships, promotions' },
  { id: 'travel_transport', name: 'Fuel, Travel & Logistics', group: 'operating', description: 'Company vehicles, fuel, courier, public transport' },
  { id: 'office_supplies', name: 'Office Supplies & Stationery', group: 'admin', description: 'Printing paper, ink, general office consumables' },
  { id: 'professional_fees', name: 'Legal & Accounting Fees', group: 'admin', description: 'Audits, legal counsel, compliance filing fees' },
  { id: 'bank_charges', name: 'Bank Charges & Fees', group: 'financial', description: 'Account maintenance, card charges, transfer fees' },
  { id: 'repairs_maintenance', name: 'Repairs & Maintenance', group: 'operating', description: 'IT hardware repair, office maintenance, servicing' },
  { id: 'licences_insurance', name: 'Licences & Insurance', group: 'admin', description: 'Business levy, PACRA, property and liability insurance' },
  { id: 'meals_entertainment', name: 'Staff Welfare & Entertainment', group: 'operating', description: 'Refreshments, team lunch, client hospitality' },
  { id: 'equipment_software', name: 'Software Subscriptions & Tools', group: 'operating', description: 'Cloud software, SaaS licences, productivity tools' },
  { id: 'other_operating', name: 'Miscellaneous Operating', group: 'operating', description: 'Sundry expenses not otherwise classified' },
];

export interface BusinessExpense {
  id: string;
  company_id: string;
  expense_number: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  category: ExpenseCategory;
  amount_minor: number;
  currency_code: CurrencyCode;
  payment_method: PaymentMethod;
  payee_merchant: string;
  supplier_id?: string;
  reference?: string; // Receipt / Voucher / Cheque #
  is_tax_deductible: boolean;
  is_vatable: boolean;
  vat_rate_bp: number; // e.g. 1600 = 16.00%
  vat_minor: number;
  net_amount_minor: number;
  status: 'paid' | 'pending' | 'reimbursed';
  receipt_ref?: string;
  recorded_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export type PurchaseInvoiceStatus =
  | 'draft'
  | 'received'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface PurchaseInvoiceLine {
  id: string;
  purchase_invoice_id: string;
  description: string;
  category: ExpenseCategory;
  quantity_thousandths: number; // 1000 = 1.000
  unit: string;
  unit_price_minor: number;
  is_vatable: boolean;
  vat_rate_bp: number;
  line_subtotal_minor: number;
  line_vat_minor: number;
  line_total_minor: number;
}

export interface PurchasePaymentRecord {
  id: string;
  purchase_invoice_id: string;
  company_id: string;
  payment_date: string;
  amount_minor: number;
  payment_method: PaymentMethod;
  reference?: string;
  notes?: string;
  recorded_by_user_id: string;
  created_at: string;
}

export interface PurchaseInvoice {
  id: string;
  company_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_tpin?: string;
  invoice_number: string; // Vendor's bill #
  internal_reference?: string; // Internal PO or reference
  issue_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  payment_terms_days: number;
  currency_code: CurrencyCode;
  lines: PurchaseInvoiceLine[];
  subtotal_minor: number;
  vat_rate_bp: number;
  vat_minor: number;
  total_minor: number;
  amount_paid_minor: number;
  balance_due_minor: number;
  status: PurchaseInvoiceStatus;
  category: ExpenseCategory;
  notes?: string;
  payments?: PurchasePaymentRecord[];
  recorded_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProfitAndLossStatement {
  companyId: string;
  currencyCode: CurrencyCode;
  periodStart: string;
  periodEnd: string;
  preset: string;
  basis: 'accrual' | 'cash';
  revenue: {
    salesInvoicedMinor: number;
    salesPaidMinor: number;
    effectiveRevenueMinor: number;
    salesCount: number;
  };
  costOfSales: {
    purchaseBillsMinor: number;
    directExpensesMinor: number;
    totalCostOfSalesMinor: number;
    items: {
      name: string;
      amountMinor: number;
      percentage: number;
    }[];
  };
  grossProfitMinor: number;
  grossMarginPercent: number;
  operatingExpenses: {
    totalMinor: number;
    categories: {
      category: ExpenseCategory;
      label: string;
      group: string;
      amountMinor: number;
      percentageOfExpenses: number;
      percentageOfRevenue: number;
      count: number;
    }[];
  };
  operatingProfitMinor: number; // EBIT
  operatingMarginPercent: number;
  netProfitMinor: number;
  netMarginPercent: number;
  taxVatSummary: {
    outputVatMinor: number;
    inputVatPurchasesMinor: number;
    inputVatExpensesMinor: number;
    totalInputVatMinor: number;
    netVatPayableMinor: number; // Positive = payable to authority, negative = credit
  };
}
