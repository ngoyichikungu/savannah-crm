import React, { useState, useEffect } from 'react';
import { Company, Contact, Invoice, Item, Organisation, Payment, PaymentAllocation, Quotation, User } from './types';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { InvoiceService } from './services/invoiceService';
import { QuotationCalculator } from './services/quotationCalculator';
import { Header, ActiveTab } from './components/common/Header';
import { AuthScreen } from './components/auth/AuthScreen';
import { InvoiceList } from './components/invoices/InvoiceList';
import { InvoiceDetail } from './components/invoices/InvoiceDetail';
import { InvoiceEditor } from './components/invoices/InvoiceEditor';
import { BalanceVerificationTool } from './components/invoices/BalanceVerificationTool';
import { QuotationList } from './components/quotations/QuotationList';
import { QuotationDetail } from './components/quotations/QuotationDetail';
import { QuotationEditor } from './components/quotations/QuotationEditor';
import { ProposalTracker } from './components/quotations/ProposalTracker';
import { PaymentList } from './components/payments/PaymentList';
import { ReceiptDetail } from './components/payments/ReceiptDetail';
import { RecordPaymentModal } from './components/payments/RecordPaymentModal';
import { ClientAccountView } from './components/payments/ClientAccountView';
import { PlanList } from './components/marketing/PlanList';
import { PlanDetail } from './components/marketing/PlanDetail';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { DashboardView } from './components/dashboard/DashboardView';
import { CalendarView } from './components/calendar/CalendarView';
import { ReminderBanner } from './components/calendar/ReminderBanner';
import { OperationsView } from './components/installer/OperationsView';
import { CompanySettingsModal } from './components/common/CompanySettingsModal';
import { SignOutBackupModal } from './components/auth/SignOutBackupModal';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const App: React.FC = () => {
  const [authUser, setAuthUser] = useState<User | null>(() => AuthService.getCurrentSession());
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string>('');
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentAllocations, setPaymentAllocations] = useState<PaymentAllocation[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Marketing navigation state
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Invoice navigation state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);

  // Quotation navigation state
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [isEditingQuotation, setIsEditingQuotation] = useState(false);

  // Calendar navigation state
  const [selectedCalendarEventId, setSelectedCalendarEventId] = useState<string | null>(null);

  // Payment navigation state
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentPreselectedOrgId, setPaymentPreselectedOrgId] = useState<string | undefined>();
  const [paymentPreselectedInvoiceId, setPaymentPreselectedInvoiceId] = useState<string | undefined>();

  // Company logo & branding modal state
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);
  const [companyModalMode, setCompanyModalMode] = useState<'manage' | 'create' | 'edit'>('manage');

  // Sign Out & Backup Dialog state
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const loadData = () => {
    const comps = StorageService.getCompanies();
    const orgs = StorageService.getOrganisations();
    const conts = StorageService.getContacts();
    const itms = StorageService.getItems();
    const invs = StorageService.getInvoices();
    const quotes = StorageService.getQuotations();
    const pmts = StorageService.getPayments();
    const allocs = StorageService.getPaymentAllocations();

    setCompanies(comps);
    if (comps.length > 0 && !currentCompanyId) {
      setCurrentCompanyId(comps[0].id);
    }
    setOrganisations(orgs);
    setContacts(conts);
    setItems(itms);
    setInvoices(invs);
    setQuotations(quotes);
    setPayments(pmts);
    setPaymentAllocations(allocs);
  };

  useEffect(() => {
    loadData();
  }, [currentCompanyId]);

  const currentCompany = companies.find((c) => c.id === currentCompanyId) || companies[0];
  const currentUser: User = authUser || StorageService.getCurrentUser() || {
    id: 'usr-admin-1',
    name: 'Finance Manager',
    username: 'admin',
    email: 'finance@savannah.co.zm',
    role: 'owner' as const,
    company_ids: currentCompany ? [currentCompany.id] : [],
    current_company_id: currentCompany?.id || '',
  };

  const companyInvoices = invoices.filter((i) => i.company_id === currentCompany?.id);
  const companyQuotations = quotations.filter((q) => q.company_id === currentCompany?.id);
  const companyPayments = payments.filter((p) => p.company_id === currentCompany?.id);

  // Selected entities
  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);
  const selectedQuotation = quotations.find((q) => q.id === selectedQuotationId);
  const selectedPayment = payments.find((p) => p.id === selectedPaymentId);

  // Invoice Handlers
  const handleSaveInvoice = (formData: any) => {
    if (!currentCompany) return;

    if (selectedInvoice && isEditingInvoice && selectedInvoice.status === 'draft') {
      // Update draft invoice
      const updated = InvoiceService.updateInvoice(selectedInvoice, formData);
      StorageService.saveInvoice(updated);
      loadData();
      setIsEditingInvoice(false);
      setSelectedInvoiceId(updated.id);
      showToast(`Draft invoice ${updated.number} updated successfully.`);
    } else {
      // Create new invoice
      const { invoice: created, updatedCompany } = InvoiceService.createInvoice(currentCompany, {
        company_id: currentCompany.id,
        issued_by_user_id: currentUser.id,
        ...formData,
      });
      StorageService.saveInvoice(created, updatedCompany);
      loadData();
      setIsEditingInvoice(false);
      setSelectedInvoiceId(created.id);
      showToast(`Invoice ${created.number} created successfully.`);
    }
  };

  const handleSendInvoice = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    try {
      const sent = InvoiceService.sendInvoice(inv);
      StorageService.saveInvoice(sent);
      loadData();
      showToast(`Invoice ${sent.number} sent to client and locked against direct edits.`);
    } catch (err: any) {
      showToast(err.message || 'Error sending invoice', 'error');
    }
  };

  const handleOpenRecordPaymentForInvoice = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    setPaymentPreselectedInvoiceId(inv.id);
    setPaymentPreselectedOrgId(inv.organisation_id);
    setIsRecordPaymentOpen(true);
  };

  const handleIssueCreditNote = (
    invoiceId: string,
    creditNoteInput: { amount_minor: number; reason: string; issue_date?: string }
  ) => {
    if (!currentCompany) return;
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    try {
      const { invoice: updatedInv, creditNote, updatedCompany } = InvoiceService.issueCreditNote(
        currentCompany,
        inv,
        creditNoteInput
      );
      StorageService.saveCreditNote(creditNote);
      StorageService.saveInvoice(updatedInv, updatedCompany);
      loadData();
      showToast(`Credit note ${creditNote.number} issued successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Error issuing credit note', 'error');
    }
  };

  const handleCancelInvoice = (invoiceId: string, reason: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    try {
      const cancelled = InvoiceService.cancelInvoice(inv, reason);
      StorageService.saveInvoice(cancelled);
      loadData();
      showToast(`Invoice ${cancelled.number} cancelled.`);
    } catch (err: any) {
      showToast(err.message || 'Error cancelling invoice', 'error');
    }
  };

  const handleDuplicateInvoice = (invoice: Invoice) => {
    if (!currentCompany) return;
    const rawLines = (invoice.lines || []).map((l) => ({
      item_code: l.item_code,
      description: l.description,
      quantity_thousandths: l.quantity_thousandths,
      unit: l.unit,
      unit_price_minor: l.unit_price_minor,
      discount_percent_bp: l.discount_percent_bp,
      is_vatable: l.is_vatable,
    }));

    const { invoice: duplicated, updatedCompany } = InvoiceService.createInvoice(currentCompany, {
      company_id: currentCompany.id,
      organisation_id: invoice.organisation_id,
      contact_id: invoice.contact_id,
      reference: invoice.reference ? `Copy of ${invoice.reference}` : `Copy of ${invoice.number}`,
      po_number: invoice.po_number,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + invoice.payment_terms_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      payment_terms_days: invoice.payment_terms_days,
      currency_code: invoice.currency_code,
      discount_type: invoice.discount_type,
      discount_value: invoice.discount_value,
      vat_rate_bp: invoice.vat_rate_bp,
      notes: invoice.notes,
      terms: invoice.terms,
      issued_by_user_id: currentUser.id,
      lines: rawLines,
    });

    StorageService.saveInvoice(duplicated, updatedCompany);
    loadData();
    setSelectedInvoiceId(duplicated.id);
    setIsEditingInvoice(true);
    showToast(`Invoice duplicated into new draft ${duplicated.number}.`);
  };

  // Quotation Handlers
  const handleSaveQuotation = (formData: any) => {
    if (!currentCompany) return;

    if (selectedQuotation && isEditingQuotation) {
      const calc = QuotationCalculator.calculate(
        formData.lines,
        formData.discount_type,
        formData.discount_value,
        formData.vat_rate_bp
      );
      const updated: Quotation = {
        ...selectedQuotation,
        ...formData,
        ...calc,
        updated_at: new Date().toISOString(),
      };
      StorageService.saveQuotation(updated);
      loadData();
      setIsEditingQuotation(false);
      setSelectedQuotationId(updated.id);
      showToast(`Quotation ${updated.number} updated.`);
    } else {
      const { number: newNum, updatedCompany } = InvoiceService.generateNumber(currentCompany, 'quotation');
      const calc = QuotationCalculator.calculate(
        formData.lines,
        formData.discount_type,
        formData.discount_value,
        formData.vat_rate_bp
      );
      const created: Quotation = {
        id: `quo-${Date.now()}`,
        company_id: currentCompany.id,
        number: newNum,
        revision_number: 0,
        title: formData.title,
        status: 'draft',
        organisation_id: formData.organisation_id,
        contact_id: formData.contact_id,
        issue_date: formData.issue_date,
        valid_until: formData.valid_until,
        currency_code: formData.currency_code,
        subtotal_minor: calc.subtotal_minor,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        discount_minor: calc.discount_minor,
        vat_rate_bp: formData.vat_rate_bp,
        vat_minor: calc.vat_minor,
        total_minor: calc.total_minor,
        notes: formData.notes,
        terms: formData.terms,
        prepared_by_user_id: currentUser.id,
        lines: calc.lines.map((l) => ({
          ...l,
          id: `ql_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          company_id: currentCompany.id,
          quotation_id: `quo-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      StorageService.saveQuotation(created, updatedCompany);
      loadData();
      setIsEditingQuotation(false);
      setSelectedQuotationId(created.id);
      showToast(`Quotation ${created.number} created.`);
    }
  };

  const handleSendQuotation = (quoteId: string) => {
    const q = StorageService.getQuotationById(quoteId);
    if (!q) return;
    q.status = 'sent';
    q.sent_at = new Date().toISOString();
    StorageService.saveQuotation(q);
    loadData();
    showToast(`Quotation ${q.number} sent to client.`);
  };

  const handleAcceptQuotation = (quoteId: string) => {
    const q = StorageService.getQuotationById(quoteId);
    if (!q) return;
    q.status = 'accepted';
    q.decided_at = new Date().toISOString();
    StorageService.saveQuotation(q);
    loadData();
    showToast(`Quotation ${q.number} marked as accepted!`);
  };

  const handleRejectQuotation = (quoteId: string) => {
    const q = StorageService.getQuotationById(quoteId);
    if (!q) return;
    q.status = 'rejected';
    StorageService.saveQuotation(q);
    loadData();
    showToast(`Quotation ${q.number} marked as rejected.`);
  };

  const handleConvertToInvoice = (quote: Quotation) => {
    if (!currentCompany) return;
    try {
      const { invoice: inv, updatedCompany } = InvoiceService.convertQuotationToInvoice(
        currentCompany,
        quote,
        currentUser.id
      );
      StorageService.saveInvoice(inv, updatedCompany);
      loadData();
      setActiveTab('invoices');
      setSelectedInvoiceId(inv.id);
      setIsEditingInvoice(false);
      showToast(`Quote ${quote.number} successfully converted to official Invoice ${inv.number}!`);
    } catch (err: any) {
      showToast(err.message || 'Error converting quote to invoice', 'error');
    }
  };

  // Payment Handlers
  const handlePaymentRecorded = (paymentId: string) => {
    loadData();
    setSelectedPaymentId(paymentId);
    setActiveTab('payments');
    showToast('Payment recorded, allocations saved, and official receipt generated!');
  };

  // Authentication Gate Check
  if (!authUser) {
    return (
      <AuthScreen
        onLoginSuccess={(user) => {
          setAuthUser(user);
          showToast(`Access granted! Logged in as ${user.name || user.username}.`);
        }}
      />
    );
  }

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-100 text-stone-600">
        Loading Savannah CRM workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col antialiased">
      {/* App Header */}
      <Header
        currentCompany={currentCompany}
        companies={companies}
        currentUser={authUser}
        onOpenCompanySettings={() => {
          setCompanyModalMode('manage');
          setIsCompanySettingsOpen(true);
        }}
        onCreateCompany={() => {
          setCompanyModalMode('create');
          setIsCompanySettingsOpen(true);
        }}
        onLogout={() => {
          setIsSignOutModalOpen(true);
        }}
        onSwitchCompany={(id) => {
          StorageService.setCurrentCompany(id);
          setCurrentCompanyId(id);
          setSelectedInvoiceId(null);
          setSelectedQuotationId(null);
          setSelectedPaymentId(null);
          setIsEditingInvoice(false);
          setIsEditingQuotation(false);
        }}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSelectedInvoiceId(null);
          setSelectedQuotationId(null);
          setSelectedPaymentId(null);
          setSelectedPlanId(null);
          setIsEditingInvoice(false);
          setIsEditingQuotation(false);
        }}
        invoiceCount={companyInvoices.length}
        quotationCount={companyQuotations.length}
        paymentCount={companyPayments.length}
        marketingPlanCount={StorageService.getMarketingPlans().length}
        calendarEventCount={StorageService.getCalendarEvents({ companyId: currentCompany.id }).length}
      />

      {/* Proactive Client Activity Reminder Bar */}
      <ReminderBanner
        company={currentCompany}
        onOpenCalendar={() => setActiveTab('calendar')}
        onSelectEvent={(eventId) => {
          setSelectedCalendarEventId(eventId);
          setActiveTab('calendar');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <DashboardView
            currentCompany={currentCompany}
            currentUser={currentUser}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
            }}
            onSelectInvoice={(id) => {
              setSelectedInvoiceId(id);
              setActiveTab('invoices');
            }}
            onSelectQuotation={(id) => {
              setSelectedQuotationId(id);
              setActiveTab('quotations');
            }}
            onSelectPlan={(id) => {
              setSelectedPlanId(id);
              setActiveTab('marketing');
            }}
            onOpenRecordPayment={(invId) => {
              if (invId) {
                handleOpenRecordPaymentForInvoice(invId);
              } else {
                setPaymentPreselectedOrgId(undefined);
                setPaymentPreselectedInvoiceId(undefined);
                setIsRecordPaymentOpen(true);
              }
            }}
          />
        )}

        {/* CALENDAR & REMINDERS TAB */}
        {activeTab === 'calendar' && (
          <CalendarView
            company={currentCompany}
            currentUser={currentUser}
            onNavigateTab={(tab) => setActiveTab(tab)}
            selectedEventId={selectedCalendarEventId}
          />
        )}

        {/* MARKETING PLANS TAB */}
        {activeTab === 'marketing' && (
          <>
            {selectedPlanId ? (
              <PlanDetail
                planId={selectedPlanId}
                onBack={() => setSelectedPlanId(null)}
                company={currentCompany}
                currentUser={currentUser}
              />
            ) : (
              <PlanList
                onSelectPlan={(id) => setSelectedPlanId(id)}
                company={currentCompany}
                currentUser={currentUser}
              />
            )}
          </>
        )}
        {/* INVOICES TAB */}
        {activeTab === 'invoices' && (
          <>
            {isEditingInvoice ? (
              <InvoiceEditor
                initialInvoice={selectedInvoice}
                company={currentCompany}
                organisations={organisations}
                contacts={contacts}
                items={items}
                onSave={handleSaveInvoice}
                onCancel={() => {
                  setIsEditingInvoice(false);
                }}
              />
            ) : selectedInvoice ? (
              <InvoiceDetail
                invoice={selectedInvoice}
                company={currentCompany}
                organisations={organisations}
                contacts={contacts}
                onBack={() => setSelectedInvoiceId(null)}
                onSendInvoice={handleSendInvoice}
                onRecordPayment={() => handleOpenRecordPaymentForInvoice(selectedInvoice.id)}
                onIssueCreditNote={handleIssueCreditNote}
                onCancelInvoice={handleCancelInvoice}
                onDuplicateInvoice={handleDuplicateInvoice}
                onEditInvoice={(id) => {
                  setSelectedInvoiceId(id);
                  setIsEditingInvoice(true);
                }}
              />
            ) : (
              <InvoiceList
                invoices={companyInvoices}
                company={currentCompany}
                organisations={organisations}
                onSelectInvoice={(id) => setSelectedInvoiceId(id)}
                onCreateInvoice={() => {
                  setSelectedInvoiceId(null);
                  setIsEditingInvoice(true);
                }}
              />
            )}
          </>
        )}

        {/* PAYMENTS & RECEIPTS TAB */}
        {activeTab === 'payments' && (
          <>
            {selectedPayment ? (
              <ReceiptDetail
                payment={selectedPayment}
                allocations={paymentAllocations}
                invoices={invoices}
                company={currentCompany}
                organisations={organisations}
                contacts={contacts}
                currentUser={currentUser}
                onBack={() => setSelectedPaymentId(null)}
                onPaymentUpdated={() => {
                  loadData();
                  showToast('Allocation ledger updated and balances recomputed.');
                }}
              />
            ) : (
              <PaymentList
                company={currentCompany}
                payments={companyPayments}
                allocations={paymentAllocations}
                organisations={organisations}
                currentUser={currentUser}
                onRecordPayment={(preselectedOrgId) => {
                  setPaymentPreselectedOrgId(preselectedOrgId);
                  setPaymentPreselectedInvoiceId(undefined);
                  setIsRecordPaymentOpen(true);
                }}
                onViewReceipt={(id) => setSelectedPaymentId(id)}
              />
            )}
          </>
        )}

        {/* CLIENT ACCOUNTS TAB */}
        {activeTab === 'clients' && (
          <ClientAccountView
            company={currentCompany}
            organisations={organisations}
            invoices={companyInvoices}
            payments={companyPayments}
            allocations={paymentAllocations}
            currentUser={currentUser}
            onRecordPaymentForClient={(orgId) => {
              setPaymentPreselectedOrgId(orgId);
              setPaymentPreselectedInvoiceId(undefined);
              setIsRecordPaymentOpen(true);
            }}
            onViewInvoice={(id) => {
              setActiveTab('invoices');
              setSelectedInvoiceId(id);
            }}
            onViewReceipt={(id) => {
              setActiveTab('payments');
              setSelectedPaymentId(id);
            }}
            onRefreshData={loadData}
            onShowToast={showToast}
          />
        )}

        {/* QUOTATIONS TAB */}
        {activeTab === 'quotations' && (
          <>
            {isEditingQuotation ? (
              <QuotationEditor
                initialQuotation={selectedQuotation}
                company={currentCompany}
                organisations={organisations}
                contacts={contacts}
                items={items}
                onSave={handleSaveQuotation}
                onCancel={() => {
                  setIsEditingQuotation(false);
                }}
              />
            ) : selectedQuotation ? (
              <QuotationDetail
                quotation={selectedQuotation}
                company={currentCompany}
                organisations={organisations}
                contacts={contacts}
                onBack={() => setSelectedQuotationId(null)}
                onSendQuotation={handleSendQuotation}
                onAcceptQuotation={handleAcceptQuotation}
                onRejectQuotation={handleRejectQuotation}
                onConvertToInvoice={handleConvertToInvoice}
              />
            ) : (
              <QuotationList
                quotations={companyQuotations}
                company={currentCompany}
                organisations={organisations}
                onSelectQuotation={(id) => setSelectedQuotationId(id)}
                onCreateQuotation={() => {
                  setSelectedQuotationId(null);
                  setIsEditingQuotation(true);
                }}
                onConvertToInvoice={handleConvertToInvoice}
              />
            )}
          </>
        )}

        {/* PROPOSALS & PIPELINE TRACKER */}
        {activeTab === 'proposals' && (
          <ProposalTracker
            quotations={companyQuotations}
            company={currentCompany}
            organisations={organisations}
            onSelectQuotation={(id) => {
              setActiveTab('quotations');
              setSelectedQuotationId(id);
            }}
            onConvertToInvoice={handleConvertToInvoice}
          />
        )}

        {/* EXECUTIVE REPORTING ENGINE */}
        {activeTab === 'reports' && (
          <ReportsDashboard company={currentCompany} />
        )}

        {/* AUDIT & INTEGRITY LEDGER TOOL */}
        {activeTab === 'integrity' && (
          <BalanceVerificationTool
            invoices={invoices}
            onRefresh={loadData}
          />
        )}

        {/* OPERATIONS, INSTALLER & BACKUP CENTER */}
        {activeTab === 'operations' && (
          <OperationsView onDataRestored={loadData} />
        )}
      </main>

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setPaymentPreselectedInvoiceId(undefined);
            setPaymentPreselectedOrgId(undefined);
          }}
          company={currentCompany}
          organisations={organisations}
          contacts={contacts}
          invoices={companyInvoices}
          currentUser={currentUser}
          preselectedOrganisationId={paymentPreselectedOrgId}
          preselectedInvoiceId={paymentPreselectedInvoiceId}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}

      {/* Company Profile, Subsidiary & Logo Branding Modal */}
      {currentCompany && (
        <CompanySettingsModal
          companies={companies}
          currentCompany={currentCompany}
          isOpen={isCompanySettingsOpen}
          initialMode={companyModalMode}
          onClose={() => setIsCompanySettingsOpen(false)}
          onSwitchCompany={(id) => {
            StorageService.setCurrentCompany(id);
            setCurrentCompanyId(id);
            loadData();
            showToast(`Switched active entity context.`, 'info');
          }}
          onDeleteCompany={(id) => {
            const success = StorageService.deleteCompany(id);
            if (success) {
              loadData();
              showToast('Company deleted successfully.');
            } else {
              showToast('Cannot delete the last remaining company in Savannah.', 'error');
            }
          }}
          onSaveCompany={(company, isNew) => {
            StorageService.saveCompany(company);
            if (isNew) {
              StorageService.setCurrentCompany(company.id);
              setCurrentCompanyId(company.id);
            }
            loadData();
            showToast(
              isNew
                ? `Created new subsidiary ${company.name} and activated context.`
                : `Updated company settings and letterhead branding for ${company.name}.`
            );
          }}
        />
      )}

      {/* Sign Out & Data Protection Dialog */}
      <SignOutBackupModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirmSignOut={(backedUp) => {
          setIsSignOutModalOpen(false);
          AuthService.logout();
          setAuthUser(null);
          showToast(
            backedUp
              ? 'Backup archive downloaded. Signed out securely.'
              : 'Signed out of Savannah system.',
            'info'
          );
        }}
        userName={authUser?.name}
        companyName={currentCompany?.name}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 transition-all ${
              t.type === 'error'
                ? 'bg-red-900 text-white border-red-700'
                : t.type === 'info'
                ? 'bg-stone-900 text-white border-stone-700'
                : 'bg-emerald-900 text-white border-emerald-700'
            }`}
          >
            {t.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
            )}
            <div className="flex-1 text-xs font-medium">{t.message}</div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-stone-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
