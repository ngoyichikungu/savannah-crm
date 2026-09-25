#!/usr/bin/env bash
# ==============================================================================
# Savannah Business Operations & CRM — Multi-Instance VPS Installer & Manager
# ==============================================================================
# Supports setting up multiple independent instances on the same server:
#   - Unique instance directories (e.g. /var/www/html/crm, /var/www/html/crm2)
#   - Unique databases (e.g. savannah_crm1, savannah_crm2) -> Zero clashes
#   - Independent Apache VirtualHosts (via dedicated ports, subdomains, or domains)
#   - Unique cryptographic APP_KEYs and isolated environment (.env) files
#   - Interactive variable entry wizard or unattended CLI automation flags
# ==============================================================================

set -e

# ANSI Color codes for clean output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

REGISTRY_DIR="/etc/savannah"
REGISTRY_FILE="$REGISTRY_DIR/instances.json"

# Print banner
print_banner() {
  echo -e "${BLUE}===================================================================${NC}"
  echo -e "${GREEN}  Savannah CRM & Business Operations — Multi-Instance Setup Wizard${NC}"
  echo -e "${BLUE}===================================================================${NC}"
}

# 1. Require root / sudo privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run this installer with root or sudo:${NC}"
  echo -e "   sudo bash $0 $@"
  exit 1
fi

# Detect directory from which this script is executed
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/package.json" ]; then
  BASE_SOURCE_DIR="$SCRIPT_DIR"
elif [ -f "$SCRIPT_DIR/../package.json" ]; then
  BASE_SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  BASE_SOURCE_DIR="$(pwd)"
fi

# Detect server primary IP
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

# Initialize registry directory
mkdir -p "$REGISTRY_DIR"
if [ ! -f "$REGISTRY_FILE" ]; then
  echo "[]" > "$REGISTRY_FILE"
fi

