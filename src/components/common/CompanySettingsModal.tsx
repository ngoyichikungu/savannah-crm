import React, { useState, useEffect } from 'react';
import { Company, CurrencyCode } from '../../types';
import {
  X,
  Upload,
  Building2,
  CheckCircle2,
  Image as ImageIcon,
  Trash2,
  CreditCard,
  Sparkles,
  Plus,
  ArrowRight,
  Hash,
  Settings,
  AlertTriangle,
} from 'lucide-react';

interface CompanySettingsModalProps {
  companies: Company[];
  currentCompany: Company;
  isOpen: boolean;
  onClose: () => void;
  onSaveCompany: (company: Company, isNew: boolean) => void;
  onSwitchCompany: (companyId: string) => void;
  onDeleteCompany?: (companyId: string) => void;
  initialMode?: 'manage' | 'create' | 'edit';
}

// Pre-built sample SVG logos for quick selection
const SAMPLE_LOGOS = [
  {
    name: 'Savannah Agribusiness Leaf',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><rect width="200" height="60" rx="8" fill="%23064e3b"/><circle cx="30" cy="30" r="18" fill="%23fbbf24"/><path d="M30 18 C38 18 42 26 30 42 C18 26 22 18 30 18 Z" fill="%23064e3b"/><text x="58" y="36" font-family="sans-serif" font-weight="900" font-size="18" fill="%23ffffff">SAVANNAH</text><text x="58" y="48" font-family="sans-serif" font-weight="600" font-size="9" fill="%23fbbf24" letter-spacing="1">AGRIBUSINESS</text></svg>',
  },
  {
    name: 'Modern Tech Minimalist',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><rect width="200" height="60" rx="8" fill="%231e293b"/><path d="M18 18 L32 18 L40 42 L26 42 Z" fill="%2338bdf8"/><path d="M26 18 L40 18 L32 42 L18 42 Z" fill="%23818cf8" opacity="0.8"/><text x="52" y="36" font-family="sans-serif" font-weight="800" font-size="17" fill="%23ffffff">SAVANNAH</text><text x="52" y="48" font-family="sans-serif" font-weight="700" font-size="9" fill="%2338bdf8" letter-spacing="2">SOLUTIONS</text></svg>',
  },
  {
    name: 'Emerald Corporate Shield',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><rect width="200" height="60" rx="8" fill="%23022c22"/><path d="M30 14 L42 20 L42 34 L30 44 L18 34 L18 20 Z" fill="%2310b981"/><path d="M30 18 L38 22 L38 32 L30 39 L22 32 L22 22 Z" fill="%23f59e0b"/><text x="52" y="35" font-family="sans-serif" font-weight="900" font-size="18" fill="%23ffffff">SAVANNAH</text><text x="52" y="47" font-family="sans-serif" font-weight="600" font-size="9" fill="%2334d399" letter-spacing="1.5">ENTERPRISE</text></svg>',
  },
  {
    name: 'Golden Crest Badge',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><rect width="200" height="60" rx="8" fill="%2318181b"/><circle cx="30" cy="30" r="18" fill="none" stroke="%23f59e0b" stroke-width="3"/><text x="30" y="36" font-family="sans-serif" font-weight="900" font-size="18" fill="%23f59e0b" text-anchor="middle">S</text><text x="58" y="35" font-family="sans-serif" font-weight="900" font-size="18" fill="%23ffffff">SAVANNAH</text><text x="58" y="47" font-family="sans-serif" font-weight="700" font-size="9" fill="%23f59e0b" letter-spacing="2">LOGISTICS</text></svg>',
  },
];

