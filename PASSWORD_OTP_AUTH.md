# Password + OTP Two-Factor Authentication

## Overview

The authentication system now uses two-factor authentication combining:
1. **Password verification** (First Factor)
2. **OTP verification** (Second Factor)

This provides enhanced security compared to OTP-only authentication.

## Authentication Flow

### Step 1: Request OTP (Password Verification)

**Endpoints:**
- Production: `/api/auth/email/request-otp` or `/api/auth/phone/request-otp`
- Dev: `/api/dev/email/request-otp` or `/api/dev/phone/request-otp`

**Request Body:**
```json
{
  "email": "user@example.com",  // or "phone": "+1234567890"
  "password": "user_password"
}
```

**Process:**
1. Validate and sanitize email/phone
2. Find user in database
3. **Verify password** against hashed password
4. If user not found or password incorrect, use dummy hash to prevent timing attacks
5. Generate OTP and send via MSG91 (production) or return hardcoded 123456 (dev)
6. Store OTP in database with 10-minute expiry

**Timing Attack Prevention:**
- Always performs bcrypt.compare() even when user doesn't exist
- Uses DUMMY_HASH constant to normalize timing
- Returns same error message for invalid credentials

### Step 2: Verify OTP (Complete Login)

**Endpoints:**
- Production: `/api/auth/verify-otp`
- Dev: `/api/dev/verify-otp`

**Request Body:**
```json
{
  "identifier": "user@example.com",  // email or phone
  "password": "user_password",
  "otp": "123456",
  "sessionDuration": "8h"  // Optional: "1h", "8h", "24h", "7d"
}
```

**Process:**
1. Validate identifier (auto-detect email or phone)
2. Find user in database
3. **Re-verify password** (prevents password change between steps)
4. Verify OTP (checks hash, attempts, expiry)
5. Create session with device tracking
6. Set HTTP-only session cookie
7. Log auth event

**Security Features:**
- Password verified twice (request-otp and verify-otp)
- OTP stored as bcrypt hash
- Rate limiting: 10 attempts per 15 minutes per IP
- Session tracking with IP, user agent, device info
- OTP expires after 10 minutes
- Maximum 5 OTP verification attempts

## Frontend Integration

### Login Page Components

**Step 1: Identifier + Password**
```tsx
<input type="text" value={identifier} />      // Email or phone
<input type="password" value={password} />    // User password
<button>Send OTP</button>
```

**Step 2: OTP Verification**
```tsx
<input type="text" value={otp} maxLength={6} />
<button>Verify OTP</button>
```

### API Calls

**Request OTP:**
```typescript
const response = await fetch('/api/auth/email/request-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: identifier,
    password: password 
  })
});
```

**Verify OTP:**
```typescript
const response = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: identifier,
    password: password,  // Re-verify password
    otp: otp,
    sessionDuration: '8h'
  })
});
```

## Dev Mode

**Dev mode provides:**
- Hardcoded OTP: `123456`
- OTP displayed in response and console
- Same password verification logic as production
- No actual email/SMS sent

**Toggle dev mode:**
```tsx
<button onClick={() => setIsDevMode(!isDevMode)}>
  {isDevMode ? "🔧 Dev Mode ON" : "Dev Mode"}
</button>
```

**Dev endpoints:**
- `/api/dev/email/request-otp`
- `/api/dev/phone/request-otp`
- `/api/dev/verify-otp`

**⚠️ WARNING:** Delete all `/api/dev/*` endpoints before production deployment!

## Error Responses

### Invalid Credentials
```json
{
  "error": "Invalid credentials"
}
```
Returned when:
- User not found
- Password incorrect
- Account not active

### Rate Limit Exceeded
```json
{
  "error": "Too many verification attempts. Please try again in X minutes."
}
```

### Invalid OTP
```json
{
  "error": "Invalid or expired OTP"
}
```

### Account Inactive
```json
{
  "error": "Account is not active"
}
```

## Security Best Practices

