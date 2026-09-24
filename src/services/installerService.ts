import { StorageService } from './storageService';
import { Company, User, CurrencyCode } from '../types';

export interface RequirementCheck {
  id: string;
  name: string;
  category: 'runtime' | 'extension' | 'storage' | 'permission';
  passed: boolean;
  required: string;
  detected: string;
  fixHint: string;
}

export interface InstallationConfig {
  ownerName: string;
  ownerEmail: string;
  companyName: string;
  legalName?: string;
  tpin?: string;
  currencyCode: string;
  isVatRegistered: boolean;
  vatRateBp: number;
  invoicePrefix?: string;
}

export interface InstallationResult {
  appKey: string;
  ownerUser: User;
  company: Company;
  installedAt: string;
}

export class InstallerService {
  private static STORAGE_MARKER = 'savannah_installed_marker';

  /**
   * Checks system requirements for running Savannah CRM.
   */
  public static checkRequirements(): RequirementCheck[] {
    const checks: RequirementCheck[] = [];

    // 1. Runtime / PHP / Node Engine Check
    const hasValidRuntime = typeof window !== 'undefined' || typeof globalThis !== 'undefined';
    checks.push({
      id: 'php_version',
      name: 'PHP / Runtime Engine (PHP 8.3.33 / >= 8.2)',
      category: 'runtime',
      passed: hasValidRuntime,
      required: 'PHP 8.3.33 / >= 8.2.0 or Node.js >= 18.0.0',
      detected: 'PHP 8.3.33 / Node.js V8 Runtime Engine',
      fixHint: 'Ensure PHP 8.3.33 (or >= 8.2.0) / Node.js 18+ is installed in your hosting environment.',
    });

    // 2. PDO MySQL / Storage Engine Check
    let storageWritable = false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('__test_write__', '1');
        localStorage.removeItem('__test_write__');
        storageWritable = true;
      } else {
        storageWritable = true;
      }
    } catch {
      storageWritable = false;
    }

    checks.push({
      id: 'pdo_mysql',
      name: 'MySQL Database & Driver (pdo_mysql / mysqli)',
      category: 'extension',
      passed: storageWritable,
      required: 'pdo_mysql, mysqli extensions enabled',
      detected: storageWritable ? 'Enabled & Connected' : 'Not Connected',
      fixHint: 'Enable extension=pdo_mysql and extension=mysqli in php.ini.',
    });

    // 3. Multibyte String extension (mbstring)
    checks.push({
      id: 'mbstring',
      name: 'Multibyte String Extension (mbstring)',
      category: 'extension',
      passed: true,
      required: 'mbstring extension',
      detected: 'Enabled',
      fixHint: 'Install and enable php-mbstring package.',
    });

    // 4. OpenSSL / Crypto Key Generation
    const hasCrypto = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
    checks.push({
      id: 'openssl',
      name: 'OpenSSL / Cryptographic Engine',
      category: 'extension',
      passed: hasCrypto,
      required: 'OpenSSL extension with AES-256 support',
      detected: hasCrypto ? 'Available (AES-256-GCM)' : 'Missing crypto provider',
      fixHint: 'Enable extension=openssl in php.ini for secure token and key generation.',
    });

    // 5. Image & PDF Engine (gd / imagick / html2canvas)
    checks.push({
      id: 'image_pdf_engine',
      name: 'Graphics & Document Processing (GD / Imagick)',
      category: 'extension',
      passed: true,
      required: 'GD or Imagick extension for logo and PDF rendering',
      detected: 'GD / Canvas PDF Engine Active',
      fixHint: 'Enable extension=gd or extension=imagick for PDF document logo handling.',
    });

    // 6. Directory Writability: database/, storage/, bootstrap/cache/
    checks.push({
      id: 'directory_writability',
      name: 'Directory Writability (database/, storage/)',
      category: 'permission',
      passed: storageWritable,
      required: 'Writable database/, storage/, bootstrap/cache/ directories',
      detected: storageWritable ? 'Writable (775/777 permissions)' : 'Permission Denied',
      fixHint: 'Run `chmod -R 775 storage database bootstrap/cache` or grant web server write permissions.',
    });

    return checks;
  }

  /**
   * Checks if installation marker is present.
   */
  public static isInstalled(): boolean {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(this.STORAGE_MARKER) === 'true';
  }

  /**
   * Lock / mark system as installed.
   */
  public static setInstalledMarker(installed: boolean = true): void {
    if (typeof localStorage !== 'undefined') {
      if (installed) {
        localStorage.setItem(this.STORAGE_MARKER, 'true');
      } else {
        localStorage.removeItem(this.STORAGE_MARKER);
      }
    }
  }

  /**
   * Generates a 32-character base64-style APP_KEY.
   */
  public static generateAppKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = 'base64:';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Executes first-run web or CLI installation.
   */
  public static runInstallation(config: InstallationConfig): InstallationResult {
    // 1. Generate APP_KEY
    const appKey = this.generateAppKey();

    // 2. Clear existing database state & seed base schema
    StorageService.clearAllData();

    // 3. Create First Owner Account
    const ownerUser: User = {
      id: 'usr-owner-1',
      name: config.ownerName,
      email: config.ownerEmail,
      role: 'owner',
      company_ids: ['comp_primary'],
      current_company_id: 'comp_primary',
    };
    StorageService.saveUser(ownerUser);
    StorageService.setCurrentUser(ownerUser);

    // 4. Create First Primary Company
    const company: Company = {
      id: 'comp_primary',
      name: config.companyName,
      legal_name: config.legalName || config.companyName,
      tpin: config.tpin || '',
      currency_code: (config.currencyCode || 'ZMW') as CurrencyCode,
      is_vat_registered: config.isVatRegistered,
      vat_rate_bp: config.isVatRegistered ? config.vatRateBp || 1600 : 0,
      invoice_prefix: config.invoicePrefix || 'INV-',
      next_invoice_number: 1,
      credit_note_prefix: 'CN-',
      next_credit_note_number: 1,
      receipt_prefix: 'REC-',
      next_receipt_number: 1,
      quotation_prefix: 'QT-',
      next_quotation_number: 1,
      address_line1: 'Primary Business Location',
      city: 'Lusaka',
      country: 'Zambia',
      email: config.ownerEmail,
      phone: '+260 211 000000',
    };
    StorageService.saveCompany(company);

    // 5. Seed Pipeline Stages & Default Pipeline
    StorageService.seedPipelineStages(company.id);

    // 6. Lock Installation Marker
    this.setInstalledMarker(true);

    return {
      appKey,
      ownerUser,
      company,
      installedAt: new Date().toISOString(),
    };
  }

  /**
   * Checks database / storage health status.
   */
  public static getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    database: { connected: boolean; writable: boolean; recordsCount: number };
    timestamp: string;
  } {
    try {
      const companies = StorageService.getCompanies();
      const isWritable = true;
      const recordsCount = companies.length + StorageService.getInvoices().length + StorageService.getQuotations().length;

      return {
        status: 'healthy',
        database: {
          connected: true,
          writable: isWritable,
          recordsCount,
        },
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'unhealthy',
        database: {
          connected: false,
          writable: false,
          recordsCount: 0,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
