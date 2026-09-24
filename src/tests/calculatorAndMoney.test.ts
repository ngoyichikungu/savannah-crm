import { describe, it, expect } from 'vitest';
import { QuotationCalculator } from '../services/quotationCalculator';
import { Money } from '../support/money';

describe('Quotation & Invoice Calculator Unit Tests', () => {
  it('handles standard line item calculation with default 16% VAT', () => {
    const result = QuotationCalculator.calculate([
      {
        description: 'Server Maintenance',
        quantity_thousandths: 2000, // 2 units
        unit_price_minor: 10000, // 100.00
      },
    ]);

    expect(result.subtotal_minor).toBe(20000);
    expect(result.discount_minor).toBe(0);
    expect(result.vat_minor).toBe(3200); // 16% of 200.00 = 32.00
    expect(result.total_minor).toBe(23200); // 232.00
  });

  it('handles zero-VAT line items', () => {
    const result = QuotationCalculator.calculate([
      {
        description: 'Export Grain / Exempt Commodity',
        quantity_thousandths: 1000,
        unit_price_minor: 50000,
        is_vatable: false,
      },
    ]);

    expect(result.subtotal_minor).toBe(50000);
    expect(result.vat_minor).toBe(0);
    expect(result.total_minor).toBe(50000);
  });

  it('handles mixed VAT line items correctly', () => {
    const result = QuotationCalculator.calculate([
      {
        description: 'Hardware Equipment (Vatable)',
        quantity_thousandths: 1000,
        unit_price_minor: 100000, // 1,000.00
        is_vatable: true,
      },
      {
        description: 'Agricultural Seed (Exempt)',
        quantity_thousandths: 1000,
        unit_price_minor: 50000, // 500.00
        is_vatable: false,
      },
    ]);

    expect(result.subtotal_minor).toBe(150000);
    // VAT applies ONLY to the 1000.00 item => 16% of 1000.00 = 160.00 (16000 minor)
    expect(result.vat_minor).toBe(16000);
    expect(result.total_minor).toBe(166000);
  });

  it('applies percentage document discount proportionally across vatable portion', () => {
    const result = QuotationCalculator.calculate(
      [
        {
          description: 'Consulting',
          quantity_thousandths: 1000,
          unit_price_minor: 100000, // 1,000.00
          is_vatable: true,
        },
      ],
      'percent',
      1000 // 10.00%
    );

    expect(result.subtotal_minor).toBe(100000);
    expect(result.discount_minor).toBe(10000); // 100.00 discount
    // Net vatable = 900.00 => VAT 16% of 900.00 = 144.00 (14400 minor)
    expect(result.vat_minor).toBe(14400);
    expect(result.total_minor).toBe(104400); // 900.00 + 144.00 = 1044.00
  });

  it('applies fixed document discount', () => {
    const result = QuotationCalculator.calculate(
      [
        {
          description: 'Custom Development',
          quantity_thousandths: 1000,
          unit_price_minor: 200000, // 2,000.00
          is_vatable: true,
        },
      ],
      'fixed',
      50000 // 500.00 discount
    );

    expect(result.subtotal_minor).toBe(200000);
    expect(result.discount_minor).toBe(50000);
    // Net vatable = 1500.00 => VAT 16% = 240.00 (24000 minor)
    expect(result.vat_minor).toBe(24000);
    expect(result.total_minor).toBe(174000);
  });

  it('rejects negative quantity or unit price', () => {
    expect(() => {
      QuotationCalculator.calculate([
        {
          description: 'Invalid Line',
          quantity_thousandths: -1000,
          unit_price_minor: 10000,
        },
      ]);
    }).toThrow(/Quantity cannot be negative/i);

    expect(() => {
      QuotationCalculator.calculate([
        {
          description: 'Invalid Line',
          quantity_thousandths: 1000,
          unit_price_minor: -5000,
        },
      ]);
    }).toThrow(/Unit price cannot be negative/i);
  });

  it('converts monetary values to English words for multi-currency invoices and quotes', () => {
    // ZMW
    const zmwAmount = new Money(125050, 'ZMW'); // 1,250.50
    expect(zmwAmount.amountInWords()).toBe('One Thousand Two Hundred Fifty Kwacha and Fifty Ngwee Only');

    // USD
    const usdAmount = new Money(500000, 'USD'); // 5,000.00
    expect(usdAmount.amountInWords()).toBe('Five Thousand US Dollars Only');

    // GBP
    const gbpAmount = new Money(4225, 'GBP'); // 42.25
    expect(gbpAmount.amountInWords()).toBe('Forty-Two Pounds and Twenty-Five Pence Only');

    // Zero amount
    const zeroAmount = new Money(0, 'ZMW');
    expect(zeroAmount.amountInWords()).toBe('Zero Kwacha Only');
  });
});
