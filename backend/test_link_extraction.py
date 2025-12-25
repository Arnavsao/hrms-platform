#!/usr/bin/env python3
"""Test script to verify PDF link extraction from Arnav's resume"""

import asyncio
from app.services.ai_parser import parse_resume

async def test_resume_parsing():
    # Read the resume file
    resume_path = "/Users/arnavsao/Downloads/New UpdatedResume 2025 /Arnav Sao's Resume.pdf"

    print("=== Testing Resume Link Extraction ===\n")

    with open(resume_path, 'rb') as f:
        content = f.read()

    print(f"Resume file size: {len(content)} bytes")
    print(f"Testing with: {resume_path}\n")

    try:
        result = await parse_resume(
            content=content,
            filename="Arnav Sao's Resume.pdf",
            resume_url="test://local"
        )

        print("✓ Resume parsed successfully!\n")
        print(f"Candidate ID: {result.candidate_id}")
        print(f"Name: {result.parsed_data.name}")
        print(f"Email: {result.parsed_data.email}")
        print(f"Phone: {result.parsed_data.phone}")
        print(f"Skills: {len(result.parsed_data.skills)} skills found")
        print(f"\n=== EXTRACTED LINKS ===")
        print(f"GitHub: {result.parsed_data.links.get('github', 'NOT FOUND')}")
        print(f"LinkedIn: {result.parsed_data.links.get('linkedin', 'NOT FOUND')}")
        print(f"Portfolio: {result.parsed_data.links.get('portfolio', 'NOT FOUND')}")
        print("\n✓ Test completed successfully!")

        # Verify links are extracted
        if result.parsed_data.links.get('github'):
            print("\n✓ GitHub link extracted successfully!")
        else:
            print("\n✗ GitHub link NOT extracted")

        if result.parsed_data.links.get('linkedin'):
            print("✓ LinkedIn link extracted successfully!")
        else:
            print("✗ LinkedIn link NOT extracted")

        if result.parsed_data.links.get('portfolio'):
            print("✓ Portfolio link extracted successfully!")
        else:
            print("✗ Portfolio link NOT extracted")

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_resume_parsing())
