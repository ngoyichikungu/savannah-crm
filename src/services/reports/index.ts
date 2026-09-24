import { ReportContract } from '../../types';
import { leadsCapturedReport } from './leadsCapturedReport';
import { leadsContactedReport } from './leadsContactedReport';
import { leadProgressionReport } from './leadProgressionReport';
import { leadConversionReport } from './leadConversionReport';
import { clientInvoicesReport } from './clientInvoicesReport';
import { clientPaymentsBalancesReport } from './clientPaymentsBalancesReport';
import { clientStatementReport } from './clientStatementReport';
import { marketingTrackerReport } from './marketingTrackerReport';

export {
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
  leadsCapturedReport,
  leadsContactedReport,
  leadProgressionReport,
  leadConversionReport,
  clientInvoicesReport,
  clientPaymentsBalancesReport,
  clientStatementReport,
  marketingTrackerReport,
];

export function getReportById(id: string): ReportContract<any, any, any> | undefined {
  return ALL_REPORTS.find((r) => r.id === id);
}