# ==============================================================================
# Helper Functions: Registry & Inspection
# ==============================================================================
list_instances() {
  echo -e "\n${BLUE}===================================================================${NC}"
  echo -e "${CYAN}  Configured Savannah CRM Instances on this Server${NC}"
  echo -e "${BLUE}===================================================================${NC}"

  # Scan /etc/apache2/sites-available/ for savannah configs
  local count=0
  if [ -d "/etc/apache2/sites-available" ]; then
    for conf in /etc/apache2/sites-available/savannah-*.conf /etc/apache2/sites-available/000-savannah.conf; do
      [ -f "$conf" ] || continue
      count=$((count + 1))
      local conf_name=$(basename "$conf")
      local is_enabled="Disabled"
      [ -f "/etc/apache2/sites-enabled/$conf_name" ] && is_enabled="${GREEN}Active / Enabled${NC}"

      local doc_root=$(grep -i "DocumentRoot" "$conf" | head -n1 | awk '{print $2}')
      local s_name=$(grep -i "ServerName" "$conf" | head -n1 | awk '{print $2}')
      local vh_port=$(grep -i "<VirtualHost" "$conf" | head -n1 | sed -e 's/.*:\([0-9]*\)>/\1/' -e 's/.*>\(.*\)/\1/')
      [ -z "$vh_port" ] || [ "$vh_port" = "<VirtualHost" ] && vh_port="80"

      local inst_dir=$(dirname "$doc_root" 2>/dev/null || echo "")
      local db_name="Unknown"
      if [ -f "$inst_dir/.env" ]; then
        db_name=$(grep -E "^DB_DATABASE=" "$inst_dir/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
      fi

      echo -e "\n${BOLD}Instance #${count}: ${YELLOW}$conf_name${NC}"
      echo -e "  • Status:        $is_enabled"
      echo -e "  • Port:          ${CYAN}$vh_port${NC}"
      echo -e "  • Domain/Host:   ${CYAN}${s_name:-localhost}${NC}"
      echo -e "  • DocumentRoot:  ${doc_root:-N/A}"
      echo -e "  • Database:      ${GREEN}${db_name:-N/A}${NC}"
      echo -e "  • Access URL:    http://${s_name:-$SERVER_IP}:${vh_port}"
    done
  fi

  if [ "$count" -eq 0 ]; then
    echo -e "${YELLOW}  No active Savannah instances detected yet in Apache2.${NC}"
    echo -e "  Run 'sudo bash $0' to set up your first instance."
  fi
  echo -e "${BLUE}===================================================================${NC}\n"
}

# ==============================================================================
# Helper Function: Port Selection Narrative & Guidance
# ==============================================================================
print_port_guide() {
  echo -e "\n${BLUE}===================================================================${NC}"
  echo -e "${BOLD}${CYAN}  SAVANNAH CRM — MULTI-INSTANCE PORT SELECTION NARRATIVE${NC}"
  echo -e "${BLUE}===================================================================${NC}"
  echo -e "${BOLD}Understanding Port Options on a Multi-Instance Server:${NC}"
  echo -e "On Linux, each web application instance listens on an IP address and a TCP Port (1 - 65535)."
  echo -e "To run multiple instances simultaneously on the same host without collisions, you have"
  echo -e "two primary architecture options:"
  echo ""
  echo -e "  ${BOLD}${GREEN}OPTION A: Standard Port 80 with Subdomain / Domain Routing (Name-Based)${NC}"
  echo -e "  ───────────────────────────────────────────────────────────────────"
  echo -e "  • ${BOLD}Port to select:${NC}   ${GREEN}80${NC} (or 443 with SSL/Certbot)"
  echo -e "  • ${BOLD}How it works:${NC}   Multiple instances all share Port 80. Apache inspects the"
  echo -e "                      incoming HTTP 'Host' header to route each visitor to the right folder."
  echo -e "  • ${BOLD}Examples:${NC}       • http://crm1.yourdomain.co.zm  →  Instance 1 (/var/www/html/crm1)"
  echo -e "                      • http://crm2.yourdomain.co.zm  →  Instance 2 (/var/www/html/crm2)"
  echo -e "                      • http://client3.domain.com     →  Instance 3 (/var/www/html/client3)"
  echo -e "  • ${BOLD}Key Advantage:${NC}  Clean URLs! Users never need to remember or type a port number."
  echo -e "  • ${BOLD}Requirement:${NC}    Requires DNS A-records or /etc/hosts pointing each domain to this server."
  echo ""
  echo -e "  ${BOLD}${YELLOW}OPTION B: Dedicated High Web Ports (Port-Based Routing on Server IP)${NC}"
  echo -e "  ───────────────────────────────────────────────────────────────────"
  echo -e "  • ${BOLD}Ports to select:${NC}  ${YELLOW}8080, 8081, 8082, 8083, 8084 ... 8099${NC}"
  echo -e "                      Alternative application ports: ${YELLOW}8888, 8000, 3000, 5000, 9000${NC}"
  echo -e "  • ${BOLD}How it works:${NC}   Each instance binds to its own dedicated TCP port. The installer"
  echo -e "                      automatically appends 'Listen <port>' to /etc/apache2/ports.conf."
  echo -e "  • ${BOLD}Examples:${NC}       • http://${SERVER_IP}:8080  →  Instance 1 (HQ / Default)"
  echo -e "                      • http://${SERVER_IP}:8081  →  Instance 2 (Branch Kitwe)"
  echo -e "                      • http://${SERVER_IP}:8082  →  Instance 3 (Branch Ndola)"
  echo -e "  • ${BOLD}Key Advantage:${NC}  Works immediately with direct IP access! No domain names or DNS needed."
  echo -e "                      Ideal for internal LANs, staging servers, and quick deployments."
  echo -e "  • ${BOLD}Firewall:${NC}       Ensure your VPS firewall allows the port: ${CYAN}sudo ufw allow <port>/tcp${NC}"
  echo ""
  echo -e "  ${BOLD}${RED}CRITICAL: RESERVED PORTS TO NEVER SELECT (COLLISION HAZARDS)${NC}"
  echo -e "  ───────────────────────────────────────────────────────────────────"
  echo -e "  Do ${BOLD}NOT${NC} assign any of the following ports to a web instance:"
  echo -e "    ❌ ${RED}Port 22${NC}    : ${BOLD}SSH Remote Management${NC} — Selecting this can break administrative access!"
  echo -e "    ❌ ${RED}Port 3306${NC}  : ${BOLD}MySQL / MariaDB Server${NC} — The CRM database is running here!"
  echo -e "                         Assigning Apache to 3306 causes an immediate port crash & DB failure."
  echo -e "    ❌ ${RED}Port 53${NC}    : ${BOLD}DNS Resolver${NC} (systemd-resolved, bind9)"
  echo -e "    ❌ ${RED}Port 25/587${NC} : ${BOLD}SMTP Mail Services${NC}"
  echo -e "    ❌ ${RED}Port 6379${NC}  : ${BOLD}Redis Cache${NC}"
  echo -e "    ❌ ${RED}Port 443${NC}   : ${BOLD}Standard HTTPS / SSL${NC} (reserved for Certbot SSL termination)"
  echo -e "    ❌ ${RED}Ports < 1024${NC} : Privileged OS system daemons (except Port 80)"
  echo -e "    ❌ ${RED}Ports > 49151${NC}: Ephemeral dynamic ports used by Linux for outbound connections"
  echo -e "${BLUE}===================================================================${NC}\n"
}

is_port_reserved() {
  local p="$1"
  case "$p" in
    20|21) echo "FTP (File Transfer Protocol)"; return 0 ;;
    22) echo "SSH (Secure Shell Remote Management - CRITICAL)"; return 0 ;;
    25|465|587) echo "SMTP (Mail Server)"; return 0 ;;
    53) echo "DNS Resolver (systemd-resolved)"; return 0 ;;
    3306) echo "MySQL / MariaDB Database Server (CRITICAL - Database Clash!)"; return 0 ;;
    5432) echo "PostgreSQL Database Server"; return 0 ;;
    6379) echo "Redis Cache"; return 0 ;;
    11211) echo "Memcached Server"; return 0 ;;
    *)
      if [ "$p" -lt 1024 ] && [ "$p" -ne 80 ] && [ "$p" -ne 443 ]; then
        echo "Privileged System Port (< 1024)"; return 0
      fi
      if [ "$p" -gt 49151 ]; then
        echo "Ephemeral Dynamic Port (> 49151)"; return 0
      fi
      return 1
      ;;
  esac
}

is_port_in_use() {
  local p="$1"
  if command -v ss &>/dev/null; then
    ss -tuln 2>/dev/null | grep -q -E "[:.]$p\b" && return 0
  elif command -v netstat &>/dev/null; then
    netstat -tuln 2>/dev/null | grep -q -E "[:.]$p\b" && return 0
  elif command -v lsof &>/dev/null; then
    lsof -i ":$p" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  fi
  return 1
}

remove_instance() {
  local target_id="$1"
  if [ -z "$target_id" ]; then
    echo -e "${RED}❌ Please specify the instance identifier to remove:${NC}"
    echo -e "   sudo bash $0 --remove=<instance_id>"
    exit 1
  fi

  local conf_file="/etc/apache2/sites-available/savannah-${target_id}.conf"
  if [ ! -f "$conf_file" ] && [ "$target_id" = "default" ] && [ -f "/etc/apache2/sites-available/000-savannah.conf" ]; then
    conf_file="/etc/apache2/sites-available/000-savannah.conf"
  fi

  if [ ! -f "$conf_file" ]; then
    echo -e "${RED}❌ VirtualHost configuration for instance '$target_id' not found at $conf_file.${NC}"
    exit 1
  fi

  echo -e "${YELLOW}Disabling Apache site $(basename "$conf_file")...${NC}"
  a2dissite "$(basename "$conf_file")" >/dev/null 2>&1 || true
  apache2ctl configtest >/dev/null 2>&1 || true
  systemctl reload apache2 >/dev/null 2>&1 || true

  echo -e "${GREEN}✓ Instance '$target_id' site has been disabled in Apache.${NC}"
  echo -e "  VirtualHost configuration file kept at: $conf_file"
  echo -e "  (To completely delete the config: rm $conf_file && sudo systemctl reload apache2)"
}

