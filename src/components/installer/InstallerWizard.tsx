import React, { useState } from 'react';
import { InstallerService, RequirementCheck, InstallationConfig } from '../../services/installerService';
import { StorageService } from '../../services/storageService';
import { Company, User } from '../../types';
import {
  CheckCircle2,
  XCircle,
  Key,
  Database,
  Building2,
  UserCheck,
  ArrowRight,
  RefreshCw,
  Server,
  Lock,
} from 'lucide-react';

interface InstallerWizardProps {
  onInstallationComplete: (owner: User, company: Company) => void;
  onCancel?: () => void;
}

export const InstallerWizard: React.FC<InstallerWizardProps> = ({
  onInstallationComplete,
  onCancel,
}) => {
  const isAlreadyInstalled = InstallerService.isInstalled();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [requirements, setRequirements] = useState<RequirementCheck[]>(() =>
    InstallerService.checkRequirements()
  );

  // Form State
  const [instanceId, setInstanceId] = useState(() => StorageService.getInstanceId());
  const [ownerName, setOwnerName] = useState('Chikungu Ngoyi');
  const [ownerEmail, setOwnerEmail] = useState('owner@savannah.co.zm');
  const [companyName, setCompanyName] = useState('Savannah Enterprises Ltd');
  const [currencyCode, setCurrencyCode] = useState('ZMW');
  const [isVatRegistered, setIsVatRegistered] = useState(true);
  const [vatRateBp] = useState(1600);
  const [generatedAppKey, setGeneratedAppKey] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);

  const allRequirementsPassed = requirements.every((r) => r.passed);

  const handleRecheckRequirements = () => {
    setRequirements(InstallerService.checkRequirements());
  };

  const handleGenerateKeyAndProceed = () => {
    const key = InstallerService.generateAppKey();
    setGeneratedAppKey(key);
    setStep(3);
  };

  const handleRunInstallation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsInstalling(true);

    setTimeout(() => {
      const config: InstallationConfig = {
        ownerName,
        ownerEmail,
        companyName,
        currencyCode,
        isVatRegistered,
        vatRateBp,
      };

      const result = InstallerService.runInstallation(config);
      setIsInstalling(false);
      setStep(4);
      setTimeout(() => {
        onInstallationComplete(result.ownerUser, result.company);
      }, 1500);
    }, 600);
  };

  if (isAlreadyInstalled) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-stone-200 shadow-md">
        <div className="flex items-center gap-4 text-rose-700 bg-rose-50 p-4 rounded-xl border border-rose-200 mb-6">
          <Lock className="w-8 h-8 shrink-0" />
          <div>
            <h2 className="text-base font-bold tracking-tight">First-Run Installer Disabled</h2>
            <p className="text-xs text-rose-800 mt-1">
              Savannah CRM is already installed on this instance. The <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-bold">/install</code> route is locked for security.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-stone-600">
          <p>
            To re-run the installer or manage database initialization, execute the interactive CLI alternative:
          </p>
          <div className="bg-stone-900 text-stone-100 font-mono p-4 rounded-xl text-xs space-y-2">
            <div className="text-stone-400"># CLI Installation Alternative (SSH / Terminal)</div>
            <div className="text-amber-300">php artisan app:install</div>
            <div className="text-stone-400 mt-2"># CLI Manual Database Backup</div>
            <div className="text-amber-300">php artisan app:backup</div>
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-between items-center">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-stone-900 text-stone-100 text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors"
              >
                Return to Dashboard
              </button>
            )}
            <button
              onClick={() => {
                InstallerService.setInstalledMarker(false);
                window.location.reload();
              }}
              className="px-3 py-1.5 border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold rounded-lg transition-colors"
            >
              Unlock Installer (Admin Mode)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-8 bg-white rounded-2xl border border-stone-200 shadow-lg overflow-hidden">
      {/* Header Banner */}
      <div className="bg-stone-900 text-stone-100 p-6 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center font-bold text-amber-300 text-lg font-mono">
            S
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Savannah CRM First-Run Web Installer</h1>
            <p className="text-xs text-stone-400">System initialization, requirements verification &amp; seed database</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-mono font-bold bg-amber-400 text-stone-900 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Step {step} of 4
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-100 h-1.5 flex">
        <div className={`h-full bg-emerald-600 transition-all duration-300 ${step === 1 ? 'w-1/4' : step === 2 ? 'w-2/4' : step === 3 ? 'w-3/4' : 'w-full'}`} />
      </div>

      <div className="p-8">
        {/* Step 1: Requirements Check */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-700" />
                Step 1: System Requirements &amp; Permissions Check
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Verifying server PHP extensions, database writability, and cryptographic providers before setup.
              </p>
            </div>

            <div className="space-y-3">
              {requirements.map((req) => (
                <div
                  key={req.id}
                  className={`p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                    req.passed
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {req.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h3 className="text-xs font-bold text-stone-900">{req.name}</h3>
                      <p className="text-[11px] font-mono text-stone-600 mt-0.5">
                        Detected: <span className="font-semibold text-stone-900">{req.detected}</span> (Required: {req.required})
                      </p>
                      {!req.passed && (
                        <p className="text-[11px] text-rose-800 font-semibold mt-1 bg-rose-100/80 p-1.5 rounded">
                          Fix Hint: {req.fixHint}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                      req.passed
                        ? 'bg-emerald-200/80 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {req.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <button
                onClick={handleRecheckRequirements}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Re-check Environment
              </button>

              <button
                disabled={!allRequirementsPassed}
                onClick={() => setStep(2)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-stone-900 shadow-sm transition-all ${
                  allRequirementsPassed
                    ? 'bg-amber-400 hover:bg-amber-300'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                Continue to Security Setup
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: APP_KEY & Database Initialization */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                Step 2: Cryptographic APP_KEY &amp; MySQL Initialization
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Generates a 256-bit encryption key and connects to a fresh MySQL database with required tables.
              </p>
            </div>

            <div className="bg-stone-900 text-stone-100 p-5 rounded-xl border border-stone-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>Application Master Encryption Key (APP_KEY):</span>
                <span className="font-mono text-[10px] text-amber-400 uppercase">AES-256-GCM</span>
              </div>
              <div className="font-mono text-sm bg-stone-950 p-3 rounded-lg text-emerald-400 font-bold border border-stone-800 break-all select-all">
                {generatedAppKey || 'base64:7K0mQx1sL29p3... (will generate on proceed)'}
              </div>
              <p className="text-[11px] text-stone-400">
                This key encrypts sensitive financial parameters, user tokens, and session cookies in <code className="text-stone-200">.env</code>.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-950">
              <Database className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">MySQL Engine &amp; Multi-Instance Isolation</span>
                  <span className="font-mono text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">
                    Instance: {instanceId}
                  </span>
                </div>
                <p className="text-stone-700 mt-0.5">
                  Database <code className="font-mono bg-emerald-100/80 px-1 py-0.5 rounded font-bold">savannah_{instanceId === 'default' ? 'crm' : instanceId}</code> is fully isolated. No clash occurs with any other instances on this server.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
              >
                ← Back
              </button>

              <button
                onClick={handleGenerateKeyAndProceed}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 font-bold text-stone-900 rounded-xl text-xs shadow-sm transition-all"
              >
                Generate APP_KEY &amp; Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Owner Account & Primary Company Form */}
        {step === 3 && (
          <form onSubmit={handleRunInstallation} className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                Step 3: Initial Owner Account &amp; Company Setup
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Configure your system administrator account and primary operating company entity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Owner Account */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  Primary System Administrator
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full text-xs p-2 bg-white rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Admin Email *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full text-xs p-2 bg-white rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Instance Identifier (Slug)</label>
                  <input
                    type="text"
                    value={instanceId}
                    onChange={(e) => {
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                      setInstanceId(slug);
                      StorageService.setInstanceId(slug);
                    }}
                    className="w-full text-xs p-2 bg-white rounded-lg border border-stone-300 font-mono focus:outline-none focus:ring-1 focus:ring-stone-800"
                    placeholder="e.g. crm1, crm2"
                  />
                  <span className="text-[10px] text-stone-500">Isolates data storage from other instances on this host.</span>
                </div>
              </div>

              {/* Primary Company Entity */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  First Company Entity
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Company Trading Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-xs p-2 bg-white rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">Currency *</label>
                    <select
                      value={currencyCode}
                      onChange={(e) => setCurrencyCode(e.target.value)}
                      className="w-full text-xs p-2 bg-white rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800"
                    >
                      <option value="ZMW">ZMW (Zambian Kwacha)</option>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="GBP">GBP (British Pound)</option>
                      <option value="ZAR">ZAR (SA Rand)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">VAT Reg Status</label>
                    <select
                      value={isVatRegistered ? 'yes' : 'no'}
                      onChange={(e) => setIsVatRegistered(e.target.value === 'yes')}
                      className="w-full text-xs p-2 bg-white rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800"
                    >
                      <option value="yes">VAT Registered (16%)</option>
                      <option value="no">Non-VAT Registered</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
              >
                ← Back
              </button>

              <button
                type="submit"
                disabled={isInstalling}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 font-bold text-white rounded-xl text-xs shadow-md transition-all"
              >
                {isInstalling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Initializing Database...
                  </>
                ) : (
                  <>
                    Complete Installation &amp; Launch
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Installation Complete */}
        {step === 4 && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Installation Complete!</h2>
            <p className="text-xs text-stone-600 max-w-md mx-auto">
              Savannah CRM has been configured with <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">{companyName}</code> and initial seed data. Redirecting to onboarding dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
