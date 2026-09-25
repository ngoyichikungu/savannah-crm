# Savannah CRM — Multi-Instance Server Deployment Guide

This guide details how to install, run, and manage **multiple isolated instances of Savannah CRM on the same server** without any database clashes, port conflicts, or cross-tenant data leaks.

---

## 1. Architectural Overview: How Multi-Instance Works

Each Savannah CRM instance on the server is fully isolated across all tiers:

| Tier | Isolation Mechanism | Result |
| :--- | :--- | :--- |
| **Filesystem** | Separate project folders (e.g. `/var/www/html/crm1`, `/var/www/html/crm2`) | No file overwrites; separate `dist/`, `storage/`, and `database/` folders |
| **Configuration** | Independent `.env` files with unique `APP_KEY` and `VITE_INSTANCE_ID` | Cryptographic separation; sessions and cookie signatures cannot cross-authenticate |
| **Database** | Independent MySQL databases (e.g. `savannah_crm1`, `savannah_crm2`) | **Zero backend database clash**; clients, invoices, and users never mix |
| **Web Server** | Dedicated Apache VirtualHost configs (`savannah-crm1.conf`, `savannah-crm2.conf`) | Independent ports or subdomains; separate access/error log files |
| **Client Storage** | Partitioned browser storage keys (`savannah_crm_db_<instance>_v1`) | Independent client cache even if tested on the same host |

---

## 2. Using the Automated Multi-Instance Setup Wizard

The root installer script `install.sh` has an interactive wizard allowing you to configure custom variables for each instance.

### Run the Wizard:
```bash
sudo bash /var/www/html/crm/install.sh
```

### The Interactive Prompts:
When prompted, select **Option 1 (Install or Add an Instance)**. You will be asked to enter:

1. **Instance Identifier / Slug**:
   - Example: `crm1`, `crm2`, `kitwe`, or `tenant_corp`
   - Used for naming configuration files, log files, and database defaults.
2. **Application Name / Title**:
   - Example: `Savannah CRM - Kitwe Branch`
3. **Installation Directory**:
   - Example: `/var/www/html/crm1` or `/var/www/html/crm2`
   - *Tip:* If the directory does not exist yet, the installer will automatically copy the project files to the new location!
4. **Web Server & Routing Strategy (Port Selection)**:
   - **Option 1 — Dedicated High Web Port (IP-Based):** e.g., Port `8080`, `8081`, `8082`. Perfect when accessing via Server IP (`http://192.168.1.50:8081`). The installer automatically configures `Listen 8081` in Apache `ports.conf` and checks for port conflicts.
   - **Option 2 — Subdomain / Domain on Port 80 (Name-Based):** e.g., `crm1.yourdomain.co.zm` and `crm2.yourdomain.co.zm` on standard Port 80. Multiple instances share Port 80 seamlessly via HTTP Host headers.
   - Run `sudo bash install.sh --port-guide` anytime for full port selection guidance.
5. **Database Configuration**:
   - Database Name: e.g., `savannah_crm1`, `savannah_crm2`
   - Database Host: `127.0.0.1` (or remote MySQL server)
   - Database Port: `3306`
   - Database User & Password: Your MySQL credentials
   - The installer automatically creates the database:
     `CREATE DATABASE IF NOT EXISTS \`savannah_crm2\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
6. **Financial Defaults**:
   - Currency: `ZMW`, `USD`, `EUR`, `ZAR`
   - VAT Rate: `16%` (1600 basis points)

---

## 3. Port Selection Narrative & Guidance

When deploying multiple instances of Savannah CRM on a single server, each instance must have an unambiguous network entry point. The following narrative explains what port options you can select, why they work, and which ports you must avoid.

### Option Comparison: Which Port Strategy Should You Choose?

| Strategy | Port(s) | URL Format | Best For | Prerequisites |
| :--- | :--- | :--- | :--- | :--- |
| **A. Subdomain Routing** | `80` (or `443` SSL) | `http://crm1.yourdomain.co.zm` | Production with public domains | DNS A-records or `/etc/hosts` pointing to VPS IP |
| **B. Dedicated High Web Ports** | `8080` to `8099` | `http://192.168.1.50:8081` | Direct IP access, staging, test labs, LAN | None (works immediately on VPS IP) |
| **C. Custom User Ports** | `3000`, `5000`, `8000`, `9000` | `http://192.168.1.50:8888` | Custom intranet setups | Firewall rule for custom port |
| **D. Default Site** | `80` | `http://192.168.1.50` | Primary/default instance | Reserved for the primary site only |

### Detailed Port Options Narrative

#### Option 1: Standard Port 80 (Name-Based VirtualHosting)
- **Port:** `80`
- **How it works:** Multiple Savannah instances all share Port 80 simultaneously. When an HTTP request reaches the server, Apache inspects the `Host:` request header (`ServerName`) and directs the visitor to the corresponding instance folder (e.g. `/var/www/html/crm1` or `/var/www/html/crm2`).
- **Advantage:** Clean, user-friendly URLs. End users never have to remember or append a port number (e.g., `:8081`).
- **Ideal use case:** Customer-facing production installations where each branch, client, or division has its own subdomain (e.g., `hq.company.zm`, `kitwe.company.zm`, `ndola.company.zm`).

