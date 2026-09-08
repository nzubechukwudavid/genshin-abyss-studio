# Phase 3: Example Workflows - Research

**Researched:** 2026-01-23
**Domain:** Example workflow creation for teaching API patterns and file operations
**Confidence:** HIGH

## Summary

This research examines best practices for creating educational example workflows that demonstrate the DOE framework pattern (directive + script + version sync). The goal is to provide two simple, working examples: (1) a file utility workflow requiring no external API, and (2) a simple API workflow that demonstrates the environment variable/API key pattern using python-dotenv.

Research shows that effective example workflows follow key principles: they should be immediately runnable, teach by demonstration rather than explanation, use realistic but simple use cases, and clearly show the pattern they're meant to teach. For teaching API patterns specifically, the python-dotenv library is the 2026 standard for managing API keys securely, with `.env` files containing secrets that are excluded from version control.

The framework already has excellent templates (`_TEMPLATE.md` and `_TEMPLATE.py`) and existing infrastructure (`doe_utils.py`, `sync_agent_files.py`). The example workflows should leverage these existing patterns while being simple enough that a new user can understand them in under 5 minutes each.

**Primary recommendation:** Create two minimal but complete examples: (1) a CSV-to-JSON converter showing file I/O patterns, and (2) a simple HTTP API request workflow showing dotenv + requests pattern with graceful handling of missing API keys.

## Standard Stack

The example workflows should use only standard Python libraries plus the minimum necessary dependencies that are already established in the template.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python | 3.10+ | Runtime | Established in prior decisions (D2) |
| python-dotenv | 1.0+ | Environment variables | Industry standard for API key management |
| argparse | stdlib | CLI arguments | Standard library, matches template pattern |
| pathlib | stdlib | File paths | Modern Python path handling |
| json | stdlib | JSON processing | Standard library, universally available |
| csv | stdlib | CSV processing | Standard library, perfect for simple file example |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| requests | 2.31+ | HTTP requests | For API example only (not file utility) |
| os | stdlib | Environment access | Used with dotenv for API keys |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| csv module | pandas | More powerful but adds heavy dependency for simple example |
| requests | urllib | Standard library but more verbose, less beginner-friendly |
| json module | simplejson | No benefit for simple examples |

**Installation:**
```bash
# Already in .env.example - no additional setup needed
pip install python-dotenv requests
```

## Architecture Patterns

### Pattern 1: Simple File Utility Workflow (No External API)

**What:** A workflow that processes files using only standard library + file system operations. No network, no API keys, no external services.

**When to use:** To teach the basic directive + script pattern without complications of API keys or network dependencies.

**Example use case:** CSV-to-JSON converter
- Input: CSV file path
- Process: Read CSV, convert to JSON structure
- Output: JSON file or stdout
- Success criteria: User can run `python execution/csv_to_json.py input.csv` immediately

**Why CSV-to-JSON:**
- Realistic use case (common data conversion task)
- Demonstrates file I/O patterns
- Shows error handling (file not found, malformed CSV)
- No dependencies beyond standard library
- Output is visible and verifiable
- Teaches: argparse, pathlib, csv module, json module, error handling

**Template alignment:**
```python
# Matches _TEMPLATE.py structure
DOE_VERSION = "2026.01.23"  # Syncs with directive

def main():
    parser = argparse.ArgumentParser(description="Convert CSV to JSON")
    parser.add_argument("input", help="Input CSV file path")
    parser.add_argument("--output", help="Output JSON file (default: stdout)")
    args = parser.parse_args()

    # File processing logic here
    # Follows template error handling pattern
```

