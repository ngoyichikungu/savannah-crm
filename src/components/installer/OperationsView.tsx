import React, { useState } from 'react';
import { BackupService } from '../../services/backupService';
import { InstallerService } from '../../services/installerService';
import { InstallerWizard } from './InstallerWizard';
import {
  Download,
  Upload,
  RefreshCw,
  Database,
  Activity,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface OperationsViewProps {
  onDataRestored?: () => void;
}

export const OperationsView: React.FC<OperationsViewProps> = ({ onDataRestored }) => {
  const [healthStatus, setHealthStatus] = useState(() => InstallerService.getHealthStatus());
  const [backupHistory, setBackupHistory] = useState(() => BackupService.getBackupHistory());
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<any | null>(null);
  const [showInstallerModal, setShowInstallerModal] = useState(false);

  const handleRefreshHealth = () => {
    const status = InstallerService.getHealthStatus();
    setHealthStatus(status);
    setMessage({ type: 'info', text: 'Health status refreshed.' });
  };

  const handleDownloadBackup = () => {
    try {
      BackupService.downloadBackupFile();
      setBackupHistory(BackupService.getBackupHistory());
      setMessage({ type: 'success', text: 'Backup archive generated and downloaded successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Backup failed: ${err?.message || 'Error creating archive'}` });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setConfirmRestoreFile(json);
      } catch {
        setMessage({ type: 'error', text: 'Failed to parse file: Selected file is not valid JSON.' });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!confirmRestoreFile) return;
    setIsRestoring(true);

    setTimeout(() => {
      const result = BackupService.restoreBackup(confirmRestoreFile);
      setIsRestoring(false);
      setConfirmRestoreFile(null);

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setHealthStatus(InstallerService.getHealthStatus());
        if (onDataRestored) onDataRestored();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    }, 400);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-700" />
            Operations, Health &amp; Backup Center
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Database health checks, timestamped backups, restore execution &amp; CLI utilities.
          </p>
        </div>

        <button
          onClick={handleRefreshHealth}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Check Health Endpoint
        </button>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : message.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-stone-100 text-stone-800 border-stone-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-stone-400 hover:text-stone-700">
            ✕
          </button>
        </div>
      )}

      {/* Health Indicator Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Overall System Health</span>
            <span className="font-mono text-[10px] bg-stone-100 px-2 py-0.5 rounded uppercase font-bold text-stone-700">
              /api/health
            </span>
          </div>
          <div className="flex items-center gap-2 text-base font-extrabold text-stone-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="uppercase text-emerald-700">{healthStatus.status}</span>
          </div>
          <p className="text-[11px] text-stone-500">All database checks responding properly.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>MySQL Database Status</span>
            <Database className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base font-extrabold text-stone-900">
            {healthStatus.database.connected ? 'Connected & Writable' : 'Disconnected'}
          </div>
          <p className="text-[11px] text-stone-500 font-mono">
            Records stored: <span className="font-bold text-stone-900">{healthStatus.database.recordsCount}</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Installer Endpoint Guard</span>
            <Lock className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-base font-extrabold text-stone-900">
            {InstallerService.isInstalled() ? 'LOCKED (/install disabled)' : 'UNLOCKED'}
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-stone-500">Guard flag prevents unauthorized re-installation.</p>
            <button
              onClick={() => {
                InstallerService.setInstalledMarker(false);
                setShowInstallerModal(true);
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-[10px] rounded-lg shadow-2xs transition-all"
            >
              Run /install Wizard
            </button>
          </div>
        </div>
      </div>

      {/* Backup & Restore Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Backup */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
            <Download className="w-5 h-5 text-emerald-700" />
            Database Backup Archive
          </div>
          <p className="text-xs text-stone-600">
            Generates a complete timestamped backup archive of all companies, ledgers, quotations, invoices, payments, and contacts.
          </p>

          <button
            onClick={handleDownloadBackup}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Create &amp; Download Backup Archive
          </button>

          {/* Backup History */}
          <div className="pt-3 border-t border-stone-100">
            <h4 className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2">
              Recent Backup Log ({backupHistory.length})
            </h4>
            {backupHistory.length === 0 ? (
              <p className="text-[11px] text-stone-400 italic">No recent backup archives in history.</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                {backupHistory.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-stone-50 rounded-lg text-[11px]">
                    <span className="font-mono text-stone-700">{b.timestamp.substring(0, 19).replace('T', ' ')}</span>
                    <span className="font-mono text-stone-500 text-[10px]">CRC: {b.checksum}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Restore Backup */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
            <Upload className="w-5 h-5 text-amber-600" />
            Restore Database Backup
          </div>
          <p className="text-xs text-stone-600">
            Upload a previously generated Savannah JSON backup file to restore database state.
          </p>

          <label className="block w-full cursor-pointer">
            <div className="border-2 border-dashed border-stone-300 hover:border-amber-500 p-6 rounded-xl text-center bg-stone-50/50 hover:bg-amber-50/30 transition-all">
              <Upload className="w-6 h-6 text-stone-400 mx-auto mb-2" />
              <span className="text-xs font-bold text-stone-800 block">Select Backup JSON File</span>
              <span className="text-[10px] text-stone-400">.json archives created via app:backup or web UI</span>
            </div>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      {confirmRestoreFile && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 border border-stone-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <AlertTriangle className="w-6 h-6 shrink-0 text-amber-600" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider">Confirm Database Restore</h3>
                <p className="text-[11px] text-amber-900">
                  This action will replace the current database with data from the backup archive.
                </p>
              </div>
            </div>

            <div className="text-xs text-stone-600 space-y-2 bg-stone-50 p-3 rounded-xl border border-stone-200 font-mono text-[11px]">
              <div>Timestamp: {confirmRestoreFile.timestamp || 'Unknown'}</div>
              <div>App Version: {confirmRestoreFile.version || '1.0.0'}</div>
              <div>Checksum: {confirmRestoreFile.checksum || 'N/A'}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmRestoreFile(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-lg shadow-xs transition-all flex items-center gap-1.5"
              >
                {isRestoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirm &amp; Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLI Alternative Reference */}
      <div className="bg-stone-900 text-stone-100 p-6 rounded-2xl border border-stone-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
            <Terminal className="w-4 h-4" />
            CLI Operations Commands (SSH / Terminal)
          </div>
          <span className="text-[10px] font-mono text-stone-400">php artisan app:*</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
            <div className="text-amber-300 font-bold">php artisan app:backup</div>
            <div className="text-[11px] text-stone-400 mt-1">Creates a timestamped snapshot of MySQL DB and storage archive.</div>
          </div>

          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
            <div className="text-amber-300 font-bold">php artisan app:restore &#123;file&#125;</div>
            <div className="text-[11px] text-stone-400 mt-1">Restores database from a specified backup file after confirmation.</div>
          </div>

          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
            <div className="text-amber-300 font-bold">php artisan app:install</div>
            <div className="text-[11px] text-stone-400 mt-1">Interactive CLI installer for SSH / terminal deployments.</div>
          </div>
        </div>
      </div>
      {/* Installer Modal */}
      {showInstallerModal && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-8">
            <InstallerWizard
              onInstallationComplete={() => {
                setShowInstallerModal(false);
                setHealthStatus(InstallerService.getHealthStatus());
                setMessage({ type: 'success', text: 'Installation complete! Database initialized.' });
                if (onDataRestored) onDataRestored();
              }}
              onCancel={() => setShowInstallerModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
