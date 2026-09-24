# Production Hygiene & Portfolio Readiness Directive
<!-- DOE-VERSION: 2026.09.24 -->

## Goal
Enforce professional repository standards, zero-leak credential/path hygiene, live CI metrics, and clean code presentation suitable for high-scrutiny technical portfolio and CV reviews.

## Trigger Phrases
- "check repository hygiene"
- "prepare for CV review"
- "production repository cleanup"
- "audit portfolio readiness"
- "sanitize repository"

## Quick Start
```bash
# 1. Verify zero personal paths in committed files
git grep -i "c:/users/" ; git grep -i "c:\\users\\"

# 2. Check version alignment across all artifacts
python execution/bump_version.py --check

# 3. Verify full regression test suite
python -m pytest tests -v
```

## What It Does
1. **Zero Personal Paths & Secret Leakage**:
   - No committed JSON, YAML, or Python scripts may contain absolute personal workstation paths (e.g. `C:\Users\<Name>\...` or `/home/<name>/...`).
   - Dynamic path resolution via `Path.home()`, `LOCALAPPDATA`, or relative workspace anchors (`Path(__file__).resolve().parent`) is strictly mandatory.
   - Any local cache schemas committed to version control (e.g. `data/cache/music_catalog.json`) must be sanitized to clean default empty states (`{"tracks": []}`).

2. **Git Index Sanitization**:
   - No dummy boilerplate files (`sample.csv`, `test.txt`) from initial project scaffolding may remain in the production branch.
   - No binary media from personal screenrecording sessions (e.g., `Screenrecorder-*.jpg` or `*.mp4`) may be tracked in git; all runtime caches must be excluded by `.gitignore` with only `.gitkeep` retained.

3. **Live CI Metrics & Dynamic Badges**:
   - Avoid static, hardcoded test counts in `README.md` (e.g. `Pytest-101_Passing_Tests`) that inevitably drift out of sync as new tests are authored.
   - Always link dynamic GitHub Actions Workflow Status badges (`actions/workflows/release.yml/badge.svg`) that reflect live, verified CI health.

4. **Console Cleanliness & Error Boundaries**:
   - Production frontend JavaScript (`web/studio.js`, `web/modules/*.js`) must contain zero stray debug `console.log()` statements.
   - All fetch/network calls must have graceful error fallbacks with user-visible toasts rather than uncaught console promise rejections.

5. **Accurate & Calibrated Capability Claims**:
   - Ground documentation claims in verifiable engineering realities:
     - Use "Offline-First with local asset bundling & caching" rather than unqualified "100% offline".
     - Frame visual tools as "A/B Composition & Feed Preview" rather than speculative "High-CTR Predictors".
     - Distinguish designed behavior from tested benchmarks.

## Output
- Pristine, enterprise-ready GitHub repository with zero personal artifacts or boilerplate clutter.
- High-credibility presentation for senior engineering, open-source, and recruitment reviews.
