import { ReportPreset, ReportDateRange } from '../types';

/**
 * Standard utility for consistent date calculations and inclusive boundary evaluation
 */
export class ReportingDateUtils {
  /**
   * Helper to format a Date or string to 'YYYY-MM-DD'
   */
  static toYmd(date: Date | string): string {
    if (typeof date === 'string') {
      if (date.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(date)) {
        return date.substring(0, 10);
      }
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) return date;
      date = parsed;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Computes Start and End dates for predefined date range presets
   */
  static getPresetRange(preset: ReportPreset, refDate: Date = new Date()): ReportDateRange {
    const y = refDate.getFullYear();
    const m = refDate.getMonth(); // 0-indexed
    const d = refDate.getDate();

    switch (preset) {
      case 'today': {
        const ymd = this.toYmd(refDate);
        return { startDate: ymd, endDate: ymd, preset };
      }

      case 'this_week': {
        // Assume Monday as start of week
        const dayOfWeek = refDate.getDay(); // 0 is Sunday, 1 is Monday...
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(y, m, d + diffToMonday);
        const sunday = new Date(y, m, d + diffToMonday + 6);
        return {
          startDate: this.toYmd(monday),
          endDate: this.toYmd(sunday),
          preset,
        };
      }

      case 'this_month': {
        const firstDay = new Date(y, m, 1);
        const lastDay = new Date(y, m + 1, 0);
        return {
          startDate: this.toYmd(firstDay),
          endDate: this.toYmd(lastDay),
          preset,
        };
      }

      case 'last_month': {
        const firstDay = new Date(y, m - 1, 1);
        const lastDay = new Date(y, m, 0);
        return {
          startDate: this.toYmd(firstDay),
          endDate: this.toYmd(lastDay),
          preset,
        };
      }

      case 'this_quarter': {
        const quarterIndex = Math.floor(m / 3); // 0, 1, 2, 3
        const firstMonth = quarterIndex * 3;
        const firstDay = new Date(y, firstMonth, 1);
        const lastDay = new Date(y, firstMonth + 3, 0);
        return {
          startDate: this.toYmd(firstDay),
          endDate: this.toYmd(lastDay),
          preset,
        };
      }

      case 'this_year': {
        const firstDay = new Date(y, 0, 1);
        const lastDay = new Date(y, 11, 31);
        return {
          startDate: this.toYmd(firstDay),
          endDate: this.toYmd(lastDay),
          preset,
        };
      }

      case 'custom':
      default: {
        const firstDay = new Date(y, m, 1);
        const lastDay = new Date(y, m + 1, 0);
        return {
          startDate: this.toYmd(firstDay),
          endDate: this.toYmd(lastDay),
          preset: 'custom',
        };
      }
    }
  }

  /**
   * Evaluates if a given date is within the range INCLUSIVELY
   * (targetDate >= startDate && targetDate <= endDate)
   */
  static isInRangeInclusive(
    targetDateStr?: string | null,
    startDate?: string,
    endDate?: string
  ): boolean {
    if (!targetDateStr || !startDate || !endDate) return false;
    const targetYmd = this.toYmd(targetDateStr);
    const startYmd = this.toYmd(startDate);
    const endYmd = this.toYmd(endDate);

    return targetYmd >= startYmd && targetYmd <= endYmd;
  }

  /**
   * Calculates difference in integer days between two dates
   */
  static daysBetween(startDateStr: string, endDateStr: string): number {
    const start = new Date(this.toYmd(startDateStr));
    const end = new Date(this.toYmd(endDateStr));
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Computes age in days relative to an as-of date (e.g. for ageing buckets)
   */
  static daysPassed(fromDateStr: string, asOfDateStr: string): number {
    return this.daysBetween(fromDateStr, asOfDateStr);
  }
}
