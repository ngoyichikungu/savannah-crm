import React, { useState } from 'react';
import { BackupService } from '../../services/backupService';
import { StorageService } from '../../services/storageService';
import {
  Download,
  LogOut,
  X,
  ShieldCheck,
  Building2,
  FileText,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface SignOutBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSignOut: (backedUp: boolean) => void;
  userName?: string;
  companyName?: string;
}

export const SignOutBackupModal: React.FC<SignOutBackupModalProps> = ({
  isOpen,
  onClose,
  onConfirmSignOut,
  userName,
  companyName,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  // Retrieve current database stats for the summary card
  const db = StorageService.getDb();
  const orgCount = db.organisations?.filter((o) => o.is_active).length || 0;
  const invoiceCount = db.invoices?.length || 0;
  const paymentCount = db.payments?.filter((p) => !p.deleted_at).length || 0;
  const calendarCount = db.calendarEvents?.length || 0;

  const handleBackupAndSignOut = () => {
    setIsDownloading(true);
    try {
      BackupService.downloadBackupFile();
      // Brief pause to ensure download initiates before tearing down session state
      setTimeout(() => {
        setIsDownloading(false);
        onConfirmSignOut(true);
      }, 500);
    } catch (err) {
      console.error('Backup download failed:', err);
      setIsDownloading(false);
      onConfirmSignOut(false);
    }
  };

  const handleExitWithoutBackup = () => {
    onConfirmSignOut(false);
  };

  return (
    <div
      id="sign-out-backup-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="sign-out-backup-modal"
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200">
              <ShieldCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900 tracking-tight">
                Sign Out &amp; Data Protection
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                {companyName ? `${companyName}` : 'Savannah Business Operations'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Friendly prompt message */}
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-stone-800">
              Would you like to download a data backup before exiting?
            </p>
            <p className="text-stone-600 leading-relaxed">
              {userName ? `${userName}, ` : ''}it is good practice to download a local snapshot
              of your financial transactions, invoices, and operations before ending your session.
            </p>
          </div>

          {/* Records Snapshot Bento */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase text-stone-500 tracking-wider">
              <span>Database Snapshot Summary</span>
              <span className="text-emerald-700 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-stone-200/60 shadow-2xs">
                <div className="flex items-center justify-center text-stone-400 mb-1">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="font-mono font-black text-stone-900 text-sm">{orgCount}</div>
                <div className="text-[10px] text-stone-500 font-medium">Clients</div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-stone-200/60 shadow-2xs">
                <div className="flex items-center justify-center text-stone-400 mb-1">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="font-mono font-black text-stone-900 text-sm">{invoiceCount}</div>
                <div className="text-[10px] text-stone-500 font-medium">Invoices</div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-stone-200/60 shadow-2xs">
                <div className="flex items-center justify-center text-stone-400 mb-1">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="font-mono font-black text-stone-900 text-sm">{paymentCount}</div>
                <div className="text-[10px] text-stone-500 font-medium">Payments</div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-stone-200/60 shadow-2xs">
                <div className="flex items-center justify-center text-stone-400 mb-1">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="font-mono font-black text-stone-900 text-sm">{calendarCount}</div>
                <div className="text-[10px] text-stone-500 font-medium">Events</div>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 text-center font-medium pt-1">
              Backup format: Standard encrypted JSON archive with integrity checksum.
            </p>
          </div>

          {/* Quick Notice */}
          <div className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-amber-900 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-snug">
              You can restore any downloaded backup archive at any time from{' '}
              <strong className="font-bold">Ops &amp; Install &rarr; Restore Database</strong>.
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-6 bg-stone-50/90 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="w-full sm:w-auto px-4 py-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-bold rounded-xl transition-colors cursor-pointer text-xs order-3 sm:order-1"
          >
            Cancel &amp; Stay
          </button>

          <button
            type="button"
            id="btn-signout-without-backup"
            onClick={handleExitWithoutBackup}
            disabled={isDownloading}
            className="w-full sm:w-auto px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5 order-2"
          >
            <LogOut className="w-3.5 h-3.5 text-stone-600" />
            <span>Sign Out Without Backup</span>
          </button>

          <button
            type="button"
            id="btn-backup-and-signout"
            onClick={handleBackupAndSignOut}
            disabled={isDownloading}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors shadow-sm cursor-pointer text-xs flex items-center justify-center gap-2 order-1 sm:order-3"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Downloading Backup...' : 'Backup Data & Sign Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
