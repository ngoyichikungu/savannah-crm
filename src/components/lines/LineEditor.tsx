import React from 'react';
import { CurrencyCode, Item } from '../../types';
import { RawLineInput } from '../../services/quotationCalculator';
import { Money } from '../../support/money';
import { Plus, Trash2, Tag } from 'lucide-react';

interface LineEditorProps {
  lines: RawLineInput[];
  onChange: (lines: RawLineInput[]) => void;
  items: Item[];
  currencyCode: CurrencyCode;
  vatRateBp: number;
  readOnly?: boolean;
}

export const LineEditor: React.FC<LineEditorProps> = ({
  lines,
  onChange,
  items,
  currencyCode,
  vatRateBp,
  readOnly = false,
}) => {
  const handleAddLine = () => {
    if (readOnly) return;
    const newLine: RawLineInput = {
      item_code: '',
      description: '',
      quantity_thousandths: 1000, // default 1.000
      unit: 'pcs',
      unit_price_minor: 0,
      discount_percent_bp: 0,
      is_vatable: true,
    };
    onChange([...lines, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    if (readOnly || lines.length <= 1) return;
    const updated = lines.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateLine = (index: number, patch: Partial<RawLineInput>) => {
    if (readOnly) return;
    const updated = lines.map((line, i) => {
      if (i !== index) return line;
      return { ...line, ...patch };
    });
    onChange(updated);
  };

  const handleSelectItem = (index: number, itemId: string) => {
    if (readOnly) return;
    const item = items.find((it) => it.id === itemId);
    if (!item) return;

    handleUpdateLine(index, {
      item_code: item.code,
      description: item.name,
      unit: item.unit,
      unit_price_minor: item.default_unit_price_minor,
      is_vatable: item.is_vatable,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Line Items &amp; Scope</h3>
          <p className="text-xs text-stone-500">
            {readOnly ? 'Locked against edits (Immutable)' : 'Add and customize billable units, pricing and VAT exemptions.'}
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleAddLine}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-600 bg-stone-50">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3 min-w-[220px]">Item &amp; Description</th>
              <th className="py-2.5 px-3 w-28 text-right">Quantity</th>
              <th className="py-2.5 px-3 w-20">Unit</th>
              <th className="py-2.5 px-3 w-32 text-right">Unit Price</th>
              <th className="py-2.5 px-3 w-24 text-center">VAT</th>
              <th className="py-2.5 px-3 w-32 text-right">Line Total</th>
              {!readOnly && <th className="py-2.5 px-3 w-12 text-center"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-xs">
            {lines.map((line, idx) => {
              const qtyNum = line.quantity_thousandths / 1000;
              const unitPriceNum = line.unit_price_minor / 100;
              const subtotalMinor = Math.round((line.quantity_thousandths * line.unit_price_minor) / 1000);
              const vatRate = vatRateBp;
              const vatMinor = line.is_vatable ? Math.round((subtotalMinor * vatRate) / 10000) : 0;
              const totalMinor = subtotalMinor + vatMinor;

              return (
                <tr key={idx} className="hover:bg-stone-50/70">
                  <td className="py-2.5 px-3 text-center text-stone-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 space-y-1">
                    {!readOnly && items.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-stone-400" />
                        <select
                          value=""
                          onChange={(e) => handleSelectItem(idx, e.target.value)}
                          className="text-[11px] text-stone-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                        >
                          <option value="">-- Load standard catalog item --</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.code} - {it.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <input
                      type="text"
                      disabled={readOnly}
                      value={line.description}
                      onChange={(e) => handleUpdateLine(idx, { description: e.target.value })}
                      placeholder="Line item description or scope of work..."
                      className="w-full text-xs rounded border-stone-300 px-2 py-1 focus:border-stone-800 focus:ring-stone-800"
                      required
                    />
                    <input
                      type="text"
                      disabled={readOnly}
                      value={line.item_code || ''}
                      onChange={(e) => handleUpdateLine(idx, { item_code: e.target.value })}
                      placeholder="Optional SKU / Item code"
                      className="w-32 text-[10px] font-mono rounded border-stone-200 px-1.5 py-0.5 text-stone-600"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      disabled={readOnly}
                      value={qtyNum}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleUpdateLine(idx, { quantity_thousandths: Math.round(val * 1000) });
                      }}
                      className="w-full text-xs text-right font-mono rounded border-stone-300 px-2 py-1 focus:border-stone-800 focus:ring-stone-800"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={line.unit || ''}
                      onChange={(e) => handleUpdateLine(idx, { unit: e.target.value })}
                      placeholder="pcs"
                      className="w-full text-xs rounded border-stone-300 px-2 py-1 focus:border-stone-800 focus:ring-stone-800"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={readOnly}
                      value={unitPriceNum}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleUpdateLine(idx, { unit_price_minor: Math.round(val * 100) });
                      }}
                      className="w-full text-xs text-right font-mono rounded border-stone-300 px-2 py-1 focus:border-stone-800 focus:ring-stone-800"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={line.is_vatable}
                        onChange={(e) => handleUpdateLine(idx, { is_vatable: e.target.checked })}
                        className="rounded border-stone-300 text-stone-900 focus:ring-stone-800 w-3.5 h-3.5"
                      />
                      <span className="text-[10px] text-stone-600">VAT</span>
                    </label>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                    {new Money(totalMinor, currencyCode).format()}
                  </td>
                  {!readOnly && (
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length <= 1}
                        className="p-1 text-stone-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
