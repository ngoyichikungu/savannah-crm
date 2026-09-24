import React, { useState } from 'react';
import { Invoice } from '../../types';
import { BalanceDiscrepancy, InvoiceService } from '../../services/invoiceService';
import { StorageService } from '../../services/storageService';
import { Money } from '../../support/money';
import { ShieldCheck, AlertTriangle, RefreshCw, Terminal, Wrench, Bug } from 'lucide-react';

interface BalanceVerificationToolProps {
  invoices: Invoice[];
  onRefresh: () => void;
}

export const BalanceVerificationTool: React.FC<BalanceVerificationToolProps> = ({
  invoices,
  onRefresh,
}) => {
  const [discrepancies, setDiscrepancies] = useState<BalanceDiscrepancy[]>(() =>
    InvoiceService.verifyInvoiceBalances(invoices)
  );
  const [lastRunTime, setLastRunTime] = useState<string>(new Date().toLocaleTimeString());
  const [logMessage, setLogMessage] = useState<string | null>(null);

  const runVerification = () => {
    const freshInvoices = StorageService.getInvoices();
    const results = InvoiceService.verifyInvoiceBalances(freshInvoices);
    setDiscrepancies(results);
    setLastRunTime(new Date().toLocaleTimeString());
    if (results.length === 0) {
      setLogMessage('✓ All invoice balances verified successfully against the payment allocation ledger. 0 anomalies detected.');
    } else {
      setLogMessage(`⚠ Alert: ${results.length} balance discrepancy detected in the ledger!`);
    }
  };

  const handleSimulateCorruption = () => {
    if (invoices.length === 0) return;
    const target = invoices[0];
    const corrupted: Invoice = {
      ...target,
      amount_paid_minor: 12345, // corrupted
      balance_due_minor: 999999, // corrupted
    };
    StorageService.saveInvoice(corrupted);
    onRefresh();
    runVerification();
    setLogMessage(`[SIMULATION TEST] Deliberately corrupted balance on invoice ${target.number} to test detection.`);
  };

  const handleRepairBalances = () => {
    const currentInvoices = StorageService.getInvoices();
    for (const inv of currentInvoices) {
      const payments = inv.payments || [];
      const computedPaid = payments.reduce((sum, p) => sum + p.amount_minor, 0);
      const creditNotes = inv.credit_notes || [];
      const totalCredited = creditNotes.reduce((sum, cn) => sum + cn.total_minor, 0);
      const computedBalance = Math.max(0, inv.total_minor - computedPaid - totalCredited);

      const repaired: Invoice = {
        ...inv,
        amount_paid_minor: computedPaid,
        balance_due_minor: computedBalance,
      };
      StorageService.saveInvoice(repaired);
    }
    onRefresh();
    runVerification();
    setLogMessage('✓ Successfully recalculated and repaired all invoice balance fields from raw transaction ledgers.');
  };

  return (
    <div id="balance-verification-tool" className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center font-mono font-bold">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              Artisan Command: <span className="font-mono text-emerald-800 bg-stone-100 px-2 py-0.5 rounded text-sm">invoices:verify-balances</span>
            </h2>
            <p className="text-xs text-stone-500">
              Audit ledger engine — prevents balance drift and ensures double-entry integrity
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-run-verify"
            onClick={runVerification}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Run Audit
          </button>
          <button
            id="btn-simulate-corruption"
            onClick={handleSimulateCorruption}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
          >
            <Bug className="w-3.5 h-3.5" />
            Inject Corrupt Balance (Test)
          </button>
          {discrepancies.length > 0 && (
            <button
              id="btn-repair-balances"
              onClick={handleRepairBalances}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-sm"
            >
              <Wrench className="w-3.5 h-3.5" />
              Auto-Repair Ledger
            </button>
          )}
        </div>
      </div>

      {logMessage && (
        <div className="p-3 bg-stone-900 text-amber-300 font-mono text-xs rounded-lg shadow-inner flex items-center justify-between">
          <span>{logMessage}</span>
          <span className="text-stone-400 text-[10px]">Ran at {lastRunTime}</span>
        </div>
      )}

      {discrepancies.length === 0 ? (
        <div className="p-6 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-4 text-emerald-950">
          <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm">Ledger Verification Passed (100% In Sync)</h3>
            <p className="text-xs text-emerald-800">
              All {invoices.length} invoices matched their raw transaction allocation history exactly. Stored balance due
              and amounts paid are mathematically verified.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 bg-red-50 border border-red-300 rounded-xl flex items-start gap-3 text-red-900">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Discrepancy Detected ({discrepancies.length} Invoice Anomaly)</h3>
              <p className="text-xs text-red-700 mt-0.5">
                The stored balance fields differ from the sum of payments in the allocation ledger.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-100 text-stone-700 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Stored Paid</th>
                  <th className="py-2.5 px-3 text-right">Computed Ledger Paid</th>
                  <th className="py-2.5 px-3 text-right">Stored Balance</th>
                  <th className="py-2.5 px-3 text-right">True Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-mono">
                {discrepancies.map((d) => (
                  <tr key={d.invoice_id} className="bg-red-50/40">
                    <td className="py-2.5 px-3 font-bold text-stone-900">{d.invoice_number}</td>
                    <td className="py-2.5 px-3 text-right">{new Money(d.total_minor).format()}</td>
                    <td className="py-2.5 px-3 text-right text-red-700 line-through">
                      {new Money(d.stored_paid_minor).format()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-800 font-bold">
                      {new Money(d.computed_paid_minor).format()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-red-700 line-through">
                      {new Money(d.stored_balance_due_minor).format()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-800 font-bold">
                      {new Money(d.computed_balance_due_minor).format()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
