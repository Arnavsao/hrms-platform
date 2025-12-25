#!/usr/bin/env python3
"""
Quick script to check and validate environment configuration for MegaLLM migration.
"""

import os
from pathlib import Path

def check_env_file():
    """Check backend .env file for proper MegaLLM configuration."""
    env_path = Path(__file__).parent / ".env"
    
    print("\n" + "="*60)
    print("HRMS Platform - Environment Configuration Check")
    print("="*60)
    print()
    
    if not env_path.exists():
        print("❌ .env file not found!")
        print(f"   Expected location: {env_path}")
        print()
        print("📝 Create a .env file based on env.example:")
        print(f"   cp {env_path.parent}/env.example {env_path}")
        return False
    
    print(f"✓ Found .env file: {env_path}")
    print()
    
    # Read .env file
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
    
    issues = []
    warnings = []
    
    # Check for MEGALLM_API_KEY
    if 'MEGALLM_API_KEY' not in env_vars or not env_vars['MEGALLM_API_KEY'] or env_vars['MEGALLM_API_KEY'] == 'your-megallm-api-key':
        issues.append("❌ MEGALLM_API_KEY is missing or not set")
    else:
        print("✓ MEGALLM_API_KEY is configured")
    
    # Check AI_MODEL
    ai_model = env_vars.get('AI_MODEL', 'gpt-5')
    if ai_model.startswith('google/'):
        warnings.append(f"⚠️  AI_MODEL has 'google/' prefix: {ai_model}")
        warnings.append("   This will be automatically fixed, but update your .env file")
    elif 'gemini' in ai_model.lower():
        warnings.append(f"⚠️  Legacy Gemini model detected: {ai_model}")
        warnings.append("   This will be automatically converted to 'gpt-5'")
    elif ai_model != 'gpt-5':
        print(f"ℹ️  AI_MODEL is set to: {ai_model}")
        print("   (Default is 'gpt-5', but your custom model should work)")
    else:
        print("✓ AI_MODEL is set to 'gpt-5'")
    
    # Check for old GEMINI_API_KEY (should be removed or commented)
    if 'GEMINI_API_KEY' in env_vars and env_vars['GEMINI_API_KEY'] and env_vars['GEMINI_API_KEY'] != 'your-gemini-api-key':
        warnings.append("⚠️  GEMINI_API_KEY is still set (deprecated)")
        warnings.append("   You can remove it or comment it out")
    
    print()
    
    if issues:
        print("="*60)
        print("ISSUES FOUND:")
        print("="*60)
        for issue in issues:
            print(issue)
        print()
    
    if warnings:
        print("="*60)
        print("WARNINGS:")
        print("="*60)
        for warning in warnings:
            print(warning)
        print()
    
    if not issues and not warnings:
        print("="*60)
        print("✓ All checks passed! Configuration looks good.")
        print("="*60)
        print()
        return True
    elif issues:
        print("="*60)
        print("❌ Please fix the issues above before running the server.")
        print("="*60)
        print()
        return False
    else:
        print("="*60)
        print("⚠️  Configuration has warnings but should work.")
        print("="*60)
        print()
        return True

if __name__ == "__main__":
    success = check_env_file()
    exit(0 if success else 1)