#### Option 2: Dedicated High Web Ports (Ports 8080 – 8099)
- **Recommended Ports:**
  - `8080`: Primary alternate HTTP port (often assigned to Instance 1 or staging)
  - `8081`: Recommended for Instance 2
  - `8082`: Recommended for Instance 3
  - `8083`: Recommended for Instance 4
  - `8084` – `8099`: Additional isolated instances
  - Other common alternate web ports: `8888`, `8000`, `3000`, `5000`, `9000`
- **How it works:** Each instance binds to its own dedicated TCP socket. The installer automatically appends `Listen <PORT>` to `/etc/apache2/ports.conf` so Apache listens on that port.
- **Advantage:** Requires zero domain configuration or DNS records. You can immediately access each instance using the server's public or private IP address (`http://192.168.1.50:8081`).
- **Firewall rule:** When selecting a custom port, make sure to allow it through your server's firewall:
  ```bash
  sudo ufw allow 8081/tcp
  ```

---

### Critical Reserved Ports to NEVER Select (Collision Hazards)

Do **NOT** assign any of the following ports to a web instance:

| Port | Reserved Service | Why You Must Never Select It |
| :--- | :--- | :--- |
| **22** | **SSH (Secure Shell)** | Remote terminal management. Binding Apache to 22 can lock administrators out of the server! |
| **3306** | **MySQL / MariaDB** | **The CRM Database engine is running here!** Selecting 3306 causes an immediate port crash (`Address already in use`) and destroys database connectivity. |
| **53** | **DNS Resolver** | System DNS resolution daemon (`systemd-resolved` / `bind9`). |
| **25, 465, 587** | **SMTP / Mail** | Email transfer agents (`postfix`, `exim`). |
| **6379** | **Redis** | In-memory cache store. |
| **443** | **Standard HTTPS / SSL** | Reserved for TLS/SSL certificates (e.g. Certbot / Let's Encrypt). Configure the VirtualHost on Port 80 and let Certbot bind 443. |
| **< 1024** | **Privileged OS Ports** | Privileged ports require root privileges and conflict with standard OS daemons. |
| **> 49151** | **Ephemeral Ports** | Dynamically allocated by the Linux kernel for temporary outbound TCP connections. |

---

### Automated Conflict Detection in `install.sh`

The `install.sh` installer includes real-time collision detection:
1. **Reserved Port Guard:** Immediately blocks dangerous ports (like 22 or 3306) with a descriptive error message explaining why the port is forbidden.
2. **In-Use Port Probe:** Queries `ss -tuln`, `netstat`, or `lsof` to detect if another process is already listening on the selected port, warning you before Apache tries to bind.
3. **Port Guide Command:** You can run the narrative guide directly from the terminal at any time:
   ```bash
   sudo bash install.sh --port-guide
   ```

---

## 4. Quick Non-Interactive Setup (CLI Automation)

You can pass command-line arguments to deploy instances in shell scripts or CI/CD pipelines without interactive prompts:

### Example: Deploying Instance #1 (Port 80 / Default)
```bash
sudo bash install.sh \
  --instance-id=crm1 \
  --dir=/var/www/html/crm \
  --port=80 \
  --domain=localhost \
  --db-name=savannah_crm1 \
  --db-user=root \
  --db-pass=your_password \
  --title="Savannah CRM - HQ" \
  -y
```

### Example: Deploying Instance #2 on Port 8081
```bash
sudo bash install.sh \
  --instance-id=crm2 \
  --dir=/var/www/html/crm2 \
  --port=8081 \
  --db-name=savannah_crm2 \
  --db-user=root \
  --db-pass=your_password \
  --title="Savannah CRM - Branch Kitwe" \
  -y
```

### Example: Deploying Instance #3 on Subdomain `client3.company.zm`
```bash
sudo bash install.sh \
  --instance-id=client3 \
  --dir=/var/www/html/client3 \
  --port=80 \
  --domain=client3.company.zm \
  --db-name=savannah_client3 \
  --db-user=root \
  --db-pass=your_password \
  --title="Savannah CRM - Client 3" \
  -y
```

---

## 5. Managing Existing Instances

### List all active instances on the server:
```bash
sudo bash install.sh --list
```
**Sample Output:**
```
===================================================================
  Configured Savannah CRM Instances on this Server
===================================================================

Instance #1: savannah-crm1.conf
  • Status:        Active / Enabled
  • Port:          80
  • Domain/Host:   localhost
  • DocumentRoot:  /var/www/html/crm/dist
  • Database:      savannah_crm1
  • Access URL:    http://192.168.1.100:80

Instance #2: savannah-crm2.conf
  • Status:        Active / Enabled
  • Port:          8081
  • Domain/Host:   127.0.0.1
  • DocumentRoot:  /var/www/html/crm2/dist
  • Database:      savannah_crm2
  • Access URL:    http://192.168.1.100:8081
===================================================================
```

### Temporarily disable an instance:
```bash
sudo bash install.sh --remove=crm2
```

---

## 6. Apache VirtualHost Details

Each instance gets its own configuration file in `/etc/apache2/sites-available/savannah-<INSTANCE_ID>.conf`.

To inspect or manually reload Apache:
```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

To view individual instance logs:
```bash
tail -f /var/log/apache2/savannah_crm1_error.log
tail -f /var/log/apache2/savannah_crm2_error.log
```
