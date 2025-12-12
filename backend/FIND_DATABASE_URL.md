# How to Find Your Database Connection URL

## ❌ This is NOT what you need:
```
https://mcp.supabase.com/mcp?project_ref=dwzxawcllpolpezulpun
```
This is an MCP server URL, not a database connection string.

## ✅ This IS what you need:
```
postgresql://postgres:[YOUR-PASSWORD]@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres
```

## Step-by-Step Guide to Find It:

### Method 1: From Supabase Dashboard (Easiest)

1. **Go to your Supabase Dashboard:**
   - https://supabase.com/dashboard/project/dwzxawcllpolpezulpun

2. **Navigate to Settings → Database:**
   - Click on **Settings** (gear icon) in the left sidebar
   - Click on **Database** in the settings menu

3. **Find "Connection string" section:**
   - Scroll down to find **"Connection string"** or **"Connection pooling"**
   - You'll see tabs like: "URI", "JDBC", "Golang", etc.
   - Click on the **"URI"** tab

4. **Copy the connection string:**
   - It will look like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres
     ```
   - **Copy the entire string** - this is your `DATABASE_URL`

### Method 2: Get Password Separately

If you only see the password field (not full connection string):

1. **Copy the password** from the "Database password" field
2. **Use this format:**
   ```
   postgresql://postgres:YOUR_PASSWORD@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres
   ```
   Replace `YOUR_PASSWORD` with the actual password

### Method 3: Reset Password

If you don't know your password:

1. Go to: **Settings → Database**
2. Click **"Reset Database Password"**
3. Copy the new password
4. Use format:
   ```
   postgresql://postgres:NEW_PASSWORD@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres
   ```

## What Each Part Means:

```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
│          │         │          │   │              │         │    │
│          │         │          │   │              │         │    └─ Database name (always "postgres")
│          │         │          │   │              │         └────── Port (always 5432)
│          │         │          │   │              └──────────────── Supabase domain
│          │         │          │   └──────────────────────────────── Your project reference
│          │         │          └──────────────────────────────────── Database host
│          │         └─────────────────────────────────────────────── Your database password
│          └────────────────────────────────────────────────────────── Database user (always "postgres")
└───────────────────────────────────────────────────────────────────── Protocol
```

## Your Project Details:

- **Project Reference:** `dwzxawcllpolpezulpun` ✅ (this is correct!)
- **Database Host:** `db.dwzxawcllpolpezulpun.supabase.co`
- **Port:** `5432`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** ⚠️ You need to get this from Supabase dashboard

## Quick Test:

Once you have the full connection string, you can test it:

```bash
# Test connection (replace with your actual password)
psql "postgresql://postgres:YOUR_PASSWORD@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres" -c "SELECT version();"
```

If this works, your connection string is correct!

