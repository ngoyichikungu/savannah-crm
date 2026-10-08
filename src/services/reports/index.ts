import { ReportContract } from '../../types';
import { profitAndLossReport } from './profitAndLossReport';
import { leadsCapturedReport } from './leadsCapturedReport';
import { leadsContactedReport } from './leadsContactedReport';
import { leadProgressionReport } from './leadProgressionReport';
import { leadConversionReport } from './leadConversionReport';
import { clientInvoicesReport } from './clientInvoicesReport';
import { clientPaymentsBalancesReport } from './clientPaymentsBalancesReport';
import { clientStatementReport } from './clientStatementReport';
import { marketingTrackerReport } from './marketingTrackerReport';

export {
  profitAndLossReport,
  leadsCapturedReport,
  leadsContactedReport,
  leadProgressionReport,
  leadConversionReport,
  clientInvoicesReport,
  clientPaymentsBalancesReport,
  clientStatementReport,
  marketingTrackerReport,
};

export const ALL_REPORTS: ReportContract<any, any, any>[] = [
  clientInvoicesReport,
  clientPaymentsBalancesReport,
  clientStatementReport,
  leadsCapturedReport,
  leadsContactedReport,
  leadProgressionReport,
  leadConversionReport,
  marketingTrackerReport,
];

export const ALL_DASHBOARD_REPORTS: ReportContract<any, any, any>[] = [
  profitAndLossReport,
  ...ALL_REPORTS,
];

export function getReportById(id: string): ReportContract<any, any, any> | undefined {
  if (id === 'profit-and-loss') return profitAndLossReport;
  return ALL_REPORTS.find((r) => r.id === id);
}
