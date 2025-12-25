# MegaLLM Migration Guide

## Overview

The HRMS platform has been migrated from Google Gemini API to MegaLLM API, which provides access to GPT-5 and 70+ other AI models through a unified interface.

## What Changed

### API Provider
- **Old**: Google Gemini API (`google-generativeai`)
- **New**: MegaLLM API (OpenAI-compatible)

### Model
- **Old**: `gemini-1.5-flash`
- **New**: `gpt-5`

### Configuration
- **Old**: `GEMINI_API_KEY` environment variable
- **New**: `MEGALLM_API_KEY` environment variable

## Migration Steps

### 1. Update Environment Variables

Update your `.env` file in the `backend/` directory:

```bash
# Remove or comment out old Gemini key
# GEMINI_API_KEY=your-gemini-api-key

# Add new MegaLLM key
MEGALLM_API_KEY=your-megallm-api-key

# Update model name
AI_MODEL=gpt-5
```

### 2. Get Your MegaLLM API Key

1. Sign up at [MegaLLM](https://megallm.io)
2. Navigate to your dashboard
3. Copy your API key
4. Add it to your `.env` file as `MEGALLM_API_KEY`

### 3. Restart Backend Server

The backend server needs to be restarted to pick up the new environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Code Changes

### New AI Client Module

A new unified AI client has been created at `backend/app/core/ai_client.py`:
- `get_ai_client()`: Returns OpenAI-compatible client configured for MegaLLM
- `generate_ai_response()`: Helper function for text generation
- `generate_json_response()`: Helper function for JSON responses

### Updated Services

All AI services have been updated to use the new MegaLLM client:
- ✅ `ai_parser.py` - Resume parsing
- ✅ `ai_matching.py` - Candidate-job matching
- ✅ `ai_screening.py` - Screening questions and evaluation

## Benefits

1. **Unified Interface**: Access 70+ models through one API
2. **Better Model**: GPT-5 provides improved reasoning and accuracy
3. **Automatic Fallbacks**: MegaLLM can automatically switch models if one fails
4. **Future-Proof**: Easy to switch models by changing one parameter

## Testing

After migration, test the following features:

1. **Resume Parsing**: Upload a resume and verify it parses correctly
2. **Candidate Matching**: Test candidate-job matching functionality
3. **Screening**: Generate screening questions and evaluate responses

## Troubleshooting

### Error: "MEGALLM_API_KEY is not configured"
- **Solution**: Make sure `MEGALLM_API_KEY` is set in your `.env` file

### Error: "Model not found" or "Invalid model"
- **Solution**: Verify `AI_MODEL=gpt-5` in your `.env` file. Model name must match exactly.

### Error: "API request failed"
- **Solution**: 
  1. Verify your API key is correct
  2. Check your MegaLLM account has credits/quota
  3. Verify network connectivity

### Legacy Support

The old `GEMINI_API_KEY` configuration is still supported for backward compatibility but is deprecated. It's recommended to migrate to MegaLLM for better performance and features.

## Model Options

You can switch models by changing the `AI_MODEL` environment variable:

- `gpt-5` - Recommended for complex reasoning (default)
- `gpt-4o` - Fast and cost-effective
- `claude-3.7-sonnet` - Great for analysis
- `claude-opus-4-1-20250805` - Best for creative tasks
- `gemini-2.5-pro` - Alternative reasoning model

See [MegaLLM Models Catalog](https://megallm.io/docs/models) for full list.

## Support

For issues or questions:
- MegaLLM Documentation: https://megallm.io/docs
- MegaLLM Support: support@megallm.io
- Project Issues: Open an issue in the repository
