# Environment Variables Required

## Copy this template to your `.env` file

```env
# =============================================================================
# DATABASE CONNECTION
# =============================================================================
# Your existing NeonDB PostgreSQL connection string
# Get from: NeonDB Dashboard → Connection String
DATABASE_URL="postgresql://username:password@host.region.neon.tech:5432/database?sslmode=require"


# =============================================================================
# MSG91 API CONFIGURATION (for OTP Delivery)
# =============================================================================
# Get your Auth Key from: MSG91 Dashboard → API Keys
MSG91_AUTH_KEY="YOUR_MSG91_AUTH_KEY_HERE"

# Verified sender email address for OTP emails
# Must be verified in MSG91 Dashboard → Email Settings
MSG91_EMAIL_SENDER_EMAIL="noreply@yourdomain.com"

# Display name for OTP emails (optional but recommended)
MSG91_EMAIL_SENDER_NAME="Your Hospital Name"

# SMS Template ID from MSG91 (optional)
# Get from: MSG91 Dashboard → SMS → Templates
MSG91_TEMPLATE_ID="YOUR_SMS_TEMPLATE_ID"


# =============================================================================
# CRON JOB SECURITY
# =============================================================================
# Random secret for cleanup cron endpoint
# Generate with: openssl rand -base64 32
# Or use any random string
CRON_SECRET="your_random_secret_string_here"


# =============================================================================
# NODE ENVIRONMENT
# =============================================================================
NODE_ENV="development"
# Change to "production" when deploying
```

---

## Where to Get Each Value

### 1. **DATABASE_URL** ✅ (You already have this)
- **Source:** Your NeonDB dashboard
- **Format:** `postgresql://user:pass@host:5432/db?sslmode=require`
- **Note:** This is your existing connection string

### 2. **MSG91_AUTH_KEY** 🔑
- **Source:** [MSG91 Dashboard](https://control.msg91.com/app/) → API Keys
- **Steps:**
  1. Login to MSG91
  2. Go to "Settings" → "API Keys"
  3. Copy your Auth Key
- **Format:** Long alphanumeric string

### 3. **MSG91_EMAIL_SENDER_EMAIL** 📧
- **Source:** MSG91 Dashboard → Email Settings
- **Steps:**
  1. Add and verify your domain/email
  2. Use verified email as sender
- **Format:** `noreply@yourdomain.com`
- **Note:** Must be verified in MSG91

### 4. **MSG91_EMAIL_SENDER_NAME** 📝
- **Source:** Your choice
- **Example:** "City Hospital" or "Your Hospital Name"
- **Optional:** Yes (defaults to empty string)

### 5. **MSG91_TEMPLATE_ID** 📱
- **Source:** MSG91 Dashboard → SMS → Templates
- **Steps:**
  1. Create SMS template for OTP
  2. Get approved template ID
- **Optional:** Yes (can use direct SMS API without template)

### 6. **CRON_SECRET** 🔐
- **Source:** Generate yourself
- **Generate with:**
  ```bash
  openssl rand -base64 32
  ```
  Or use any random string like: `my-super-secret-cron-key-12345`
- **Purpose:** Secures the `/api/cron/cleanup` endpoint

### 7. **NODE_ENV** 🌍
- **Development:** `"development"`
- **Production:** `"production"`
- **Purpose:** Controls secure cookie settings and logging

---

## Quick Setup Steps

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file:**
   ```bash
   code .env  # or use any text editor
   ```

3. **Replace placeholders** with your actual values

4. **Save the file**

5. **Restart dev server** (if running):
   ```bash
   # Press Ctrl+C to stop
   bun run dev
   ```

---

## Testing Without MSG91

If you don't have MSG91 set up yet:

1. **Use Dev Mode** on the login page
2. OTP will always be `123456`
3. OTP still gets saved to database but not sent via email/SMS
4. Perfect for testing!

---

## Security Notes

⚠️ **NEVER commit `.env` to Git!**

✅ `.gitignore` already includes `.env`

✅ Use `.env.example` as template (safe to commit)

✅ In production, set these in your hosting platform's environment variables

---

## Verification Checklist

- [ ] DATABASE_URL connects to NeonDB
- [ ] MSG91_AUTH_KEY is valid
- [ ] MSG91_EMAIL_SENDER_EMAIL is verified in MSG91
- [ ] CRON_SECRET is a random string
- [ ] NODE_ENV is set correctly
- [ ] `.env` file is not committed to Git

---

## Example `.env` File

```env
# Working example (replace with your values)

DATABASE_URL="postgresql://myuser:mypass@ep-cool-paper-123456.us-east-1.aws.neon.tech:5432/hospital_db?sslmode=require"

MSG91_AUTH_KEY="348945834985HGKJHGKJH45"
MSG91_EMAIL_SENDER_EMAIL="noreply@cityhospital.com"
MSG91_EMAIL_SENDER_NAME="City Hospital"
MSG91_TEMPLATE_ID="6543ab21cd98ef012345"

CRON_SECRET="8y9w3h4tg9w3h4tg9w3h4t"

NODE_ENV="development"
```

---

**Once configured, start the server and test! 🚀**

```bash
bun run dev
```

