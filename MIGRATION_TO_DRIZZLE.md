# Migration to Drizzle ORM - Complete ✅

## What Was Done

### 1. **Installed Dependencies**
- ✅ `drizzle-orm` - ORM library
- ✅ `postgres` - PostgreSQL driver
- ✅ `drizzle-kit` - CLI tool for schema management
- ✅ `bcryptjs` - Password/OTP hashing
- ✅ `ua-parser-js` - User agent parsing for device info
- ✅ `zod` - Runtime validation

### 2. **Created Drizzle Schema**
- ✅ `drizzle/schema.ts` - Complete schema matching your Prisma schema
- ✅ `drizzle.config.ts` - Drizzle configuration
- ✅ All tables: User, Session, SessionLog, AuthLog, OtpRequest, and related tables

### 3. **Created Core Utilities**
- ✅ `lib/drizzle.ts` - Database connection
- ✅ `lib/validation.ts` - Input validation and sanitization (email, phone, OTP, etc.)
- ✅ `lib/rate-limit.ts` - In-memory rate limiting for OTP requests
- ✅ `lib/session-management.ts` - Session CRUD operations
- ✅ `lib/otp-management.ts` - OTP generation and verification
- ✅ `lib/auth.ts` - getCurrentUser helper

### 4. **Created Production Auth API Endpoints**
- ✅ `/api/auth/email/request-otp` - Request OTP via email
- ✅ `/api/auth/phone/request-otp` - Request OTP via phone
- ✅ `/api/auth/verify-otp` - Verify OTP and create session
- ✅ `/api/auth/logout` - Logout current session
- ✅ `/api/auth/logout-all` - Logout from all devices
- ✅ `/api/auth/logout-other` - Logout from other devices
- ✅ `/api/user/sessions` - Get all active sessions
- ✅ `/api/admin/dashboard` - Admin dashboard data
- ✅ `/api/cron/cleanup` - Cleanup expired sessions/OTPs

### 5. **Created Dev Auth API Endpoints** (DELETE IN PRODUCTION)
- ✅ `/api/dev/email/request-otp` - Dev login with hardcoded OTP (123456)
- ✅ `/api/dev/phone/request-otp` - Dev login with hardcoded OTP (123456)
- ✅ `/api/dev/verify-otp` - Verify dev OTP

### 6. **Updated Login Page**
- ✅ Two-step login flow (identifier → OTP)
- ✅ Auto-detect email vs phone number
- ✅ Dev mode toggle button (remove in production)
- ✅ Session duration selection
- ✅ Displays dev OTP when in dev mode

## Key Features Implemented

### ✅ Input Sanitization & Validation
- Email validation (RFC compliant)
- Phone number validation (international format)
- OTP validation (6 digits)
- Session duration validation (1h, 8h, 24h, 7d)
- XSS prevention (removes <, >, control characters)
- SQL injection prevention (Drizzle parameterized queries)

### ✅ Rate Limiting
- OTP request: 5 attempts per 15 minutes (by IP and user)
- OTP verify: 10 attempts per 15 minutes
- 60-second cooldown between OTP requests per user

### ✅ Session Management
- Sessions stored in database
- Device tracking (browser, OS, device type)
- IP address tracking
- Last activity tracking
- Automatic expiry based on duration
- Session logs for audit trail

### ✅ Security Features
- HTTP-only cookies for session IDs
- Bcrypt for OTP hashing
- No passwords stored (OTP-only auth)
- User status validation (active/suspended/deleted)
- Comprehensive auth logs

## Environment Variables Required

Create a `.env` file with these variables:

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# MSG91 (for SMS/Email OTP)
MSG91_AUTH_KEY="your_msg91_auth_key"
MSG91_EMAIL_SENDER_EMAIL="noreply@yourdomain.com"
MSG91_EMAIL_SENDER_NAME="Your Hospital Name"
MSG91_TEMPLATE_ID="your_sms_template_id"

# Cron Job Secret
CRON_SECRET="generate_a_random_secret"

# Node Environment
NODE_ENV="development"
```

## How to Use

### Development
1. Copy `.env.example` to `.env` and fill in your values
2. Run `bun run dev` to start the dev server
3. Visit `http://localhost:3000/login`
4. Toggle "Dev Mode" to use hardcoded OTP (123456)

### Production Deployment

#### Before Deploying:
1. **Delete the dev API folder:**
   ```bash
   rm -rf app/api/dev
   ```

2. **Remove dev mode toggle from login page:**
   - Remove the dev mode button and logic from `app/login/page.tsx`

3. **Set environment variables in your hosting platform**

4. **Set up cron job** to call `/api/cron/cleanup` hourly:
   ```
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/cleanup
   ```

### Testing the Auth Flow

#### Production Flow:
1. Enter email or phone number
2. Click "Send OTP"
3. Check email/SMS for OTP
4. Enter OTP and verify
5. You're logged in!

#### Dev Flow:
1. Toggle "Dev Mode" button
2. Enter email or phone number
3. Click "Send OTP"
4. OTP (123456) is displayed on screen
5. Enter 123456 and verify
6. You're logged in!

## Database Schema

The Drizzle schema exactly matches your existing Prisma schema. No migration needed since tables already exist in NeonDB.

## Scripts Added

```bash
bun run drizzle:generate  # Generate migrations
bun run drizzle:push      # Push schema to database
bun run drizzle:studio    # Open Drizzle Studio
```

## Files That Can Be Removed (After Testing)

Once you confirm everything works:
- `prisma/` folder (keep schema.prisma for reference if needed)
- Old Prisma-based files (already removed)
- `/app/api/dev/` folder (ONLY in production)

## Notes

- The tables already exist in your NeonDB, so no schema changes needed
- Prisma can coexist with Drizzle during migration
- All input is sanitized before processing
- Rate limiting is in-memory (consider Redis for production scale)
- Session cookies are HTTP-only for security
- OTP expires after 10 minutes
- Sessions expire based on selected duration

## Support

If you need to adjust any settings:
- Rate limits: Edit `lib/rate-limit.ts` → `RATE_LIMITS` object
- OTP expiry: Edit OTP request endpoints → `expiryMinutes` parameter
- Session duration options: Edit `app/login/page.tsx` → `DURATION_OPTIONS`
- Dev OTP: Edit `app/api/dev/**` → `DEV_OTP` constant

---

**Migration Status: COMPLETE** ✅

All authentication has been migrated to Drizzle ORM with comprehensive input validation, rate limiting, and session management.
