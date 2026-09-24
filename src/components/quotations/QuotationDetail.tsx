import React from 'react';
import { Company, Contact, Organisation, Quotation } from '../../types';
import { Money } from '../../support/money';
import { StatusBadge } from '../common/StatusBadge';
import {
  ArrowLeft,
  Printer,
  Send,
  CheckCircle,
  XCircle,
  FileText,
} from 'lucide-react';

interface QuotationDetailProps {
  quotation: Quotation;
  company: Company;
  organisations: Organisation[];
  contacts: Contact[];
  onBack: () => void;
  onSendQuotation: (id: string) => void;
  onAcceptQuotation: (id: string) => void;
  onRejectQuotation: (id: string) => void;
  onConvertToInvoice: (quotation: Quotation) => void;
}

export const QuotationDetail: React.FC<QuotationDetailProps> = ({
  quotation,
  company,
  organisations,
  contacts,
  onBack,
  onSendQuotation,
  onAcceptQuotation,
  onRejectQuotation,
  onConvertToInvoice,
}) => {
  const organisation = organisations.find((o) => o.id === quotation.organisation_id);
  const contact = contacts.find((c) => c.id === quotation.contact_id);

  const isDraft = quotation.status === 'draft';
  const isAccepted = quotation.status === 'accepted';

  const totalMoney = new Money(quotation.total_minor, quotation.currency_code);
  const words = totalMoney.amountInWords();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="quotation-detail-screen" className="space-y-6">
      {/* Top Header Toolbar */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono text-stone-900">{quotation.number}</h1>
              <StatusBadge status={quotation.status} />
            </div>
            <p className="text-xs text-stone-500">
              {quotation.title} | Client: <span className="font-semibold text-stone-800">{organisation?.name || 'Valued Client'}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isDraft && (
            <button
              id="btn-send-quote"
              onClick={() => onSendQuotation(quotation.id)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-700 text-white hover:bg-blue-800 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Send to Client
            </button>
          )}

          {!isAccepted && quotation.status !== 'rejected' && (
            <>
              <button
                id="btn-accept-quote"
                onClick={() => onAcceptQuotation(quotation.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Client Accepted
              </button>

              <button
                id="btn-reject-quote"
                onClick={() => onRejectQuotation(quotation.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-stone-600 hover:bg-red-50 hover:text-red-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Mark Rejected
              </button>
            </>
          )}

          {isAccepted && (
            <button
              id="btn-convert-quote-to-inv"
              onClick={() => onConvertToInvoice(quotation)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-800 text-white hover:bg-emerald-900 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              Convert to Official Invoice
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Quotation Document Render */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl border border-stone-200 shadow-md p-8 md:p-12 print:border-none print:shadow-none print:p-0">
        {/* Header */}
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
                  Commercial Proposal &amp; Quotation
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
              {company.tpin && <p className="font-mono text-stone-700">TPIN: {company.tpin}</p>}
            </div>
          </div>

          <div className="sm:text-right space-y-1 bg-stone-50 p-4 rounded-lg border border-stone-200 sm:min-w-[240px]">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-800 bg-blue-100 px-2.5 py-1 rounded">
              OFFICIAL QUOTATION
            </span>
            <div className="text-xl font-bold font-mono text-stone-900 pt-1">{quotation.number}</div>
            <div className="text-xs text-stone-600 space-y-1 pt-1">
              <div>
                <strong>Issue Date:</strong> {quotation.issue_date}
              </div>
              <div>
                <strong>Valid Until:</strong> <span className="text-amber-800 font-semibold">{quotation.valid_until}</span>
              </div>
              {quotation.reference && (
                <div>
                  <strong>Ref:</strong> {quotation.reference}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client & Scope Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-8 py-4 bg-stone-50/70 p-6 rounded-lg border border-stone-100">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Prepared For</div>
            <div className="font-bold text-base text-stone-900">{organisation?.name || 'Valued Client'}</div>
            {contact && (
              <div className="text-sm font-medium text-stone-700 mt-1">
                Attn: {contact.first_name} {contact.last_name} {contact.job_title ? `(${contact.job_title})` : ''}
              </div>
            )}
            <div className="text-xs text-stone-600 mt-1 space-y-0.5">
              {organisation?.address_line1 && <p>{organisation.address_line1}</p>}
              {(contact?.email || organisation?.email) && <p>Email: {contact?.email || organisation?.email}</p>}
              {(contact?.phone || organisation?.phone) && <p>Phone: {contact?.phone || organisation?.phone}</p>}
            </div>
          </div>

          <div className="sm:border-l sm:border-stone-200 sm:pl-8 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Proposal Overview</div>
            <div className="font-semibold text-stone-900 text-sm">{quotation.title}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-600">Status:</span>
              <StatusBadge status={quotation.status} />
            </div>
            {quotation.payment_terms && (
              <div className="text-xs text-stone-600">
                Payment Terms: <span className="font-medium text-stone-900">{quotation.payment_terms}</span>
              </div>
            )}
          </div>
        </div>

        {/* Lines */}
        <div className="overflow-x-auto my-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-stone-800 text-xs uppercase tracking-wider text-stone-700 bg-stone-100">
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3">Description &amp; Specifications</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-center">VAT</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {(quotation.lines || []).map((line, idx) => {
                const qty = (line.quantity_thousandths / 1000).toLocaleString('en-US', {
                  minimumFractionDigits: line.quantity_thousandths % 1000 === 0 ? 0 : 2,
                  maximumFractionDigits: 3,
                });
                const unitPrice = new Money(line.unit_price_minor, quotation.currency_code).format();
                const lineTotal = new Money(line.line_total_minor, quotation.currency_code).format();

                return (
                  <tr key={line.id || idx} className="text-sm">
                    <td className="py-3 px-3 text-stone-500 text-center">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-stone-900">{line.description}</div>
                      {line.item_code && <div className="text-xs text-stone-500 font-mono">Code: {line.item_code}</div>}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {qty} {line.unit || 'pcs'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{unitPrice}</td>
                    <td className="py-3 px-3 text-center text-xs text-stone-600">
                      {line.is_vatable ? `${(quotation.vat_rate_bp / 100).toFixed(0)}%` : 'Exempt'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold font-mono text-stone-900">{lineTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Words */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-8 pt-4 border-t border-stone-200">
          <div className="md:col-span-7 space-y-4">
            <div className="p-4 bg-blue-50/60 rounded-lg border border-blue-100">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">Amount in Words</div>
              <div className="text-sm font-semibold text-blue-950 italic">"{words}"</div>
            </div>

            {quotation.terms && (
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-1">
                <strong className="text-stone-800 uppercase tracking-wide">Terms &amp; Conditions:</strong>
                <p className="mt-0.5 whitespace-pre-line text-stone-700">{quotation.terms}</p>
              </div>
            )}
          </div>

          <div className="md:col-span-5 space-y-2 text-sm bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div className="flex justify-between py-1 text-stone-600">
              <span>Subtotal:</span>
              <span className="font-mono text-stone-900">
                {new Money(quotation.subtotal_minor, quotation.currency_code).format()}
              </span>
            </div>
            {quotation.discount_minor > 0 && (
              <div className="flex justify-between py-1 text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono">-{new Money(quotation.discount_minor, quotation.currency_code).format()}</span>
              </div>
            )}
            <div className="flex justify-between py-1 text-stone-600">
              <span>VAT ({(quotation.vat_rate_bp / 100).toFixed(0)}%):</span>
              <span className="font-mono text-stone-900">
                {new Money(quotation.vat_minor, quotation.currency_code).format()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-stone-800 text-base font-bold text-stone-900">
              <span>Quotation Total:</span>
              <span className="font-mono text-lg text-blue-800">{totalMoney.format()}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-4 border-t border-stone-200 flex justify-between items-center text-[10px] text-stone-400">
          <div>Generated by Savannah Operations — {quotation.number}</div>
          <div>Valid through {quotation.valid_until}</div>
        </div>
      </div>
    </div>
  );
};
