# Storage Bucket Setup Guide

## Issue: "Bucket not found" Error

If you encounter the error `"Bucket not found"` when uploading resumes, you need to create the storage bucket in your Supabase project.

## Solution: Create the Storage Bucket

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar

3. **Create New Bucket**
   - Click the "New bucket" button
   - Enter bucket name: `resumes`
   - Toggle "Public bucket" to **ON** (this allows public access to uploaded resumes)
   - Click "Create bucket"

4. **Configure Bucket Settings (Optional)**
   - Click on the `resumes` bucket
   - Go to "Settings" tab
   - Set file size limit: `10485760` (10MB)
   - Add allowed MIME types:
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Option 2: Using Supabase SQL Editor

Run this SQL in your Supabase SQL Editor:

```sql
-- Create the resumes storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  true,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;
```

### Option 3: Using the Python Script

Try running the provided script:

```bash
cd backend
source venv/bin/activate
python create_storage_bucket.py
```

**Note:** This may fail due to API permissions. If it does, use Option 1 (Dashboard) instead.

## Verify Bucket Creation

After creating the bucket:

1. Go to Storage → `resumes` bucket
2. You should see an empty bucket
3. Try uploading a resume again through the application

## Troubleshooting

### Error: "Bucket not found"
- **Cause:** The `resumes` bucket doesn't exist in your Supabase project
- **Solution:** Follow Option 1 above to create the bucket

### Error: "Permission denied" or "Access denied"
- **Cause:** Row Level Security (RLS) policies may be blocking access
- **Solution:** 
  1. Go to Storage → `resumes` bucket → Policies
  2. Ensure there are policies allowing uploads
  3. Or temporarily disable RLS for testing (not recommended for production)

### Error: "File size exceeds limit"
- **Cause:** File is larger than 10MB
- **Solution:** Compress the PDF or use a smaller file

### Error: "Invalid file type"
- **Cause:** File type is not PDF, DOC, or DOCX
- **Solution:** Convert your resume to one of the supported formats

## Required Bucket Configuration

- **Name:** `resumes` (must match exactly)
- **Public:** Yes (required for public URL access)
- **File Size Limit:** 10MB (10485760 bytes)
- **Allowed MIME Types:**
  - `application/pdf`
  - `application/msword` (DOC)
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)

## After Setup

Once the bucket is created, resume uploads should work automatically. The application will:
1. Upload the resume file to the `resumes` bucket
2. Generate a public URL for the resume
3. Parse the resume using AI (Gemini)
4. Store candidate data in the database