# ==============================================================================
# Parse Command-Line Flags (for non-interactive automation or shortcuts)
# ==============================================================================
NON_INTERACTIVE=false
MODE=""
ARG_INSTANCE_ID=""
ARG_TITLE=""
ARG_DIR=""
ARG_PORT=""
ARG_DOMAIN=""
ARG_DB_NAME=""
ARG_DB_USER=""
ARG_DB_PASS=""
ARG_DB_HOST=""
ARG_DB_PORT=""
ARG_CURRENCY=""
ARG_VAT=""

for arg in "$@"; do
  case $arg in
    --help|-h)
      print_banner
      echo "Usage: sudo bash install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --port-guide                Display narrative explaining what port options you can select"
      echo "  --list                      List all Savannah CRM instances on this server"
      echo "  --remove=<id>               Disable an instance VirtualHost"
      echo "  --instance-id=<id>          Instance identifier slug (e.g. crm1, crm2, kitwe)"
      echo "  --title=<name>              Display title for instance in .env"
      echo "  --dir=<path>                Destination directory (e.g. /var/www/html/crm2)"
      echo "  --port=<port>               VirtualHost HTTP port (e.g. 80, 8080, 8081)"
      echo "  --domain=<domain>           VirtualHost ServerName (e.g. crm2.yourdomain.com)"
      echo "  --db-name=<name>            Dedicated MySQL database name (e.g. savannah_crm2)"
      echo "  --db-user=<user>            MySQL user (default: root)"
      echo "  --db-pass=<pass>            MySQL password"
      echo "  --db-host=<host>            MySQL host (default: 127.0.0.1)"
      echo "  --db-port=<port>            MySQL port (default: 3306)"
      echo "  --currency=<code>           Default currency code (default: ZMW)"
      echo "  --vat=<bp>                  Default VAT basis points (default: 1600)"
      echo "  -y|--non-interactive        Execute without interactive prompts"
      exit 0
      ;;
    --port-guide)
      print_banner
      print_port_guide
      exit 0
      ;;
    --list)
      list_instances
      exit 0
      ;;
    --remove=*)
      remove_instance "${arg#*=}"
      exit 0
      ;;
    --instance-id=*)
      ARG_INSTANCE_ID="${arg#*=}"
      ;;
    --title=*)
      ARG_TITLE="${arg#*=}"
      ;;
    --dir=*)
      ARG_DIR="${arg#*=}"
      ;;
    --port=*)
      ARG_PORT="${arg#*=}"
      ;;
    --domain=*)
      ARG_DOMAIN="${arg#*=}"
      ;;
    --db-name=*)
      ARG_DB_NAME="${arg#*=}"
      ;;
    --db-user=*)
      ARG_DB_USER="${arg#*=}"
      ;;
    --db-pass=*)
      ARG_DB_PASS="${arg#*=}"
      ;;
    --db-host=*)
      ARG_DB_HOST="${arg#*=}"
      ;;
    --db-port=*)
      ARG_DB_PORT="${arg#*=}"
      ;;
    --currency=*)
      ARG_CURRENCY="${arg#*=}"
      ;;
    --vat=*)
      ARG_VAT="${arg#*=}"
      ;;
    -y|--non-interactive)
      NON_INTERACTIVE=true
      ;;
  esac
done

print_banner

# ==============================================================================
# Interactive Setup Menu & Variable Collection
# ==============================================================================
if [ "$NON_INTERACTIVE" = false ] && [ -z "$ARG_INSTANCE_ID" ]; then
  echo -e "\n${BOLD}Select an operation:${NC}"
  echo -e "  ${GREEN}1)${NC} ${BOLD}Install or Add an Instance${NC} (configure custom variables, port, DB & directory)"
  echo -e "  ${GREEN}2)${NC} ${BOLD}Express Quick Setup${NC} (single instance on port 80 / localhost)"
  echo -e "  ${GREEN}3)${NC} ${BOLD}List All Instances${NC} (inspect existing instances on this server)"
  echo -e "  ${GREEN}4)${NC} ${BOLD}Port Selection Guide & Narrative${NC} (explain what ports can be selected)"
  echo -e "  ${GREEN}5)${NC} ${BOLD}Disable an Instance${NC}"
  echo -e "  ${GREEN}6)${NC} Exit"

  read -r -p "Enter selection [1-6] (default: 1): " MODE_INPUT
  MODE_INPUT=${MODE_INPUT:-1}

  case $MODE_INPUT in
    2)
      MODE="express"
      ;;
    3)
      list_instances
      exit 0
      ;;
    4)
      print_port_guide
      echo -e "${BOLD}Would you like to proceed with installing an instance now? [Y/n]: ${NC}"
      read -r -p "" CONT_PROMPT
      if [[ "$CONT_PROMPT" =~ ^[Nn] ]]; then
        exit 0
      fi
      MODE="custom"
      ;;
    5)
      echo ""
      read -r -p "Enter Instance ID to disable: " RM_ID
      remove_instance "$RM_ID"
      exit 0
      ;;
    6)
      echo "Setup cancelled."
      exit 0
      ;;
    *)
      MODE="custom"
      ;;
  esac
fi

# Determine default suggested instance ID
SUGGESTED_ID="crm1"
if [ -f "/etc/apache2/sites-available/savannah-crm1.conf" ] || [ -f "/etc/apache2/sites-available/000-savannah.conf" ]; then
  # Find next available index: crm2, crm3...
  idx=2
  while [ -f "/etc/apache2/sites-available/savannah-crm${idx}.conf" ]; do
    idx=$((idx + 1))
  done
  SUGGESTED_ID="crm${idx}"
