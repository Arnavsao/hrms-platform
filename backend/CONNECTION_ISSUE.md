# Database Connection Issue - DNS Resolution Failed

## Problem
The DNS lookup for `db.dwzxawcllpolpezulpun.supabase.co` is failing. This could be due to:

1. **IPv4/IPv6 Compatibility**: Your Supabase project might not support direct IPv4 connections
2. **Connection Pooling Required**: Some Supabase projects require connection pooling
3. **Region-Specific Hostname**: The database hostname might be different based on your region

## Solution Options

### Option 1: Use Connection Pooling (Recommended)

In your Supabase Dashboard:
1. Go to **Settings → Database**
2. Find **"Connection string"** section
3. Change **"Method"** dropdown to **"Session mode"** or **"Transaction mode"**
4. Copy the new connection string (it will have a different hostname like `aws-0-[region].pooler.supabase.com`)
5. Update your `.env` file with this connection string

### Option 2: Check Your Region

Your database hostname might be region-specific. Check your Supabase dashboard for the exact hostname.

### Option 3: Use Supabase Dashboard SQL Editor

As a temporary workaround, you can run migrations directly in Supabase:

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy contents of `supabase/migrations/001_init.sql`
3. Paste and run it
4. Copy contents of `supabase/migrations/002_rls.sql`
5. Paste and run it

## Current Connection String Format

Your current connection string:
```
postgresql://postgres:[YOUR-PASSWORD]@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres
```

This should work, but the DNS resolution is failing. Please check your Supabase dashboard for the correct connection string format.

## Next Steps

1. **Check Supabase Dashboard** → Settings → Database → Connection string
2. **Try Session Pooler** instead of Direct connection
3. **Copy the exact connection string** from the dashboard
4. **Update your .env file** with the correct connection string
5. **Run migrations again**

