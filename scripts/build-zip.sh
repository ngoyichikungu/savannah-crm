#!/bin/bash
# ==============================================================================
# Savannah Business Operations & CRM — One-Command Shared Hosting Builder
# ==============================================================================
# Builds production assets and packages a standalone deployment ZIP archive
# suitable for cPanel, Namecheap, SiteGround, and shared web hosts.
# ==============================================================================

set -e

echo "🚀 [1/4] Installing dependencies..."
npm ci

echo "🔨 [2/4] Compiling production build..."
npm run build

echo "📦 [3/4] Packaging deployment archive..."
DIST_ZIP="savannah-crm-shared-hosting.zip"
rm -f "$DIST_ZIP"

if command -v zip &> /dev/null; then
    zip -r "$DIST_ZIP" dist/ public/ .env.example Dockerfile README.md
else
    echo "⚠️  'zip' CLI utility not found. Distribution files generated in /dist directory."
fi

echo "✅ [4/4] Package built successfully: $DIST_ZIP"
echo "------------------------------------------------------------------------------"
echo "Shared Hosting Deployment Instructions (cPanel / Namecheap):"
echo "  1. Upload '$DIST_ZIP' to your cPanel File Manager in public_html."
echo "  2. Extract the contents inside public_html."
echo "  3. Copy '.env.example' to '.env' and set APP_KEY via /install."
echo "  4. Ensure directory 'database/' permissions are set to 775 or 777."
echo "------------------------------------------------------------------------------"
