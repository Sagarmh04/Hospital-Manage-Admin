# Session Management & Security

## Overview
This system implements secure session management with the ability to logout from all devices. Only authenticated users can terminate their own sessions.

## Security Features

### 1. **Logout from Current Device**
- Endpoint: `POST /api/auth/logout`
- Deletes the current session
- Clears the session cookie

### 2. **Logout from All Devices** 🔒
- Endpoint: `POST /api/auth/logout-all`
- **Security**: Requires valid authentication via session cookie
- Validates session is active, not expired, and not revoked
- Only allows users to delete their own sessions (isolated by userId)
- Returns count of sessions deleted

## How It Works

### Authentication Flow
```
1. User logs in → Session created in database
2. Session ID stored in HttpOnly cookie
3. Every request validates the session via getCurrentUser()
4. Session expires after chosen duration (1h, 8h, 24h, 7d)
```

### Logout All Flow
```
1. User clicks "Logout All Devices"
2. POST /api/auth/logout-all is called
3. Server validates session cookie using getCurrentUser()
4. If authorized → Delete all sessions for that userId
5. Clear current cookie → Redirect to login
```

## Security Guarantees

✅ **Authorization Required**: Cannot call logout-all without valid session  
✅ **User Isolation**: Can only delete own sessions (filtered by userId)  
✅ **Session Validation**: Checks for expiration and revocation  
✅ **No Session Leakage**: Uses existing getCurrentUser() helper  
✅ **Cookie Security**: HttpOnly, Secure (in production), SameSite=lax  

## Usage

### In UI Components
```tsx
import { LogoutButton } from "@/components/LogoutButton";

// Dropdown with both options
<LogoutButton />
```

### Direct API Calls
```typescript
// Logout current device
await fetch("/api/auth/logout", { method: "POST" });

// Logout all devices (requires auth)
await fetch("/api/auth/logout-all", { method: "POST" });
```

## Database Schema
```prisma
model Session {
  id             String   @id @default(cuid())
  userId         String   // Links to User - used for isolation
  user           User     @relation(fields: [userId], references: [id])
  
  createdAt      DateTime @default(now())
  expiresAt      DateTime
  revoked        Boolean  @default(false)
  
  ipAddress      String?
  userAgent      String?
  lastActivityAt DateTime @default(now())
}
```

## Testing

### Test Scenario 1: Unauthorized Access
```bash
# Try to logout all without being logged in
curl -X POST http://localhost:3000/api/auth/logout-all
# Expected: 401 Unauthorized
```

### Test Scenario 2: Multi-Device Logout
```bash
# 1. Login from Device A
# 2. Login from Device B
# 3. On Device A, call logout-all
# Expected: Both sessions deleted, redirected to login
```

### Test Scenario 3: Session Count
```bash
# Login multiple times with different durations
# Check dashboard - should show active session count
# Use logout-all
# Check database - all sessions for that user removed
```

## Error Handling

| Error | Status | Meaning |
|-------|--------|---------|
| `Unauthorized - Please login first` | 401 | No valid session cookie |
| `Session expired` | 401 | Session past expiresAt |
| `Session revoked` | 401 | Session marked as revoked |
| `Server error` | 500 | Database or system error |

## Best Practices

1. **Always use HTTPS in production** to protect session cookies
2. **Monitor session counts** - unusual activity may indicate account compromise
3. **Encourage logout-all** when users change passwords
4. **Set reasonable session durations** based on security requirements
5. **Audit session creation** via ipAddress and userAgent fields

## Implementation Files

- `/app/api/auth/logout-all/route.ts` - Logout all endpoint
- `/app/api/auth/logout/route.ts` - Single logout endpoint
- `/lib/auth.ts` - Session validation helper
- `/components/LogoutButton.tsx` - UI component with dropdown
- `/app/admin/page.tsx` - Shows active session count

## Future Enhancements

- [ ] Show list of active sessions with device info
- [ ] Allow terminating individual sessions
- [ ] Email notifications on new login
- [ ] Suspicious activity detection
- [ ] Session activity logs
