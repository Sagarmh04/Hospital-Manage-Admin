# Quick Start Guide - SPA + PWA Admin Dashboard

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd admin
npm install
```

### 2. Run Development Server
```bash
npm run dev
# Visit http://localhost:3000
```

### 3. Build for Production
```bash
npm run build
npm start
```

## 📋 Key Features

### ✨ Single Page Application
- Navigate without page reloads
- Instant view switching
- Client-side routing
- Smooth transitions

### 📱 Progressive Web App
- Installable on devices
- Offline support
- App-like experience
- Push notifications ready

### 🔐 Unified Authentication
- Centralized session verification
- Consistent security checks
- Automatic activity tracking
- Expired session logging

## 🎯 Quick Reference

### Using Session Verifier in New API Routes

```typescript
import { verifySession } from "@/lib/session-verifier";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  const result = await verifySession(sessionId);

  if (!result.valid) {
    return NextResponse.json(
      { error: "Unauthorized", redirect: "/login" },
      { status: 401 }
    );
  }

  // Access user data
  const user = result.user;
  const session = result.session;

  // Your API logic here
  return NextResponse.json({ data: "your data" });
}
```

### Adding New SPA Views

1. **Update View Type** in `app/admin/page.tsx`:
```typescript
type ViewType = "dashboard" | "devices" | "your-new-view" | ...;
```

2. **Add Navigation Item** in `components/AdminSidebarClient.tsx`:
```typescript
const navItems: NavItem[] = [
  // ...
  { label: "Your New View", view: "your-new-view" },
];
```

3. **Add View Handler** in `components/AdminDashboardClient.tsx`:
```typescript
if (currentView === "your-new-view") {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Your New View
        </h2>
        {/* Your view content */}
      </section>
    </div>
  );
}
```

### Testing PWA Locally

**Chrome DevTools:**
```
1. Open DevTools (F12)
2. Go to "Application" tab
3. Check "Service Workers" - should show registered
4. Check "Manifest" - should show all details
5. Check "Storage" - should show cache entries
```

**Test Offline:**
```
1. Open DevTools (F12)
2. Go to "Network" tab
3. Select "Offline" from dropdown
4. Refresh page - should load from cache
```

**Test Installation:**
```
1. Chrome: Look for install icon in address bar
2. Chrome Android: Menu → "Add to Home screen"
3. Edge: Install icon in address bar or menu
```

## 🛠️ Development Workflow

### Adding a New Protected API Route

```typescript
// app/api/your-endpoint/route.ts
import { verifySession } from "@/lib/session-verifier";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const result = await verifySession(sessionId);

    if (!result.valid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Your logic here
    const body = await req.json();
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
```

### Fetching Data in SPA Components

```typescript
"use client";

import { useEffect, useState } from "react";

export function YourComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/your-endpoint");
        
        if (!res.ok) {
          const errorData = await res.json();
          if (errorData.redirect) {
            window.location.href = errorData.redirect;
            return;
          }
          throw new Error("Failed to fetch");
        }

        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return <div>{/* Your content */}</div>;
}
```

## 🎨 PWA Icon Generation

### Quick Method (Recommended)
```bash
npx pwa-asset-generator public/icons/icon.svg public/icons --icon-only
```

### Manual Sizes Needed
- 16x16, 32x32 (favicons)
- 72x72, 96x96, 128x128, 144x144, 152x152
- 180x180 (Apple)
- 192x192, 384x384, 512x512
- 192x192, 512x512 (maskable)

### Online Tools
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

## 🔍 Debugging

### Check Service Worker
```javascript
// Browser console
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log(regs));
```

### Clear Service Worker
```javascript
// Browser console
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.unregister()));
```

### Check Cache
```javascript
// Browser console
caches.keys().then(keys => console.log(keys));
caches.open('hospital-admin-v1')
  .then(cache => cache.keys())
  .then(keys => console.log(keys));
```

### Clear All Caches
```javascript
// Browser console
caches.keys().then(keys => 
  Promise.all(keys.map(key => caches.delete(key)))
);
```

## 📱 Testing Checklist

### SPA Functionality
- [ ] Navigate between views without page reload
- [ ] Browser back button works (or doesn't - by design)
- [ ] Loading states show properly
- [ ] Error states handled gracefully
- [ ] Session expiration redirects to login

### PWA Features
- [ ] App installs on Chrome desktop
- [ ] App installs on Chrome Android
- [ ] App opens in standalone mode
- [ ] Icons display correctly
- [ ] Theme colors apply properly
- [ ] Offline mode works
- [ ] Service worker updates properly

### Authentication
- [ ] Login works normally
- [ ] Session validation works
- [ ] Expired sessions redirect
- [ ] Logout clears session
- [ ] Logout all works
- [ ] AuthLog entries created

## 🚨 Common Issues

### Service Worker Not Registering
**Cause**: Not in production mode  
**Fix**: `npm run build && npm start`

### Icons Not Found (404)
**Cause**: Icons not generated  
**Fix**: Run `npx pwa-asset-generator public/icons/icon.svg public/icons --icon-only`

### PWA Not Installing
**Cause**: Missing manifest or icons  
**Fix**: Check DevTools > Application > Manifest

### Session Verification Fails
**Cause**: Database connection or invalid session  
**Fix**: Check Prisma connection, verify session exists

### SPA Navigation Not Working
**Cause**: Component not client-side  
**Fix**: Add `"use client"` directive

## 📚 File Locations

### Core Files
```
lib/session-verifier.ts         # Session verification utility
app/admin/page.tsx              # SPA container
components/AdminDashboardClient.tsx  # Dashboard views
components/AdminSidebarClient.tsx    # Navigation
```

### PWA Files
```
public/manifest.json            # PWA manifest
public/service-worker.js        # Service worker
components/ServiceWorkerRegistration.tsx  # SW registration
public/icons/                   # PWA icons
```

### API Routes
```
app/api/admin/dashboard/route.ts     # Dashboard data
app/api/auth/logout/route.ts         # Logout
app/api/auth/logout-all/route.ts     # Logout all
app/api/auth/session/[id]/route.ts   # Delete session
app/api/user/sessions/route.ts       # List sessions
```

### Documentation
```
SPA_PWA_IMPLEMENTATION.md       # Technical details
PWA_SETUP.md                    # PWA setup guide
IMPLEMENTATION_SUMMARY.md       # Complete summary
```

## 💡 Tips

1. **Always use verifySession** in new API routes
2. **Test in production mode** for PWA features
3. **Clear cache** when testing service worker updates
4. **Use DevTools Application tab** for PWA debugging
5. **Add `"use client"`** for interactive components
6. **Handle loading states** in SPA components
7. **Implement error boundaries** for better UX
8. **Test offline mode** regularly

## 🔗 Useful Commands

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Generate icons
npx pwa-asset-generator public/icons/icon.svg public/icons --icon-only

# Lighthouse audit
npx lighthouse http://localhost:3000 --view

# Check TypeScript
npx tsc --noEmit

# Prisma commands
npx prisma generate
npx prisma migrate dev
```

## 📞 Need Help?

1. Check `SPA_PWA_IMPLEMENTATION.md` for technical details
2. Check `PWA_SETUP.md` for PWA-specific help
3. Use browser DevTools > Application tab
4. Check console for errors
5. Verify service worker registration
6. Check Prisma connection

## 🎓 Learning Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Prisma Documentation](https://www.prisma.io/docs)
