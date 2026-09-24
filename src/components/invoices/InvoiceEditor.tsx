import React, { useState, useMemo, useEffect } from 'react';
import { Company, Contact, DiscountType, Invoice, Item, Organisation } from '../../types';
import { RawLineInput, QuotationCalculator } from '../../services/quotationCalculator';
import { Money } from '../../support/money';
import { LineEditor } from '../lines/LineEditor';
import { ArrowLeft, Save, Lock, Building2 } from 'lucide-react';

interface InvoiceEditorProps {
  initialInvoice?: Invoice;
  company: Company;
  organisations: Organisation[];
  contacts: Contact[];
  items: Item[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  initialInvoice,
  company,
  organisations,
  contacts,
  items,
  onSave,
  onCancel,
}) => {
  const isEditing = !!initialInvoice;
  const isSent = initialInvoice ? initialInvoice.status !== 'draft' : false;

  const [organisationId, setOrganisationId] = useState<string>(
    initialInvoice?.organisation_id || (organisations[0]?.id || '')
  );
  const [contactId, setContactId] = useState<string>(initialInvoice?.contact_id || '');
  const [reference, setReference] = useState<string>(initialInvoice?.reference || '');
  const [poNumber, setPoNumber] = useState<string>(initialInvoice?.po_number || '');
  const [issueDate, setIssueDate] = useState<string>(
    initialInvoice?.issue_date || new Date().toISOString().slice(0, 10)
  );
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(
    initialInvoice?.payment_terms_days || 30
  );
  const [dueDate, setDueDate] = useState<string>(() => {
    if (initialInvoice?.due_date) return initialInvoice.due_date;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const [discountType, setDiscountType] = useState<DiscountType>(
    initialInvoice?.discount_type || 'none'
  );
  const [discountInputValue, setDiscountInputValue] = useState<string>(() => {
    if (!initialInvoice || initialInvoice.discount_type === 'none') return '0';
    if (initialInvoice.discount_type === 'percent') {
      return ((initialInvoice.discount_value || 0) / 100).toString();
    }
    return ((initialInvoice.discount_value || 0) / 100).toFixed(2);
  });

  const [vatRateBp] = useState<number>(
    initialInvoice?.vat_rate_bp ?? (company.is_vat_registered ? company.vat_rate_bp : 0)
  );

  const [notes, setNotes] = useState<string>(initialInvoice?.notes || '');
  const [terms, setTerms] = useState<string>(
    initialInvoice?.terms || company.default_invoice_terms || ''
  );

  const [lines, setLines] = useState<RawLineInput[]>(() => {
    if (initialInvoice?.lines && initialInvoice.lines.length > 0) {
      return initialInvoice.lines.map((l) => ({
        item_code: l.item_code,
        description: l.description,
        quantity_thousandths: l.quantity_thousandths,
        unit: l.unit,
        unit_price_minor: l.unit_price_minor,
        discount_percent_bp: l.discount_percent_bp,
        is_vatable: l.is_vatable,
      }));
    }
    return [
      {
        item_code: '',
        description: '',
        quantity_thousandths: 1000,
        unit: 'pcs',
        unit_price_minor: 0,
        discount_percent_bp: 0,
        is_vatable: true,
      },
    ];
  });

  // Automatically update due date when issue date or terms change
  useEffect(() => {
    if (issueDate && paymentTermsDays >= 0) {
      const parts = issueDate.split('-').map(Number);
      if (parts.length === 3) {
        const issueObj = new Date(parts[0], parts[1] - 1, parts[2]);
        issueObj.setDate(issueObj.getDate() + Number(paymentTermsDays));
        const y = issueObj.getFullYear();
        const m = String(issueObj.getMonth() + 1).padStart(2, '0');
        const d = String(issueObj.getDate()).padStart(2, '0');
        setDueDate(`${y}-${m}-${d}`);
      }
    }
  }, [issueDate, paymentTermsDays]);

  // Filter contacts by chosen organisation
  const clientContacts = useMemo(() => {
    return contacts.filter((c) => c.organisation_id === organisationId);
  }, [contacts, organisationId]);

  // Live Calculations
  const calcResult = useMemo(() => {
    const rawVal = parseFloat(discountInputValue) || 0;
    let computedDiscountVal = 0;
    if (discountType === 'percent') {
      computedDiscountVal = Math.round(rawVal * 100);
    } else if (discountType === 'fixed') {
      computedDiscountVal = Math.round(rawVal * 100);
    }

    try {
      return QuotationCalculator.calculate(lines, discountType, computedDiscountVal, vatRateBp);
    } catch {
      return {
        lines: [],
        subtotal_minor: 0,
        discount_minor: 0,
        vatable_subtotal_minor: 0,
        vat_minor: 0,
        total_minor: 0,
      };
    }
  }, [lines, discountType, discountInputValue, vatRateBp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.length === 0 || !lines[0].description.trim()) {
      alert('Please include at least one valid line item with a description.');
      return;
    }

    const rawVal = parseFloat(discountInputValue) || 0;
    const computedDiscountVal = discountType === 'percent' ? Math.round(rawVal * 100) : Math.round(rawVal * 100);

    onSave({
      organisation_id: organisationId,
      contact_id: contactId || undefined,
      reference: reference.trim() || undefined,
      po_number: poNumber.trim() || undefined,
      issue_date: issueDate,
      due_date: dueDate,
      payment_terms_days: Number(paymentTermsDays),
      currency_code: company.currency_code,
      discount_type: discountType,
      discount_value: computedDiscountVal,
      vat_rate_bp: vatRateBp,
      notes: notes.trim() || undefined,
      terms: terms.trim() || undefined,
      lines,
    });
  };

  return (
    <form id="invoice-editor-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-stone-900">
              {isEditing ? `Edit Invoice (${initialInvoice?.number})` : 'Create New Invoice'}
            </h1>
            <p className="text-xs text-stone-500">
              {isSent
                ? 'Immutable invoice: Only administrative notes/dates can be adjusted. Totals are locked.'
                : 'Draft mode: Full editing permitted across items, quantities, and pricing.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-save-invoice-form"
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Invoice
          </button>
        </div>
      </div>

      {isSent && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
          <Lock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Accounting Rule Enforced:</span> This invoice has already been issued to the client.
            Line items, pricing, discounts, and tax rates cannot be modified. To reduce invoice amounts, issue a Credit Note.
          </div>
        </div>
      )}

      {/* Primary Details Grid */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-stone-600" />
          Client &amp; Invoice Metadata
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Client / Organisation *</label>
            <select
              id="invoice-client-select"
              value={organisationId}
              onChange={(e) => {
                setOrganisationId(e.target.value);
                setContactId('');
              }}
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800 bg-white"
              required
            >
              {organisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} {org.tpin ? `(TPIN: ${org.tpin})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Attention Contact</label>
            <select
              id="invoice-contact-select"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800 bg-white"
            >
              <option value="">-- Select Contact --</option>
              {clientContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} {c.job_title ? `(${c.job_title})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Currency</label>
            <input
              type="text"
              value={`${company.currency_code} (Company Default)`}
              disabled
              className="w-full text-xs rounded-lg border-stone-300 bg-stone-100 px-3 py-2 text-stone-600 font-mono font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-stone-100">
          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Issue Date *</label>
            <input
              id="invoice-issue-date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full text-xs font-mono rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Payment Terms (Days) *</label>
            <select
              id="invoice-payment-terms"
              value={paymentTermsDays}
              onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800 bg-white"
            >
              <option value="0">Due on Receipt (0 days)</option>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days (Standard)</option>
              <option value="45">45 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Due Date (Computed) *</label>
            <input
              id="invoice-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs font-mono font-bold text-red-700 rounded-lg border-stone-300 px-3 py-2 focus:border-stone-800 focus:ring-stone-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">PO / Contract Number</label>
            <input
              id="invoice-po-input"
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-881920"
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Project Reference / Job Scope</label>
          <input
            id="invoice-ref-input"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. Q3 Server SLA & Cloud Storage Migration"
            className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
          />
        </div>
      </div>

      {/* Line Item Editor */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
        <LineEditor
          lines={lines}
          onChange={setLines}
          items={items}
          currencyCode={company.currency_code}
          vatRateBp={vatRateBp}
          readOnly={isSent}
        />
      </div>

      {/* Discounts, VAT, Notes and Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Document Terms &amp; Tax Settings</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Discount Type</label>
              <select
                value={discountType}
                disabled={isSent}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800 bg-white"
              >
                <option value="none">No Document Discount</option>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount ({company.currency_code})</option>
              </select>
            </div>

            {discountType !== 'none' && (
              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                  Discount Value {discountType === 'percent' ? '(%)' : `(${company.currency_code})`}
                </label>
                <input
                  type="number"
                  step={discountType === 'percent' ? '0.1' : '0.01'}
                  min="0"
                  disabled={isSent}
                  value={discountInputValue}
                  onChange={(e) => setDiscountInputValue(e.target.value)}
                  className="w-full text-xs font-mono rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Payment Instructions &amp; Terms</label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Payment terms, bank details reference, interest policy..."
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes for accounting / dispatch..."
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
            />
          </div>
        </div>

        {/* Live Calculation Summary */}
        <div className="lg:col-span-5 bg-stone-900 text-stone-100 p-6 rounded-xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Live Accounting Summary</h2>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-stone-300">
              <span>Gross Subtotal:</span>
              <span className="font-mono font-medium">{new Money(calcResult.subtotal_minor, company.currency_code).format()}</span>
            </div>

            {calcResult.discount_minor > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount:</span>
                <span className="font-mono font-medium">-{new Money(calcResult.discount_minor, company.currency_code).format()}</span>
              </div>
            )}

            <div className="flex justify-between text-stone-300">
              <span>VAT ({(vatRateBp / 100).toFixed(0)}%):</span>
              <span className="font-mono font-medium">{new Money(calcResult.vat_minor, company.currency_code).format()}</span>
            </div>

            <div className="pt-3 border-t border-stone-700 flex justify-between items-center text-sm font-bold text-white">
              <span>Grand Total:</span>
              <span className="font-mono text-xl text-emerald-400">{new Money(calcResult.total_minor, company.currency_code).format()}</span>
            </div>

            <div className="pt-3 border-t border-stone-800">
              <span className="text-[11px] text-stone-400 uppercase tracking-wider block mb-1">Amount in Words:</span>
              <p className="text-xs text-amber-200/90 italic">
                "{new Money(calcResult.total_minor, company.currency_code).amountInWords()}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
