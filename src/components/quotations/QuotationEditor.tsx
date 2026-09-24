import React, { useState, useMemo } from 'react';
import { Company, Contact, DiscountType, Item, Organisation, Quotation } from '../../types';
import { RawLineInput, QuotationCalculator } from '../../services/quotationCalculator';
import { Money } from '../../support/money';
import { LineEditor } from '../lines/LineEditor';
import { ArrowLeft, Save } from 'lucide-react';

interface QuotationEditorProps {
  initialQuotation?: Quotation;
  company: Company;
  organisations: Organisation[];
  contacts: Contact[];
  items: Item[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export const QuotationEditor: React.FC<QuotationEditorProps> = ({
  initialQuotation,
  company,
  organisations,
  contacts,
  items,
  onSave,
  onCancel,
}) => {
  const isEditing = !!initialQuotation;

  const [title, setTitle] = useState<string>(
    initialQuotation?.title || 'Commercial Proposal & Scope of Work'
  );
  const [organisationId, setOrganisationId] = useState<string>(
    initialQuotation?.organisation_id || (organisations[0]?.id || '')
  );
  const [contactId, setContactId] = useState<string>(initialQuotation?.contact_id || '');
  const [issueDate, setIssueDate] = useState<string>(
    initialQuotation?.issue_date || new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState<string>(() => {
    if (initialQuotation?.valid_until) return initialQuotation.valid_until;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const [paymentTerms, setPaymentTerms] = useState<string>(
    initialQuotation?.payment_terms || '50% deposit on order, 50% upon completion'
  );

  const [discountType, setDiscountType] = useState<DiscountType>(
    initialQuotation?.discount_type || 'none'
  );
  const [discountInputValue, setDiscountInputValue] = useState<string>(() => {
    if (!initialQuotation || initialQuotation.discount_type === 'none') return '0';
    if (initialQuotation.discount_type === 'percent') {
      return ((initialQuotation.discount_value || 0) / 100).toString();
    }
    return ((initialQuotation.discount_value || 0) / 100).toFixed(2);
  });

  const vatRateBp = initialQuotation?.vat_rate_bp ?? (company.is_vat_registered ? company.vat_rate_bp : 0);

  const [notes, setNotes] = useState<string>(initialQuotation?.notes || '');
  const [terms, setTerms] = useState<string>(
    initialQuotation?.terms || company.default_quotation_terms || ''
  );

  const [lines, setLines] = useState<RawLineInput[]>(() => {
    if (initialQuotation?.lines && initialQuotation.lines.length > 0) {
      return initialQuotation.lines.map((l) => ({
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

  const clientContacts = useMemo(() => {
    return contacts.filter((c) => c.organisation_id === organisationId);
  }, [contacts, organisationId]);

  const calcResult = useMemo(() => {
    const rawVal = parseFloat(discountInputValue) || 0;
    const computedDiscountVal = discountType === 'percent' ? Math.round(rawVal * 100) : Math.round(rawVal * 100);
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
      alert('Please add at least one line item.');
      return;
    }

    const rawVal = parseFloat(discountInputValue) || 0;
    const computedDiscountVal = discountType === 'percent' ? Math.round(rawVal * 100) : Math.round(rawVal * 100);

    onSave({
      title: title.trim(),
      organisation_id: organisationId,
      contact_id: contactId || undefined,
      issue_date: issueDate,
      valid_until: validUntil,
      currency_code: company.currency_code,
      payment_terms: paymentTerms,
      discount_type: discountType,
      discount_value: computedDiscountVal,
      vat_rate_bp: vatRateBp,
      notes: notes.trim() || undefined,
      terms: terms.trim() || undefined,
      lines,
    });
  };

  return (
    <form id="quotation-editor-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
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
              {isEditing ? `Edit Quotation (${initialQuotation?.number})` : 'New Commercial Quotation'}
            </h1>
            <p className="text-xs text-stone-500">
              Draft commercial scope, pricing, and validity window.
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
            id="btn-save-quote-form"
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Quotation
          </button>
        </div>
      </div>

      {/* Primary Details */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Proposal Title / Subject *</label>
          <input
            id="quote-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Annual IT Support & Disaster Recovery Infrastructure"
            className="w-full text-xs font-semibold rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Client / Organisation *</label>
            <select
              id="quote-client-select"
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
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Attention Contact</label>
            <select
              id="quote-contact-select"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-stone-100">
          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Issue Date *</label>
            <input
              id="quote-issue-date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full text-xs font-mono rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Valid Until Date *</label>
            <input
              id="quote-valid-until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full text-xs font-mono font-bold text-amber-800 rounded-lg border-stone-300 px-3 py-2 focus:border-stone-800 focus:ring-stone-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Payment Terms</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. 30 days / 50% deposit"
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
        <LineEditor
          lines={lines}
          onChange={setLines}
          items={items}
          currencyCode={company.currency_code}
          vatRateBp={vatRateBp}
        />
      </div>

      {/* Discounts, Terms, and Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Discounts &amp; Terms</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800 bg-white"
              >
                <option value="none">No Discount</option>
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
                  value={discountInputValue}
                  onChange={(e) => setDiscountInputValue(e.target.value)}
                  className="w-full text-xs font-mono rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Proposal Terms &amp; Conditions</label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Quotation validity, payment milestones..."
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Notes / Scope Highlights</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Executive highlights, scope inclusions..."
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
            />
          </div>
        </div>

        {/* Live Calculation Summary */}
        <div className="lg:col-span-5 bg-stone-900 text-stone-100 p-6 rounded-xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Quotation Summary</h2>

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
              <span>Total Value:</span>
              <span className="font-mono text-xl text-amber-400">{new Money(calcResult.total_minor, company.currency_code).format()}</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