fi

# Default suggested directory
if [ "$BASE_SOURCE_DIR" != "/var/www/html" ] && [ "$BASE_SOURCE_DIR" != "/var/www" ]; then
  SUGGESTED_DIR="$BASE_SOURCE_DIR"
else
  SUGGESTED_DIR="/var/www/html/$SUGGESTED_ID"
fi

# Collect variables
if [ "$MODE" = "express" ]; then
  INSTANCE_ID="${ARG_INSTANCE_ID:-crm1}"
  INSTANCE_TITLE="${ARG_TITLE:-Savannah Business Operations & CRM}"
  TARGET_DIR="${ARG_DIR:-$BASE_SOURCE_DIR}"
  ROUTING_TYPE="port"
  HTTP_PORT="${ARG_PORT:-80}"
  SERVER_DOMAIN="${ARG_DOMAIN:-localhost}"
  DB_HOST="${ARG_DB_HOST:-127.0.0.1}"
  DB_PORT="${ARG_DB_PORT:-3306}"
  DB_NAME="${ARG_DB_NAME:-savannah_${INSTANCE_ID}}"
  DB_USER="${ARG_DB_USER:-root}"
  DB_PASS="${ARG_DB_PASS:-}"
  DEFAULT_CURRENCY="${ARG_CURRENCY:-ZMW}"
  DEFAULT_VAT_BP="${ARG_VAT:-1600}"
