import React, { useState } from 'react';
import { ExpenseCategory, PurchaseInvoice } from '../../types/accounting';
import { Company, User } from '../../types';
import { AccountingService } from '../../services/accountingService';
import { FileText, Plus, Trash2, X, Check } from 'lucide-react';
import { Money } from '../../support/money';

interface LineItemForm {
  id: string;
  description: string;
  category: ExpenseCategory;
  quantity: number;
  unit: string;
  unitPrice: number; // in Kwacha or base units
  isVatable: boolean;
}

interface PurchaseInvoiceEditorModalProps {
  company: Company;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (invoice: PurchaseInvoice) => void;
  onOpenCreateSupplier?: () => void;
}

export const PurchaseInvoiceEditorModal: React.FC<PurchaseInvoiceEditorModalProps> = ({
  company,
  currentUser,
  isOpen,
  onClose,
  onSaved,
  onOpenCreateSupplier,
}) => {
  const suppliers = AccountingService.getSuppliers(company.id);

  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [internalReference, setInternalReference] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);
  const [category, setCategory] = useState<ExpenseCategory>('cost_of_goods');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [lines, setLines] = useState<LineItemForm[]>([
    {
      id: '1',
      description: '',
      category: 'cost_of_goods',
      quantity: 1,
      unit: 'unit',
      unitPrice: 0,
      isVatable: company.is_vat_registered,
    },
  ]);

  if (!isOpen) return null;

  const vatRateBp = company.is_vat_registered ? company.vat_rate_bp || 1600 : 0;

  // Calculate Due Date based on Issue Date + Terms
  const issueDateObj = new Date(issueDate);
  const dueDateObj = new Date(issueDateObj.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);
  const dueDateStr = dueDateObj.toISOString().split('T')[0];

  // Totals calculations
  let calculatedSubtotalMinor = 0;
  let calculatedVatMinor = 0;

  lines.forEach((line) => {
    const lineSubtotal = Math.round(line.quantity * (line.unitPrice * 100));
    const lineVat = line.isVatable ? Math.round((lineSubtotal * vatRateBp) / 10000) : 0;
    calculatedSubtotalMinor += lineSubtotal;
    calculatedVatMinor += lineVat;
  });

  const calculatedTotalMinor = calculatedSubtotalMinor + calculatedVatMinor;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: '',
        category,
        quantity: 1,
        unit: 'unit',
        unitPrice: 0,
        isVatable: company.is_vat_registered,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLine = (index: number, updates: Partial<LineItemForm>) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setError('Please select a supplier or create one.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setError("Vendor's invoice or bill number is required.");
      return;
    }

    const validLines = lines.filter((l) => l.description.trim() && l.unitPrice > 0);
    if (validLines.length === 0) {
      setError('Please add at least one line item with description and price.');
      return;
    }

    try {
      const created = AccountingService.createPurchaseInvoice(company, {
        supplier_id: supplierId,
        invoice_number: invoiceNumber.trim(),
        internal_reference: internalReference.trim() || undefined,
        issue_date: issueDate,
        due_date: dueDateStr,
        payment_terms_days: paymentTermsDays,
        category,
        lines: validLines.map((l) => ({
          description: l.description.trim(),
          category: l.category,
          quantity: l.quantity,
          unit: l.unit,
          unit_price_minor: Math.round(l.unitPrice * 100),
          is_vatable: l.isVatable,
        })),
        notes: notes.trim() || undefined,
        recorded_by_user_id: currentUser.id,
      });

      onSaved(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to capture purchase invoice.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                Capture Purchase Invoice (Vendor Bill)
              </h2>
              <p className="text-xs text-stone-500">Record incoming supplier invoice into Accounts Payable</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[84vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Supplier and Invoice Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Supplier / Vendor *</span>
                {onOpenCreateSupplier && (
                  <button
                    type="button"
                    onClick={onOpenCreateSupplier}
                    className="text-[11px] text-blue-700 font-bold hover:underline cursor-pointer"
                  >
                    + New Supplier
                  </button>
                )}
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
              >
                <option value="">Select a supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.tpin ? `(TPIN: ${s.tpin})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Vendor Bill # *
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-88492"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Internal PO / Ref #
              </label>
              <input
                type="text"
                value={internalReference}
                onChange={(e) => setInternalReference(e.target.value)}
                placeholder="e.g. PO-2026-044"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Invoice Issue Date *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              >
                <option value={0}>Due on Receipt</option>
                <option value={7}>Net 7 Days</option>
                <option value={15}>Net 15 Days</option>
                <option value={30}>Net 30 Days</option>
                <option value={60}>Net 60 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Primary Account
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
              >
                <option value="cost_of_goods">Direct Inventory / COGS</option>
                <option value="equipment_software">Hardware / IT Equipment</option>
                <option value="telecom_internet">Telecoms &amp; Internet</option>
                <option value="rent_rates">Rent &amp; Premises</option>
                <option value="subcontractor">Subcontractor Labor</option>
                <option value="other_operating">General Operating</option>
              </select>
            </div>
          </div>

          {/* Line items table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden mt-2">
            <div className="bg-stone-100 px-4 py-2 border-b border-stone-200 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Bill Line Items
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Row</span>
              </button>
            </div>

            <div className="p-3 space-y-2 bg-stone-50/50">
              {lines.map((line, idx) => {
                const lineSub = line.quantity * line.unitPrice;
                const lineVat = line.isVatable ? (lineSub * vatRateBp) / 10000 : 0;
                const lineTot = lineSub + lineVat;

                return (
                  <div
                    key={line.id}
                    className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <input
                        type="text"
                        required
                        placeholder="Item or service description..."
                        value={line.description}
                        onChange={(e) => handleUpdateLine(idx, { description: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Qty"
                          value={line.quantity || ''}
                          onChange={(e) =>
                            handleUpdateLine(idx, { quantity: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white text-right font-mono"
                        />
                        <input
                          type="text"
                          placeholder="unit"
                          value={line.unit}
                          onChange={(e) => handleUpdateLine(idx, { unit: e.target.value })}
                          className="w-14 px-1 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-[10px] text-stone-600 focus:outline-none text-center"
                        />
                      </div>
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={line.unitPrice || ''}
                        onChange={(e) =>
                          handleUpdateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white text-right font-mono font-bold"
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2 text-right">
                      <div className="text-xs font-mono font-bold text-stone-900">
                        {company.currency_code} {lineTot.toFixed(2)}
                      </div>
                      <label className="inline-flex items-center gap-1 cursor-pointer text-[10px] text-stone-500 font-bold">
                        <input
                          type="checkbox"
                          checked={line.isVatable}
                          disabled={!company.is_vat_registered}
                          onChange={(e) => handleUpdateLine(idx, { isVatable: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>VAT ({company.vat_rate_bp ? (company.vat_rate_bp / 100).toFixed(0) : '16'}%)</span>
                      </label>
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length <= 1}
                        className="p-1 text-stone-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subtotal, VAT and Total bar */}
            <div className="bg-stone-100 p-4 border-t border-stone-200 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-3">
              <div className="text-xs text-stone-500">
                Payment Due Date: <strong className="text-stone-800 font-mono">{dueDateStr}</strong>
              </div>

              <div className="space-y-1 text-right text-xs font-mono">
                <div className="flex justify-between gap-6 text-stone-600">
                  <span>Net Goods Subtotal:</span>
                  <span className="font-bold text-stone-800">
                    {new Money(calculatedSubtotalMinor, company.currency_code).format()}
                  </span>
                </div>
                <div className="flex justify-between gap-6 text-emerald-700">
                  <span>Input VAT Claimable:</span>
                  <span className="font-bold">
                    {new Money(calculatedVatMinor, company.currency_code).format()}
                  </span>
                </div>
                <div className="flex justify-between gap-6 text-sm font-black text-stone-900 border-t border-stone-300 pt-1">
                  <span>Total Payable:</span>
                  <span>{new Money(calculatedTotalMinor, company.currency_code).format()}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Bill Notes &amp; Line Allocation Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Hardware delivery verified at Lusaka workshop..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Capture Bill into Accounts Payable</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