### Implemented
✅ Password + OTP two-factor authentication
✅ Bcrypt password hashing (cost factor 10)
✅ Timing attack prevention with dummy hash
✅ Rate limiting (10 attempts/15min)
✅ OTP expiry (10 minutes)
✅ OTP attempt limit (5 attempts)
✅ HTTP-only secure cookies
✅ Session tracking with device info
✅ Input validation and sanitization
✅ Password re-verification in verify-otp

### Recommended
- [ ] Add CAPTCHA for failed login attempts
- [ ] Implement account lockout after N failed attempts
- [ ] Add email notifications for new logins
- [ ] Monitor for unusual login patterns
- [ ] Implement password strength requirements
- [ ] Add password reset functionality
- [ ] Enable 2FA backup codes

## Database Schema

### User Table
```sql
passwordHash VARCHAR(255) NOT NULL  -- Bcrypt hash of password
email VARCHAR(255) UNIQUE
phone VARCHAR(20) UNIQUE
status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'
```

### OtpRequest Table
```sql
userId UUID REFERENCES User(id)
otpHash VARCHAR(255) NOT NULL       -- Bcrypt hash of OTP
expiresAt TIMESTAMP NOT NULL
attempts INTEGER DEFAULT 0
createdAt TIMESTAMP DEFAULT NOW()
```

### Session Table
```sql
userId UUID REFERENCES User(id)
sessionToken VARCHAR(255) UNIQUE NOT NULL
expiresAt TIMESTAMP NOT NULL
ipAddress VARCHAR(45)
userAgent TEXT
browser VARCHAR(100)
os VARCHAR(100)
deviceType VARCHAR(50)
```

## Testing

### Test User Creation
```sql
-- Create test user with bcrypt-hashed password
INSERT INTO "User" (id, email, "passwordHash", name, role, status)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  '$2a$10$X5nZPJlcqNyZc4vZLHHkA.J8EWvLx3fBK7qGrq6KwP5X2HZLqY5HS', -- password: "test123"
  'Test User',
  'admin',
  'active'
);
```

### Test Flow
1. Enter email/phone + password
2. Click "Send OTP"
3. Receive OTP (or use 123456 in dev mode)
4. Enter OTP
5. Click "Verify OTP"
6. Redirected to `/admin`

### Dev Mode Testing
```bash
# Terminal 1: Start dev server
bun run dev

# Terminal 2: Test request-otp
curl -X POST http://localhost:3000/api/dev/email/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Terminal 3: Test verify-otp
curl -X POST http://localhost:3000/api/dev/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","password":"test123","otp":"123456","sessionDuration":"8h"}'
```

## Migration from OTP-Only

**Changed Files:**
- `/app/api/auth/email/request-otp/route.ts` - Added password verification
- `/app/api/auth/phone/request-otp/route.ts` - Added password verification
- `/app/api/auth/verify-otp/route.ts` - Added password re-verification
- `/app/api/dev/email/request-otp/route.ts` - Added password verification
- `/app/api/dev/phone/request-otp/route.ts` - Added password verification
- `/app/api/dev/verify-otp/route.ts` - Added password re-verification
- `/app/login/page.tsx` - Added password input field

**No Breaking Changes:**
- Database schema unchanged
- Session management unchanged
- Rate limiting unchanged
- OTP generation/verification unchanged (still bcrypt-hashed)

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# MSG91 (Production OTP)
MSG91_EMAIL_AUTH_KEY="your_email_auth_key"
MSG91_EMAIL_SENDER_EMAIL="no-reply@mail.hospitalmanage.in"
MSG91_EMAIL_SENDER_NAME="Hospital Admin"
MSG91_SMS_AUTH_KEY="your_sms_auth_key"
MSG91_SMS_SENDER_ID="HSPTL"
MSG91_SMS_TEMPLATE_ID="your_template_id"

# Cron Job Authentication
CRON_SECRET="your_secret_key_here"
```

## Support

For issues or questions:
1. Check error messages in browser console
2. Check server logs for detailed errors
3. Verify environment variables are set
4. Test with dev mode first
5. Ensure user exists in database with correct passwordHash