**Source:** [Working with CSV and JSON Files in Python](https://www.cromacampus.com/blogs/working-with-csv-and-json-files-in-python/), [Automate the Boring Stuff - CSV, JSON, and XML Files](https://automatetheboringstuff.com/3e/chapter18.html)

### Pattern 2: Simple API Workflow with Environment Variables

**What:** A workflow that makes one HTTP request to a public API, demonstrating the dotenv + environment variable pattern for API key management.

**When to use:** To teach secure API key handling, environment variable patterns, and graceful handling of missing credentials.

**Example use case:** Weather lookup using OpenWeatherMap API (or similar free API)
- Input: City name (CLI argument)
- Process: Load API key from .env, make HTTP GET request
- Output: Formatted weather data or clear error message
- Success criteria:
  - WITH API key: Makes request, shows result
  - WITHOUT API key: Shows helpful error message explaining how to set up .env

**Why weather API:**
- Free tier available (OpenWeatherMap, WeatherAPI)
- Simple GET request (no authentication complexity)
- Immediately useful output
- Demonstrates all key patterns: dotenv, requests, error handling, API key validation
- Teaches: Environment variables, HTTP requests, JSON parsing, error messages

**API Key Pattern (2026 Best Practice):**
```python
from dotenv import load_dotenv
import os

load_dotenv()  # Loads .env file

API_KEY = os.getenv("WEATHER_API_KEY")

def main():
    # Validate at startup (recommended pattern)
    if not API_KEY:
        print("ERROR: WEATHER_API_KEY not set in .env")
        print("Get a free key at: https://openweathermap.org/api")
        print("Add to .env: WEATHER_API_KEY=your_key_here")
        return 1

    # Make API request with key
    # Handle API errors gracefully
```

**Key security practices demonstrated:**
1. Never hardcode API keys
2. Use .env file (gitignored)
3. Validate environment variables at startup
4. Provide helpful error messages
5. Show users exactly where to get API keys

**Source:** [Managing API Keys and Secrets in Python Using the Dotenv Library](https://plainenglish.io/blog/managing-api-keys-and-secrets-in-python-using-the-dotenv-library-a-beginners-guide), [Storing Environment Variables and API Keys in Python](https://medium.com/@alwinraju/%EF%B8%8F-storing-environment-variables-and-api-keys-in-python-475144b2f098), [API Key Best Practices - Claude Help Center](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure)

### Pattern 3: Educational Example Structure

**What:** The structure that makes examples effective for teaching.

**Key elements:**
1. **Clear trigger phrases** in directive (e.g., "convert csv to json", "check weather")
2. **Immediate runnability** - no setup beyond what template already requires
3. **Visible output** - user sees result immediately
4. **Helpful errors** - when things fail, user knows exactly what to fix
5. **Version sync** - directive and script have matching DOE-VERSION tags
6. **Documentation in directive** - What It Does, Quick Start, Output sections fully populated

**Source:** [Code samples best practices - I'd Rather Be Writing](https://idratherbewriting.com/learnapidoc/docapis_codesamples_bestpractices.html), [Learn API fundamentals with interactive hands-on tutorial](https://n8n.io/workflows/5171-learn-api-fundamentals-with-an-interactive-hands-on-tutorial-workflow/)

### Anti-Patterns to Avoid

- **Complex First Example:** Don't start with multi-step workflows or complex APIs. Simple file operations teach the pattern without distractions.

- **Hidden Dependencies:** Don't use libraries not listed in requirements.txt or that require separate installation steps beyond `pip install -r requirements.txt`.

- **API Examples Without Fallback:** Don't create API examples that only work if the user has an API key. Always provide a clear error message guiding them to get one.

- **Incomplete Directives:** Don't skimp on directive documentation for examples. Examples should be the MOST complete directives, not the least.

- **Version Tag Neglect:** Don't forget to sync version tags between directive and script. Examples should demonstrate version control best practices.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API key management | Custom config parser | python-dotenv | Industry standard, handles edge cases, well-tested |
| CSV parsing | String splitting | csv module | Handles quoted fields, escaping, malformed data |
| JSON generation | Manual string concatenation | json.dumps() | Proper escaping, type handling, formatting |
| HTTP requests | Raw sockets | requests library | Error handling, redirects, encoding, cookies |
| File path handling | String concatenation | pathlib.Path | Cross-platform, proper separators, existence checks |
| CLI argument parsing | sys.argv slicing | argparse | Help text, validation, type conversion, error messages |

**Key insight:** Example workflows should demonstrate GOOD practices, not reinvent the wheel. Use standard libraries to teach patterns, not to show off custom implementations.

## Common Pitfalls

### Pitfall 1: Examples Too Complex

**What goes wrong:** You create an example that chains multiple APIs, has complex business logic, or requires understanding of domain-specific concepts. New users can't understand it.

**Why it happens:** Trying to make examples "realistic" or "useful" instead of "educational". Real workflows can be complex; examples must be simple.

**How to avoid:**
- Rule of thumb: User should understand the example in under 5 minutes
- Single responsibility: One example teaches ONE pattern (file I/O OR API calls, not both)
- No business logic: Keep processing trivial (CSV to JSON, not "sales analysis pipeline")
- Minimal dependencies: Use standard library wherever possible

**Warning signs:** Example requires reading documentation for libraries other than the DOE framework itself.

### Pitfall 2: Missing API Key Causes Silent Failure

**What goes wrong:** API example fails with cryptic error when user doesn't have API key. User doesn't know what to do.

**Why it happens:** Not validating environment variables before attempting API calls. Letting exceptions bubble up without context.

**How to avoid:**
```python
# GOOD: Validate at startup
if not API_KEY:
    print("ERROR: API_KEY not set")
    print("1. Get key at: https://example.com/api")
    print("2. Add to .env: API_KEY=your_key_here")
    return 1

# BAD: Let it fail during request
response = requests.get(url, headers={"Authorization": API_KEY})  # None fails
```

**Warning signs:** User reports "doesn't work" without details.

### Pitfall 3: Version Tags Out of Sync

**What goes wrong:** Directive has `DOE-VERSION: 2026.01.23` but script has `DOE_VERSION = "2026.01.22"`. Framework validation fails.

**Why it happens:** Editing one file without updating the other. Not running version check after edits.

**How to avoid:**
1. Edit both directive and script together
2. Use same version tag in both
3. Run `python execution/doe_utils.py check-versions` after editing
4. Commit both files in same commit

**Warning signs:** User reports version mismatch warnings.

### Pitfall 4: Examples Not Referenced in Documentation

**What goes wrong:** You create example workflows but don't update README or CLAUDE.md to mention them. Users don't know they exist.

**Why it happens:** Focusing on creating examples without thinking about discoverability.

**How to avoid:**
- Add "Example Workflows" section to README.md
- List trigger phrases for each example
- Show quick-start command for each
- Reference examples in CLAUDE.md's "How It Works" section

**Warning signs:** Users ask "are there any examples?" after examples exist.

### Pitfall 5: Examples Depend on External Services That Break

**What goes wrong:** Weather API example uses a service that goes offline, changes its API, or removes free tier. Example stops working.

**Why it happens:** Choosing APIs based on features without considering stability.

**How to avoid:**
- File utility example: No external dependency, can't break
- API example: Use well-established free APIs (OpenWeatherMap, JSONPlaceholder, etc.)
- Document API choice reasoning in research
- Provide fallback: Show error handling for "API unavailable"

**Warning signs:** GitHub issues reporting "weather example doesn't work".

## Code Examples

### File Utility Example: CSV to JSON Structure

```python
#!/usr/bin/env python3
"""
Convert CSV file to JSON format.

Directive: directives/csv_to_json.md

Usage:
    python execution/csv_to_json.py input.csv
    python execution/csv_to_json.py input.csv --output output.json
"""

import csv
import json
import sys
import argparse
from pathlib import Path

# Version must match directive
DOE_VERSION = "2026.01.23"

def main():
    parser = argparse.ArgumentParser(
        description="Convert CSV file to JSON format"
    )
    parser.add_argument("input", help="Input CSV file path")
    parser.add_argument(
        "--output",
        help="Output JSON file (default: print to stdout)"
    )
    args = parser.parse_args()

    # Validate input
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: File not found: {args.input}")
        return 1

    try:
        # Read CSV
        with open(input_path, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            data = list(reader)

        # Convert to JSON
        json_output = json.dumps(data, indent=2)

        # Output
        if args.output:
            output_path = Path(args.output)
            output_path.write_text(json_output)
            print(f"✅ Converted {len(data)} rows")
            print(f"   Output: {args.output}")
        else:
            print(json_output)

        return 0

    except csv.Error as e:
        print(f"❌ CSV Error: {e}")
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

**Source:** Standard Python documentation for csv and json modules

### API Example: Weather Lookup Structure

```python
#!/usr/bin/env python3
"""
Look up current weather for a city.

Directive: directives/weather_lookup.md

Usage:
    python execution/weather_lookup.py "San Francisco"
"""

import os
import sys
import argparse
from dotenv import load_dotenv
import requests

load_dotenv()

# Version must match directive
DOE_VERSION = "2026.01.23"

# Configuration
API_KEY = os.getenv("WEATHER_API_KEY")
API_URL = "https://api.openweathermap.org/data/2.5/weather"

def main():
    parser = argparse.ArgumentParser(
        description="Get current weather for a city"
    )
    parser.add_argument("city", help="City name")
    args = parser.parse_args()

    # Validate environment
    if not API_KEY:
        print("❌ ERROR: WEATHER_API_KEY not set in .env")
        print()
        print("To fix:")
        print("1. Get free API key at: https://openweathermap.org/api")
        print("2. Add to .env file:")
        print("   WEATHER_API_KEY=your_key_here")
        return 1

    try:
        # Make API request
        response = requests.get(
            API_URL,
            params={"q": args.city, "appid": API_KEY, "units": "metric"}
        )
        response.raise_for_status()

        data = response.json()

        # Display result
        print(f"✅ Weather in {data['name']}:")
        print(f"   Temperature: {data['main']['temp']}°C")
        print(f"   Conditions: {data['weather'][0]['description']}")

        return 0

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print("❌ Invalid API key")
        elif e.response.status_code == 404:
            print(f"❌ City not found: {args.city}")
        else:
            print(f"❌ API Error: {e}")
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

**Source:** [python-dotenv documentation](https://pypi.org/project/python-dotenv/), [requests library documentation](https://docs.python-requests.org/)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Config files (INI, YAML) | .env files with dotenv | ~2020 | Simpler, 12-factor app pattern, better gitignore |
| urllib for HTTP | requests library | ~2015 | More intuitive API, better error handling |
| os.path | pathlib.Path | Python 3.4+ | Object-oriented, cross-platform, cleaner syntax |
| Manual arg parsing | argparse | Always preferred | Auto-generated help, type validation, better UX |
| Print to console | Structured logging | Production code | But for examples, print() is actually better (simpler) |

**Deprecated/outdated:**
- **ConfigParser for secrets:** Use dotenv for API keys (ConfigParser is for app config, not secrets)
- **urllib for simple requests:** Use requests library (urllib is verbose and error-prone)
- **sys.argv directly:** Use argparse for anything beyond trivial scripts

## Open Questions

Things that couldn't be fully resolved:

1. **Which free API to use for API example**
   - What we know: OpenWeatherMap offers free tier with 1000 calls/day, stable for 10+ years
   - What's unclear: Whether to use weather API specifically or a different domain (quotes, jokes, etc.)
   - Recommendation: Use OpenWeatherMap for weather lookup. It's practical (users can actually use it), well-documented, and stable. Alternative: JSONPlaceholder (https://jsonplaceholder.typicode.com/) for truly zero-setup testing, but less practical.

2. **Whether to include sample data files**
   - What we know: Example CSV file would make file utility immediately runnable
   - What's unclear: Whether to commit sample files or have script generate them
   - Recommendation: Include a tiny sample CSV (3-5 rows) in the repository as `data/sample.csv`. Makes example immediately runnable without setup.

3. **Level of error handling in examples**
   - What we know: Examples should teach good practices but remain readable
   - What's unclear: Balance between "complete production code" and "readable teaching code"
   - Recommendation: Include essential error handling (file not found, missing API key, HTTP errors) but skip edge cases (network timeouts, rate limiting). Comment where additional handling would go in production.

## Sources

### Primary (HIGH confidence)
- [Managing API Keys and Secrets in Python Using the Dotenv Library: A Beginner's Guide](https://plainenglish.io/blog/managing-api-keys-and-secrets-in-python-using-the-dotenv-library-a-beginners-guide)
- [Storing Environment Variables and API Keys in Python | by Alwin Raju | Medium](https://medium.com/@alwinraju/%EF%B8%8F-storing-environment-variables-and-api-keys-in-python-475144b2f098)
- [API Key Best Practices: Keeping Your Keys Safe and Secure | Claude Help Center](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure)
- [Working with CSV and JSON Files in Python](https://www.cromacampus.com/blogs/working-with-csv-and-json-files-in-python/)
- [Chapter 18 - CSV, JSON, and XML Files, Automate the Boring Stuff with Python, 3rd Ed](https://automatetheboringstuff.com/3e/chapter18.html)
- Codebase analysis: `_TEMPLATE.md`, `_TEMPLATE.py`, `doe_utils.py`, `sync_agent_files.py`

### Secondary (MEDIUM confidence)
- [Code samples best practices | I'd Rather Be Writing](https://idratherbewriting.com/learnapidoc/docapis_codesamples_bestpractices.html)
- [Learn API fundamentals with an interactive hands-on tutorial workflow | n8n](https://n8n.io/workflows/5171-learn-api-fundamentals-with-an-interactive-hands-on-tutorial-workflow/)
- [25 API Project Ideas — A Complete Student-Friendly Guide](https://bestprojectideas.com/api-project-ideas/)
- [Setting Up API Keys Securely | Env Setup](https://apxml.com/courses/python-llm-workflows/chapter-2-python-environment-setup-llm/setting-up-api-keys-securely)

### Tertiary (LOW confidence)
- [API Documentation: How to Write, Examples & Best Practices | Postman](https://www.postman.com/api-platform/api-documentation/)
- [Two approaches to API design - Resources vs Workflows](https://redocly.com/blog/api-design-approaches)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Python standard library + dotenv + requests is well-established for this use case
- Architecture patterns: HIGH - Verified against existing template structure, aligned with prior decisions
- Code examples: HIGH - Based on standard Python documentation and verified patterns
- API choice: MEDIUM - OpenWeatherMap is stable but alternatives exist; recommendation is solid but not the only option

**Research date:** 2026-01-23
**Valid until:** 90 days (technology stack stable, but API providers can change terms)
