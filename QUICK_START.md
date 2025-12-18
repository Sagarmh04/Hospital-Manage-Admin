# 🚀 Quick Start Guide

## Immediate Steps to Get Running

### 1. Install Dependencies (Already Done ✅)
```bash
bun install
```

### 2. Set Up Environment Variables

Copy the example file:
```bash
cp .env.example .env
```

Then edit `.env` and replace placeholders:

```env
DATABASE_URL="your_neondb_connection_string"
MSG91_AUTH_KEY="your_msg91_key"
MSG91_EMAIL_SENDER_EMAIL="noreply@yourhospital.com"
MSG91_EMAIL_SENDER_NAME="Your Hospital Name"
MSG91_TEMPLATE_ID="your_template_id"
CRON_SECRET="any_random_secret_string"
NODE_ENV="development"
```

### 3. Start Development Server

```bash
bun run dev
```

Server will start at: `http://localhost:3000`

### 4. Test the Login

1. Go to: `http://localhost:3000/login`
2. Click "Dev Mode" button (bottom of form)
3. Enter a registered email from your database
4. Click "Send OTP"
5. OTP `123456` will appear on screen
6. Enter `123456` and click "Verify OTP"
7. You're logged in! 🎉

---

## Environment Variables You Need

| Variable | Where to Get It | Required |
|----------|----------------|----------|
| `DATABASE_URL` | Your NeonDB dashboard | ✅ Yes |
| `MSG91_AUTH_KEY` | MSG91 dashboard → API Keys | ✅ Yes |
| `MSG91_EMAIL_SENDER_EMAIL` | Your verified sender email in MSG91 | ✅ Yes |
| `MSG91_EMAIL_SENDER_NAME` | Your hospital/company name | ⚠️ Optional |
| `MSG91_TEMPLATE_ID` | MSG91 dashboard → Templates | ⚠️ Optional |
| `CRON_SECRET` | Generate any random string | ✅ Yes |

---

## Testing Scenarios

### ✅ Test Dev Login (OTP: 123456)
1. Enable "Dev Mode"
2. Use any registered email/phone
3. OTP is always `123456`

### ✅ Test Production Login (Real OTP)
1. Disable "Dev Mode"
2. Use registered email/phone
3. Check email/SMS for real OTP
4. Enter received OTP

### ✅ Test Rate Limiting
1. Try requesting OTP 6 times quickly
2. Should get "Too many requests" error

### ✅ Test Session Duration
1. Select "1 hour" duration
2. Login
3. Wait 1+ hours
4. Try accessing `/admin` - should redirect to login

### ✅ Test Logout
1. Login
2. Go to `/admin`
3. Use logout button
4. Should redirect to login

---

## Common Issues & Solutions

### ❌ "DATABASE_URL not set"
**Solution:** Add `DATABASE_URL` to your `.env` file

### ❌ "Failed to send OTP"
**Solutions:**
- Check MSG91_AUTH_KEY is correct
- In dev mode, OTP still shows on screen even if email fails
- Verify sender email is verified in MSG91

### ❌ "Invalid session"
**Solutions:**
- Check if session expired
- Verify `Session` table exists in database
- Check `DATABASE_URL` is correct

### ❌ "Too many OTP requests"
**Solution:** Wait 15 minutes or restart dev server (clears in-memory rate limits)

---

## File Structure Overview

```
admin/
├── app/
│   ├── api/
│   │   ├── auth/          # Production auth endpoints
│   │   ├── dev/           # Dev endpoints (DELETE in prod!)
│   │   ├── user/          # User endpoints
│   │   ├── admin/         # Admin endpoints
│   │   └── cron/          # Cleanup cron
│   ├── login/
│   │   └── page.tsx       # Login UI
│   └── admin/
│       └── page.tsx       # Admin dashboard
├── lib/
│   ├── drizzle.ts         # DB connection
│   ├── validation.ts      # Input validation
│   ├── rate-limit.ts      # Rate limiting
│   ├── session-management.ts  # Session ops
│   ├── otp-management.ts  # OTP ops
│   └── auth.ts            # Auth helpers
├── drizzle/
│   └── schema.ts          # Database schema
├── .env                   # Your environment vars
└── .env.example          # Template
```

---

## What to Do Next

### For Development:
1. ✅ Keep dev mode enabled
2. ✅ Use hardcoded OTP (123456)
3. ✅ Test all flows

### Before Production:
1. ⚠️ Delete `/app/api/dev` folder
2. ⚠️ Remove dev mode button from login page
3. ⚠️ Set production environment variables
4. ⚠️ Set up cleanup cron job
5. ⚠️ Test with real OTP delivery

---

## Helpful Commands

```bash
# Start dev server
bun run dev

# Generate Drizzle migrations (if schema changes)
bun run drizzle:generate

# Push schema to database (if schema changes)
bun run drizzle:push

# Open Drizzle Studio (database GUI)
bun run drizzle:studio

# Build for production
bun run build
```

---

## Need Help?

Check these files for detailed info:
- `README_AUTH_SYSTEM.md` - Complete system documentation
- `MIGRATION_TO_DRIZZLE.md` - Migration details
- `.env.example` - Environment variables template

---

**You're all set! Start the server and test the login flow. 🚀**

