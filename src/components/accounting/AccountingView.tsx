import React, { useState } from 'react';
import { Company, User } from '../../types';
import { BusinessExpense, PurchaseInvoice, Supplier } from '../../types/accounting';
import { AccountingService } from '../../services/accountingService';
import { ProfitLossView } from './ProfitLossView';
import { PurchaseInvoiceList } from './PurchaseInvoiceList';
import { ExpenseList } from './ExpenseList';
import { PurchaseInvoiceEditorModal } from './PurchaseInvoiceEditorModal';
import { RecordPurchasePaymentModal } from './RecordPurchasePaymentModal';
import { ExpenseEditorModal } from './ExpenseEditorModal';
import { SupplierModal } from './SupplierModal';
import {
  TrendingUp,
  Receipt,
  FileText,
  Building2,
  Plus,
  Trash2,
  Edit2,
  Phone,
  Mail,
  Hash,
} from 'lucide-react';
import { Money } from '../../support/money';

export type AccountingSubTab = 'pnl' | 'purchases' | 'expenses' | 'suppliers';

interface AccountingViewProps {
  company: Company;
  currentUser: User;
  initialSubTab?: AccountingSubTab;
  onDataChanged?: () => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  company,
  currentUser,
  initialSubTab = 'pnl',
  onDataChanged,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AccountingSubTab>(initialSubTab);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [isCaptureBillOpen, setIsCaptureBillOpen] = useState(false);
  const [isRecordExpenseOpen, setIsRecordExpenseOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<BusinessExpense | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<PurchaseInvoice | null>(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const purchaseInvoices = AccountingService.getPurchaseInvoices({ companyId: company.id });
  const expenses = AccountingService.getExpenses({ companyId: company.id });
  const suppliers = AccountingService.getSuppliers(company.id);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    if (onDataChanged) onDataChanged();
  };

  const handleDeleteExpense = (exp: BusinessExpense) => {
    if (window.confirm(`Delete expense "${exp.expense_number} - ${exp.title}"?`)) {
      AccountingService.deleteExpense(exp.id);
      handleRefresh();
    }
  };

  const handleDeleteInvoice = (inv: PurchaseInvoice) => {
    if (window.confirm(`Delete purchase bill "${inv.invoice_number}" from ${inv.supplier_name}?`)) {
      AccountingService.deletePurchaseInvoice(inv.id);
      handleRefresh();
    }
  };

  const handleDeleteSupplier = (supp: Supplier) => {
    try {
      if (window.confirm(`Delete supplier "${supp.name}"?`)) {
        AccountingService.deleteSupplier(supp.id);
        handleRefresh();
      }
    } catch (err: any) {
      alert(err.message || 'Cannot delete supplier.');
    }
  };

  return (
    <div className="space-y-6" key={refreshKey}>
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Commercial Accounting Engine
            </span>
            <span className="text-xs text-stone-400 font-mono">• {company.currency_code}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-1 flex items-center gap-2">
            <span>Small Business Accounting</span>
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Capture vendor bills, business expenses, monitor payables, and generate real-time Profit &amp; Loss statements.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-quick-record-expense"
            onClick={() => {
              setSelectedExpense(null);
              setIsRecordExpenseOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>+ Record Expense</span>
          </button>

          <button
            type="button"
            id="btn-quick-capture-bill"
            onClick={() => setIsCaptureBillOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Capture Bill</span>
          </button>
        </div>
      </div>

      {/* Segmented Sub-Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('pnl')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'pnl'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Profit &amp; Loss (P&amp;L)</span>
        </button>

        <button
          type="button"
          id="subtab-purchases"
          onClick={() => setActiveSubTab('purchases')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'purchases'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Purchase Invoices / Bills</span>
          {purchaseInvoices.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeSubTab === 'purchases'
                  ? 'bg-blue-800 text-white'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {purchaseInvoices.length}
            </span>
          )}
        </button>

        <button
          type="button"
          id="subtab-expenses"
          onClick={() => setActiveSubTab('expenses')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'expenses'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Business Expenses</span>
          {expenses.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeSubTab === 'expenses'
                  ? 'bg-amber-800 text-white'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {expenses.length}
            </span>
          )}
        </button>

        <button
          type="button"
          id="subtab-suppliers"
          onClick={() => setActiveSubTab('suppliers')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'suppliers'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Suppliers &amp; Vendors</span>
          {suppliers.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeSubTab === 'suppliers'
                  ? 'bg-purple-800 text-white'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {suppliers.length}
            </span>
          )}
        </button>
      </div>

      {/* Subtab Contents */}
      {activeSubTab === 'pnl' && (
        <ProfitLossView
          company={company}
          onOpenCaptureBill={() => setIsCaptureBillOpen(true)}
          onOpenRecordExpense={() => {
            setSelectedExpense(null);
            setIsRecordExpenseOpen(true);
          }}
        />
      )}

      {activeSubTab === 'purchases' && (
        <PurchaseInvoiceList
          company={company}
          currentUser={currentUser}
          invoices={purchaseInvoices}
          onOpenCreate={() => setIsCaptureBillOpen(true)}
          onRecordPayment={(inv) => {
            setSelectedInvoiceForPayment(inv);
            setIsRecordPaymentOpen(true);
          }}
          onDelete={handleDeleteInvoice}
        />
      )}

      {activeSubTab === 'expenses' && (
        <ExpenseList
          company={company}
          currentUser={currentUser}
          expenses={expenses}
          onOpenCreate={() => {
            setSelectedExpense(null);
            setIsRecordExpenseOpen(true);
          }}
          onEdit={(exp) => {
            setSelectedExpense(exp);
            setIsRecordExpenseOpen(true);
          }}
          onDelete={handleDeleteExpense}
        />
      )}

      {activeSubTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Approved Suppliers &amp; Trade Vendors</h3>
              <p className="text-xs text-stone-500">Manage vendor contact profiles, TPINs, bank details, and payment credit terms</p>
            </div>
            <button
              type="button"
              id="btn-add-supplier"
              onClick={() => {
                setSelectedSupplier(null);
                setIsSupplierModalOpen(true);
              }}
              className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Supplier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => {
              const supplierBills = purchaseInvoices.filter((p) => p.supplier_id === s.id);
              const totalBilled = supplierBills.reduce((acc, b) => acc + b.total_minor, 0);
              const totalDue = supplierBills.reduce((acc, b) => acc + b.balance_due_minor, 0);

              return (
                <div
                  key={s.id}
                  className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-stone-900">{s.name}</h4>
                        {s.contact_person && (
                          <div className="text-xs text-stone-500 font-medium">
                            Attn: {s.contact_person}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSupplier(s);
                            setIsSupplierModalOpen(true);
                          }}
                          className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg cursor-pointer"
                          title="Edit supplier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSupplier(s)}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-stone-600 font-sans">
                      {s.tpin && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-700">
                          <Hash className="w-3 h-3 text-stone-400" />
                          <span>TPIN: {s.tpin}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-stone-400" />
                          <span>{s.email}</span>
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-mono">Billed / Terms</span>
                      <span className="font-bold text-stone-700 font-mono text-[11px]">
                        {new Money(totalBilled, company.currency_code).format()} • {s.payment_terms_days > 0 ? `Net ${s.payment_terms_days}d` : 'Immediate'}
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-stone-400 block font-sans">Balance Due</span>
                      <span className={`font-bold ${totalDue > 0 ? 'text-rose-700' : 'text-stone-700'}`}>
                        {new Money(totalDue, company.currency_code).format()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {isCaptureBillOpen && (
        <PurchaseInvoiceEditorModal
          company={company}
          currentUser={currentUser}
          isOpen={isCaptureBillOpen}
          onClose={() => setIsCaptureBillOpen(false)}
          onSaved={() => {
            handleRefresh();
          }}
          onOpenCreateSupplier={() => {
            setSelectedSupplier(null);
            setIsSupplierModalOpen(true);
          }}
        />
      )}

      {isRecordExpenseOpen && (
        <ExpenseEditorModal
          company={company}
          currentUser={currentUser}
          expense={selectedExpense}
          isOpen={isRecordExpenseOpen}
          onClose={() => setIsRecordExpenseOpen(false)}
          onSaved={() => {
            handleRefresh();
          }}
        />
      )}

      {isRecordPaymentOpen && (
        <RecordPurchasePaymentModal
          company={company}
          currentUser={currentUser}
          invoice={selectedInvoiceForPayment}
          isOpen={isRecordPaymentOpen}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setSelectedInvoiceForPayment(null);
          }}
          onSaved={() => {
            handleRefresh();
          }}
        />
      )}

      {isSupplierModalOpen && (
        <SupplierModal
          company={company}
          supplier={selectedSupplier}
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          onSaved={() => {
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};
