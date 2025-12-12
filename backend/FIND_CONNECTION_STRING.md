# How to Find Your Connection String

## Current Location
You're currently on: **Settings → Database** (Database Settings page)

## Where to Find Connection String

The connection string is NOT on the Database Settings page. You need to go to:

### Option 1: Project Settings → Connection String (Easiest)

1. **Go back to your project dashboard**
   - Click on your project name or go to: https://supabase.com/dashboard/project/dwzxawcllpolpezulpun

2. **Look for "Connect to your project" or "Connection string"**
   - This might be in the left sidebar under "Project Settings"
   - Or look for a tab/section called "Connection string" or "Connect"

3. **Alternative path:**
   - Click **Settings** (gear icon) in left sidebar
   - Look for **"Connection string"** or **"Connect"** tab
   - This is different from "Database" settings

### Option 2: From the Page You Saw Earlier

Remember the page that showed:
- Title: "Connect to your project"
- Tabs: "Connection String", "App Frameworks", "Mobile Frameworks", etc.
- That's where you need to be!

**To get there:**
1. Go to your project dashboard
2. Look for a button/link that says "Connect" or "Connection string"
3. Or go to: Settings → Look for "Connection string" tab (not Database tab)

### Option 3: Direct URL (if available)

Try navigating to:
- https://supabase.com/dashboard/project/dwzxawcllpolpezulpun/settings/database
- Then look for tabs at the top: "Connection string", "Database", etc.

## What You're Looking For

On the "Connection string" page, you should see:

1. **Dropdown selectors:**
   - Type: "URI" (selected)
   - Source: "Primary Database" or "Connection Pooling"
   - Method: "Direct connection" or "Session mode" or "Transaction mode"

2. **Connection string box** with:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres
   ```
   OR (if using pooler):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

3. **Copy button** next to the connection string

## Important: Use Session Mode

Since you saw "Not IPv4 compatible" earlier:

1. On the Connection string page
2. Change **"Method"** dropdown to **"Session mode"** (instead of "Direct connection")
3. Copy the connection string that appears
4. It will have a different hostname (pooler.supabase.com instead of db.supabase.co)

## Quick Steps Summary

1. ✅ You're on: Settings → Database (current page)
2. ⬅️ Go back/up one level
3. 🔍 Look for "Connection string" tab or "Connect" section
4. 📋 Copy the connection string (use Session mode if available)
5. ✏️ Update your .env file with it

