# Savannah CRM & Business Operations — User Guide

> **A plain-language guide for business owners and team members.**

---

## 1. Setting Up Your First Company

1. Click the **Company Selector** dropdown in the top navigation bar.
2. Select **+ Add New Company**.
3. Type your **Company Trading Name** and **Legal Name**.
4. Enter your **TPIN (Tax Number)** and physical business address.
5. Choose your default currency (for example, **ZMW** or **USD**).
6. Toggle **VAT Registered** if applicable, and set your VAT rate (for example, **16%**).
7. Click **Save Company**. Your new company is ready.

---

## 2. Defining Custom Fields

1. Go to **Company Settings** and click **Custom Fields**.
2. Select the model where you want a new field (for example, **Leads** or **Quotations**).
3. Click **+ Add Custom Field**.
4. Type a clear field label (for example, *"Farm Size in Hectares"* or *"Preferred Delivery Date"*).
5. Choose the field type: **Text**, **Number**, **Dropdown Select**, **Date**, or **Checkbox**.
6. Click **Save Field Definition**. The field immediately appears on forms.

---

## 3. Capturing and Managing Leads

1. Click **Dashboard** or **Follow-ups** in the top navigation.
2. Click **+ Add New Lead**.
3. Enter the lead title, lead source (e.g., Exhibition, WhatsApp, Referral), and estimated value.
4. Select or create the client organisation and primary contact person.
5. Click **Save Lead**.
6. To move a lead along your pipeline, drag and drop the lead card to the next stage (e.g., *New → Qualified → Proposal Sent → Won*).

---

## 4. Creating and Sending Quotations

1. Click **Quotations** in the top navigation bar.
2. Click **+ New Quotation**.
3. Select the client organisation and contact person.
4. Set the quotation validity date (e.g., valid for 30 days).
5. Add line items: select products/services, type quantities, and enter unit prices.
6. Check the automatically calculated subtotal, VAT, and grand total.
7. Click **Save & Issue Quotation**.
8. Click **Download PDF** to generate an official PDF quote to email or WhatsApp to your client.

---

## 5. Converting Quotations to Invoices

1. Click **Quotations** and select an active quotation.
2. Click **Convert to Tax Invoice**.
3. Confirm the invoice issue date and payment due date.
4. Click **Create Invoice**. The quotation converts instantly into a official Tax Invoice with a unique invoice number (e.g., `INV-0108`).

---

## 6. Recording Payments and Issuing Receipts

1. Click **Invoices** or **Payments & Receipts** in the top navigation.
2. Click **Record Payment**.
3. Select the client organisation.
4. Enter the payment amount received, payment date, and method (e.g., Bank Transfer, Airtel Money, Cash).
5. Allocate the payment across open invoices.
6. Click **Save Payment**.
7. Click **View Official Receipt** and click **Download PDF** to print or share the receipt.

---

## 7. Generating Client Account Statements

1. Click **Client Accounts** in the top navigation.
2. Select the client organisation from the list.
3. Review the complete statement ledger showing all issued invoices, recorded payments, and running balance due.
4. Click **Download PDF Statement** to produce a statement for the client.

---

## 8. Running Executive Reports

1. Click **Reports** in the top navigation bar.
2. Choose from the **Eight Core Executive Reports**:
   - **Sales Pipeline Report**: Active deals, win rates, and stage values.
   - **Tax & VAT Summary**: Output VAT collected and net tax liabilities.
   - **Invoice Aging Buckets**: Unpaid invoices grouped by 0-30, 31-60, 61-90, and 90+ days.
   - **Top Clients by Revenue**: Revenue rankings per client organisation.
   - **Product & Service Performance**: Best-selling items by revenue and quantity.
   - **Quotation Conversion Rate**: Percentage of quotes converted into paid invoices.
   - **Lead Velocity & Conversion**: Speed of leads moving through sales stages.
   - **Payment Collection Ledger**: Historical cash collected by payment channel.
3. Use the date range presets (e.g., *This Month*, *This Quarter*, *This Year*).
4. Click **Export Report PDF** or **Export CSV Data** to download the report.

---

## 9. User Management Facility & Role-Based Access Control (RBAC)

The User Management Facility allows administrators and business owners to manage team member accounts, assign entity access, configure role permissions, and reset security credentials.

### How to Access User Management
The User Management facility is prominently accessible across multiple entry points:
1. **Top Navigation Bar**: Click the **Team & Users** button in the top navigation toolbar.
2. **Module Switcher**: Open the **Module** dropdown menu and select **User Management** under the *System* category.
3. **User Profile Chip**: Click your logged-in username badge in the top right corner of the header.
4. **Executive Dashboard**: Click the **Team & Users** action button in the top banner.
5. **Company Settings Modal**: Click **Team & Users** inside the *Company Management Center*.

### Provisioning New Team Members
1. In User Management, click **+ Create Team Member**.
2. Enter the user's **Full Name**, unique **Username**, and corporate **Email Address**.
3. Specify an **Initial Password** (minimum 4 characters).
4. Select the appropriate **Role & Permissions Profile**:
   - **Owner (Executive)**: Unrestricted access to all companies, financials, user accounts, and server operations.
   - **Admin (Operations)**: Manages team member accounts, CRM pipelines, quotations, invoicing, and clients.
   - **Accountant (Finance)**: Handles invoices, payments, receipts, credit notes, client account ledgers, and tax reports.
   - **Sales Representative (Commercial)**: Drafts quotations, manages sales pipeline deals, marketing plans, and meetings.
5. Check the **Permitted Legal Entities** the user is allowed to access.
6. (Optional) Provide department and telephone details.
7. Click **Create User**.

### Managing Existing Accounts & Security
- **Edit Details**: Update a team member's role, company entity access, email, or department at any time.
- **Reset Password**: Click the **Key** icon to securely set a new password for any team member.
- **Suspend / Reactivate**: Click the **Status** icon to temporarily freeze an account without deleting historical data.
- **Safe Deletion**: Non-owner accounts can be deleted with confirmation. Built-in security guards prevent self-deletion or removing the last active Owner account.
- **Session Switching**: Click the **Log In / Switch** icon next to any active team member to preview and verify their specific permissions view.
