# Phase 1: Critical Fixes - Research

**Researched:** 2026-01-23
**Domain:** Python project configuration, documentation consistency, version management
**Confidence:** HIGH

## Summary

This phase addresses critical bugs preventing first-run success. The domain is straightforward: Python dependency management, documentation consistency, and file synchronization. These are well-established practices with clear best practices.

The fixes fall into three categories:
1. **Documentation consistency** - Establishing CLAUDE.md as canonical source
2. **Python configuration** - Adding requirements.txt and updating version requirements
3. **Code alignment** - Ensuring sync script and docs match decisions

**Primary recommendation:** Use standard Python packaging patterns (requirements.txt with `>=` version specs, `requires-python = ">=3.10"` for future migration). Document canonical source explicitly and update sync script default.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| python-dotenv | >=1.0.0 | Load environment variables from .env | Industry standard for 12-factor apps, 1.x is stable |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| pip | Latest | Package installation | Standard Python package manager |
| requirements.txt | N/A | Dependency specification | Standard for Python projects without complex build needs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| requirements.txt | pyproject.toml | More modern but adds complexity; defer until Phase 2 |
| Manual .env loading | python-dotenv | Manual is error-prone; dotenv is 2-line solution |
| Python 3.8 | Python 3.10+ | 3.8 EOL Oct 2024; 3.10+ gives modern syntax (PEP 604 union types) |

**Installation:**
```bash
pip install -r requirements.txt
```

## Architecture Patterns

### Python Version Specification

**Pattern 1: requirements.txt for Dependencies**
**What:** Plain text file listing dependencies with version constraints
**When to use:** Simple projects without complex build requirements
**Example:**
```
# requirements.txt
python-dotenv>=1.0.0
```

**Pattern 2: Semantic Version Constraints**
**What:** Use `>=` for minimum version, avoid upper bounds unless necessary
**When to use:** Always, unless specific incompatibility known
**Rationale:**
- `>=1.0.0` allows bug fixes and minor updates
- Upper bounds (`<2.0`) can unnecessarily restrict compatibility
- Major version 1.x indicates stable API

### Documentation Consistency

**Pattern 3: Single Source of Truth (SSOT)**
**What:** One canonical file that other files mirror
**When to use:** Multiple files must contain identical content
**Implementation:**
1. Declare canonical source explicitly in docs
2. Configure sync tooling to use canonical as default
3. Document in sync tool comments/help text
4. Add comments in mirrored files pointing to canonical

**Example:**
```markdown
<!-- CLAUDE.md is the canonical source -->
<!-- Edit CLAUDE.md, then sync: python execution/sync_agent_files.py --sync -->
```

### Git Patterns for Temporary Files

**Pattern 4: .gitignore with Preserved Markers**
**What:** Ignore directory contents but preserve structure markers
**When to use:** Temporary directories that must exist but contain generated files
**Example:**
```gitignore
# Ignore contents
.tmp/*

# Preserve directory structure
!.tmp/.gitkeep
```

**Note:** Pattern works because .gitkeep is a direct child of .tmp (not nested deeper)

### Anti-Patterns to Avoid

- **Split documentation sources:** Don't maintain separate "versions" of docs that should be identical
- **Implicit canonical source:** Don't rely on convention; state it explicitly
- **Version mismatches:** Code behavior (DEFAULT_SOURCE) must match documentation
- **Upper bound version pinning without reason:** `python-dotenv<2.0` is premature; wait for actual incompatibility

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading .env files | Custom parser | python-dotenv | Handles edge cases (quotes, comments, multiline, encoding) |
| Version comparison | String parsing | packaging.version | Handles alpha/beta/rc, epochs, local versions |
| File syncing | Manual copy | Existing sync_agent_files.py | Already handles detection, backups, errors |

**Key insight:** Environment file parsing looks trivial but has subtle complexity (variable expansion, quote handling, comment syntax, whitespace rules). python-dotenv is 1.5K lines for a reason.

