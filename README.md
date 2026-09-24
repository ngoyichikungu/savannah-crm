# Savannah Business Operations & CRM

> **A multi-tenant, offline-capable CRM and business operations engine built for African SMEs, agribusinesses, and service providers.**

---

## ⚠️ **CRITICAL DEPLOYMENT WARNING: PERSISTENT VOLUMES**

> **AN EPHEMERAL FILESYSTEM WILL DESTROY YOUR MYSQL DATABASE ON CONTAINER REDEPLOYS.**
> If deploying to **Fly.io**, **Railway**, **Render**, **DigitalOcean App Platform**, or **AWS ECS**, you **MUST** attach a persistent volume mounted at the database directory (`/app/data` or `database/`).
> Failure to mount a persistent volume will result in total data loss whenever a container restarts or updates!

---

## Key Features & Capabilities

- **Multi-Tenant Scoping**: Instant tenant isolation per company with strict role-based access control (Owner, Sales, Finance, Marketing, Viewer).
- **100% Integer Minor Unit Financial Ledger**: Zero floating-point math; all monetary values stored as exact minor units (e.g., ngwee, cents) wrapped in immutable money value objects.
- **Quotations & Proposal Engine**: Live quote builder, automatic ZMW/USD tax calculations, 3-status pipeline tracking, and one-click conversion to invoices.
- **Invoicing & Partial Payments**: Instant PDF document rendering, multi-allocation payment receipting, and client statement ledgers.
- **Executive Reporting (8 Modules)**: Sales pipeline, tax summary, invoice aging buckets, client revenue rankings, product performance, quotation conversion, lead velocity, and payment collection reports with PDF/CSV exports.
- **First-Run Web & CLI Installer**: Web-based setup wizard at `/install` and CLI setup via `php artisan app:install`.
- **Operations & Backup Engine**: Online MySQL snapshot backups, automated retention rotations, and `/api/health` monitoring.

---

## System Requirements

- **PHP**: `8.3.x` (specifically tested and verified on `PHP 8.3.33`; minimum `>= 8.2.0`) or **Node.js**: `>= 18.0.0`
- **Extensions**: `pdo_mysql`, `mysqli`, `mbstring`, `openssl`, `fileinfo`, `curl`, `xml`, `gd` (or `imagick`), `zip`, `intl`
- **Writable Directories**: `database/`, `storage/`, `bootstrap/cache/` (Permissions `775` or `777`)

---

## Three Installation Paths

### Path 1: Docker & Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/savannah/savannah-crm.git
cd savannah-crm

# 2. Copy environment template
cp .env.example .env

# 3. Launch single-service container stack
docker-compose up -d --build

# 4. Access the web installer at http://localhost:3000/install
```

### Path 2: Plain VPS (Ubuntu / Debian / Apache2 with PHP 8.3)

#### ⚡ Quick Option: 1-Command Automated Installer (Recommended)
Simply navigate into your project directory (e.g. `/var/www/html/crm` or `/var/www/savannah-crm`) and run:

```bash
cd /var/www/html/crm   # or wherever you cloned the repo
sudo bash install.sh
```

**What this automated script does for you:**
1. Automatically detects your project directory (no manual path editing).
2. Creates `.env` and all required writable directories (`database/`, `storage/`, `bootstrap/cache/`).
3. Installs Apache2, PHP 8.3 (`libapache2-mod-php8.3` and extensions) & Node.js.
4. Compiles the production assets (`npm run build` &rarr; generates `dist/`).
5. Configures the Apache VirtualHost automatically pointing to your exact project path.
6. Sets `www-data` ownership and `775` permissions.
7. Tests configuration (`apache2ctl configtest`) and restarts Apache2.

---

#### 🛠️ Manual Step-by-Step Option (Advanced)

If you prefer to run commands manually step-by-step:

```bash
# 1. Update package lists and add PHP 8.3 repository (Ondřej Surý PPA)
sudo apt update
sudo apt install -y software-properties-common ca-certificates lsb-release apt-transport-https
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# 2. Install Apache2, PHP 8.3 (8.3.33) & required extensions
sudo apt install -y apache2 libapache2-mod-php8.3 \
  php8.3 php8.3-cli php8.3-common \
  php8.3-mysql php8.3-mbstring php8.3-curl \
  php8.3-xml php8.3-fileinfo php8.3-gd \
  php8.3-zip php8.3-intl

# 3. Verify your installed PHP version matches 8.3.33
php -v

