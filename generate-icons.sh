#!/bin/bash

# Create icons directory
mkdir -p public/icons

# Create placeholder SVG icon
cat > public/icons/icon.svg << 'EOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0f172a"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#ffffff" font-family="Arial, sans-serif" font-size="200" font-weight="bold">H</text>
</svg>
EOF

echo "Created placeholder icon at public/icons/icon.svg"
echo ""
echo "To generate proper PWA icons, you can:"
echo "1. Use an online tool like https://realfavicongenerator.net/"
echo "2. Use the command line tool 'pwa-asset-generator':"
echo "   npx pwa-asset-generator public/icons/icon.svg public/icons --icon-only"
echo ""
echo "Required icon sizes:"
echo "  - 16x16, 32x32 (favicons)"
echo "  - 72x72, 96x96, 128x128, 144x144, 152x152 (various devices)"
echo "  - 180x180 (Apple touch icon)"
echo "  - 192x192, 384x384, 512x512 (Android)"
echo "  - 192x192, 512x512 maskable (Android adaptive icons)"
