# Backend Testing Guide

## Overview

This directory contains integration tests for the AI-powered HRMS backend services.

## Test Structure

```
tests/
├── test_ai_services.py    # Tests for AI services (parsing, matching, screening)
├── test_api.py            # Tests for FastAPI endpoints
└── README.md             # This file
```

## Running Tests

### Prerequisites

1. Activate the virtual environment:
```bash
cd backend
source venv/bin/activate
```

2. Install test dependencies:
```bash
pip install pytest pytest-asyncio httpx
```

### Run All Tests

```bash
pytest tests/ -v
```

### Run Specific Test Files

```bash
# Run only AI service tests
pytest tests/test_ai_services.py -v

# Run only API tests
pytest tests/test_api.py -v
```

### Run Specific Tests

```bash
# Run a specific test class
pytest tests/test_ai_services.py::TestResumeParsing -v

# Run a specific test function
pytest tests/test_ai_services.py::TestResumeParsing::test_parse_resume_with_ai -v
```

### Run with Coverage

```bash
# Install coverage tool
pip install pytest-cov

# Run with coverage report
pytest --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html
```

## Test Categories

### Unit Tests
- Fast execution
- Mock external dependencies
- Test individual functions
- No database required

### Integration Tests
- Test API endpoints
- Test full workflows
- May require Supabase setup
- Marked with `@pytest.mark.skip` if requiring setup

## Configuration

Tests are configured via `pytest.ini` in the backend directory.

Key settings:
- `asyncio_mode = auto` - Handles async tests automatically
- `addopts = -v` - Verbose output
- `testpaths = tests` - Test directory

## Markers

Use pytest markers to categorize tests:

```python
@pytest.mark.slow
def test_something_slow():
    pass

@pytest.mark.ai
def test_ai_feature():
    pass

@pytest.mark.integration
def test_database_feature():
    pass
```

Run only specific markers:
```bash
pytest -m "slow"     # Run only slow tests
pytest -m "not slow" # Skip slow tests
```

## Mocking External Services

Tests use mocks to avoid calling external APIs (Gemini, etc.):

```python
with patch('app.services.ai_parser.genai.GenerativeModel') as mock_model:
    # Mock the Gemini response
    mock_instance = Mock()
    mock_response = Mock()
    mock_response.text = '{"name": "John Doe", ...}'
    mock_instance.generate_content.return_value = mock_response
    mock_model.return_value = mock_instance
    
    # Now run your test
    result = await parse_resume_with_ai("...")
```

## Environment Variables

Some tests require environment variables. Create a `.env.test` file:

```bash
# .env.test
GEMINI_API_KEY=test-key
SUPABASE_URL=test-url
SUPABASE_KEY=test-key
```

Load test environment:
```bash
pytest --envfile=.env.test
```

## Continuous Integration

Tests can be run in CI/CD pipelines:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    cd backend
    source venv/bin/activate
    pytest tests/ -v --tb=short
```

## Troubleshooting

### Import Errors
```bash
# Make sure you're in the correct directory
cd backend
source venv/bin/activate
```

### Module Not Found
```bash
# Install missing dependencies
pip install -r requirements.txt
```

### Async Warning
```
# Ensure pytest-asyncio is installed
pip install pytest-asyncio
```

### Supabase Connection Errors
```
# Tests that require Supabase are skipped by default
# To run them, configure Supabase credentials in .env
```

## Best Practices

1. **Mock External Services**: Don't call real APIs in tests
2. **Test Independence**: Each test should be independent
3. **Clear Names**: Use descriptive test names
4. **Assertions**: Make clear assertions about expected behavior
5. **Fixtures**: Use pytest fixtures for common setup

Example fixture:
```python
@pytest.fixture
def sample_resume_text():
    return """
    John Doe
    Software Engineer
    ...
    """
```

## Coverage Goals

Target coverage:
- AI Services: 80%+
- API Endpoints: 70%+
- Critical Paths: 100%

Check coverage:
```bash
pytest --cov=app --cov-report=term-missing
```

## Contributing

When adding new tests:
1. Follow naming convention: `test_<feature>.py`
2. Use descriptive test function names: `test_<what>_<expectation>`
3. Add docstrings explaining the test
4. Mock external dependencies
5. Add to appropriate category (unit/integration)