## Common Pitfalls

### Pitfall 1: Union Type Syntax Python Version Mismatch
**What goes wrong:** Code uses `str | None` syntax but docs say "Python 3.8+"
**Why it happens:** PEP 604 union operator (`X | Y`) only available in Python 3.10+
**How to avoid:**
- Grep codebase for `| None` or `str |` patterns
- Update all version requirements to match actual syntax used
- Consider adding CI check or pre-commit hook
**Warning signs:** TypeError: unsupported operand type(s) for |: 'type' and 'type'

### Pitfall 2: .gitignore Negation Order
**What goes wrong:** `.tmp/.gitkeep` not preserved despite negation pattern
**Why it happens:** If parent directory excluded via `.tmp/`, negation won't work
**How to avoid:**
- Use `.tmp/*` not `.tmp/` to exclude contents
- Negation `!.tmp/.gitkeep` must come after
- Test with `git check-ignore -v .tmp/.gitkeep`
**Warning signs:** `git status` shows empty .tmp directory as untracked

### Pitfall 3: DEFAULT_SOURCE in Code vs Documentation
**What goes wrong:** Docs say "CLAUDE.md is canonical" but code uses AGENTS.md as fallback
**Why it happens:** Documentation updated but code not synced
**How to avoid:**
- Grep for DEFAULT_SOURCE assignments
- Verify matches documented canonical source
- Update comments in script to reflect new default
**Warning signs:** `--sync` without changes picks wrong source file

### Pitfall 4: Missing `## Remember` Section
**What goes wrong:** `--add-learning` fails with "section not found"
**Why it happens:** Feature expects specific heading structure
**How to avoid:**
- Check sync_agent_files.py for required section markers
- Add section to canonical source before any other file
- Test `--add-learning` after adding section
**Warning signs:** Error: "'## Remember' section not found in CLAUDE.md"

### Pitfall 5: requirements.txt with Unpinned Dependencies in Production
**What goes wrong:** `pip install -r requirements.txt` gets different versions over time
**Why it happens:** `>=` allows any newer version
**How to avoid:**
- Use `>=` for development (this phase)
- Use `pip freeze > requirements.lock` for production deployments
- Or migrate to pip-tools/Poetry for lock files
**Warning signs:** "It works on my machine" but fails in deployment

## Code Examples

Verified patterns from official sources:

### requirements.txt Format
```
# Source: pip documentation
# https://pip.pypa.io/en/stable/reference/requirements-file-format/

# Minimum version constraint (recommended for libraries)
python-dotenv>=1.0.0

# Exact pinning (for production deployments)
python-dotenv==1.0.1

# Version range (use sparingly)
python-dotenv>=1.0.0,<2.0.0

# Comments are allowed
# Blank lines ignored
```

### Python Version Check in Script
```python
# Source: Python documentation
import sys

# Check minimum Python version
if sys.version_info < (3, 10):
    print("Error: Python 3.10+ required")
    sys.exit(1)
```

### Canonical Source Documentation Pattern
```markdown
<!-- Source: Write the Docs principles -->
<!-- Single Source of Truth pattern -->
<!--
  Canonical source: CLAUDE.md
  Edit CLAUDE.md, then sync to AGENTS.md and GEMINI.md
  Sync command: python execution/sync_agent_files.py --sync
-->
```

### .gitignore with Preserved Files
```gitignore
# Source: Git documentation
# https://git-scm.com/docs/gitignore

# Ignore all files in .tmp directory
.tmp/*

# Exception: preserve .gitkeep marker
!.tmp/.gitkeep
```

