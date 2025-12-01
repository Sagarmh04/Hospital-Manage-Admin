# PWA Setup Guide

This application is now configured as a Progressive Web App (PWA) with offline support and installability.

## Features

- ✅ **Installable**: Can be installed on mobile and desktop devices
- ✅ **Offline Support**: Service worker caches static assets for offline access
- ✅ **App-like Experience**: Standalone display mode without browser UI
- ✅ **Fast Loading**: Cached assets load instantly on repeat visits

## PWA Icons Setup

The application requires icon assets for proper PWA functionality. Follow these steps:

### Option 1: Using pwa-asset-generator (Recommended)

```bash
# Install the tool
npm install -g pwa-asset-generator

# Generate all required icons from your source image
npx pwa-asset-generator public/icons/icon.svg public/icons --icon-only

# Or from a PNG source
npx pwa-asset-generator path/to/your/logo.png public/icons --icon-only
```

### Option 2: Manual Creation

Create the following icon sizes in `public/icons/`:

**Favicons:**
- icon-16x16.png
- icon-32x32.png

**General PWA Icons:**
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

**Apple Touch Icons:**
- icon-180x180.png

**Maskable Icons (Android Adaptive):**
- icon-maskable-192x192.png
- icon-maskable-512x512.png

### Option 3: Online Tools

Use online favicon generators:
- https://realfavicongenerator.net/
- https://favicon.io/
- https://www.pwabuilder.com/imageGenerator

## Testing the PWA

### Chrome Desktop
1. Open the app in Chrome
2. Look for the install icon in the address bar
3. Click to install

### Chrome Android
1. Open the app in Chrome on Android
2. Tap the three dots menu
3. Select "Add to Home screen"
4. The app will install as a standalone app

### Lighthouse Audit
Run a Lighthouse audit to verify PWA compliance:
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://your-domain.com --view
```

## Service Worker

The service worker (`public/service-worker.js`) implements:
- **Network-first strategy** for API calls (always fresh data)
- **Cache-first strategy** for static assets (fast loading)
- **Automatic cache updates** when new versions deploy
- **Offline fallback** when network is unavailable

### Cache Management

The service worker automatically:
- Caches static assets on install
- Updates cache when new version is deployed
- Cleans up old caches

### Manual Service Worker Update

If needed, you can force service worker update:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
// Then reload the page
```

## Manifest Configuration

Edit `public/manifest.json` to customize:
- App name and description
- Theme colors
- App icons
- Display mode
- Shortcuts
- Categories

## Production Deployment

The service worker only registers in production mode. To test locally:

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Browser Support

PWA features are supported in:
- ✅ Chrome/Edge (full support)
- ✅ Safari (iOS 11.3+, partial support)
- ✅ Firefox (partial support)
- ✅ Samsung Internet

## Troubleshooting

### PWA Not Installing
1. Ensure you're using HTTPS (or localhost for development)
2. Verify all required icons exist
3. Check manifest.json is accessible
4. Verify service worker registers successfully (check DevTools > Application)

### Service Worker Not Updating
1. Close all tabs of the app
2. Unregister the service worker (DevTools > Application > Service Workers)
3. Clear cache and reload

### Icons Not Showing
1. Verify icon files exist in `public/icons/`
2. Check browser console for 404 errors
3. Verify icon paths in manifest.json match actual files
4. Clear cache and reinstall the app

## Next Steps

1. **Generate proper icons** using one of the methods above
2. **Test installation** on multiple devices
3. **Run Lighthouse audit** to verify PWA compliance
4. **Monitor service worker** performance in production
5. **Implement offline page** for better offline UX (optional)

## Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox (advanced caching)](https://developers.google.com/web/tools/workbox)
