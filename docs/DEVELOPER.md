# Savannah CRM & Business Operations — Developer Guide

> **Technical Architecture, Tenancy Isolation, Financial Precision Rules & Developer Workflows.**

---

## 1. Architectural Overview

Savannah CRM is structured as a clean, modular TypeScript application operating with a server-authoritative service architecture and an offline-first storage engine.

```
/src
├── components/          # Pure React Presentational & Interactive UI Modules
│   ├── common/          # Header, ChartWrapper, Modal, Toast
│   ├── dashboard/       # Executive Role-Aware Analytics Dashboard
│   ├── installer/       # Web Installer Wizard & Operations View
│   ├── invoices/        # Invoice List, Editor, Detail, Balance Verification
│   ├── marketing/       # Marketing Plans & Activities
│   ├── payments/        # Payment Recording, Allocation & Client Accounts
│   ├── quotations/      # Quotation Builder, Detail, Proposal Tracker
│   └── reports/         # Executive Reporting Engine & 8 PDF/CSV Reports
├── services/            # Domain Services & Business Logic Engine
│   ├── backupService.ts    # JSON Archive Creation, Retention & Restore Engine
│   ├── dashboardService.ts # Dashboard Analytics Aggregations
│   ├── documentPdfService.ts # Client-Side PDF Generation (jsPDF + html2canvas)
│   ├── installerService.ts # Requirements Check & First-Run Setup Engine
│   ├── invoiceService.ts   # Invoice & Payment Allocation Engine
│   ├── quotationCalculator.ts # Pure Integer Minor Unit Money Calculations
│   ├── reportingDateUtils.ts # Date Range Presets & Formatting
│   └── storageService.ts   # Company-Scoped Storage & Database Engine
├── support/
│   └── money.ts         # Immutable Money Value Object (Zero Float Math)
├── types/
│   ├── index.ts         # Global Entity Types & Interfaces
│   └── reporting.ts     # Reporting Data Transfer Objects
└── tests/               # Comprehensive Vitest Test Suites (Part 1 - Part 10)
```

---

## 2. Multi-Tenant Scoping (`company_id`)

Tenancy isolation is strictly enforced across all database queries and service methods.

### Rules of Tenancy
1. Every domain record (Invoice, Quotation, Lead, Payment, Organisation, Item) **MUST** possess a `company_id` attribute matching the active company ID.
2. Direct raw queries filtering across all companies without `company_id` scoping are **STRICTLY PROHIBITED**.
3. Storage helper functions explicitly require `companyId` parameters:
   ```typescript
   // Example of company-scoped service query in storageService.ts
   public static getInvoicesForCompany(companyId: string): Invoice[] {
     return this.getInvoices().filter((inv) => inv.company_id === companyId && !inv.deleted_at);
   }
   ```

---

## 3. The Money-Handling Rule (100% Integer Minor Units)

> **FLOATING-POINT ARITHMETIC IS STRICTLY FORBIDDEN IN MONETARY CALCULATIONS.**

To eliminate rounding discrepancies across multi-currency operations:

1. All monetary fields are named with the `_minor` suffix and stored as exact integers (e.g., 100 ngwee = `100`, $10.50 = `1050`).
2. Calculations use the immutable `Money` value object (`/src/support/money.ts`):
   ```typescript
   import { Money } from '../support/money';

   const itemPrice = new Money(15000, 'ZMW'); // ZMW 150.00
   const vatAmount = itemPrice.percentage(1600); // 16.00% VAT = ZMW 24.00 (2400 minor)
   const total = itemPrice.add(vatAmount); // ZMW 174.00 (17400 minor)
   ```
3. VAT rate is represented in basis points (`1600` bp = `16.00%`).
4. Conversion to display strings occurs **ONLY** at presentation time via `Money.format()`.

---

## 4. How to Add a New Report

1. **Define DTO Types**: Add report dataset types in `/src/types/reporting.ts`.
2. **Implement Calculation Logic**: Create a dedicated generator class in `/src/services/reports/`:
   ```typescript
   export class CustomReportGenerator {
     public static generate(companyId: string, range: DateRange): CustomReportData {
       // Perform company-scoped aggregations using integer minor unit math
     }
   }
   ```
3. **Add UI Report Card**: Add the report view component inside `/src/components/reports/`.
4. **Register in ReportsDashboard**: Add the new report to the report selector tabs in `/src/components/reports/ReportsDashboard.tsx`.
5. **Add Test Assertions**: Write test coverage in `/src/tests/` verifying company isolation and calculation precision.

---

## 5. How to Add a Custom Field Type

1. Add the field type literal to `CustomFieldType` in `/src/types/index.ts`:
   ```typescript
   export type CustomFieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'email';
   ```
2. Update rendering logic in `/src/components/common/CustomFieldRenderer.tsx`:
   - Add input component switch case.
   - Add validation logic.
3. Update custom field definition editor in `/src/components/common/CustomFieldEditor.tsx`.

---

## 6. Testing Strategy & Execution

Tests are executed via **Vitest** (`npm test`).

```bash
# Run full test suite
npm test

# Run tests in watch mode
npx vitest

# Run specific part test suite
npx vitest src/tests/part10.test.ts
```

### Coverage Mandates
- **Part 1**: Tenancy isolation, company creation, currency switching.
- **Part 2**: Custom field definitions and dynamic field value storage.
- **Part 3**: Pipeline stages, lead tracking, and velocity.
- **Part 4**: Quotations, line item calculations, and PDF generation.
- **Part 5**: Invoices, tax calculations, credit notes, and balance verification.
- **Part 6**: Payment recording, multi-invoice allocations, and receipt PDFs.
- **Part 7**: Marketing plans, budgets, activities, and target metrics.
- **Part 8**: Executive reporting engine & 8 core financial reports.
- **Part 9**: Role-aware executive dashboard & Chart.js visualizations.
- **Part 10**: First-run web/CLI installer, backup/restore, health status, and deployment verification.
