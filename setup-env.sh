#!/bin/bash

# Setup script for HRMS Platform Environment Variables

echo "Setting up environment variables for HRMS Platform..."

# Create frontend .env.local file
cat > frontend/.env.local << 'EOF'
# Frontend Environment Variables
# Update these values with your actual Supabase project details

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API URL (for frontend to connect)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Environment
NODE_ENV=development
EOF

# Create backend .env file
cat > backend/.env << 'EOF'
# Backend Environment Variables
# Update these values with your actual configuration

# Supabase Configuration
SUPABASE_SERVICE_KEY=your-service-key-here
DATABASE_URL=postgresql://user:password@host:port/database

# AI Configuration
OPENROUTER_API_KEY=your-openrouter-api-key
GEMINI_API_KEY=your-gemini-api-key

# Environment
PYTHON_ENV=development

# Optional: File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_RESUME_FORMATS=pdf,doc,docx

# Optional: AI Service Configuration
AI_MODEL=google/gemini-2.0-flash
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2048

# Optional: Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Optional: Logging
LOG_LEVEL=INFO
EOF

echo "✅ Environment files created!"
echo ""
echo "📝 Next steps:"
echo "1. Update frontend/.env.local with your Supabase project details"
echo "2. Update backend/.env with your Supabase service key and database URL"
echo "3. Add your AI API keys if you want to use AI features"
echo ""
echo "🔗 Get your Supabase credentials from: https://supabase.com/dashboard"
echo "📖 See env.example files for reference values"
