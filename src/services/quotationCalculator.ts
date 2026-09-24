import { DiscountType, DocumentLineCalculation } from '../types';

export interface RawLineInput {
  item_code?: string;
  description: string;
  quantity_thousandths: number; // integer (qty * 1000)
  unit?: string;
  unit_price_minor: number; // integer in minor units
  discount_percent_bp?: number; // basis points (0-10000)
  is_vatable?: boolean;
}

export interface DocumentCalculationResult {
  lines: DocumentLineCalculation[];
  subtotal_minor: number;
  discount_minor: number;
  vatable_subtotal_minor: number;
  vat_minor: number;
  total_minor: number;
}

export class QuotationCalculator {
  static calculate(
    rawLines: RawLineInput[],
    discountType: DiscountType = 'none',
    discountValue: number = 0,
    vatRateBp: number = 1600, // 16% default
  ): DocumentCalculationResult {
    if (vatRateBp < 0) {
      throw new Error('VAT rate cannot be negative');
    }

    let runningGross = 0;
    let runningVatableSubtotal = 0;

    const calculatedLines: DocumentLineCalculation[] = rawLines.map((line, index) => {
      if (line.quantity_thousandths < 0) {
        throw new Error(`Line ${index + 1}: Quantity cannot be negative`);
      }
      if (line.unit_price_minor < 0) {
        throw new Error(`Line ${index + 1}: Unit price cannot be negative`);
      }

      const discountBp = Math.max(0, Math.min(10000, line.discount_percent_bp || 0));

      // Gross = (qty_thousandths * unit_price_minor) / 1000
      const grossMinor = Math.round((line.quantity_thousandths * line.unit_price_minor) / 1000);
      const lineDiscountMinor = Math.round((grossMinor * discountBp) / 10000);
      const lineSubtotalMinor = grossMinor - lineDiscountMinor;

      const isVatable = line.is_vatable ?? true;
      const lineVatMinor = isVatable ? Math.round((lineSubtotalMinor * vatRateBp) / 10000) : 0;
      const lineTotalMinor = lineSubtotalMinor + lineVatMinor;

      runningGross += lineSubtotalMinor;
      if (isVatable) {
        runningVatableSubtotal += lineSubtotalMinor;
      }

      return {
        sort_order: index + 1,
        item_code: line.item_code || '',
        description: line.description,
        quantity_thousandths: line.quantity_thousandths,
        unit: line.unit || 'pcs',
        unit_price_minor: line.unit_price_minor,
        discount_percent_bp: discountBp,
        line_subtotal_minor: lineSubtotalMinor,
        is_vatable: isVatable,
        line_vat_minor: lineVatMinor,
        line_total_minor: lineTotalMinor,
      };
    });

    const subtotalMinor = runningGross;

    // Document-level discount
    let discountMinor = 0;
    if (discountType === 'percent') {
      if (discountValue < 0 || discountValue > 10000) {
        throw new Error('Percentage discount must be between 0% and 100%');
      }
      discountMinor = Math.round((subtotalMinor * discountValue) / 10000);
    } else if (discountType === 'fixed') {
      if (discountValue < 0) {
        throw new Error('Fixed discount cannot be negative');
      }
      discountMinor = Math.min(subtotalMinor, Math.round(discountValue));
    }

    // Effective discount factor applied to vatable items
    const netSubtotal = subtotalMinor - discountMinor;
    const discountRatio = subtotalMinor > 0 ? netSubtotal / subtotalMinor : 1;
    const discountedVatableSubtotal = Math.round(runningVatableSubtotal * discountRatio);

    const vatMinor = Math.round((discountedVatableSubtotal * vatRateBp) / 10000);
    const totalMinor = netSubtotal + vatMinor;

    return {
      lines: calculatedLines,
      subtotal_minor: subtotalMinor,
      discount_minor: discountMinor,
      vatable_subtotal_minor: discountedVatableSubtotal,
      vat_minor: vatMinor,
      total_minor: totalMinor,
    };
  }
}