else
  # Custom / Guided multi-instance entry
  echo -e "\n${CYAN}───────────────────────────────────────────────────────────────────${NC}"
  echo -e "${BOLD}Instance Identification & Variables${NC}"
  echo -e "${CYAN}───────────────────────────────────────────────────────────────────${NC}"

  # 1. Instance ID
  if [ -n "$ARG_INSTANCE_ID" ]; then
    INSTANCE_ID="$ARG_INSTANCE_ID"
  else
    read -r -p "▶ Instance Identifier / Slug [default: $SUGGESTED_ID]: " INSTANCE_ID
    INSTANCE_ID="${INSTANCE_ID:-$SUGGESTED_ID}"
  fi
  # Sanitize to alphanumeric, dashes, underscores
  INSTANCE_ID=$(echo "$INSTANCE_ID" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9_-]//g')
  if [ -z "$INSTANCE_ID" ]; then INSTANCE_ID="crm1"; fi
  echo -e "   Instance ID: ${GREEN}$INSTANCE_ID${NC}"

  # 2. Instance Title
  if [ -n "$ARG_TITLE" ]; then
    INSTANCE_TITLE="$ARG_TITLE"
  else
    DEFAULT_TITLE="Savannah CRM ($INSTANCE_ID)"
    read -r -p "▶ Application Name / Title [default: $DEFAULT_TITLE]: " INSTANCE_TITLE
    INSTANCE_TITLE="${INSTANCE_TITLE:-$DEFAULT_TITLE}"
  fi

  # 3. Project Directory
  if [ -n "$ARG_DIR" ]; then
    TARGET_DIR="$ARG_DIR"
  else
    # If base directory is already assigned to a different instance, suggest a new folder
    if [ -f "$BASE_SOURCE_DIR/.env" ] && grep -q "VITE_INSTANCE_ID=" "$BASE_SOURCE_DIR/.env" 2>/dev/null; then
      EXISTING_INST=$(grep -E "^VITE_INSTANCE_ID=" "$BASE_SOURCE_DIR/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
      if [ -n "$EXISTING_INST" ] && [ "$EXISTING_INST" != "$INSTANCE_ID" ]; then
        SUGGESTED_DIR="/var/www/html/$INSTANCE_ID"
      fi
    fi
    read -r -p "▶ Installation Directory [default: $SUGGESTED_DIR]: " TARGET_DIR
    TARGET_DIR="${TARGET_DIR:-$SUGGESTED_DIR}"
  fi
  echo -e "   Target Directory: ${GREEN}$TARGET_DIR${NC}"

  # 4. Networking & Apache Routing (Port Selection Narrative)
  echo -e "\n${CYAN}───────────────────────────────────────────────────────────────────${NC}"
  echo -e "${BOLD}Web Server & Routing Strategy (Port Selection)${NC}"
  echo -e "${CYAN}───────────────────────────────────────────────────────────────────${NC}"
  echo -e "Each instance on this server must be reachable via a distinct network entry."
  echo -e "You can select how Apache routes incoming requests to this instance:"
  echo ""
  echo -e "  ${GREEN}1) Dedicated High Web Port on Server IP${NC} [Recommended for IP/LAN access]"
  echo -e "     • Access via: ${CYAN}http://${SERVER_IP}:<PORT>${NC} (e.g. http://${SERVER_IP}:8081)"
  echo -e "     • Best for: Testing, multi-tenant IP access, or servers without DNS subdomains"
  echo -e "     • Safe ports: ${BOLD}8080, 8081, 8082, 8083, 8084 ... 8099${NC}, or 8888, 3000, 5000, 8000"
  echo -e "     • The installer registers 'Listen <PORT>' in /etc/apache2/ports.conf automatically"
  echo ""
  echo -e "  ${GREEN}2) Custom Subdomain / Domain on Standard Port 80${NC} [Recommended for Production]"
  echo -e "     • Access via: ${CYAN}http://${INSTANCE_ID}.yourdomain.co.zm${NC}"
  echo -e "     • Best for: Production environments with DNS records"
  echo -e "     • Benefit: Multiple instances share Port 80; no port number needed in the browser URL"
  echo ""
  echo -e "  ${GREEN}3) Standard Port 80 as Default Site${NC}"
  echo -e "     • Access via: ${CYAN}http://${SERVER_IP}${NC}"
  echo -e "     • Sets this instance as the fallback default site for direct IP requests on Port 80"
  echo ""
  echo -e "  ${GREEN}4) View Full Port Selection Guidance & Collision Hazards${NC}"
  echo ""

  if [ -n "$ARG_PORT" ] || [ -n "$ARG_DOMAIN" ]; then
    HTTP_PORT="${ARG_PORT:-80}"
    SERVER_DOMAIN="${ARG_DOMAIN:-_}"
    # Validate CLI-supplied port
    if RESERVED_REASON=$(is_port_reserved "$HTTP_PORT"); then
      echo -e "${RED}⚠️ WARNING: CLI-specified port $HTTP_PORT is reserved for: $RESERVED_REASON.${NC}"
      echo -e "${RED}   This may cause service collisions. Consider choosing a safe port (8080-8099).${NC}"
    fi
  else
    while true; do
      read -r -p "Select routing strategy [1-4] (default: 1): " ROUTE_CHOICE
      ROUTE_CHOICE="${ROUTE_CHOICE:-1}"

      if [ "$ROUTE_CHOICE" = "4" ]; then
        print_port_guide
        continue
      fi
      break
    done

    case $ROUTE_CHOICE in
      2)
        HTTP_PORT="80"
        read -r -p "▶ Enter Domain or Subdomain (e.g., ${INSTANCE_ID}.savannah.co.zm): " SERVER_DOMAIN
        SERVER_DOMAIN="${SERVER_DOMAIN:-${INSTANCE_ID}.local}"
        ;;
      3)
        HTTP_PORT="80"
        SERVER_DOMAIN="localhost $SERVER_IP"
        ;;
      *)
        # Determine next free recommended port in the 8080-8099 range
        DEFAULT_PORT="8080"
        if [ "$INSTANCE_ID" = "crm1" ]; then DEFAULT_PORT="8080";
        elif [ "$INSTANCE_ID" = "crm2" ]; then DEFAULT_PORT="8081";
        elif [ "$INSTANCE_ID" = "crm3" ]; then DEFAULT_PORT="8082";
        elif [ "$INSTANCE_ID" = "crm4" ]; then DEFAULT_PORT="8083";
        else
          # Auto-scan next open port starting from 8080
          scan_port=8080
          while [ $scan_port -le 8099 ]; do
            if ! grep -q -E "^Listen\s+$scan_port" /etc/apache2/ports.conf 2>/dev/null && ! is_port_in_use "$scan_port"; then
              DEFAULT_PORT="$scan_port"
              break
            fi
            scan_port=$((scan_port + 1))
          done
        fi

        echo -e "\n${BOLD}Port Selection Guidelines:${NC}"
        echo -e "  • Recommended range: ${GREEN}8080, 8081, 8082, 8083, 8084 ... 8099${NC}"
        echo -e "  • Do NOT use: ${RED}22 (SSH), 3306 (MySQL), 53 (DNS), 25/587 (SMTP), 6379 (Redis)${NC}"

        while true; do
          read -r -p "▶ Enter Dedicated Port for this instance [default: $DEFAULT_PORT]: " USER_PORT_INPUT
          USER_PORT_INPUT="${USER_PORT_INPUT:-$DEFAULT_PORT}"

          # Numeric check
          if ! [[ "$USER_PORT_INPUT" =~ ^[0-9]+$ ]] || [ "$USER_PORT_INPUT" -lt 1 ] || [ "$USER_PORT_INPUT" -gt 65535 ]; then
            echo -e "${RED}❌ Invalid port number. Please enter a valid TCP port between 1 and 65535.${NC}"
            continue
          fi

          # Reserved port check
          if RESERVED_REASON=$(is_port_reserved "$USER_PORT_INPUT"); then
            echo -e "${RED}❌ FORBIDDEN PORT: Port $USER_PORT_INPUT is reserved for $RESERVED_REASON!${NC}"
            echo -e "   Selecting this port will cause service crashes or prevent the database from connecting."
            echo -e "   Please select a high web port such as 8080, 8081, 8082, etc."
            continue
          fi

          # In-use check
          if is_port_in_use "$USER_PORT_INPUT"; then
            echo -e "${YELLOW}⚠️ Notice: Port $USER_PORT_INPUT is currently in use or listening on this server.${NC}"
            read -r -p "   Do you still want to proceed with port $USER_PORT_INPUT? [y/N]: " OVERRIDE_PORT
            if [[ ! "$OVERRIDE_PORT" =~ ^[Yy] ]]; then
              continue
            fi
          fi

          HTTP_PORT="$USER_PORT_INPUT"
          SERVER_DOMAIN="_"
          echo -e "   Selected Port: ${GREEN}$HTTP_PORT${NC} (Access via http://${SERVER_IP}:${HTTP_PORT})"
          echo -e "   ${CYAN}Tip: Remember to open this port in your firewall: sudo ufw allow ${HTTP_PORT}/tcp${NC}"
          break
        done
        ;;
    esac
  fi

  # 5. Database Isolation (Prevent backend clash)
  echo -e "\n${CYAN}───────────────────────────────────────────────────────────────────${NC}"
  echo -e "${BOLD}Database Isolation (MySQL / MariaDB)${NC}"
  echo -e "${CYAN}───────────────────────────────────────────────────────────────────${NC}"
  echo -e "Each instance requires a separate database name to guarantee 100% data separation."

  SUGGESTED_DB="savannah_${INSTANCE_ID}"
  if [ -n "$ARG_DB_NAME" ]; then
    DB_NAME="$ARG_DB_NAME"
  else
    read -r -p "▶ Database Name [default: $SUGGESTED_DB]: " DB_NAME
    DB_NAME="${DB_NAME:-$SUGGESTED_DB}"
  fi

  if [ -n "$ARG_DB_HOST" ]; then DB_HOST="$ARG_DB_HOST"; else
    read -r -p "▶ Database Host [default: 127.0.0.1]: " DB_HOST
    DB_HOST="${DB_HOST:-127.0.0.1}"
  fi

  if [ -n "$ARG_DB_PORT" ]; then DB_PORT="$ARG_DB_PORT"; else
    read -r -p "▶ Database Port [default: 3306]: " DB_PORT
    DB_PORT="${DB_PORT:-3306}"
  fi

  if [ -n "$ARG_DB_USER" ]; then DB_USER="$ARG_DB_USER"; else
    read -r -p "▶ Database Username [default: root]: " DB_USER
    DB_USER="${DB_USER:-root}"
  fi

  if [ -n "$ARG_DB_PASS" ]; then DB_PASS="$ARG_DB_PASS"; else
    read -r -s -p "▶ Database Password (press Enter if blank): " DB_PASS
    echo ""
  fi

  # 6. Currency & VAT
  DEFAULT_CURRENCY="${ARG_CURRENCY:-ZMW}"
  DEFAULT_VAT_BP="${ARG_VAT:-1600}"
