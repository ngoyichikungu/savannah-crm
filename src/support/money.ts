import { CurrencyCode } from '../types';

export class Money {
  readonly amountMinor: number;
  readonly currencyCode: CurrencyCode;

  constructor(amountMinor: number, currencyCode: CurrencyCode = 'ZMW') {
    if (!Number.isFinite(amountMinor)) {
      throw new Error(`Invalid amount: ${amountMinor}`);
    }
    this.amountMinor = Math.round(amountMinor);
    this.currencyCode = currencyCode;
  }

  static fromDecimal(decimal: number | string, currencyCode: CurrencyCode = 'ZMW'): Money {
    const num = typeof decimal === 'string' ? parseFloat(decimal) : decimal;
    if (isNaN(num)) {
      throw new Error(`Invalid decimal value: ${decimal}`);
    }
    // Half-up rounding to minor units
    const minor = Math.round(num * 100);
    return new Money(minor, currencyCode);
  }

  static zero(currencyCode: CurrencyCode = 'ZMW'): Money {
    return new Money(0, currencyCode);
  }

  get decimal(): number {
    return this.amountMinor / 100;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currencyCode);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currencyCode);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.amountMinor * factor), this.currencyCode);
  }

  isZero(): boolean {
    return this.amountMinor === 0;
  }

  isPositive(): boolean {
    return this.amountMinor > 0;
  }

  isNegative(): boolean {
    return this.amountMinor < 0;
  }

  equals(other: Money): boolean {
    return this.currencyCode === other.currencyCode && this.amountMinor === other.amountMinor;
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor > other.amountMinor;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor < other.amountMinor;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currencyCode !== other.currencyCode) {
      throw new Error(`Currency mismatch: cannot operate between ${this.currencyCode} and ${other.currencyCode}`);
    }
  }

  /**
   * Allocate money amount proportionally according to numeric ratios/weights,
   * distributing any rounding remainders one minor unit at a time so no minor unit is lost.
   */
  allocateByRatio(ratios: number[]): Money[] {
    if (ratios.length === 0) return [];
    
    const sumWeights = ratios.reduce((sum, w) => sum + Math.max(0, w), 0);
    if (sumWeights === 0) {
      return ratios.map(() => Money.zero(this.currencyCode));
    }

    const total = this.amountMinor;
    const allocations: number[] = [];
    let allocatedSum = 0;
    const remainders: { index: number; remainder: number }[] = [];

    for (let i = 0; i < ratios.length; i++) {
      const weight = Math.max(0, ratios[i]);
      const product = total * weight;
      const share = Math.floor(product / sumWeights);
      allocations.push(share);
      allocatedSum += share;
      remainders.push({
        index: i,
        remainder: product - share * sumWeights,
      });
    }

    // Distribute remainder minor units to largest fractional parts
    let remainderToDistribute = total - allocatedSum;
    remainders.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < remainderToDistribute; i++) {
      allocations[remainders[i % remainders.length].index] += 1;
    }

    return allocations.map((minor) => new Money(minor, this.currencyCode));
  }

  static allocateByRatio(totalMinor: number, ratios: number[], currencyCode: CurrencyCode = 'ZMW'): Money[] {
    return new Money(totalMinor, currencyCode).allocateByRatio(ratios);
  }

  format(showSymbol: boolean = true): string {
    const formatted = (this.amountMinor / 100).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return showSymbol ? `${this.currencyCode} ${formatted}` : formatted;
  }

  /**
   * Convert monetary amount to words (e.g., Zambian Kwacha and Ngwee)
   */
  amountInWords(): string {
    const isNegative = this.amountMinor < 0;
    const absMinor = Math.abs(this.amountMinor);
    const major = Math.floor(absMinor / 100);
    const ngwee = absMinor % 100;

    const CURRENCY_UNITS: Record<CurrencyCode, { major: string; minor: string }> = {
      ZMW: { major: 'Kwacha', minor: 'Ngwee' },
      USD: { major: 'US Dollars', minor: 'Cents' },
      EUR: { major: 'Euros', minor: 'Cents' },
      GBP: { major: 'Pounds', minor: 'Pence' },
      ZAR: { major: 'Rand', minor: 'Cents' },
    };

    const units = CURRENCY_UNITS[this.currencyCode] || { major: this.currencyCode, minor: 'Cents' };
    const majorUnit = units.major;
    const minorUnit = units.minor;

    if (absMinor === 0) {
      return `Zero ${majorUnit} Only`;
    }

    let majorWords = '';
    if (major > 0) {
      majorWords = `${numberToEnglishWords(major)} ${majorUnit}`;
    }

    let minorWords = '';
    if (ngwee > 0) {
      minorWords = `${numberToEnglishWords(ngwee)} ${minorUnit}`;
    }

    let result = '';
    if (majorWords && minorWords) {
      result = `${majorWords} and ${minorWords} Only`;
    } else if (majorWords) {
      result = `${majorWords} Only`;
    } else {
      result = `${minorWords} Only`;
    }

    return isNegative ? `Negative ${result}` : result;
  }
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function numberToEnglishWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Negative ' + numberToEnglishWords(Math.abs(num));

  return convertChunk(num).trim();
}

function convertChunk(num: number): string {
  if (num === 0) return '';

  if (num < 20) {
    return ONES[num];
  }

  if (num < 100) {
    const tens = TENS[Math.floor(num / 10)];
    const ones = ONES[num % 10];
    return ones ? `${tens}-${ones}` : tens;
  }

  if (num < 1000) {
    const hundreds = ONES[Math.floor(num / 100)] + ' Hundred';
    const remainder = num % 100;
    if (remainder > 0) {
      return `${hundreds} ${convertChunk(remainder)}`;
    }
    return hundreds;
  }

  if (num < 1000000) {
    const thousands = convertChunk(Math.floor(num / 1000)) + ' Thousand';
    const remainder = num % 1000;
    if (remainder > 0) {
      return `${thousands} ${convertChunk(remainder)}`;
    }
    return thousands;
  }

  if (num < 1000000000) {
    const millions = convertChunk(Math.floor(num / 1000000)) + ' Million';
    const remainder = num % 1000000;
    if (remainder > 0) {
      return `${millions} ${convertChunk(remainder)}`;
    }
    return millions;
  }

  const billions = convertChunk(Math.floor(num / 1000000000)) + ' Billion';
  const remainder = num % 1000000000;
  if (remainder > 0) {
    return `${billions} ${convertChunk(remainder)}`;
  }
  return billions;
}
