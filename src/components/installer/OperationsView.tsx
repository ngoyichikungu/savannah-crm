import React, { useState } from 'react';
import { BackupService } from '../../services/backupService';
import { InstallerService } from '../../services/installerService';
import { StorageService } from '../../services/storageService';
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
  Server,
  Layers,
  Copy,
  Check,
  PlusCircle,
  HelpCircle,
  ShieldAlert,
  Globe,
  Radio,
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

  // Multi-Instance state
  const currentInstanceId = StorageService.getInstanceId();
  const currentStorageKey = StorageService.getStorageKey();
  const [knownInstances, setKnownInstances] = useState<string[]>(() => StorageService.listKnownInstances());
  const [customSwitchInstance, setCustomSwitchInstance] = useState('');

  // New Instance Generator Form state
  const [genInstanceId, setGenInstanceId] = useState('crm2');
  const [genTitle, setGenTitle] = useState('Savannah CRM (Instance 2)');
  const [genDir, setGenDir] = useState('/var/www/html/crm2');
  const [routingType, setRoutingType] = useState<'port' | 'subdomain'>('port');
  const [genPort, setGenPort] = useState('8081');
  const [genDomain, setGenDomain] = useState('crm2.company.co.zm');
  const [genDbName, setGenDbName] = useState('savannah_crm2');
  const [genDbUser, setGenDbUser] = useState('root');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPortNarrative, setShowPortNarrative] = useState(true);

  const checkPortStatus = (portStr: string): { status: 'safe' | 'warning' | 'error'; message: string } => {
    const p = parseInt(portStr, 10);
    if (isNaN(p) || p < 1 || p > 65535) {
      return { status: 'error', message: 'Enter a valid TCP port number between 1 and 65535.' };
    }
    if (p === 22) {
      return { status: 'error', message: 'CRITICAL: Port 22 is reserved for SSH remote management! Selecting this will cause connection failure.' };
    }
    if (p === 3306) {
      return { status: 'error', message: 'CRITICAL: Port 3306 is reserved for MySQL / MariaDB Database Server! Using this will crash your database backend.' };
    }
    if (p === 53) {
      return { status: 'error', message: 'Port 53 is reserved for system DNS resolver.' };
    }
    if (p === 25 || p === 465 || p === 587) {
      return { status: 'error', message: `Port ${p} is reserved for SMTP mail server.` };
    }
    if (p === 6379) {
      return { status: 'error', message: 'Port 6379 is reserved for Redis cache.' };
    }
    if (p === 443) {
      return { status: 'warning', message: 'Port 443 is standard HTTPS/SSL. Keep it for Certbot/SSL reverse proxy; use Port 80 for the VirtualHost.' };
    }
    if (p < 1024 && p !== 80) {
      return { status: 'error', message: `Port ${p} is a privileged system port (< 1024). Linux requires root and will conflict with OS daemons.` };
    }
    if (p === 80) {
      return { status: 'safe', message: 'Port 80 (Standard HTTP): Best paired with custom domains/subdomains (e.g. crm2.domain.co.zm).' };
    }
    if (p >= 8080 && p <= 8099) {
      return { status: 'safe', message: `Port ${p} (Recommended High Web Port): Ideal for direct IP-based access without domain collisions.` };
    }
    return { status: 'safe', message: `Port ${p}: Valid unprivileged TCP port.` };
  };

  const portValidation = checkPortStatus(genPort);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRefreshHealth = () => {
    const status = InstallerService.getHealthStatus();
    setHealthStatus(status);
    setKnownInstances(StorageService.listKnownInstances());
    setMessage({ type: 'info', text: 'Health status and instance registry refreshed.' });
  };

  const handleSwitchInstance = (targetId: string) => {
    StorageService.setInstanceId(targetId);
    setKnownInstances(StorageService.listKnownInstances());
    if (onDataRestored) onDataRestored();
    setMessage({
      type: 'success',
      text: `Switched active local instance context to '${targetId}'. Data storage key: ${StorageService.getStorageKey()}`,
    });
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

  const effectivePort = routingType === 'subdomain' ? '80' : genPort;
  const generatedCliCommand = routingType === 'subdomain'
    ? `sudo bash install.sh --instance-id=${genInstanceId} --title="${genTitle}" --dir=${genDir} --port=80 --domain=${genDomain} --db-name=${genDbName} --db-user=${genDbUser} -y`
    : `sudo bash install.sh --instance-id=${genInstanceId} --title="${genTitle}" --dir=${genDir} --port=${genPort} --db-name=${genDbName} --db-user=${genDbUser} -y`;

  const generatedEnvSnippet = `# .env for Instance: ${genInstanceId}
APP_NAME="${genTitle}"
APP_ENV=production
APP_URL=${routingType === 'subdomain' ? `http://${genDomain}` : `http://your-server-ip:${genPort}`}
APP_PORT=${effectivePort}
VITE_INSTANCE_ID="${genInstanceId}"
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=${genDbName}
DB_USERNAME=${genDbUser}
DB_PASSWORD=your_password_here`;

  const generatedApacheSnippet = `# /etc/apache2/sites-available/savannah-${genInstanceId}.conf
<VirtualHost *:${effectivePort}>
    ServerName ${routingType === 'subdomain' ? genDomain : 'localhost'}
    ${routingType === 'port' ? 'ServerAlias localhost 127.0.0.1' : ''}
    DocumentRoot ${genDir}/dist
    <Directory ${genDir}/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    ErrorLog \${APACHE_LOG_DIR}/savannah_${genInstanceId}_error.log
    CustomLog \${APACHE_LOG_DIR}/savannah_${genInstanceId}_access.log combined
</VirtualHost>`;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-700" />
            Operations, Multi-Instance &amp; Backup Center
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Multi-instance isolation manager, database health, timestamped backups &amp; Apache VPS controls.
          </p>
        </div>

        <button
          onClick={handleRefreshHealth}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Status
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

      {/* MULTI-INSTANCE MANAGER CARD */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-stone-100 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center font-bold">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">Multi-Instance Server Manager</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Zero DB Clashes
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Run unlimited instances on the same server with isolated databases, ports, and storage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400 font-mono">Current Active Instance:</span>
            <span className="px-3 py-1 bg-amber-400 text-stone-900 font-bold font-mono text-xs rounded-lg shadow-2xs">
              {currentInstanceId}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Instance Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Active Instance ID
              </span>
              <div className="text-sm font-extrabold text-stone-900 font-mono flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-700" />
                {currentInstanceId}
              </div>
              <p className="text-[10px] text-stone-500">Configured via .env / VITE_INSTANCE_ID</p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Storage Key Partition
              </span>
              <div className="text-xs font-mono font-bold text-stone-800 truncate" title={currentStorageKey}>
                {currentStorageKey}
              </div>
              <p className="text-[10px] text-emerald-700 font-medium">✓ 100% Isolated Client Namespace</p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Backend DB Isolation
              </span>
              <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-600" />
                savannah_{currentInstanceId === 'default' ? 'crm' : currentInstanceId}
              </div>
              <p className="text-[10px] text-stone-500">Separate tables, credentials &amp; logs</p>
            </div>
          </div>

          {/* Instance Switching (for preview / multi-tenant testing) */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-700" />
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Local Instance Switcher (Detected on this Browser/Domain)
                </h3>
              </div>
              <span className="text-[10px] text-amber-800 font-mono">
                {knownInstances.length} instance space(s) detected
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {knownInstances.map((inst) => (
                <button
                  key={inst}
                  onClick={() => handleSwitchInstance(inst)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    inst === currentInstanceId
                      ? 'bg-stone-900 text-amber-300 shadow-xs'
                      : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {inst === currentInstanceId && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  {inst}
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="text"
                  placeholder="New instance slug..."
                  value={customSwitchInstance}
                  onChange={(e) => setCustomSwitchInstance(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="px-2.5 py-1 text-xs bg-white rounded-lg border border-stone-300 font-mono w-40 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
                <button
                  onClick={() => {
                    if (customSwitchInstance) {
                      handleSwitchInstance(customSwitchInstance);
                      setCustomSwitchInstance('');
                    }
                  }}
                  disabled={!customSwitchInstance}
                  className="px-2.5 py-1 bg-stone-900 text-white font-bold text-xs rounded-lg hover:bg-stone-800 disabled:opacity-50"
                >
                  Switch / Create Space
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Generator for Adding Another Instance on VPS */}
          <div className="border border-stone-200 rounded-xl p-5 space-y-4 bg-stone-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-700" />
                  Interactive Multi-Instance Provisioning Generator
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Configure variables for your next instance to generate the isolated 1-command installer script:
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPortNarrative(!showPortNarrative)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors shadow-2xs self-start sm:self-auto"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                {showPortNarrative ? 'Hide Port Options Narrative' : 'Show Port Options Narrative'}
              </button>
            </div>

            {/* Comprehensive Port Selection Narrative Callout */}
            {showPortNarrative && (
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-3 text-xs text-stone-800">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                  <Server className="w-4 h-4 text-amber-700" />
                  Port Options Narrative &amp; Guidance for Multi-Instance Hosting
                </div>
                <p className="text-[11px] leading-relaxed text-stone-700">
                  Every TCP network connection requires an <strong>IP address</strong> and a <strong>Port number (1–65535)</strong>.
                  When running multiple instances of Savannah CRM on the same server, you have two primary port options to prevent collisions:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 bg-white/90 rounded-lg border border-amber-200 space-y-1">
                    <div className="font-bold text-emerald-800 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      Option A: Standard Port 80 (Subdomain / Domain Routing)
                    </div>
                    <p className="text-stone-600">
                      Multiple instances can all share <strong>Port 80</strong> as long as each has a unique domain or subdomain (e.g. <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">crm1.domain.zm</code> and <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">crm2.domain.zm</code>). Apache inspects the HTTP <code className="font-mono">Host</code> header to route each visitor cleanly without requiring a port number in the URL.
                    </p>
                  </div>

                  <div className="p-3 bg-white/90 rounded-lg border border-amber-200 space-y-1">
                    <div className="font-bold text-amber-800 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" />
                      Option B: Dedicated High Web Ports (8080–8099)
                    </div>
                    <p className="text-stone-600">
                      When accessing via the direct Server IP (e.g. <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">http://192.168.1.50:8081</code>), each instance must have its own dedicated port. Ports <strong>8080, 8081, 8082, 8083, 8084</strong> are industry-standard alternate HTTP ports. The installer automatically registers <code className="font-mono">Listen &lt;port&gt;</code> in Apache <code className="font-mono">ports.conf</code>.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-rose-50/80 rounded-lg border border-rose-200 text-[11px] text-rose-950 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Collision Hazards — Reserved Ports to NEVER Select:</span>
                    <p className="mt-0.5 text-stone-700">
                      Never assign <strong>Port 22 (SSH)</strong>, <strong>Port 3306 (MySQL / MariaDB database server)</strong>, <strong>Port 53 (DNS)</strong>, <strong>Port 25/587 (Mail)</strong>, or <strong>Port 6379 (Redis)</strong>. Binding Apache to 3306 will crash your database backend! Also avoid privileged root system ports below 1024.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-stone-600 flex items-center gap-1.5 pt-1">
                  <Terminal className="w-3.5 h-3.5 text-stone-500" />
                  <span>Firewall rule: When choosing a custom port, enable it on your VPS:</span>
                  <code className="bg-stone-900 text-amber-300 font-mono px-1.5 py-0.5 rounded text-[10px]">
                    sudo ufw allow {routingType === 'subdomain' ? '80' : genPort}/tcp
                  </code>
                </div>
              </div>
            )}

            {/* Routing Strategy Switcher */}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-bold text-stone-700">Access Strategy:</span>
              <div className="inline-flex rounded-lg border border-stone-300 p-0.5 bg-white text-xs">
                <button
                  type="button"
                  onClick={() => setRoutingType('port')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    routingType === 'port'
                      ? 'bg-stone-900 text-stone-100 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Dedicated Port (e.g. :8081)
                </button>
                <button
                  type="button"
                  onClick={() => setRoutingType('subdomain')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    routingType === 'subdomain'
                      ? 'bg-stone-900 text-stone-100 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Custom Domain / Subdomain (Port 80)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Instance ID (slug):</label>
                <input
                  type="text"
                  value={genInstanceId}
                  onChange={(e) => {
                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                    setGenInstanceId(slug);
                    setGenDir(`/var/www/html/${slug}`);
                    setGenDbName(`savannah_${slug}`);
                    setGenTitle(`Savannah CRM (${slug})`);
                    setGenDomain(`${slug}.company.co.zm`);
                  }}
                  className="w-full p-2 bg-white rounded-lg border border-stone-300 font-mono focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              {routingType === 'port' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-stone-700">VirtualHost Port:</label>
                    <span className="text-[10px] text-stone-500 font-mono">Range: 8080–8099</span>
                  </div>
                  <input
                    type="text"
                    value={genPort}
                    onChange={(e) => setGenPort(e.target.value)}
                    className={`w-full p-2 bg-white rounded-lg border font-mono focus:outline-none focus:ring-1 ${
                      portValidation.status === 'error'
                        ? 'border-rose-400 focus:ring-rose-500'
                        : portValidation.status === 'warning'
                        ? 'border-amber-400 focus:ring-amber-500'
                        : 'border-stone-300 focus:ring-stone-800'
                    }`}
                  />
                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['8080', '8081', '8082', '8083', '8084', '8888'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setGenPort(p)}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                          genPort === p
                            ? 'bg-amber-100 border-amber-300 font-bold text-amber-900'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        :{p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Domain or Subdomain (Port 80):</label>
                  <input
                    type="text"
                    value={genDomain}
                    onChange={(e) => setGenDomain(e.target.value)}
                    placeholder="e.g. crm2.company.co.zm"
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 font-mono focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                  <span className="text-[10px] text-stone-500 block mt-1">Binds to Port 80 via ServerName header.</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Target Directory:</label>
                <input
                  type="text"
                  value={genDir}
                  onChange={(e) => setGenDir(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-stone-300 font-mono focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Database Name:</label>
                <input
                  type="text"
                  value={genDbName}
                  onChange={(e) => setGenDbName(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-stone-300 font-mono focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Database User:</label>
                <input
                  type="text"
                  value={genDbUser}
                  onChange={(e) => setGenDbUser(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-stone-300 font-mono focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Display Title:</label>
                <input
                  type="text"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>
            </div>

            {/* Real-time Port Warning Banner */}
            {routingType === 'port' && portValidation.status !== 'safe' && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  portValidation.status === 'error'
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Port Check Alert: </span>
                  {portValidation.message}
                </div>
              </div>
            )}

            {/* Generated CLI Command Box */}
            <div className="bg-stone-900 text-stone-100 rounded-xl p-4 font-mono text-xs space-y-2 border border-stone-800">
              <div className="flex items-center justify-between text-stone-400 text-[11px]">
                <span>1-Command Terminal Execution for Instance '{genInstanceId}':</span>
                <button
                  onClick={() => handleCopy(generatedCliCommand, 'cli')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded text-[11px] transition-colors"
                >
                  {copiedKey === 'cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'cli' ? 'Copied!' : 'Copy Command'}
                </button>
              </div>
              <div className="text-amber-300 bg-stone-950 p-2.5 rounded-lg overflow-x-auto select-all">
                {generatedCliCommand}
              </div>
            </div>

            {/* Collapsible Config Snippets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
              <div className="bg-white p-3 rounded-lg border border-stone-200">
                <div className="flex items-center justify-between text-stone-600 font-bold mb-1">
                  <span>Isolated .env Preview</span>
                  <button
                    onClick={() => handleCopy(generatedEnvSnippet, 'env')}
                    className="text-stone-400 hover:text-stone-800"
                  >
                    {copiedKey === 'env' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-[10px] text-stone-700 bg-stone-50 p-2 rounded max-h-24 overflow-y-auto">
                  {generatedEnvSnippet}
                </pre>
              </div>

              <div className="bg-white p-3 rounded-lg border border-stone-200">
                <div className="flex items-center justify-between text-stone-600 font-bold mb-1">
                  <span>Apache VirtualHost Preview</span>
                  <button
                    onClick={() => handleCopy(generatedApacheSnippet, 'vhost')}
                    className="text-stone-400 hover:text-stone-800"
                  >
                    {copiedKey === 'vhost' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-[10px] text-stone-700 bg-stone-50 p-2 rounded max-h-24 overflow-y-auto">
                  {generatedApacheSnippet}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

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
            Records in active instance: <span className="font-bold text-stone-900">{healthStatus.database.recordsCount}</span>
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
            Database Backup Archive ({currentInstanceId})
          </div>
          <p className="text-xs text-stone-600">
            Generates a complete timestamped backup archive of all companies, ledgers, quotations, invoices, payments, and contacts for instance <strong>{currentInstanceId}</strong>.
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
            Upload a previously generated Savannah JSON backup file to restore database state for instance <strong>{currentInstanceId}</strong>.
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
                  This action will replace the current database for instance <strong>{currentInstanceId}</strong> with data from the backup archive.
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
            VPS Multi-Instance CLI Operations (SSH / Terminal)
          </div>
          <span className="text-[10px] font-mono text-stone-400">sudo bash install.sh [OPTIONS]</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
            <div className="text-amber-300 font-bold">sudo bash install.sh</div>
            <div className="text-[11px] text-stone-400 mt-1">
              Interactive setup wizard to add a new instance with custom ports, directory &amp; DB.
            </div>
          </div>

          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
            <div className="text-amber-300 font-bold">sudo bash install.sh --list</div>
            <div className="text-[11px] text-stone-400 mt-1">
              Lists all configured instances, active ports, domains, document roots &amp; database names.
            </div>
          </div>

          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
            <div className="text-amber-300 font-bold">sudo bash install.sh --remove=&lt;id&gt;</div>
            <div className="text-[11px] text-stone-400 mt-1">
              Safely unlinks an instance Apache VirtualHost without data loss and reloads server.
            </div>
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
                setMessage({ type: 'success', text: `Installation complete! Database initialized for instance '${currentInstanceId}'.` });
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