# 4. Enable Apache PHP 8.3 and essential production modules
sudo a2enmod php8.3 rewrite headers deflate expires

# 5. Clone repository, create environment & build production assets
cd /var/www/html/crm
cp .env.example .env
npm install && npm run build

# 6. Ensure writable directories exist, then set ownership and permissions
sudo mkdir -p database storage/logs storage/framework/{cache,sessions,views} bootstrap/cache
sudo chown -R www-data:www-data /var/www/html/crm
sudo chmod -R 775 database storage bootstrap/cache

# 7. Configure Apache VirtualHost (update DocumentRoot to /var/www/html/crm/dist)
sudo cp deploy/apache2.conf /etc/apache2/sites-available/savannah.conf
sudo a2dissite 000-default.conf
sudo a2ensite savannah.conf
sudo apache2ctl configtest
sudo systemctl restart apache2
```

> **Note for PHP-FPM 8.3 (Optional / High-Concurrency setups)**:
> If your Apache server utilizes `mpm_event` rather than `mpm_prefork`, install `php8.3-fpm` and enable FastCGI:
> ```bash
> sudo apt install -y php8.3-fpm
> sudo a2dismod mpm_prefork && sudo a2enmod mpm_event proxy_fcgi setenvif
> sudo a2enconf php8.3-fpm
> sudo systemctl restart apache2 php8.3-fpm
> ```

### Path 3: Shared Hosting (cPanel / Namecheap / SiteGround)

1. Run the local packaging script: `./scripts/build-zip.sh`.
2. Upload `savannah-crm-shared-hosting.zip` to your cPanel File Manager inside `public_html`.
3. Extract files inside `public_html`.
4. Ensure `database/` permissions are set to `775` or `777`.
5. Open your browser to `http://your-domain.com/install` to run the first-run wizard.

---

## First-Run Walkthrough (`/install`)

1. Navigate to `/install` or click **Ops & Install** in the header navigation.
2. **Step 1 (Requirements Check)**: Verifies runtime engine, MySQL connection & driver, and cryptographic libraries.
3. **Step 2 (Security & Key Generation)**: Generates a 256-bit `APP_KEY` and initializes the MySQL schema.
4. **Step 3 (Owner & Company Setup)**: Configures administrator account name, email, company trading name, currency, and VAT status.
5. **Step 4 (Completion)**: Automatically locks the `/install` route and redirects to the Onboarding Dashboard.

---

## Operations, Backup & Restore

### Web Interface Backup
Go to **Ops & Install** in the top navigation bar to:
- Monitor live `/api/health` connectivity.
- Click **Create & Download Backup Archive** to generate a JSON snapshot.
- Drag & drop a backup JSON archive into the **Restore Database** modal.

### CLI Alternative Commands (SSH)

```bash
# Interactive CLI Installer
php artisan app:install

# Create timestamped backup archive
php artisan app:backup

# Restore database from specified file
php artisan app:restore /var/backups/savannah_backup_2026-09-22.json
```

---

## Cloud Deployment Guides

### Railway Deployment
- Create a new Service from GitHub repository.
- **CRITICAL**: Add a Railway Volume mounted at `/app/data`.
- Set Environment Variable `DB_CONNECTION=mysql`.

### Fly.io Deployment
- Initialize app: `fly launch`.
- Create a persistent volume: `fly volumes create savannah_data --size 1`.
- Update `fly.toml` mount point:
  ```toml
  [mounts]
    source = "savannah_data"
    destination = "/app/data"
  ```

---

## Troubleshooting & Common Errors

| Issue / Error Message | Root Cause | Immediate Fix |
| :--- | :--- | :--- |
| `chmod: cannot access 'database' / 'storage'` | Directories not created yet or running command outside project root. | Run `cd /var/www/savannah-crm` and `sudo mkdir -p database storage bootstrap/cache` before running `chmod`. |
| `MYSQL_CANNOT_CONNECT: SQLSTATE[HY000] [2002]` | Incorrect database credentials or MySQL server down. | Verify `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD` in `.env`. |
| `Uncaught Error: "line" is not a registered controller` | Chart.js controllers not globally registered. | `ChartJS.register(...registerables)` called in `ChartWrapper.tsx`. |
| `Database reset after cloud redeploy` | Ephemeral filesystem used without volume mount. | Attach persistent volume mounted at `/app/data` on Fly.io/Railway/Render. |
| `First-Run Installer Disabled` | System already installed (`savannah_installed_marker` exists). | Execute `php artisan app:install` over SSH or click **Unlock Installer (Admin Mode)**. |
