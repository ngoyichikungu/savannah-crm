import React, { useState, useMemo } from 'react';
import { Company, Contact, Invoice, Organisation, Payment, PaymentAllocation, User } from '../../types';
import { Money } from '../../support/money';
import { PaymentService } from '../../services/paymentService';
import { StorageService } from '../../services/storageService';
import { ClientModal } from './ClientModal';
import {
  Building2,
  Receipt,
  FileText,
  CreditCard,
  History,
  Plus,
  Edit3,
  Mail,
  Phone,
  MapPin,
  Hash,
  User as UserIcon,
  Briefcase,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface ClientAccountViewProps {
  company: Company;
  organisations: Organisation[];
  invoices: Invoice[];
  payments: Payment[];
  allocations: PaymentAllocation[];
  currentUser?: User;
  onRecordPaymentForClient: (orgId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
  onViewReceipt: (paymentId: string) => void;
  onRefreshData?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ClientAccountView: React.FC<ClientAccountViewProps> = ({
  company,
  organisations,
  invoices,
  payments,
  allocations,
  onRecordPaymentForClient,
  onViewInvoice,
  onViewReceipt,
  onRefreshData,
  onShowToast,
}) => {
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organisations[0]?.id || '');
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'payments' | 'ledger' | 'details'>('invoices');

  // Client Modal State (Create / Edit)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);

  // Sync selectedOrgId if organisations change and current selection is gone
  const selectedOrg = organisations.find((o) => o.id === selectedOrgId) || organisations[0];
  const activeOrgId = selectedOrg?.id || '';

  const clientInvoices = invoices.filter((i) => i.organisation_id === activeOrgId);

  // Contacts for active client
  const clientContacts: Contact[] = useMemo(() => {
    if (!activeOrgId) return [];
    return StorageService.getContacts(activeOrgId);
  }, [activeOrgId, organisations]);

  const primaryContact = clientContacts.find((c) => c.is_primary) || clientContacts[0];

  // Client summary calculation
  const summary = useMemo(() => {
    if (!activeOrgId) return null;
    return PaymentService.getClientAccountSummary(company.id, activeOrgId);
  }, [company.id, activeOrgId, invoices, payments, allocations]);

  const handleOpenAddClient = () => {
    setEditingOrg(null);
    setIsClientModalOpen(true);
  };

  const handleOpenEditClient = () => {
    if (selectedOrg) {
      setEditingOrg(selectedOrg);
      setIsClientModalOpen(true);
    }
  };

  const handleClientSaved = (savedOrg: Organisation) => {
    setSelectedOrgId(savedOrg.id);
    if (onRefreshData) {
      onRefreshData();
    }
    if (onShowToast) {
      onShowToast(
        editingOrg ? `Updated details for "${savedOrg.name}".` : `Client "${savedOrg.name}" created successfully.`,
        'success'
      );
    }
  };

  // Empty state: No clients registered
  if (!selectedOrg || organisations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 shadow-sm max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">No Client Accounts Registered</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Register and capture your first client organisation to start generating quotations, issuing invoices, and tracking client ledgers.
            </p>
          </div>
          <button
            onClick={handleOpenAddClient}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Capture First Client</span>
          </button>
        </div>

        {/* Modal for Capture */}
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          companyId={company.id}
          initialOrg={null}
          onSaved={handleClientSaved}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Header & Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-stone-900 text-stone-100 rounded-2xl shadow-sm">
        <div className="space-y-2">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-700 text-amber-300 flex items-center justify-center font-bold font-mono text-xl shadow-inner shrink-0">
              {selectedOrg.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white">{selectedOrg.name}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  <CheckCircle2 className="w-3 h-3" />
                  Active Client
                </span>
              </div>

              {/* Quick Info Badges */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-300 mt-1 font-medium">
                {selectedOrg.tpin && (
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-stone-400" />
                    TPIN: <span className="font-mono text-stone-200">{selectedOrg.tpin}</span>
                  </span>
                )}
                {selectedOrg.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    {selectedOrg.email}
                  </span>
                )}
                {selectedOrg.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    {selectedOrg.phone}
                  </span>
                )}
                {(selectedOrg.city || selectedOrg.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {[selectedOrg.city, selectedOrg.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>

              {/* Primary Contact Person summary */}
              {primaryContact && (
                <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1.5">
                  <UserIcon className="w-3 h-3 text-emerald-400" />
                  <span>Key Contact:</span>
                  <span className="font-semibold text-stone-200">
                    {primaryContact.first_name} {primaryContact.last_name}
                  </span>
                  {primaryContact.job_title && (
                    <span className="text-stone-400">({primaryContact.job_title})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & Client Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-800">
          {/* Client Selector Dropdown */}
          <div className="bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-700">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Switch Client</span>
            <select
              value={activeOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
            >
              {organisations.map((org) => (
                <option key={org.id} value={org.id} className="bg-stone-800 text-white">
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Edit Client Button */}
          <button
            onClick={handleOpenEditClient}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold transition-colors border border-stone-700 cursor-pointer shadow-xs"
            title="Edit client organisation details"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Client</span>
          </button>

          {/* Capture New Client Button */}
          <button
            onClick={handleOpenAddClient}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold transition-colors border border-stone-700 cursor-pointer shadow-xs"
            title="Capture a new client organisation"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Client</span>
          </button>

          {/* Record Payment */}
          <button
            onClick={() => onRecordPaymentForClient(activeOrgId)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Bento */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Total Invoiced</span>
            <div className="text-xl font-bold font-mono text-stone-900">
              {new Money(summary.total_invoiced_minor, company.currency_code).format()}
            </div>
            <span className="text-[10px] text-stone-400 font-medium">{clientInvoices.length} invoices issued</span>
          </div>

          <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Total Paid &amp; Settled</span>
            <div className="text-xl font-bold font-mono text-emerald-700">
              {new Money(summary.total_paid_minor, company.currency_code).format()}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">{summary.payments.length} payments recorded</span>
          </div>

          <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700">Outstanding Balance</span>
            <div
              className={`text-xl font-bold font-mono ${
                summary.total_outstanding_minor > 0 ? 'text-amber-800 font-black' : 'text-stone-900'
              }`}
            >
              {new Money(summary.total_outstanding_minor, company.currency_code).format()}
            </div>
            <span className="text-[10px] text-stone-400 font-medium">
              {clientInvoices.filter((i) => i.balance_due_minor > 0).length} invoices open
            </span>
          </div>

          <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Available Client Credit</span>
            <div className="text-xl font-bold font-mono text-blue-700">
              {new Money(summary.unallocated_credit_minor, company.currency_code).format()}
            </div>
            <span className="text-[10px] text-blue-600 font-medium">Unallocated remainder balance</span>
          </div>
        </div>
      )}

      {/* Sub Tabs Navigation */}
      <div className="border-b border-stone-200 flex items-center space-x-4 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`py-3 px-2 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'invoices'
              ? 'border-emerald-700 text-emerald-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Invoices ({clientInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('payments')}
          className={`py-3 px-2 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'payments'
              ? 'border-emerald-700 text-emerald-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Payment Receipts ({summary?.payments.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`py-3 px-2 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'ledger'
              ? 'border-emerald-700 text-emerald-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Allocation Ledger ({summary?.allocations.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('details')}
          className={`py-3 px-2 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'details'
              ? 'border-emerald-700 text-emerald-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Client Profile &amp; Contacts ({clientContacts.length})</span>
        </button>
      </div>

      {/* Tab 1: Invoices */}
      {activeSubTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          {clientInvoices.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              No invoices issued to this client yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 uppercase tracking-wider font-bold text-stone-700 border-b border-stone-200 text-[11px]">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {clientInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-stone-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">{inv.number}</td>
                      <td className="py-3 px-4 text-stone-600">{inv.issue_date}</td>
                      <td className="py-3 px-4 text-stone-600">{inv.due_date}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'partially_paid'
                              ? 'bg-blue-100 text-blue-800'
                              : inv.status === 'overdue'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-stone-100 text-stone-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-800">
                        {new Money(inv.total_minor, inv.currency_code).format()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-800">
                        {new Money(inv.amount_paid_minor, inv.currency_code).format()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                        {new Money(inv.balance_due_minor, inv.currency_code).format()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="text-emerald-800 hover:text-emerald-950 font-semibold text-xs cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Payment Receipts */}
      {activeSubTab === 'payments' && summary && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          {summary.payments.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              No payments recorded from this client yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 uppercase tracking-wider font-bold text-stone-700 border-b border-stone-200 text-[11px]">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Method &amp; Ref</th>
                    <th className="py-3 px-4 text-right">Amount Received</th>
                    <th className="py-3 px-4 text-right">Allocated</th>
                    <th className="py-3 px-4 text-right">Unallocated Credit</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {summary.payments.map((pmt) => (
                    <tr key={pmt.id} className="hover:bg-stone-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">{pmt.receipt_number}</td>
                      <td className="py-3 px-4 text-stone-600">{pmt.payment_date}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-stone-800 uppercase text-[10px]">{pmt.method}</span>
                        {pmt.reference && <span className="block text-[10px] text-stone-400 font-mono">{pmt.reference}</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                        {new Money(pmt.amount_minor, pmt.currency_code).format()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-800">
                        {new Money(pmt.allocated_minor, pmt.currency_code).format()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {pmt.unallocated_minor > 0 ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
                            {new Money(pmt.unallocated_minor, pmt.currency_code).format()}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onViewReceipt(pmt.id)}
                          className="text-emerald-800 hover:text-emerald-950 font-semibold text-xs cursor-pointer"
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Ledger */}
      {activeSubTab === 'ledger' && summary && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          {summary.allocations.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              No allocations recorded on this client account yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 uppercase tracking-wider font-bold text-stone-700 border-b border-stone-200 text-[11px]">
                    <th className="py-3 px-4">Allocation ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payment Receipt #</th>
                    <th className="py-3 px-4">Applied Invoice #</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Ledger Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 font-mono">
                  {summary.allocations.map((alloc) => {
                    const pmt = summary.payments.find((p) => p.id === alloc.payment_id);
                    const inv = invoices.find((i) => i.id === alloc.invoice_id);

                    return (
                      <tr key={alloc.id} className={alloc.is_reversed ? 'bg-red-50/50 text-stone-400' : 'hover:bg-stone-50/80'}>
                        <td className="py-3 px-4 text-stone-500">{alloc.id.slice(0, 10)}...</td>
                        <td className="py-3 px-4 font-sans text-stone-600">
                          {alloc.allocated_at ? alloc.allocated_at.slice(0, 10) : (alloc.created_at || '').slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-900">{pmt?.receipt_number || alloc.payment_id}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">{inv?.number || alloc.invoice_id}</td>
                        <td className={`py-3 px-4 text-right font-bold ${alloc.is_reversed ? 'line-through text-stone-400' : 'text-emerald-800'}`}>
                          {new Money(alloc.amount_minor, company.currency_code).format()}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {alloc.is_reversed ? (
                            <span className="text-[10px] text-red-700 bg-red-100 px-2 py-0.5 rounded font-bold">
                              REVERSED ({alloc.reversal_reason || 'Manual unallocation'})
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                              ACTIVE LEDGER ENTRY
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Client Profile & Contacts */}
      {activeSubTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Organisation Profile Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">{selectedOrg.name}</h3>
                  <p className="text-xs text-stone-500">Official registered client profile</p>
                </div>
              </div>
              <button
                onClick={handleOpenEditClient}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="block font-bold text-stone-400 uppercase text-[10px] tracking-wider mb-1">
                  Organisation Name
                </span>
                <p className="font-semibold text-stone-900 text-sm">{selectedOrg.name}</p>
              </div>

              <div>
                <span className="block font-bold text-stone-400 uppercase text-[10px] tracking-wider mb-1">
                  Tax Identification (TPIN)
                </span>
                <p className="font-mono font-semibold text-stone-900 text-sm">
                  {selectedOrg.tpin || <span className="text-stone-400 italic">Not specified</span>}
                </p>
              </div>

              <div>
                <span className="block font-bold text-stone-400 uppercase text-[10px] tracking-wider mb-1">
                  Official Email
                </span>
                <p className="text-stone-900 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  {selectedOrg.email || <span className="text-stone-400 italic">No email on file</span>}
                </p>
              </div>

              <div>
                <span className="block font-bold text-stone-400 uppercase text-[10px] tracking-wider mb-1">
                  Telephone / Mobile
                </span>
                <p className="font-mono text-stone-900 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  {selectedOrg.phone || <span className="text-stone-400 italic">No telephone on file</span>}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="block font-bold text-stone-400 uppercase text-[10px] tracking-wider mb-1">
                  Physical Address
                </span>
                <div className="text-stone-800 space-y-0.5">
                  {selectedOrg.address_line1 && <p>{selectedOrg.address_line1}</p>}
                  {selectedOrg.address_line2 && <p>{selectedOrg.address_line2}</p>}
                  <p className="font-medium text-stone-600">
                    {[selectedOrg.city, selectedOrg.country].filter(Boolean).join(', ') ||
                      (!selectedOrg.address_line1 && <span className="text-stone-400 italic">No physical address on file</span>)}
                  </p>
                </div>
              </div>

              <div>
                <span className="block font-bold text-stone-400 uppercase text-[10px] tracking-wider mb-1">
                  Registration Date
                </span>
                <p className="text-stone-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  {selectedOrg.created_at ? new Date(selectedOrg.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              <div>
                <span className="block font-bold text-stone-400 uppercase text-[10px] tracking-wider mb-1">
                  Account Status
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Active Client Account
                </span>
              </div>
            </div>
          </div>

          {/* Key Contacts List Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-emerald-700" />
                <h4 className="text-sm font-bold text-stone-900">Key Contacts</h4>
              </div>
              <button
                onClick={handleOpenEditClient}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Edit</span>
              </button>
            </div>

            {clientContacts.length === 0 ? (
              <div className="p-6 text-center text-stone-400 text-xs">
                <UserIcon className="w-6 h-6 mx-auto mb-1.5 text-stone-300" />
                <p>No contact persons registered for this client yet.</p>
                <button
                  onClick={handleOpenEditClient}
                  className="mt-2 text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  + Add Key Contact
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {clientContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-stone-900">
                          {contact.first_name} {contact.last_name}
                        </div>
                        {contact.job_title && (
                          <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-stone-400" />
                            <span>{contact.job_title}</span>
                          </div>
                        )}
                      </div>
                      {contact.is_primary && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold uppercase">
                          Primary
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-stone-600 text-[11px] pt-1 border-t border-stone-200/60">
                      {contact.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-stone-400" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client Modal for Capture & Edit */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        companyId={company.id}
        initialOrg={editingOrg}
        onSaved={handleClientSaved}
      />
    </div>
  );
};