### Type Hints (Python 3.10+ Compatible)
```python
# Source: PEP 604 - https://peps.python.org/pep-0604/

# Python 3.10+ syntax (current codebase uses this)
def get_file_content(filepath: Path) -> str | None:
    """Read file content, return None if file doesn't exist."""
    # ...

# Python 3.8 compatible (would need to change to this if supporting 3.8)
from typing import Union
def get_file_content(filepath: Path) -> Union[str, None]:
    """Read file content, return None if file doesn't exist."""
    # ...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setup.py only | pyproject.toml | PEP 518 (2017), widely adopted by 2023 | Modern projects use pyproject.toml (defer to Phase 2) |
| requirements.txt manual | pip-tools, Poetry, uv | 2019-2024 | Lock files for reproducibility (not urgent for this phase) |
| Union[X, Y] syntax | X \| Y syntax | Python 3.10 (2021), PEP 604 | Cleaner code, requires 3.10+ |
| Python 3.8 | Python 3.10+ | 3.8 EOL Oct 2024 | 3.10+ is safe minimum in 2026 |

**Deprecated/outdated:**
- Python 3.8: End of Life October 2024 (no security updates)
- setup.py without pyproject.toml: PEP 517/518 supersedes this pattern
- Manual .env parsing: python-dotenv is standard since ~2014

**Current best practices for 2026:**
- requirements.txt for simple projects (sufficient for this template)
- pyproject.toml for packages or complex builds
- Lock files (requirements.lock, poetry.lock) for deployment
- Python 3.10+ as minimum (3.11+ ideal, 3.12+ if no compatibility concerns)

## Open Questions

1. **Should we add pyproject.toml in this phase?**
   - What we know: pyproject.toml is modern standard, but adds complexity
   - What's unclear: Whether template users need package distribution features
   - Recommendation: Add requirements.txt now (Phase 1), defer pyproject.toml to Phase 2 "enhancements"

2. **Should .gitignore preserve entire .tmp/.gitkeep pattern?**
   - What we know: Current pattern `.tmp/` breaks negation; `.tmp/*` works
   - What's unclear: Whether any nested structure in .tmp needs preservation
   - Recommendation: Use `.tmp/*` and `!.tmp/.gitkeep` pattern (tested pattern)

3. **Cost tracking environment variables - delete or implement?**
   - What we know: Variables defined in .env.example but unused in code
   - What's unclear: Whether future features will use them
   - Recommendation: Keep for Phase 2, document as "reserved for future use"

## Sources

### Primary (HIGH confidence)
- [python-dotenv PyPI](https://pypi.org/project/python-dotenv/) - Version information and compatibility
- [pip requirements file format documentation](https://pip.pypa.io/en/stable/reference/requirements-file-format/) - Official syntax reference
- [PEP 604 - Union Types](https://peps.python.org/pep-0604/) - Python 3.10 union operator specification
- [Git gitignore documentation](https://git-scm.com/docs/gitignore) - Negation pattern rules

### Secondary (MEDIUM confidence)
- [Python Packaging Best Practices 2026](https://dasroot.net/posts/2026/01/python-packaging-best-practices-setuptools-poetry-hatch/) - Modern tooling comparison
- [Writing pyproject.toml guide](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/) - For future Phase 2 migration
- [Single Source of Truth in Technical Documentation](https://quanos.com/en/knowhow/technical-documentation/mastering-variants/single-source-of-truth-in-technical-documentation/) - Documentation consistency patterns

### Tertiary (LOW confidence)
- Community discussions on Python 3.10 vs 3.8 compatibility (multiple sources, general consensus)
- Technical writing trends 2026 articles (context for documentation patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - python-dotenv is industry standard, requirements.txt is documented
- Architecture: HIGH - Patterns verified against official documentation (pip, PEP 604, git)
- Pitfalls: HIGH - Based on actual code inspection (grep results, file reads)
- Code examples: HIGH - All sourced from official docs or verified in codebase

**Research date:** 2026-01-23
**Valid until:** ~90 days (stable domain, slow-moving standards)

**Notes:**
- No API calls needed - local file operations only
- All fixes are deterministic - no edge cases or complex logic
- Verification straightforward - grep, file checks, Python import tests
