# Troubleshooting Backend Connection Issues

## Quick Checklist

### 1. Verify Backend is Running
```bash
# Check if backend is running
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","environment":"development"}
```

### 2. Check Backend Process
```bash
# Check if uvicorn is running
ps aux | grep uvicorn

# If not running, start it:
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Verify Frontend Environment
```bash
# Check if NEXT_PUBLIC_API_URL is set
cd frontend
grep NEXT_PUBLIC_API_URL .env.local

# Should show:
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Restart Frontend (if needed)
If you changed `.env.local`, restart Next.js:
```bash
# Stop the frontend (Ctrl+C)
# Then restart:
cd frontend
npm run dev
```

### 5. Test Backend API Directly
```bash
# Test health endpoint
curl http://localhost:8000/health

# Test leave endpoint (will error but confirms server is up)
curl http://localhost:8000/api/leave/requests

# Test with CORS
curl -H "Origin: http://localhost:3000" http://localhost:8000/api/leave/requests
```

## Common Issues

### Issue: "Unable to connect to server"
**Solutions:**
1. **Backend not running**: Start backend with `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
2. **Port conflict**: Check if port 8000 is already in use: `lsof -ti:8000`
3. **Firewall**: Check if firewall is blocking localhost:8000
4. **Frontend env**: Verify `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`

### Issue: CORS Error
**Solutions:**
1. **Check CORS config**: Verify `CORS_ORIGINS` in `backend/.env` includes `http://localhost:3000`
2. **Restart backend**: After changing CORS config, restart the backend
3. **Check browser console**: Look for specific CORS error messages

### Issue: 500 Internal Server Error
**Solutions:**
1. **Check backend logs**: Look at terminal where backend is running
2. **Check syntax**: Run `python3 -m py_compile app/api/leave.py` in backend directory
3. **Verify database connection**: Check Supabase credentials in `backend/.env`

### Issue: Frontend not picking up API changes
**Solutions:**
1. **Restart Next.js**: Stop and restart `npm run dev`
2. **Clear browser cache**: Hard refresh (Cmd+Shift+R on Mac)
3. **Check .env.local**: Ensure `NEXT_PUBLIC_API_URL` is set correctly

## Debug Commands

```bash
# Check backend health
curl http://localhost:8000/health

# Check if backend process is running
ps aux | grep uvicorn

# Check what's on port 8000
lsof -ti:8000

# Test API endpoint
curl http://localhost:8000/api/leave/requests

# View backend logs (if running in foreground)
# Look at the terminal where uvicorn is running

# Check frontend env
cd frontend && cat .env.local | grep API_URL
```

## Current Backend Status

- **Backend URL**: http://localhost:8000
- **Health Endpoint**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs
- **Frontend URL**: http://localhost:3000
- **API Base URL**: Should be set in `frontend/.env.local` as `NEXT_PUBLIC_API_URL=http://localhost:8000`