export function buildNewCompanyTemplate(name: string = 'New Subsidiary Ltd'): Company {
  const id = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    name,
    legal_name: `${name} Limited`,
    tpin: '1000' + Math.floor(100000 + Math.random() * 900000),
    is_vat_registered: true,
    vat_rate_bp: 1600,
    currency_code: 'ZMW',
    email: `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.co.zm`,
    phone: '+260 97 ' + Math.floor(1000000 + Math.random() * 9000000),
    address_line1: 'Plot 101, Great East Road',
    address_line2: 'Suite 4B, Commercial Center',
    city: 'Lusaka',
    country: 'Zambia',
    bank_name: 'Stanbic Bank Zambia',
    bank_account_name: `${name} Limited`,
    bank_account_number: '913000' + Math.floor(100000 + Math.random() * 900000),
    bank_branch_code: '040001',
    momo_provider: 'MTN Mobile Money Merchant',
    momo_account_number: '+260 97 1234567',
    default_invoice_terms: 'Payment is due within 30 days from invoice issue date. Late payments accrue interest at 2% monthly.',
    default_quotation_terms: 'Quotation remains valid for 30 calendar days from issue date.',
    invoice_prefix: 'INV-2026-',
    quotation_prefix: 'QUO-2026-',
    credit_note_prefix: 'CN-2026-',
    receipt_prefix: 'REC-2026-',
    next_invoice_number: 1001,
    next_quotation_number: 1001,
    next_credit_note_number: 101,
    next_receipt_number: 1001,
  };
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  companies,
  currentCompany,
  isOpen,
  onClose,
  onSaveCompany,
  onSwitchCompany,
  onDeleteCompany,
  initialMode = 'manage',
}) => {
  const [viewMode, setViewMode] = useState<'manage' | 'create' | 'edit'>(initialMode);
  const [formData, setFormData] = useState<Company>({ ...currentCompany });
  const [activeTab, setActiveTab] = useState<'branding' | 'details' | 'prefixes' | 'banking'>('branding');
  const [logoInputType, setLogoInputType] = useState<'upload' | 'preset' | 'url'>('upload');
  const [customUrl, setCustomUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync state when modal opens or current company changes
  useEffect(() => {
    if (isOpen) {
      setViewMode(initialMode);
      setFormData({ ...currentCompany });
      setCustomUrl(
        currentCompany.logo_url && !currentCompany.logo_url.startsWith('data:')
          ? currentCompany.logo_url
          : ''
      );
    }
  }, [isOpen, currentCompany, initialMode]);

  if (!isOpen) return null;

  // Handle starting new company creation
  const handleStartCreateNew = () => {
    const template = buildNewCompanyTemplate(`Subsidiary ${companies.length + 1}`);
    setFormData(template);
    setViewMode('create');
    setActiveTab('branding');
    setCustomUrl('');
  };

  // Handle starting company edit
  const handleStartEditCompany = (comp: Company) => {
    setFormData({ ...comp });
    setViewMode('edit');
    setActiveTab('branding');
    setCustomUrl(comp.logo_url && !comp.logo_url.startsWith('data:') ? comp.logo_url : '');
  };

  // File upload processing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, or WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormData((prev) => ({ ...prev, logo_url: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleApplyCustomUrl = () => {
    if (customUrl.trim()) {
      setFormData((prev) => ({ ...prev, logo_url: customUrl.trim() }));
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo_url: undefined }));
    setCustomUrl('');
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = viewMode === 'create';
    onSaveCompany(formData, isNew);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setViewMode('manage');
    }, 600);
  };

  const handleDelete = (companyId: string) => {
    if (onDeleteCompany) {
      onDeleteCompany(companyId);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6 animate-in fade-in duration-150">
        {/* Header Bar */}
        <div className="bg-white text-stone-900 p-6 flex items-center justify-between border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                Company &amp; Subsidiary Management Center
              </h2>
              <p className="text-xs text-stone-500">
                {viewMode === 'manage'
                  ? 'Manage multi-tenant company accounts, switch active entity, or create new subsidiaries.'
                  : viewMode === 'create'
                  ? 'Create a new business entity or subsidiary with custom branding and tax setup.'
                  : `Modify settings and letterhead branding for ${formData.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar for View Modes */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('manage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'manage'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-300'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Companies Directory ({companies.length})
            </button>

            {viewMode !== 'manage' && (
              <span className="text-xs text-stone-400 font-bold">
                / {viewMode === 'create' ? 'Create New Company' : `Editing: ${formData.name}`}
              </span>
            )}
          </div>

          {viewMode === 'manage' && (
            <button
              type="button"
              onClick={handleStartCreateNew}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create New Company / Subsidiary
            </button>
          )}
        </div>

        {/* MODE 1: DIRECTORY & COMPANY LIST */}
        {viewMode === 'manage' && (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((comp) => {
                const isActive = comp.id === currentCompany.id;
                return (
                  <div
                    key={comp.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                      isActive
                        ? 'bg-emerald-50/40 border-emerald-500/80 shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {comp.logo_url ? (
                            <img
                              src={comp.logo_url}
                              alt={comp.name}
                              className="w-12 h-12 object-contain rounded-xl border border-stone-200 bg-white p-1"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-xl font-mono shadow-xs">
                              {comp.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-extrabold text-stone-900">
                                {comp.legal_name || comp.name}
                              </h3>
                              {isActive && (
                                <span className="px-2 py-0.5 bg-emerald-700 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-stone-500 font-medium block mt-0.5">
                              TPIN: {comp.tpin || 'N/A'} | {comp.city}, {comp.country}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 bg-stone-50 p-2.5 rounded-xl text-[11px] font-mono text-stone-600 border border-stone-200/80">
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase font-sans font-bold">
                            Currency
                          </span>
                          <span className="font-bold text-stone-900">{comp.currency_code}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase font-sans font-bold">
                            VAT Status
                          </span>
                          <span className="font-bold text-emerald-800">
                            {comp.is_vat_registered
                              ? `${(comp.vat_rate_bp / 100).toFixed(0)}%`
                              : 'Exempt'}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase font-sans font-bold">
                            Next Inv
                          </span>
                          <span className="font-bold text-stone-900">
                            {comp.invoice_prefix || 'INV-'}
                            {comp.next_invoice_number}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              onSwitchCompany(comp.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Switch To Entity
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEditCompany(comp)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-lg border border-stone-300 transition-all flex items-center gap-1"
                        >
                          <Settings className="w-3.5 h-3.5 text-stone-500" />
                          Edit &amp; Branding
                        </button>
                      </div>

                      {companies.length > 1 && !isActive && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(comp.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Company"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Confirmation Dialog for Delete */}
            {confirmDeleteId && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-950">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>
                    Are you sure you want to remove this company from Savannah?
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1 text-stone-600 hover:bg-red-100 rounded font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(confirmDeleteId)}
                    className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 rounded font-bold"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2 & 3: FORM EDITOR (CREATE OR EDIT) */}
        {(viewMode === 'create' || viewMode === 'edit') && (
          <div>
            {/* Form Navigation Tabs */}
            <div className="flex border-b border-stone-200 bg-stone-50 px-6 gap-2 text-xs font-bold text-stone-600 pt-3 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('branding')}
                className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'branding'
                    ? 'border-emerald-700 text-emerald-800 font-extrabold'
                    : 'border-transparent hover:text-stone-900'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Logo &amp; Branding
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'details'
                    ? 'border-emerald-700 text-emerald-800 font-extrabold'
                    : 'border-transparent hover:text-stone-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Details &amp; Tax
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('prefixes')}
                className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'prefixes'
                    ? 'border-emerald-700 text-emerald-800 font-extrabold'
                    : 'border-transparent hover:text-stone-900'
                }`}
              >
                <Hash className="w-4 h-4" />
                Prefixes &amp; Sequences
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('banking')}
                className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'banking'
                    ? 'border-emerald-700 text-emerald-800 font-extrabold'
                    : 'border-transparent hover:text-stone-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Bank &amp; Mobile Money
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
              {/* TAB 1: BRANDING & LOGO */}
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  {/* Current Logo Preview Box */}
                  <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Letterhead Header Preview
                      </span>
                      {formData.logo_url && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove Logo
                        </button>
                      )}
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-inner flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {formData.logo_url ? (
                          <div className="p-2 border border-stone-200 rounded-lg bg-stone-50">
                            <img
                              src={formData.logo_url}
                              alt={formData.name}
                              className="h-14 w-auto max-w-[200px] object-contain rounded"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-2xl font-mono shadow-xs">
                            {formData.name ? formData.name.charAt(0) : 'C'}
                          </div>
                        )}
                        <div>
                          <h4 className="text-base font-extrabold text-stone-900">
                            {formData.legal_name || formData.name || 'Company Name'}
                          </h4>
                          <p className="text-xs text-stone-500">
                            {formData.logo_url
                              ? 'Custom high-res logo loaded'
                              : 'Default monogram icon badge active'}
                          </p>
                          <p className="text-[11px] font-mono text-stone-400 mt-0.5">
                            TPIN: {formData.tpin || 'N/A'} | {formData.city || 'Lusaka'},{' '}
                            {formData.country || 'Zambia'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right hidden sm:block">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded font-mono">
                          Official Letterhead
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Logo Source Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Select Logo Source
                      </span>
                      <div className="flex gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setLogoInputType('upload')}
                          className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                            logoInputType === 'upload'
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoInputType('preset')}
                          className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                            logoInputType === 'preset'
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          Preset Vectors
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoInputType('url')}
                          className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                            logoInputType === 'url'
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          Image URL
                        </button>
                      </div>
                    </div>

                    {/* File Upload Mode */}
                    {logoInputType === 'upload' && (
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative ${
                          dragActive
                            ? 'border-emerald-500 bg-emerald-50/50'
                            : 'border-stone-300 hover:border-amber-500 bg-stone-50/50 hover:bg-amber-50/20'
                        }`}
                      >
                        <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                        <h3 className="text-sm font-bold text-stone-800">
                          Drag &amp; Drop Logo File Here
                        </h3>
                        <p className="text-xs text-stone-500 mt-1">
                          PNG, JPG, WebP, or SVG format supported (Max 5MB).
                        </p>
                        <label className="inline-block mt-4 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all">
                          Select Image File
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {/* Preset Logos Mode */}
                    {logoInputType === 'preset' && (
                      <div className="grid grid-cols-2 gap-3">
                        {SAMPLE_LOGOS.map((sample, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, logo_url: sample.dataUrl }))
                            }
                            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                              formData.logo_url === sample.dataUrl
                                ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/30'
                                : 'border-stone-200 hover:border-stone-400 bg-white'
                            }`}
                          >
                            <img
                              src={sample.dataUrl}
                              alt={sample.name}
                              className="h-10 w-auto max-w-[120px] object-contain rounded"
                            />
                            <div>
                              <span className="text-xs font-bold text-stone-800 block">
                                {sample.name}
                              </span>
                              <span className="text-[10px] text-stone-500">Vector SVG</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* URL Input Mode */}
                    {logoInputType === 'url' && (
                      <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <label className="block text-xs font-bold text-stone-700">
                          External Image URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCustomUrl}
                            className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-stone-800 transition-colors"
                          >
                            Apply URL
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: BUSINESS DETAILS & TAX */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Trading Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Legal Registered Entity Name
                      </label>
                      <input
                        type="text"
                        value={formData.legal_name || ''}
                        onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                        placeholder="e.g. Savannah Agribusiness Ltd"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Taxpayer Identification Number (TPIN)
                      </label>
                      <input
                        type="text"
                        value={formData.tpin || ''}
                        onChange={(e) => setFormData({ ...formData, tpin: e.target.value })}
                        placeholder="1000123456"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Default Base Currency
                      </label>
                      <select
                        value={formData.currency_code}
                        onChange={(e) =>
                          setFormData({ ...formData, currency_code: e.target.value as CurrencyCode })
                        }
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="ZMW">ZMW — Zambian Kwacha (K)</option>
                        <option value="USD">USD — US Dollar ($)</option>
                        <option value="EUR">EUR — Euro (€)</option>
                        <option value="GBP">GBP — British Pound (£)</option>
                        <option value="ZAR">ZAR — South African Rand (R)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Primary Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Physical Address Line 1
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Country</label>
                      <input
                        type="text"
                        required
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* VAT Registration Panel */}
                  <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="vat-registered-chk"
                        checked={formData.is_vat_registered}
                        onChange={(e) =>
                          setFormData({ ...formData, is_vat_registered: e.target.checked })
                        }
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-amber-500"
                      />
                      <label
                        htmlFor="vat-registered-chk"
                        className="text-xs font-bold text-stone-900 cursor-pointer"
                      >
                        VAT Registered Taxpayer (Prints "TAX INVOICE" header on invoices)
                      </label>
                    </div>

                    {formData.is_vat_registered && (
                      <div className="pt-2 border-t border-amber-200/80 flex items-center gap-4">
                        <label className="text-xs font-semibold text-stone-700">
                          Standard VAT Rate (Basis Points):
                        </label>
                        <input
                          type="number"
                          value={formData.vat_rate_bp}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vat_rate_bp: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-28 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        />
                        <span className="text-xs text-stone-500">
                          ({(formData.vat_rate_bp / 100).toFixed(0)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PREFIXES & DOCUMENT SEQUENCES */}
              {activeTab === 'prefixes' && (
                <div className="space-y-4">
                  <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    Configure official numbering prefixes and starting sequence numbers for invoices, quotations, credit notes, and payment receipts.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-200 pb-1">
                        Invoice Sequence
                      </span>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Invoice Number Prefix
                        </label>
                        <input
                          type="text"
                          value={formData.invoice_prefix || ''}
                          onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                          placeholder="INV-2026-"
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Next Invoice Number
                        </label>
                        <input
                          type="number"
                          value={formData.next_invoice_number}
                          onChange={(e) =>
                            setFormData({ ...formData, next_invoice_number: parseInt(e.target.value) || 1001 })
                          }
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-200 pb-1">
                        Quotation Sequence
                      </span>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Quotation Prefix
                        </label>
                        <input
                          type="text"
                          value={formData.quotation_prefix || ''}
                          onChange={(e) => setFormData({ ...formData, quotation_prefix: e.target.value })}
                          placeholder="QUO-2026-"
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Next Quotation Number
                        </label>
                        <input
                          type="number"
                          value={formData.next_quotation_number}
                          onChange={(e) =>
                            setFormData({ ...formData, next_quotation_number: parseInt(e.target.value) || 1001 })
                          }
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-200 pb-1">
                        Credit Note Sequence
                      </span>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Credit Note Prefix
                        </label>
                        <input
                          type="text"
                          value={formData.credit_note_prefix || ''}
                          onChange={(e) => setFormData({ ...formData, credit_note_prefix: e.target.value })}
                          placeholder="CN-2026-"
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Next Credit Note Number
                        </label>
                        <input
                          type="number"
                          value={formData.next_credit_note_number}
                          onChange={(e) =>
                            setFormData({ ...formData, next_credit_note_number: parseInt(e.target.value) || 101 })
                          }
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-200 pb-1">
                        Receipt Sequence
                      </span>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Receipt Prefix
                        </label>
                        <input
                          type="text"
                          value={formData.receipt_prefix || ''}
                          onChange={(e) => setFormData({ ...formData, receipt_prefix: e.target.value })}
                          placeholder="REC-2026-"
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Next Receipt Number
                        </label>
                        <input
                          type="number"
                          value={formData.next_receipt_number || 1001}
                          onChange={(e) =>
                            setFormData({ ...formData, next_receipt_number: parseInt(e.target.value) || 1001 })
                          }
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Default Invoice Terms &amp; Footer Notes
                    </label>
                    <textarea
                      rows={2}
                      value={formData.default_invoice_terms || ''}
                      onChange={(e) => setFormData({ ...formData, default_invoice_terms: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: BANKING & MOBILE MONEY */}
              {activeTab === 'banking' && (
                <div className="space-y-4">
                  <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    These banking and mobile money remittance details are automatically printed on invoice and quotation letterheads.
                  </div>

                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider pt-2 border-b border-stone-200 pb-1">
                    Direct Bank Transfer Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={formData.bank_name || ''}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="e.g. Stanbic Bank Zambia"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={formData.bank_account_name || ''}
                        onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                        placeholder="e.g. Savannah Agribusiness Ltd"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.bank_account_number || ''}
                        onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                        placeholder="913000123456"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Branch / Sort Code
                      </label>
                      <input
                        type="text"
                        value={formData.bank_branch_code || ''}
                        onChange={(e) => setFormData({ ...formData, bank_branch_code: e.target.value })}
                        placeholder="040001"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider pt-4 border-b border-stone-200 pb-1">
                    Mobile Money Merchant Remittance
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Mobile Money Provider
                      </label>
                      <input
                        type="text"
                        value={formData.momo_provider || ''}
                        onChange={(e) => setFormData({ ...formData, momo_provider: e.target.value })}
                        placeholder="e.g. MTN MoMo Merchant"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Merchant / Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.momo_account_number || ''}
                        onChange={(e) => setFormData({ ...formData, momo_account_number: e.target.value })}
                        placeholder="+260 97 1234567"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setViewMode('manage')}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  ← Back to Directory
                </button>

                <div className="flex items-center gap-3">
                  {savedSuccess && (
                    <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" /> Saved successfully!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {viewMode === 'create' ? 'Create Subsidiary Entity' : 'Save Company Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
