#!/usr/bin/env bash
# ==============================================================================
# Savannah Business Operations & CRM — 1-Command Automated VPS Installer
# ==============================================================================
# Automatically installs Apache2, PHP 8.3 (8.3.33+), Node.js, compiles assets,
# creates writable directories, configures VirtualHost, and starts the service.
# ==============================================================================

set -e

# ANSI Color codes for clean output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================================${NC}"
echo -e "${GREEN}  Savannah CRM & Business Operations — Easy Setup Wizard${NC}"
echo -e "${BLUE}===================================================================${NC}"

# 1. Require root / sudo privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run this script with sudo:${NC}"
  echo -e "   sudo bash $0"
  exit 1
fi

# 2. Determine actual project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/package.json" ]; then
  PROJECT_DIR="$SCRIPT_DIR"
elif [ -f "$SCRIPT_DIR/../package.json" ]; then
  PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  PROJECT_DIR="$(pwd)"
fi

echo -e "${BLUE}📁 Project directory detected at:${NC} ${GREEN}$PROJECT_DIR${NC}"
cd "$PROJECT_DIR"

# 3. Ensure essential directories exist
echo -e "\n${YELLOW}▶ [1/6] Creating database and storage directories...${NC}"
mkdir -p "$PROJECT_DIR/database"
mkdir -p "$PROJECT_DIR/storage/logs"
mkdir -p "$PROJECT_DIR/storage/framework/cache"
mkdir -p "$PROJECT_DIR/storage/framework/sessions"
mkdir -p "$PROJECT_DIR/storage/framework/views"
mkdir -p "$PROJECT_DIR/bootstrap/cache"

# Ensure .env file exists
if [ ! -f "$PROJECT_DIR/.env" ] && [ -f "$PROJECT_DIR/.env.example" ]; then
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  echo "   Created .env from .env.example"
fi

# 4. Update apt & install Apache2 and PHP 8.3
echo -e "\n${YELLOW}▶ [2/6] Setting up Apache2 & PHP 8.3 (including PHP 8.3.33)...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -qq
apt-get install -y -qq software-properties-common ca-certificates lsb-release apt-transport-https curl

# Add Ondřej Surý PHP repository on Ubuntu if needed
if [ -f /etc/lsb-release ] || grep -qi ubuntu /etc/os-release 2>/dev/null; then
  if ! grep -q "ondrej/php" /etc/apt/sources.list /etc/apt/sources.list.d/* 2>/dev/null; then
    echo "   Adding PHP repository (ppa:ondrej/php)..."
    add-apt-repository ppa:ondrej/php -y >/dev/null 2>&1 || true
    apt-get update -y -qq
  fi
fi

# Install Apache2 and PHP 8.3 packages
apt-get install -y -qq \
  apache2 \
  libapache2-mod-php8.3 \
  php8.3 \
  php8.3-cli \
  php8.3-common \
  php8.3-mysql \
  php8.3-mbstring \
  php8.3-curl \
  php8.3-xml \
  php8.3-fileinfo \
  php8.3-gd \
  php8.3-zip \
  php8.3-intl || {
    echo -e "${YELLOW}   Note: standard PHP installation attempted. Continuing...${NC}"
  }

# 5. Check Node.js and compile production assets
echo -e "\n${YELLOW}▶ [3/6] Checking Node.js & building web application...${NC}"
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
  echo "   Installing Node.js & npm..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1 || true
  apt-get install -y -qq nodejs || apt-get install -y -qq npm
fi

# Build assets
echo "   Running npm install & npm run build (creates the dist/ folder)..."
npm install --silent >/dev/null 2>&1 || npm install
npm run build

if [ ! -d "$PROJECT_DIR/dist" ]; then
  echo -e "${RED}❌ Build failed to generate dist/ directory. Check npm logs.${NC}"
  exit 1
fi
echo -e "   ${GREEN}✓ Build succeeded: $PROJECT_DIR/dist generated.${NC}"

# 6. Configure Apache VirtualHost
echo -e "\n${YELLOW}▶ [4/6] Configuring Apache VirtualHost...${NC}"

cat > /etc/apache2/sites-available/savannah.conf <<EOF
# Apache2 VirtualHost for Savannah CRM
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot $PROJECT_DIR/dist

    <Directory $PROJECT_DIR/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # Single Page Application routing fallback
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteBase /
            RewriteRule ^index\.html$ - [L]
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule . /index.html [L]
        </IfModule>
    </Directory>

    <FilesMatch "^\.|\.(sql|mysql|sqlite|env|lock)$">
        Require all denied
    </FilesMatch>

    <IfModule mod_headers.c>
        Header always set X-Frame-Options "SAMEORIGIN"
        Header always set X-Content-Type-Options "nosniff"
    </IfModule>

    ErrorLog \${APACHE_LOG_DIR}/savannah_error.log
    CustomLog \${APACHE_LOG_DIR}/savannah_access.log combined
</VirtualHost>
EOF

# Suppress ServerName FQDN warning
echo "ServerName 127.0.0.1" > /etc/apache2/conf-available/fqdn.conf 2>/dev/null || true
a2enconf fqdn >/dev/null 2>&1 || true

# Enable essential modules & activate site
a2enmod rewrite headers deflate expires php8.3 >/dev/null 2>&1 || a2enmod rewrite headers deflate expires >/dev/null 2>&1 || true
a2dissite 000-default.conf >/dev/null 2>&1 || true
a2ensite savannah.conf >/dev/null 2>&1

# 7. Set file permissions & ownership
echo -e "\n${YELLOW}▶ [5/6] Setting directory ownership & file permissions...${NC}"
chown -R www-data:www-data "$PROJECT_DIR"
chmod -R 775 "$PROJECT_DIR/database" "$PROJECT_DIR/storage" "$PROJECT_DIR/bootstrap/cache" 2>/dev/null || true
chmod -R 755 "$PROJECT_DIR/dist"

# 8. Test Apache configuration & restart
echo -e "\n${YELLOW}▶ [6/6] Verifying Apache syntax & restarting service...${NC}"
apache2ctl configtest
systemctl restart apache2

# Detect server IP
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo -e "\n${BLUE}===================================================================${NC}"
echo -e "${GREEN}🎉 Installation completed successfully!${NC}"
echo -e "${BLUE}===================================================================${NC}"
echo -e "You can now access Savannah CRM in your web browser at:"
echo -e "  👉 ${GREEN}http://localhost${NC}  or  👉 ${GREEN}http://$SERVER_IP${NC}"
echo -e "First-run setup wizard:"
echo -e "  👉 ${GREEN}http://localhost/install${NC}  or  👉 ${GREEN}http://$SERVER_IP/install${NC}"
echo -e "\nDefault demo admin credentials (when using sample data):"
echo -e "  • Username: ${YELLOW}admin${NC}"
echo -e "  • Password: ${YELLOW}password123${NC}"
echo -e "${BLUE}===================================================================${NC}\n"