fi

# Construct Canonical APP_URL
if [ "$HTTP_PORT" = "80" ]; then
  if [ "$SERVER_DOMAIN" = "_" ] || [ "$SERVER_DOMAIN" = "*" ]; then
    APP_URL="http://$SERVER_IP"
  else
    FIRST_DOMAIN=$(echo "$SERVER_DOMAIN" | awk '{print $1}')
    APP_URL="http://$FIRST_DOMAIN"
  fi
else
  if [ "$SERVER_DOMAIN" = "_" ] || [ "$SERVER_DOMAIN" = "*" ]; then
    APP_URL="http://$SERVER_IP:$HTTP_PORT"
  else
    FIRST_DOMAIN=$(echo "$SERVER_DOMAIN" | awk '{print $1}')
    APP_URL="http://$FIRST_DOMAIN:$HTTP_PORT"
  fi
fi

# Summary confirmation before proceeding
echo -e "\n${BLUE}===================================================================${NC}"
echo -e "${GREEN}Configuration Summary for Instance: ${YELLOW}$INSTANCE_ID${NC}"
echo -e "${BLUE}===================================================================${NC}"
echo -e "  • Instance ID:         ${GREEN}$INSTANCE_ID${NC}"
echo -e "  • Instance Name:       $INSTANCE_TITLE"
echo -e "  • Filesystem Path:     $TARGET_DIR"
echo -e "  • Port / Domain:       Port $HTTP_PORT | Host: $SERVER_DOMAIN"
echo -e "  • Web Access URL:      ${CYAN}$APP_URL${NC}"
echo -e "  • Database Engine:     MySQL ($DB_HOST:$DB_PORT)"
echo -e "  • Database Name:       ${GREEN}$DB_NAME${NC} (Independent & Isolated)"
echo -e "  • Database User:       $DB_USER"
echo -e "  • Apache Site Config:  /etc/apache2/sites-available/savannah-${INSTANCE_ID}.conf"
echo -e "${BLUE}===================================================================${NC}"

if [ "$NON_INTERACTIVE" = false ]; then
  read -r -p "Proceed with installation? [Y/n]: " CONFIRM_INSTALL
  CONFIRM_INSTALL=${CONFIRM_INSTALL:-y}
  if [[ ! "$CONFIRM_INSTALL" =~ ^[Yy]$ ]]; then
    echo "Installation aborted by user."
    exit 0
  fi
fi

# ==============================================================================
# Step 1: Clone / Copy Codebase to Target Directory (if separate path chosen)
# ==============================================================================
echo -e "\n${YELLOW}▶ [1/7] Preparing instance directory...${NC}"
mkdir -p "$TARGET_DIR"

if [ "$TARGET_DIR" != "$BASE_SOURCE_DIR" ]; then
  echo "   Deploying application files to $TARGET_DIR..."
  # Copy source files excluding build artifacts and environment files
  mkdir -p "$TARGET_DIR"
  cp -r "$BASE_SOURCE_DIR/src" "$TARGET_DIR/" 2>/dev/null || true
  cp -r "$BASE_SOURCE_DIR/public" "$TARGET_DIR/" 2>/dev/null || true
  cp -r "$BASE_SOURCE_DIR/deploy" "$TARGET_DIR/" 2>/dev/null || true
  cp -r "$BASE_SOURCE_DIR/scripts" "$TARGET_DIR/" 2>/dev/null || true
  cp "$BASE_SOURCE_DIR/package.json" "$TARGET_DIR/" 2>/dev/null || true
  cp "$BASE_SOURCE_DIR/tsconfig.json" "$TARGET_DIR/" 2>/dev/null || true
  cp "$BASE_SOURCE_DIR/vite.config.ts" "$TARGET_DIR/" 2>/dev/null || true
  cp "$BASE_SOURCE_DIR/tailwind.config.js" "$TARGET_DIR/" 2>/dev/null || true
  cp "$BASE_SOURCE_DIR/postcss.config.js" "$TARGET_DIR/" 2>/dev/null || true
  cp "$BASE_SOURCE_DIR/index.html" "$TARGET_DIR/" 2>/dev/null || true
  cp "$BASE_SOURCE_DIR/.env.example" "$TARGET_DIR/" 2>/dev/null || true
  cp "$BASE_SOURCE_DIR/install.sh" "$TARGET_DIR/" 2>/dev/null || true
  echo "   Files deployed to $TARGET_DIR."
fi

# Ensure storage & database directories exist
mkdir -p "$TARGET_DIR/database"
mkdir -p "$TARGET_DIR/storage/logs"
mkdir -p "$TARGET_DIR/storage/framework/cache"
mkdir -p "$TARGET_DIR/storage/framework/sessions"
mkdir -p "$TARGET_DIR/storage/framework/views"
mkdir -p "$TARGET_DIR/bootstrap/cache"

# ==============================================================================
# Step 2: Generate Unique APP_KEY & .env Configuration
# ==============================================================================
echo -e "\n${YELLOW}▶ [2/7] Generating isolated environment (.env) configuration...${NC}"

