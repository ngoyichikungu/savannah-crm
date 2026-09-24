import { Company, Invoice, Organisation, Contact, Quotation, Payment, PaymentAllocation } from '../types';
import { Money } from '../support/money';

export interface DocumentPdfRenderOptions {
  pageNumber?: number;
  totalPages?: number;
}

export class DocumentPdfService {
  /**
   * Determine document title based on company VAT registration status
   */
  static getInvoiceHeading(company: Company): 'TAX INVOICE' | 'INVOICE' {
    return company.is_vat_registered ? 'TAX INVOICE' : 'INVOICE';
  }

  /**
   * Generates clean HTML for printable / PDF view of an invoice
   */
  static renderInvoiceHtml(
    invoice: Invoice,
    company: Company,
    organisation?: Organisation,
    contact?: Contact,
    _options: DocumentPdfRenderOptions = {}
  ): string {
    const heading = this.getInvoiceHeading(company);
    const totalMoney = new Money(invoice.total_minor, invoice.currency_code);
    const words = totalMoney.amountInWords();
    const isPartial = invoice.status === 'partially_paid' || (invoice.amount_paid_minor > 0 && invoice.amount_paid_minor < invoice.total_minor);

    const subtotalFormatted = new Money(invoice.subtotal_minor, invoice.currency_code).format();
    const discountFormatted = invoice.discount_minor > 0 ? new Money(invoice.discount_minor, invoice.currency_code).format() : null;
    const vatRatePercent = (invoice.vat_rate_bp / 100).toFixed(invoice.vat_rate_bp % 100 === 0 ? 0 : 2);
    const vatFormatted = new Money(invoice.vat_minor, invoice.currency_code).format();
    const totalFormatted = totalMoney.format();
    const paidFormatted = new Money(invoice.amount_paid_minor, invoice.currency_code).format();
    const balanceFormatted = new Money(invoice.balance_due_minor, invoice.currency_code).format();

    const linesHtml = (invoice.lines || []).map((line, idx) => {
      const qty = (line.quantity_thousandths / 1000).toLocaleString('en-US', {
        minimumFractionDigits: line.quantity_thousandths % 1000 === 0 ? 0 : 2,
        maximumFractionDigits: 3,
      });
      const unitPrice = new Money(line.unit_price_minor, invoice.currency_code).format();
      const lineTotal = new Money(line.line_total_minor, invoice.currency_code).format();
      const vatBadge = line.is_vatable ? (company.is_vat_registered ? `${vatRatePercent}%` : 'Standard') : 'Zero / Exempt';

      return `
        <tr class="border-b border-stone-200 text-sm">
          <td class="py-3 px-3 text-stone-500 text-center">${idx + 1}</td>
          <td class="py-3 px-3">
            <div class="font-medium text-stone-900">${escapeHtml(line.description)}</div>
            ${line.item_code ? `<div class="text-xs text-stone-500 font-mono">Code: ${escapeHtml(line.item_code)}</div>` : ''}
          </td>
          <td class="py-3 px-3 text-right font-mono">${qty} ${escapeHtml(line.unit || 'pcs')}</td>
          <td class="py-3 px-3 text-right font-mono">${unitPrice}</td>
          <td class="py-3 px-3 text-center text-xs text-stone-600">${vatBadge}</td>
          <td class="py-3 px-3 text-right font-semibold font-mono text-stone-900">${lineTotal}</td>
        </tr>
      `;
    }).join('');

    return `
      <div id="invoice-document-root" class="bg-white text-stone-900 font-sans p-8 md:p-12 max-w-4xl mx-auto shadow-sm border border-stone-200 print:border-none print:shadow-none print:p-0">
        <!-- Letterhead & Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start pb-8 border-b-2 border-stone-800 gap-6">
          <div class="space-y-1">
            <div class="flex items-center gap-3">
              ${company.logo_url ? `
                <img src="${escapeHtml(company.logo_url)}" alt="${escapeHtml(company.name)}" class="h-12 w-auto max-w-[160px] max-h-16 object-contain rounded" />
              ` : `
                <div class="w-10 h-10 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-xl font-mono">
                  ${company.name.charAt(0)}
                </div>
              `}
              <div>
                <h1 class="text-2xl font-extrabold tracking-tight text-stone-900">${escapeHtml(company.legal_name || company.name)}</h1>
                <p class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Business Operations &amp; Enterprise Services</p>
              </div>
            </div>
            <div class="text-xs text-stone-600 pt-2 space-y-0.5">
              <p>${escapeHtml(company.address_line1)}${company.address_line2 ? `, ${escapeHtml(company.address_line2)}` : ''}, ${escapeHtml(company.city)}, ${escapeHtml(company.country)}</p>
              <p>Email: <span class="font-medium text-stone-800">${escapeHtml(company.email)}</span> | Phone: <span class="font-medium text-stone-800">${escapeHtml(company.phone)}</span></p>
              ${company.tpin ? `<p class="font-mono text-stone-700"><strong>TPIN / Tax Reg:</strong> ${escapeHtml(company.tpin)} ${company.is_vat_registered ? '<span class="text-emerald-700 font-semibold">(VAT Registered)</span>' : ''}</p>` : ''}
            </div>
          </div>

          <div class="sm:text-right space-y-1 bg-stone-50 p-4 rounded-lg border border-stone-200 sm:min-w-[240px]">
            <span class="inline-block text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded">
              ${heading}
            </span>
            <div class="text-xl font-bold font-mono text-stone-900 pt-1">${escapeHtml(invoice.number)}</div>
            <div class="text-xs text-stone-600 space-y-1 pt-1">
              <div><strong>Issue Date:</strong> ${invoice.issue_date}</div>
              <div><strong>Due Date:</strong> <span class="text-red-700 font-semibold">${invoice.due_date}</span></div>
              ${invoice.po_number ? `<div><strong>PO Number:</strong> ${escapeHtml(invoice.po_number)}</div>` : ''}
              ${invoice.reference ? `<div><strong>Reference:</strong> ${escapeHtml(invoice.reference)}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Bill To Section -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 my-8 py-4 bg-stone-50/70 p-6 rounded-lg border border-stone-100">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Billed To</div>
            <div class="font-bold text-base text-stone-900">${escapeHtml(organisation?.name || 'Valued Client')}</div>
            ${contact ? `<div class="text-sm font-medium text-stone-700 mt-1">Attn: ${escapeHtml(contact.first_name)} ${escapeHtml(contact.last_name)} ${contact.job_title ? `(${escapeHtml(contact.job_title)})` : ''}</div>` : ''}
            <div class="text-xs text-stone-600 mt-1 space-y-0.5">
              ${organisation?.address_line1 ? `<p>${escapeHtml(organisation.address_line1)}, ${escapeHtml(organisation.city || '')}</p>` : ''}
              ${contact?.email || organisation?.email ? `<p>Email: ${escapeHtml(contact?.email || organisation?.email || '')}</p>` : ''}
              ${contact?.phone || organisation?.phone ? `<p>Phone: ${escapeHtml(contact?.phone || organisation?.phone || '')}</p>` : ''}
              ${organisation?.tpin ? `<p class="font-mono mt-1 text-stone-700">Client TPIN: <strong>${escapeHtml(organisation.tpin)}</strong></p>` : ''}
            </div>
          </div>

          <div class="sm:border-l sm:border-stone-200 sm:pl-8 space-y-2">
            <div class="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Payment Terms & Status</div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-stone-600">Status:</span>
              <span class="text-xs font-bold uppercase px-2 py-0.5 rounded bg-stone-200 text-stone-800">${invoice.status.replace('_', ' ')}</span>
            </div>
            <div class="text-xs text-stone-600">
              <p>Payment Terms: <span class="font-medium text-stone-900">${invoice.payment_terms_days} days from issue</span></p>
              <p>Currency: <span class="font-semibold text-stone-900">${invoice.currency_code}</span></p>
            </div>
          </div>
        </div>

        <!-- Line Items Table -->
        <div class="overflow-x-auto my-6">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b-2 border-stone-800 text-xs uppercase tracking-wider text-stone-700 bg-stone-100">
                <th class="py-2.5 px-3 text-center w-10">#</th>
                <th class="py-2.5 px-3">Description & Item</th>
                <th class="py-2.5 px-3 text-right">Qty</th>
                <th class="py-2.5 px-3 text-right">Unit Price</th>
                <th class="py-2.5 px-3 text-center">VAT</th>
                <th class="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${linesHtml}
            </tbody>
          </table>
        </div>

        <!-- Totals & Amount in Words Block -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 my-8 pt-4 border-t border-stone-200">
          <div class="md:col-span-7 space-y-4">
            <div class="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
              <div class="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1">Amount in Words</div>
              <div class="text-sm font-semibold text-emerald-950 italic">"${escapeHtml(words)}"</div>
            </div>

            <!-- Payment Instructions -->
            <div class="p-4 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-2">
              <div class="font-bold text-stone-800 uppercase tracking-wider">Settlement &amp; Remittance Details</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-700">
                ${company.bank_name ? `
                  <div class="space-y-0.5">
                    <p class="font-semibold text-stone-900">Direct Bank Transfer</p>
                    <p>Bank: <strong>${escapeHtml(company.bank_name)}</strong></p>
                    <p>Account Name: ${escapeHtml(company.bank_account_name || company.legal_name)}</p>
                    <p class="font-mono">Account No: <strong>${escapeHtml(company.bank_account_number || '')}</strong></p>
                    ${company.bank_branch_code ? `<p>Branch/Sort: ${escapeHtml(company.bank_branch_code)}</p>` : ''}
                    ${company.bank_swift ? `<p>SWIFT: ${escapeHtml(company.bank_swift)}</p>` : ''}
                  </div>
                ` : ''}
                ${company.momo_provider ? `
                  <div class="space-y-0.5">
                    <p class="font-semibold text-stone-900">Mobile Money Merchant</p>
                    <p>Provider: <strong>${escapeHtml(company.momo_provider)}</strong></p>
                    <p class="font-mono">Merchant / Acc: <strong>${escapeHtml(company.momo_account_number || '')}</strong></p>
                    <p class="text-stone-500">Ref: ${escapeHtml(invoice.number)}</p>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="md:col-span-5 space-y-2 text-sm bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div class="flex justify-between py-1 text-stone-600">
              <span>Subtotal:</span>
              <span class="font-mono text-stone-900">${subtotalFormatted}</span>
            </div>
            ${discountFormatted ? `
              <div class="flex justify-between py-1 text-emerald-700">
                <span>Discount (${invoice.discount_type === 'percent' ? `${(invoice.discount_value / 100).toFixed(0)}%` : 'Fixed'}):</span>
                <span class="font-mono">-${discountFormatted}</span>
              </div>
            ` : ''}
            <div class="flex justify-between py-1 text-stone-600">
              <span>VAT (${vatRatePercent}%):</span>
              <span class="font-mono text-stone-900">${vatFormatted}</span>
            </div>
            <div class="flex justify-between py-2 border-t-2 border-stone-800 text-base font-bold text-stone-900">
              <span>Grand Total:</span>
              <span class="font-mono text-lg text-emerald-800">${totalFormatted}</span>
            </div>

            ${isPartial ? `
              <div class="pt-2 border-t border-dashed border-stone-300 space-y-1 text-xs">
                <div class="flex justify-between text-emerald-800 font-medium">
                  <span>Amount Paid:</span>
                  <span class="font-mono">${paidFormatted}</span>
                </div>
                <div class="flex justify-between text-red-700 font-bold text-sm">
                  <span>Balance Due:</span>
                  <span class="font-mono">${balanceFormatted}</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Terms & Notes -->
        ${invoice.terms || invoice.notes ? `
          <div class="my-6 pt-4 border-t border-stone-200 text-xs text-stone-600 space-y-2">
            ${invoice.terms ? `<div><strong class="text-stone-800 uppercase tracking-wide">Terms &amp; Conditions:</strong> <p class="mt-0.5 whitespace-pre-line">${escapeHtml(invoice.terms)}</p></div>` : ''}
            ${invoice.notes ? `<div><strong class="text-stone-800 uppercase tracking-wide">Notes:</strong> <p class="mt-0.5 whitespace-pre-line">${escapeHtml(invoice.notes)}</p></div>` : ''}
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="mt-12 pt-4 border-t border-stone-200 flex justify-between items-center text-[10px] text-stone-400">
          <div>Generated by Savannah Business Suite — ${invoice.number}</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    `;
  }

  /**
   * Generates clean HTML for quotation
   */
  static renderQuotationHtml(
    quotation: Quotation,
    company: Company,
    organisation?: Organisation,
    contact?: Contact,
    _options: DocumentPdfRenderOptions = {}
  ): string {
    const totalMoney = new Money(quotation.total_minor, quotation.currency_code);
    const words = totalMoney.amountInWords();
    const subtotalFormatted = new Money(quotation.subtotal_minor, quotation.currency_code).format();
    const discountFormatted = quotation.discount_minor > 0 ? new Money(quotation.discount_minor, quotation.currency_code).format() : null;
    const vatRatePercent = (quotation.vat_rate_bp / 100).toFixed(quotation.vat_rate_bp % 100 === 0 ? 0 : 2);
    const vatFormatted = new Money(quotation.vat_minor, quotation.currency_code).format();
    const totalFormatted = totalMoney.format();

    const linesHtml = (quotation.lines || []).map((line, idx) => {
      const qty = (line.quantity_thousandths / 1000).toLocaleString('en-US', {
        minimumFractionDigits: line.quantity_thousandths % 1000 === 0 ? 0 : 2,
        maximumFractionDigits: 3,
      });
      const unitPrice = new Money(line.unit_price_minor, quotation.currency_code).format();
      const lineTotal = new Money(line.line_total_minor, quotation.currency_code).format();

      return `
        <tr class="border-b border-stone-200 text-sm">
          <td class="py-3 px-3 text-stone-500 text-center">${idx + 1}</td>
          <td class="py-3 px-3">
            <div class="font-medium text-stone-900">${escapeHtml(line.description)}</div>
            ${line.item_code ? `<div class="text-xs text-stone-500 font-mono">Code: ${escapeHtml(line.item_code)}</div>` : ''}
          </td>
          <td class="py-3 px-3 text-right font-mono">${qty} ${escapeHtml(line.unit || 'pcs')}</td>
          <td class="py-3 px-3 text-right font-mono">${unitPrice}</td>
          <td class="py-3 px-3 text-center text-xs text-stone-600">${line.is_vatable ? `${vatRatePercent}%` : 'Zero / Exempt'}</td>
          <td class="py-3 px-3 text-right font-semibold font-mono text-stone-900">${lineTotal}</td>
        </tr>
      `;
    }).join('');

    return `
      <div id="quotation-document-root" class="bg-white text-stone-900 font-sans p-8 md:p-12 max-w-4xl mx-auto shadow-sm border border-stone-200 print:border-none print:shadow-none print:p-0">
        <!-- Letterhead & Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start pb-8 border-b-2 border-stone-800 gap-6">
          <div class="space-y-1">
            <div class="flex items-center gap-3">
              ${company.logo_url ? `
                <img src="${escapeHtml(company.logo_url)}" alt="${escapeHtml(company.name)}" class="h-12 w-auto max-w-[160px] max-h-16 object-contain rounded" />
              ` : `
                <div class="w-10 h-10 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-xl font-mono">
                  ${company.name.charAt(0)}
                </div>
              `}
              <div>
                <h1 class="text-2xl font-extrabold tracking-tight text-stone-900">${escapeHtml(company.legal_name || company.name)}</h1>
                <p class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Business Quotation &amp; Proposal</p>
              </div>
            </div>
            <div class="text-xs text-stone-600 pt-2 space-y-0.5">
              <p>${escapeHtml(company.address_line1)}${company.address_line2 ? `, ${escapeHtml(company.address_line2)}` : ''}, ${escapeHtml(company.city)}, ${escapeHtml(company.country)}</p>
              <p>Email: <span class="font-medium text-stone-800">${escapeHtml(company.email)}</span> | Phone: <span class="font-medium text-stone-800">${escapeHtml(company.phone)}</span></p>
              ${company.tpin ? `<p class="font-mono text-stone-700"><strong>TPIN:</strong> ${escapeHtml(company.tpin)}</p>` : ''}
            </div>
          </div>

          <div class="sm:text-right space-y-1 bg-stone-50 p-4 rounded-lg border border-stone-200 sm:min-w-[240px]">
            <span class="inline-block text-xs font-bold uppercase tracking-widest text-blue-800 bg-blue-100 px-2.5 py-1 rounded">
              QUOTATION
            </span>
            <div class="text-xl font-bold font-mono text-stone-900 pt-1">${escapeHtml(quotation.number)}</div>
            ${quotation.revision_number > 0 ? `<div class="text-xs font-semibold text-amber-800 bg-amber-100 inline-block px-1.5 py-0.5 rounded">Revision ${quotation.revision_number}</div>` : ''}
            <div class="text-xs text-stone-600 space-y-1 pt-1">
              <div><strong>Issue Date:</strong> ${quotation.issue_date}</div>
              <div><strong>Valid Until:</strong> <span class="text-stone-800 font-semibold">${quotation.valid_until}</span></div>
              ${quotation.reference ? `<div><strong>Ref:</strong> ${escapeHtml(quotation.reference)}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Bill To Section -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 my-8 py-4 bg-stone-50/70 p-6 rounded-lg border border-stone-100">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Prepared For</div>
            <div class="font-bold text-base text-stone-900">${escapeHtml(organisation?.name || 'Valued Client')}</div>
            ${contact ? `<div class="text-sm font-medium text-stone-700 mt-1">Attn: ${escapeHtml(contact.first_name)} ${escapeHtml(contact.last_name)}</div>` : ''}
            <div class="text-xs text-stone-600 mt-1">
              ${contact?.email || organisation?.email ? `<p>Email: ${escapeHtml(contact?.email || organisation?.email || '')}</p>` : ''}
            </div>
          </div>

          <div class="sm:border-l sm:border-stone-200 sm:pl-8 space-y-2">
            <div class="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Proposal Details</div>
            <div class="text-sm font-semibold text-stone-800">${escapeHtml(quotation.title)}</div>
            <div class="text-xs text-stone-600">Status: <span class="uppercase font-bold">${quotation.status}</span></div>
          </div>
        </div>

        <!-- Lines -->
        <div class="overflow-x-auto my-6">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b-2 border-stone-800 text-xs uppercase tracking-wider text-stone-700 bg-stone-100">
                <th class="py-2.5 px-3 text-center w-10">#</th>
                <th class="py-2.5 px-3">Description</th>
                <th class="py-2.5 px-3 text-right">Qty</th>
                <th class="py-2.5 px-3 text-right">Unit Price</th>
                <th class="py-2.5 px-3 text-center">VAT</th>
                <th class="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>${linesHtml}</tbody>
          </table>
        </div>

        <!-- Totals & Words -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 my-8 pt-4 border-t border-stone-200">
          <div class="md:col-span-7 space-y-4">
            <div class="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
              <div class="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1">Total in Words</div>
              <div class="text-sm font-semibold text-emerald-950 italic">"${escapeHtml(words)}"</div>
            </div>
          </div>

          <div class="md:col-span-5 space-y-2 text-sm bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div class="flex justify-between py-1 text-stone-600">
              <span>Subtotal:</span>
              <span class="font-mono text-stone-900">${subtotalFormatted}</span>
            </div>
            ${discountFormatted ? `
              <div class="flex justify-between py-1 text-emerald-700">
                <span>Discount:</span>
                <span class="font-mono">-${discountFormatted}</span>
              </div>
            ` : ''}
            <div class="flex justify-between py-1 text-stone-600">
              <span>VAT (${vatRatePercent}%):</span>
              <span class="font-mono text-stone-900">${vatFormatted}</span>
            </div>
            <div class="flex justify-between py-2 border-t-2 border-stone-800 text-base font-bold text-stone-900">
              <span>Grand Total:</span>
              <span class="font-mono text-lg text-emerald-800">${totalFormatted}</span>
            </div>
          </div>
        </div>

        <!-- Terms -->
        ${quotation.terms || quotation.notes ? `
          <div class="my-6 pt-4 border-t border-stone-200 text-xs text-stone-600 space-y-2">
            ${quotation.terms ? `<div><strong class="text-stone-800 uppercase tracking-wide">Terms:</strong> <p class="mt-0.5 whitespace-pre-line">${escapeHtml(quotation.terms)}</p></div>` : ''}
            ${quotation.notes ? `<div><strong class="text-stone-800 uppercase tracking-wide">Notes:</strong> <p class="mt-0.5 whitespace-pre-line">${escapeHtml(quotation.notes)}</p></div>` : ''}
          </div>
        ` : ''}

        <div class="mt-12 pt-4 border-t border-stone-200 flex justify-between items-center text-[10px] text-stone-400">
          <div>Generated by Savannah Business Suite — ${quotation.number}</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    `;
  }

  /**
   * Generates clean HTML for printable / PDF view of an official payment receipt
   */
  static renderReceiptHtml(
    payment: Payment,
    allocations: PaymentAllocation[],
    invoices: Invoice[],
    company: Company,
    organisation?: Organisation,
    contact?: Contact,
    totalClientOutstandingMinor: number = 0,
    _options: DocumentPdfRenderOptions = {}
  ): string {
    const totalMoney = new Money(payment.amount_minor, payment.currency_code);
    const words = totalMoney.amountInWords();
    const formattedAmount = totalMoney.format();
    const formattedAllocated = new Money(payment.allocated_minor, payment.currency_code).format();
    const formattedUnallocated = new Money(payment.unallocated_minor, payment.currency_code).format();
    const formattedTotalOutstanding = new Money(totalClientOutstandingMinor, payment.currency_code).format();

    const activeAllocations = allocations.filter((a) => !a.is_reversed && a.payment_id === payment.id);

    const methodLabels: Record<string, string> = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer (EFT)',
      cheque: 'Cheque',
      mobile_money: 'Mobile Money',
      card: 'Debit / Credit Card',
      other: 'Other',
    };
    const methodDisplay = methodLabels[payment.method] || payment.method;

    const allocationsTableRows = activeAllocations.map((alloc, idx) => {
      const inv = invoices.find((i) => i.id === alloc.invoice_id);
      const invNum = inv?.number || `Invoice #${alloc.invoice_id}`;
      const issueDate = inv?.issue_date || '-';
      const invTotal = inv ? new Money(inv.total_minor, inv.currency_code).format() : '-';
      const appliedAmt = new Money(alloc.amount_minor, payment.currency_code).format();
      const remainingBal = inv ? new Money(inv.balance_due_minor, inv.currency_code).format() : '-';

      return `
        <tr class="border-b border-stone-200 text-sm">
          <td class="py-3 px-3 text-stone-500 text-center">${idx + 1}</td>
          <td class="py-3 px-3 font-mono font-bold text-stone-900">${escapeHtml(invNum)}</td>
          <td class="py-3 px-3 text-stone-600">${escapeHtml(issueDate)}</td>
          <td class="py-3 px-3 text-right font-mono text-stone-700">${invTotal}</td>
          <td class="py-3 px-3 text-right font-mono font-bold text-emerald-800">${appliedAmt}</td>
          <td class="py-3 px-3 text-right font-mono text-stone-900">${remainingBal}</td>
        </tr>
      `;
    }).join('');

    return `
      <div id="receipt-document-root" class="bg-white text-stone-900 font-sans p-8 md:p-12 max-w-4xl mx-auto shadow-sm border border-stone-200 print:border-none print:shadow-none print:p-0">
        <!-- Letterhead & Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start pb-8 border-b-2 border-stone-800 gap-6">
          <div class="space-y-1">
            <div class="flex items-center gap-3">
              ${company.logo_url ? `
                <img src="${escapeHtml(company.logo_url)}" alt="${escapeHtml(company.name)}" class="h-12 w-auto max-w-[160px] max-h-16 object-contain rounded" />
              ` : `
                <div class="w-10 h-10 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-xl font-mono">
                  ${company.name.charAt(0)}
                </div>
              `}
              <div>
                <h2 class="text-2xl font-extrabold tracking-tight text-stone-900">${escapeHtml(company.legal_name || company.name)}</h2>
                <p class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Official Payment Receipt</p>
              </div>
            </div>
            <div class="text-xs text-stone-600 pt-2 space-y-0.5">
              <p>${escapeHtml(company.address_line1)}${company.address_line2 ? `, ${escapeHtml(company.address_line2)}` : ''}, ${escapeHtml(company.city)}, ${escapeHtml(company.country)}</p>
              <p>Email: <span class="font-medium text-stone-800">${escapeHtml(company.email)}</span> | Phone: <span class="font-medium text-stone-800">${escapeHtml(company.phone)}</span></p>
              ${company.tpin ? `<p class="font-mono text-stone-700">TPIN: ${escapeHtml(company.tpin)}</p>` : ''}
            </div>
          </div>

          <div class="sm:text-right space-y-1 bg-stone-50 p-4 rounded-lg border border-stone-200 sm:min-w-[240px]">
            <span class="inline-block text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded">
              OFFICIAL RECEIPT
            </span>
            <div class="text-xl font-bold font-mono text-stone-900 pt-1">${escapeHtml(payment.receipt_number)}</div>
            <div class="text-xs text-stone-600 space-y-1 pt-1">
              <div><strong>Payment Date:</strong> ${escapeHtml(payment.payment_date)}</div>
              <div><strong>Method:</strong> ${escapeHtml(methodDisplay)}</div>
              ${payment.reference ? `<div><strong>Ref / Tx:</strong> ${escapeHtml(payment.reference)}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Received From & Payment Details -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 my-8 py-4 bg-stone-50/70 p-6 rounded-lg border border-stone-100">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Received From</div>
            <div class="font-bold text-base text-stone-900">${escapeHtml(organisation?.name || 'Valued Client')}</div>
            ${contact ? `<div class="text-sm font-medium text-stone-700 mt-1">Attn: ${escapeHtml(contact.first_name)} ${escapeHtml(contact.last_name)} ${contact.job_title ? `(${escapeHtml(contact.job_title)})` : ''}</div>` : ''}
            <div class="text-xs text-stone-600 mt-1 space-y-0.5">
              ${organisation?.address_line1 ? `<p>${escapeHtml(organisation.address_line1)}</p>` : ''}
              ${(contact?.email || organisation?.email) ? `<p>Email: ${escapeHtml(contact?.email || organisation?.email)}</p>` : ''}
              ${(contact?.phone || organisation?.phone) ? `<p>Phone: ${escapeHtml(contact?.phone || organisation?.phone)}</p>` : ''}
              ${organisation?.tpin ? `<p class="font-mono">TPIN: ${escapeHtml(organisation.tpin)}</p>` : ''}
            </div>
          </div>

          <div class="sm:border-l sm:border-stone-200 sm:pl-8 space-y-2">
            <div class="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Amount Received</div>
            <div class="text-2xl font-bold font-mono text-emerald-800">${formattedAmount}</div>
            <div class="text-xs text-stone-700 italic bg-white p-2.5 rounded border border-stone-200">
              "${escapeHtml(words)}"
            </div>
            ${payment.notes ? `<div class="text-xs text-stone-500 pt-1"><strong>Notes:</strong> ${escapeHtml(payment.notes)}</div>` : ''}
          </div>
        </div>

        <!-- Invoice Allocation Table -->
        <div class="my-6">
          <div class="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">Invoices Applied to this Payment</div>
          ${activeAllocations.length > 0 ? `
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b-2 border-stone-800 text-xs uppercase tracking-wider text-stone-700 bg-stone-100">
                    <th class="py-2.5 px-3 text-center w-10">#</th>
                    <th class="py-2.5 px-3">Invoice Number</th>
                    <th class="py-2.5 px-3">Issue Date</th>
                    <th class="py-2.5 px-3 text-right">Invoice Total</th>
                    <th class="py-2.5 px-3 text-right">Amount Applied</th>
                    <th class="py-2.5 px-3 text-right">Remaining Balance</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-stone-200">
                  ${allocationsTableRows}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="p-6 bg-stone-50 rounded-lg border border-stone-200 text-center text-xs text-stone-500">
              No specific invoices were allocated. Full payment amount held as unallocated credit on client account.
            </div>
          `}
        </div>

        <!-- Summary & Balance Position -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 my-8 pt-4 border-t border-stone-200">
          <div class="md:col-span-7 space-y-4">
            <div class="p-4 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-2">
              <strong class="text-stone-800 uppercase tracking-wide">Client Account Status:</strong>
              <div class="flex justify-between py-1 border-b border-stone-200/80">
                <span class="text-stone-600">Total Client Open Invoices Balance:</span>
                <span class="font-mono font-bold text-stone-900">${formattedTotalOutstanding}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-stone-600">Unallocated Credit Available:</span>
                <span class="font-mono font-bold text-emerald-800">${formattedUnallocated}</span>
              </div>
            </div>
          </div>

          <div class="md:col-span-5 space-y-2 text-sm bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div class="flex justify-between py-1 text-stone-600">
              <span>Total Payment Received:</span>
              <span class="font-mono font-bold text-stone-900">${formattedAmount}</span>
            </div>
            <div class="flex justify-between py-1 text-emerald-700">
              <span>Allocated to Invoices:</span>
              <span class="font-mono font-semibold">${formattedAllocated}</span>
            </div>
            <div class="flex justify-between py-1 text-blue-700">
              <span>Held as Client Credit:</span>
              <span class="font-mono font-semibold">${formattedUnallocated}</span>
            </div>
          </div>
        </div>

        <!-- Sign-off & Verification -->
        <div class="mt-12 pt-8 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div class="text-xs text-stone-500 space-y-1">
            <p>Thank you for your business and prompt settlement.</p>
            <p>For questions regarding this receipt, contact <span class="text-stone-700 font-medium">${escapeHtml(company.email)}</span></p>
          </div>

          <div class="text-right space-y-8">
            <div class="text-xs text-stone-500">Authorized Signature &amp; Stamp</div>
            <div class="pt-8 border-b border-stone-400 inline-block w-48"></div>
            <div class="text-[11px] font-medium text-stone-700">${escapeHtml(company.legal_name || company.name)}</div>
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-stone-200 flex justify-between items-center text-[10px] text-stone-400">
          <div>Generated by Savannah Operations — ${escapeHtml(payment.receipt_number)}</div>
          <div>Official Electronic Receipt</div>
        </div>
      </div>
    `;
  }

  /**
   * Helper to print or preview HTML report in printable format
   */
  static printReportHtml(htmlContent: string, title: string = 'Report', landscape: boolean = false): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fullDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(title)}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: ${landscape ? 'A4 landscape' : 'A4 portrait'};
              margin: 10mm;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body class="bg-white text-stone-900 antialiased">
          <div class="no-print p-4 bg-stone-100 border-b border-stone-300 flex justify-between items-center text-xs">
            <span class="font-medium text-stone-600">${escapeHtml(title)} — Ready for PDF Export / Printing</span>
            <div class="space-x-2">
              <button onclick="window.print()" class="px-4 py-1.5 bg-stone-900 text-white font-bold rounded hover:bg-stone-800 transition">Print / Save as PDF</button>
              <button onclick="window.close()" class="px-3 py-1.5 border border-stone-400 rounded text-stone-700 hover:bg-stone-200">Close Window</button>
            </div>
          </div>
          <div class="p-4">
            ${htmlContent}
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(fullDoc);
    printWindow.document.close();
  }
}

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
