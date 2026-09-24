import React, { useState } from 'react';
import { Company, Contact, Invoice, Organisation } from '../../types';
import { Money } from '../../support/money';
import { StatusBadge } from '../common/StatusBadge';
import { DocumentPdfService } from '../../services/documentPdfService';
import { RecordPaymentModal } from './RecordPaymentModal';
import { CreditNoteModal } from './CreditNoteModal';
import {
  ArrowLeft,
  Printer,
  Send,
  DollarSign,
  FileMinus,
  Ban,
  Copy,
  Edit3,
  Clock,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface InvoiceDetailProps {
  invoice: Invoice;
  company: Company;
  organisations: Organisation[];
  contacts: Contact[];
  onBack: () => void;
  onSendInvoice: (invoiceId: string) => void;
  onRecordPayment: (invoiceId: string, payment: { amount_minor: number; payment_method: any; reference?: string; note?: string }) => void;
  onIssueCreditNote: (invoiceId: string, creditNote: { amount_minor: number; reason: string; issue_date?: string }) => void;
  onCancelInvoice: (invoiceId: string, reason: string) => void;
  onDuplicateInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoiceId: string) => void;
}

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  invoice,
  company,
  organisations,
  contacts,
  onBack,
  onSendInvoice,
  onRecordPayment,
  onIssueCreditNote,
  onCancelInvoice,
  onDuplicateInvoice,
  onEditInvoice,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const organisation = organisations.find((o) => o.id === invoice.organisation_id);
  const contact = contacts.find((c) => c.id === invoice.contact_id);

  const isDraft = invoice.status === 'draft';
  const isCancelled = invoice.status === 'cancelled';
  const isPaid = invoice.status === 'paid';
  const isCredited = invoice.status === 'credited';

  const handlePrint = () => {
    window.print();
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCancelError(null);
    if (invoice.amount_paid_minor > 0 || (invoice.payments && invoice.payments.length > 0)) {
      setCancelError('Accounting rule violation: An invoice with payments allocated cannot be cancelled until payments are unallocated.');
      return;
    }
    if (!cancelReason.trim()) {
      setCancelError('Please enter a cancellation reason.');
      return;
    }
    onCancelInvoice(invoice.id, cancelReason.trim());
    setShowCancelModal(false);
  };

  const totalMoney = new Money(invoice.total_minor, invoice.currency_code);
  const paidMoney = new Money(invoice.amount_paid_minor, invoice.currency_code);
  const balanceMoney = new Money(invoice.balance_due_minor, invoice.currency_code);
  const words = totalMoney.amountInWords();
  const heading = DocumentPdfService.getInvoiceHeading(company);

  return (
    <div id="invoice-detail-screen" className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono text-stone-900">{invoice.number}</h1>
              <StatusBadge status={invoice.status} />
              {heading === 'TAX INVOICE' && (
                <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  VAT Registered
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Client: <span className="font-semibold text-stone-800">{organisation?.name || 'Valued Client'}</span> | Issued: {invoice.issue_date}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {isDraft ? (
            <>
              <button
                id="btn-edit-invoice"
                onClick={() => onEditInvoice(invoice.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Draft
              </button>
              <button
                id="btn-send-invoice"
                onClick={() => onSendInvoice(invoice.id)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-700 text-white hover:bg-blue-800 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Send &amp; Lock Invoice
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-stone-500 bg-stone-100 px-2.5 py-1 rounded-md font-medium border border-stone-200">
              <Lock className="w-3.5 h-3.5 text-stone-600" />
              <span>Immutable (Sent)</span>
            </div>
          )}

          {!isDraft && !isCancelled && !isPaid && !isCredited && (
            <button
              id="btn-record-payment"
              onClick={() => onRecordPayment(invoice.id, {} as any)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Record Payment
            </button>
          )}

          {!isDraft && !isCancelled && !isCredited && invoice.balance_due_minor > 0 && (
            <button
              id="btn-issue-credit-note"
              onClick={() => setShowCreditModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200 rounded-lg text-xs font-bold transition-colors"
            >
              <FileMinus className="w-3.5 h-3.5" />
              Credit Note
            </button>
          )}

          <button
            id="btn-duplicate-invoice"
            onClick={() => onDuplicateInvoice(invoice)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>

          <button
            id="btn-print-pdf"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>

          {!isCancelled && (
            <button
              id="btn-cancel-invoice"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Sent Immutability Notification Banner */}
      {!isDraft && (
        <div className="no-print p-3 bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-between text-xs text-stone-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>
              <strong>Accounting Integrity Enforced:</strong> This invoice has been issued/sent and its lines and totals are
              cryptographically locked. Any alterations must be issued as a <strong>Credit Note</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Main Document & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Visual Document Preview Panel (A4 layout) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-stone-200 shadow-md p-8 md:p-12 print:border-none print:shadow-none print:p-0">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-8 border-b-2 border-stone-900 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="h-12 w-auto max-w-[160px] max-h-16 object-contain rounded"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-xl font-mono">
                    {company.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
                    {company.legal_name || company.name}
                  </h2>
                  <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">
                    Business Operations &amp; Enterprise Services
                  </p>
                </div>
              </div>
              <div className="text-xs text-stone-600 pt-2 space-y-0.5">
                <p>
                  {company.address_line1}
                  {company.address_line2 ? `, ${company.address_line2}` : ''}, {company.city}, {company.country}
                </p>
                <p>
                  Email: <span className="font-medium text-stone-800">{company.email}</span> | Phone:{' '}
                  <span className="font-medium text-stone-800">{company.phone}</span>
                </p>
                {company.tpin && (
                  <p className="font-mono text-stone-700">
                    <strong>TPIN / Tax Reg:</strong> {company.tpin}{' '}
                    {company.is_vat_registered && (
                      <span className="text-emerald-700 font-semibold">(VAT Registered)</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:text-right space-y-1 bg-stone-50 p-4 rounded-lg border border-stone-200 sm:min-w-[240px]">
              <span
                id="doc-heading-badge"
                className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded"
              >
                {heading}
              </span>
              <div className="text-xl font-bold font-mono text-stone-900 pt-1">{invoice.number}</div>
              <div className="text-xs text-stone-600 space-y-1 pt-1">
                <div>
                  <strong>Issue Date:</strong> {invoice.issue_date}
                </div>
                <div>
                  <strong>Due Date:</strong> <span className="text-red-700 font-semibold">{invoice.due_date}</span>
                </div>
                {invoice.po_number && (
                  <div>
                    <strong>PO Number:</strong> {invoice.po_number}
                  </div>
                )}
                {invoice.reference && (
                  <div>
                    <strong>Reference:</strong> {invoice.reference}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bill-To Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-8 py-4 bg-stone-50/70 p-6 rounded-lg border border-stone-100">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Billed To</div>
              <div className="font-bold text-base text-stone-900">{organisation?.name || 'Valued Client'}</div>
              {contact && (
                <div className="text-sm font-medium text-stone-700 mt-1">
                  Attn: {contact.first_name} {contact.last_name} {contact.job_title ? `(${contact.job_title})` : ''}
                </div>
              )}
              <div className="text-xs text-stone-600 mt-1 space-y-0.5">
                {organisation?.address_line1 && (
                  <p>
                    {organisation.address_line1}, {organisation.city || ''}
                  </p>
                )}
                {(contact?.email || organisation?.email) && (
                  <p>Email: {contact?.email || organisation?.email}</p>
                )}
                {(contact?.phone || organisation?.phone) && (
                  <p>Phone: {contact?.phone || organisation?.phone}</p>
                )}
                {organisation?.tpin && (
                  <p className="font-mono mt-1 text-stone-700">
                    Client TPIN: <strong>{organisation.tpin}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="sm:border-l sm:border-stone-200 sm:pl-8 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Payment Terms &amp; Status</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-600">Status:</span>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="text-xs text-stone-600 space-y-0.5">
                <p>
                  Payment Terms: <span className="font-medium text-stone-900">{invoice.payment_terms_days} days</span>
                </p>
                <p>
                  Currency: <span className="font-semibold text-stone-900">{invoice.currency_code}</span>
                </p>
                {invoice.quotation_id && (
                  <p className="text-stone-500">Converted from accepted quote</p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto my-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-800 text-xs uppercase tracking-wider text-stone-700 bg-stone-100">
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">Description &amp; Item</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-center">VAT</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {(invoice.lines || []).map((line, idx) => {
                  const qty = (line.quantity_thousandths / 1000).toLocaleString('en-US', {
                    minimumFractionDigits: line.quantity_thousandths % 1000 === 0 ? 0 : 2,
                    maximumFractionDigits: 3,
                  });
                  const unitPrice = new Money(line.unit_price_minor, invoice.currency_code).format();
                  const lineTotal = new Money(line.line_total_minor, invoice.currency_code).format();
                  const vatRatePercent = (invoice.vat_rate_bp / 100).toFixed(invoice.vat_rate_bp % 100 === 0 ? 0 : 2);
                  const vatBadge = line.is_vatable
                    ? company.is_vat_registered
                      ? `${vatRatePercent}%`
                      : 'Standard'
                    : 'Zero / Exempt';

                  return (
                    <tr key={line.id || idx} className="text-sm">
                      <td className="py-3 px-3 text-stone-500 text-center">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-stone-900">{line.description}</div>
                        {line.item_code && (
                          <div className="text-xs text-stone-500 font-mono">Code: {line.item_code}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {qty} {line.unit || 'pcs'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{unitPrice}</td>
                      <td className="py-3 px-3 text-center text-xs text-stone-600">{vatBadge}</td>
                      <td className="py-3 px-3 text-right font-semibold font-mono text-stone-900">{lineTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Block & Words */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-8 pt-4 border-t border-stone-200">
            <div className="md:col-span-7 space-y-4">
              <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                  Amount in Words
                </div>
                <div className="text-sm font-semibold text-emerald-950 italic">"{words}"</div>
              </div>

              {/* Settlement Instructions */}
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-2">
                <div className="font-bold text-stone-800 uppercase tracking-wider">
                  Settlement &amp; Remittance Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-700">
                  {company.bank_name && (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-stone-900">Direct Bank Transfer</p>
                      <p>Bank: <strong>{company.bank_name}</strong></p>
                      <p>Account Name: {company.bank_account_name || company.legal_name}</p>
                      <p className="font-mono">Account No: <strong>{company.bank_account_number}</strong></p>
                      {company.bank_branch_code && <p>Branch: {company.bank_branch_code}</p>}
                      {company.bank_swift && <p>SWIFT: {company.bank_swift}</p>}
                    </div>
                  )}
                  {company.momo_provider && (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-stone-900">Mobile Money Merchant</p>
                      <p>Provider: <strong>{company.momo_provider}</strong></p>
                      <p className="font-mono">Account: <strong>{company.momo_account_number}</strong></p>
                      <p className="text-stone-500">Ref: {invoice.number}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-5 space-y-2 text-sm bg-stone-50 p-4 rounded-lg border border-stone-200">
              <div className="flex justify-between py-1 text-stone-600">
                <span>Subtotal:</span>
                <span className="font-mono text-stone-900">
                  {new Money(invoice.subtotal_minor, invoice.currency_code).format()}
                </span>
              </div>
              {invoice.discount_minor > 0 && (
                <div className="flex justify-between py-1 text-emerald-700">
                  <span>
                    Discount ({invoice.discount_type === 'percent' ? `${(invoice.discount_value / 100).toFixed(0)}%` : 'Fixed'}):
                  </span>
                  <span className="font-mono">
                    -{new Money(invoice.discount_minor, invoice.currency_code).format()}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 text-stone-600">
                <span>VAT ({(invoice.vat_rate_bp / 100).toFixed(invoice.vat_rate_bp % 100 === 0 ? 0 : 2)}%):</span>
                <span className="font-mono text-stone-900">
                  {new Money(invoice.vat_minor, invoice.currency_code).format()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-stone-800 text-base font-bold text-stone-900">
                <span>Grand Total:</span>
                <span className="font-mono text-lg text-emerald-800">{totalMoney.format()}</span>
              </div>

              {(invoice.amount_paid_minor > 0 || invoice.status === 'partially_paid') && (
                <div className="pt-2 border-t border-dashed border-stone-300 space-y-1 text-xs">
                  <div className="flex justify-between text-emerald-800 font-medium">
                    <span>Amount Paid:</span>
                    <span className="font-mono">{paidMoney.format()}</span>
                  </div>
                  <div className="flex justify-between text-red-700 font-bold text-sm">
                    <span>Balance Due:</span>
                    <span className="font-mono">{balanceMoney.format()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Notes */}
          {(invoice.terms || invoice.notes) && (
            <div className="my-6 pt-4 border-t border-stone-200 text-xs text-stone-600 space-y-2">
              {invoice.terms && (
                <div>
                  <strong className="text-stone-800 uppercase tracking-wide">Terms &amp; Conditions:</strong>
                  <p className="mt-0.5 whitespace-pre-line">{invoice.terms}</p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <strong className="text-stone-800 uppercase tracking-wide">Notes / Remarks:</strong>
                  <p className="mt-0.5 whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-12 pt-4 border-t border-stone-200 flex justify-between items-center text-[10px] text-stone-400">
            <div>Generated by Savannah Business Operations — {invoice.number}</div>
            <div>Page 1 of 1</div>
          </div>
        </div>

        {/* Sidebar: Payment History, Credit Notes & Status Timeline */}
        <div className="no-print lg:col-span-4 space-y-6">
          {/* Payment History Card */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                Payment Allocations ({invoice.payments?.length || 0})
              </h3>
              {!isDraft && !isPaid && !isCancelled && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="text-xs text-emerald-800 hover:text-emerald-950 font-bold"
                >
                  + Add
                </button>
              )}
            </div>

            {(!invoice.payments || invoice.payments.length === 0) ? (
              <p className="text-xs text-stone-400 py-3 text-center">No payments recorded yet</p>
            ) : (
              <div className="space-y-2.5">
                {invoice.payments.map((pmt) => (
                  <div key={pmt.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold font-mono text-emerald-800">
                      <span>{new Money(pmt.amount_minor, invoice.currency_code).format()}</span>
                      <span className="text-[10px] text-stone-500 uppercase font-sans">{(pmt.payment_method || 'Payment').replace('_', ' ')}</span>
                    </div>
                    {pmt.reference && (
                      <div className="text-[11px] text-stone-600 font-mono">Ref: {pmt.reference}</div>
                    )}
                    <div className="text-[10px] text-stone-400 flex justify-between">
                      <span>Allocated: {pmt.allocated_at.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Credit Notes Card */}
          {invoice.credit_notes && invoice.credit_notes.length > 0 && (
            <div className="bg-white rounded-xl border border-purple-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
                <FileMinus className="w-4 h-4 text-purple-700" />
                Credit Notes ({invoice.credit_notes.length})
              </h3>
              <div className="space-y-2.5">
                {invoice.credit_notes.map((cn) => (
                  <div key={cn.id} className="p-3 bg-purple-50/50 rounded-lg border border-purple-100 text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold font-mono text-purple-900">
                      <span>{cn.number}</span>
                      <span>-{new Money(cn.total_minor, invoice.currency_code).format()}</span>
                    </div>
                    <p className="text-stone-600 italic">"{cn.reason}"</p>
                    <div className="text-[10px] text-stone-400">Issued: {cn.issue_date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-600" />
              Status Timeline
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-stone-900">Invoice Created</div>
                  <div className="text-[11px] text-stone-500 font-mono">{invoice.created_at.slice(0, 16).replace('T', ' ')}</div>
                </div>
              </div>

              {invoice.sent_at && (
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-stone-900">Sent to Client</div>
                    <div className="text-[11px] text-stone-500 font-mono">{invoice.sent_at.slice(0, 16).replace('T', ' ')}</div>
                  </div>
                </div>
              )}

              {invoice.fully_paid_at && (
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-800">Fully Settled (Paid)</div>
                    <div className="text-[11px] text-stone-500 font-mono">{invoice.fully_paid_at.slice(0, 16).replace('T', ' ')}</div>
                  </div>
                </div>
              )}

              {invoice.cancelled_at && (
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-red-800">Cancelled</div>
                    <p className="text-[11px] text-stone-600">{invoice.cancellation_reason}</p>
                    <div className="text-[10px] text-stone-400 font-mono">{invoice.cancelled_at.slice(0, 16).replace('T', ' ')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <RecordPaymentModal
        invoice={invoice}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onRecord={(pmt) => onRecordPayment(invoice.id, pmt)}
      />

      {/* Credit Note Modal */}
      <CreditNoteModal
        invoice={invoice}
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onIssue={(cn) => onIssueCreditNote(invoice.id, cn)}
      />

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-stone-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-red-700 flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Cancel Invoice {invoice.number}
            </h2>

            {cancelError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {cancelError}
              </div>
            )}

            <p className="text-xs text-stone-600">
              Are you sure you want to cancel this invoice? Once cancelled, the invoice becomes void.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Cancellation Reason *</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Client requested revised scope, project cancelled..."
                className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900"
                required
              />
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Close
              </button>
              <button
                id="btn-confirm-cancel-invoice"
                type="button"
                onClick={handleCancelSubmit}
                className="px-4 py-2 bg-red-700 text-white rounded-lg text-xs font-bold hover:bg-red-800"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