# Generate 32-byte base64 cryptographic key
GENERATED_KEY="base64:$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64 2>/dev/null || echo "k$(date +%s)savannahrandomkey32bytes==")"

cat > "$TARGET_DIR/.env" <<EOF
# ==============================================================================
# Savannah CRM — Instance Configuration: ${INSTANCE_ID}
# Generated on: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ==============================================================================

# Application Metadata
APP_NAME="${INSTANCE_TITLE}"
APP_ENV=production
APP_KEY=${GENERATED_KEY}
APP_DEBUG=false
APP_URL=${APP_URL}
APP_PORT=${HTTP_PORT}
VITE_INSTANCE_ID="${INSTANCE_ID}"

# Database Configuration (Zero Clash Backend)
DB_CONNECTION=mysql
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_DATABASE=${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD="${DB_PASS}"

# Storage Engine
STORAGE_DRIVER=local

# Financial Defaults
DEFAULT_CURRENCY=${DEFAULT_CURRENCY}
DEFAULT_VAT_BP=${DEFAULT_VAT_BP}
DEFAULT_PAYMENT_TERMS_DAYS=30

# Logging & Operations
LOG_CHANNEL=daily
LOG_LEVEL=info
BACKUP_RETENTION_COUNT=10
EOF

echo -e "   ${GREEN}✓ Generated .env with unique APP_KEY and DB_DATABASE=${DB_NAME}${NC}"

# ==============================================================================
# Step 3: MySQL Database Provisioning (Optional Auto-Create)
# ==============================================================================
echo -e "\n${YELLOW}▶ [3/7] Provisioning database (${DB_NAME})...${NC}"
if command -v mysql &>/dev/null; then
  MYSQL_AUTH=""
  if [ -n "$DB_USER" ]; then MYSQL_AUTH="-u$DB_USER"; fi
  if [ -n "$DB_PASS" ]; then MYSQL_AUTH="$MYSQL_AUTH -p$DB_PASS"; fi
  if [ -n "$DB_HOST" ]; then MYSQL_AUTH="$MYSQL_AUTH -h$DB_HOST"; fi

  echo "   Attempting to initialize database '${DB_NAME}' via MySQL..."
  mysql $MYSQL_AUTH -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null && {
    echo -e "   ${GREEN}✓ Database '${DB_NAME}' verified/created in MySQL.${NC}"
  } || {
    echo -e "${YELLOW}   Note: Could not automatically run CREATE DATABASE via current CLI credentials.${NC}"
    echo -e "   You can create it manually anytime with:"
    echo -e "     mysql -u root -p -e \"CREATE DATABASE IF NOT EXISTS \\\`${DB_NAME}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
  }
else
  echo -e "   MySQL client not found locally. Ensure your MySQL server has database '${DB_NAME}' created."
fi

# ==============================================================================
# Step 4: System Package Verification (Apache2, PHP 8.3, Node.js)
# ==============================================================================
echo -e "\n${YELLOW}▶ [4/7] Verifying Apache2, PHP 8.3 & Node.js packages...${NC}"
export DEBIAN_FRONTEND=noninteractive

# Update apt safely (ignore non-fatal 3rd-party repository errors)
apt-get update -y -qq || true
apt-get install -y -qq software-properties-common ca-certificates lsb-release apt-transport-https curl || true

# Install Apache2 and PHP 8.3 if missing
if ! command -v apache2 &>/dev/null || ! command -v php &>/dev/null; then
  echo "   Installing Apache2 and PHP 8.3..."
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
    php8.3-intl || true
fi

# Install Node.js if missing
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
  echo "   Installing Node.js & npm..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1 || true
  apt-get install -y -qq nodejs || apt-get install -y -qq npm || true
fi

# ==============================================================================
# Step 5: Build Web Application Assets (dist/ directory)
# ==============================================================================
echo -e "\n${YELLOW}▶ [5/7] Compiling production web assets in $TARGET_DIR...${NC}"
cd "$TARGET_DIR"

# Ensure dependencies are installed
if [ ! -d "$TARGET_DIR/node_modules" ]; then
  echo "   Installing npm dependencies..."
  npm install --silent >/dev/null 2>&1 || npm install
fi

# Compile Vite production assets
echo "   Running 'npm run build'..."
npm run build

if [ ! -d "$TARGET_DIR/dist" ]; then
  echo -e "${RED}❌ Build did not produce $TARGET_DIR/dist. Please review npm build output.${NC}"
  exit 1
fi
echo -e "   ${GREEN}✓ Build succeeded: $TARGET_DIR/dist generated.${NC}"

# ==============================================================================
# Step 6: Configure Apache VirtualHost for this Instance (Zero Clash)
# ==============================================================================
echo -e "\n${YELLOW}▶ [6/7] Configuring Apache VirtualHost for instance '${INSTANCE_ID}'...${NC}"

# Ensure Apache listens on this port if custom port
if [ "$HTTP_PORT" != "80" ] && [ "$HTTP_PORT" != "443" ]; then
  if ! grep -q -E "^Listen\s+$HTTP_PORT" /etc/apache2/ports.conf 2>/dev/null; then
    echo "   Adding 'Listen $HTTP_PORT' to /etc/apache2/ports.conf..."
    echo "Listen $HTTP_PORT" >> /etc/apache2/ports.conf
  fi
fi

# ServerName & ServerAlias directives
SERVER_NAME_LINE="ServerName localhost"
SERVER_ALIAS_LINE=""
if [ "$SERVER_DOMAIN" != "_" ] && [ "$SERVER_DOMAIN" != "*" ] && [ -n "$SERVER_DOMAIN" ]; then
  PRIMARY_NAME=$(echo "$SERVER_DOMAIN" | awk '{print $1}')
  SERVER_NAME_LINE="ServerName $PRIMARY_NAME"
  ADDITIONAL_NAMES=$(echo "$SERVER_DOMAIN" | cut -d ' ' -f2-)
  if [ -n "$ADDITIONAL_NAMES" ] && [ "$ADDITIONAL_NAMES" != "$PRIMARY_NAME" ]; then
    SERVER_ALIAS_LINE="ServerAlias $ADDITIONAL_NAMES"
  fi
elif [ "$HTTP_PORT" != "80" ]; then
  SERVER_NAME_LINE="ServerName 127.0.0.1"
  SERVER_ALIAS_LINE="ServerAlias localhost $SERVER_IP"
fi

APACHE_SITE_CONF="/etc/apache2/sites-available/savannah-${INSTANCE_ID}.conf"

cat > "$APACHE_SITE_CONF" <<EOF
# ==============================================================================
# Apache2 VirtualHost for Savannah CRM — Instance: ${INSTANCE_ID}
# Automatically provisioned on: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ==============================================================================
<VirtualHost *:${HTTP_PORT}>
    ${SERVER_NAME_LINE}
    ${SERVER_ALIAS_LINE}
    ServerAdmin webmaster@localhost
    DocumentRoot ${TARGET_DIR}/dist

    <Directory ${TARGET_DIR}/dist>
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

    # Security: Deny access to sensitive files and database dumps
    <FilesMatch "^\.|\.(sql|mysql|sqlite|env|lock)$">
        Require all denied
    </FilesMatch>

    # Instance Identifier & Security Headers
    <IfModule mod_headers.c>
        Header always set X-Frame-Options "SAMEORIGIN"
        Header always set X-Content-Type-Options "nosniff"
        Header always set X-Savannah-Instance "${INSTANCE_ID}"
    </IfModule>

    ErrorLog \${APACHE_LOG_DIR}/savannah_${INSTANCE_ID}_error.log
    CustomLog \${APACHE_LOG_DIR}/savannah_${INSTANCE_ID}_access.log combined
</VirtualHost>
EOF

# Suppress ServerName FQDN warning
if [ ! -f /etc/apache2/conf-available/fqdn.conf ]; then
  echo "ServerName 127.0.0.1" > /etc/apache2/conf-available/fqdn.conf 2>/dev/null || true
  a2enconf fqdn >/dev/null 2>&1 || true
fi

# Enable required Apache modules
a2enmod rewrite headers deflate expires php8.3 >/dev/null 2>&1 || a2enmod rewrite headers deflate expires >/dev/null 2>&1 || true

# If this is replacing an old 000-savannah.conf that had catch-all wildcard, disable that legacy config
if [ "$INSTANCE_ID" != "legacy" ] && [ -f /etc/apache2/sites-enabled/000-savannah.conf ]; then
  if grep -q "ServerAlias.*127\.0\.0\.1 crm\.local \*" /etc/apache2/sites-available/000-savannah.conf 2>/dev/null; then
    echo "   Migrating legacy catch-all 000-savannah.conf to isolated instance configuration..."
    a2dissite 000-savannah.conf >/dev/null 2>&1 || true
  fi
fi

# Enable this instance VirtualHost
a2ensite "savannah-${INSTANCE_ID}.conf" >/dev/null 2>&1
echo -e "   ${GREEN}✓ Enabled Apache site: savannah-${INSTANCE_ID}.conf${NC}"

# ==============================================================================
# Step 7: Permissions & Apache Verification
# ==============================================================================
echo -e "\n${YELLOW}▶ [7/7] Setting permissions & verifying Apache...${NC}"
chown -R www-data:www-data "$TARGET_DIR" 2>/dev/null || true
chmod -R 775 "$TARGET_DIR/database" "$TARGET_DIR/storage" "$TARGET_DIR/bootstrap/cache" 2>/dev/null || true
chmod -R 755 "$TARGET_DIR/dist" 2>/dev/null || true

# Save instance metadata to local registry
cat > "$TARGET_DIR/instance.json" <<EOF
{
  "instance_id": "${INSTANCE_ID}",
  "instance_title": "${INSTANCE_TITLE}",
  "directory": "${TARGET_DIR}",
  "port": "${HTTP_PORT}",
  "domain": "${SERVER_DOMAIN}",
  "database": "${DB_NAME}",
  "url": "${APP_URL}",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# Test Apache config & reload
apache2ctl configtest
systemctl reload apache2 || systemctl restart apache2

echo -e "\n${BLUE}===================================================================${NC}"
echo -e "${GREEN}🎉 Instance '${YELLOW}${INSTANCE_ID}${GREEN}' Installed & Activated Successfully!${NC}"
echo -e "${BLUE}===================================================================${NC}"
echo -e "You can access this instance immediately at:"
echo -e "  👉 ${GREEN}${APP_URL}${NC}"
echo -e "First-run setup wizard:"
echo -e "  👉 ${GREEN}${APP_URL}/install${NC}"
echo -e "\nInstance Parameters:"
echo -e "  • Instance ID:     ${YELLOW}${INSTANCE_ID}${NC}"
echo -e "  • Project Path:    ${CYAN}${TARGET_DIR}${NC}"
echo -e "  • Database Name:   ${GREEN}${DB_NAME}${NC} (Isolated)"
echo -e "  • VirtualHost:     /etc/apache2/sites-available/savannah-${INSTANCE_ID}.conf"
echo -e "  • Error Log:       /var/log/apache2/savannah_${INSTANCE_ID}_error.log"
echo -e "\nDefault Sample Admin Credentials:"
echo -e "  • Username: ${YELLOW}admin${NC}"
echo -e "  • Password: ${YELLOW}password123${NC}"
echo -e "\nTo add another instance to this server, run:"
echo -e "  ${CYAN}sudo bash $0${NC}"
echo -e "Or list all active instances:"
echo -e "  ${CYAN}sudo bash $0 --list${NC}"
echo -e "${BLUE}===================================================================${NC}\n"
