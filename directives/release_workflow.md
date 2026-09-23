# Release Workflow Directive
<!-- DOE-VERSION: 2026.09.23 -->

## Goal
Execute atomic, zero-drift version releases across backend configuration, desktop packaging, frontend web UI, and documentation (README, CHANGELOG, and in-app What's New modal).

## Trigger Phrases
- "prepare a new release"
- "bump version"
- "create release workflow"
- "publish update"
- "release vX.Y.Z"
- "update release documentation"

## Quick Start
```bash
# Check version alignment across all artifacts
python execution/bump_version.py --check

# Execute atomic version bump
python execution/bump_version.py 2.5.4

# Verify full regression suite
python -m pytest tests -v
```

## What It Does
1. **Atomic Version Synchronization**:
   - Updates `app/core/config.py` (`APP_VERSION`).
   - Updates `web/index.html` (version badges and cache-busting asset queries `?v=X.Y.Z`).
   - Updates `web/studio.js` (header version comments and export metadata).
   - Updates `execution/installer.iss` (`MyAppVersion`).
   - Updates `execution/build_exe.py` (`APP_VERSION`).
   - Updates `.github/workflows/release.yml` (default dispatch tag).
   - Updates `tests/test_version_consistency.py` (authoritative version assertions).
   - Updates `README.md` (release badge URL).

2. **Mandatory Documentation Synchronization (3 Core Touchpoints)**:
   For every release, the following three documentation files MUST be updated:
   - **`README.md` (`### 🚀 Latest Highlights (vX.Y.Z)`)**:
     Summarizes the top 4–5 creator-facing improvements in casual, clear language with intuitive emojis.
   - **`CHANGELOG.md` (`## [X.Y.Z] - YYYY-MM-DD`)**:
     Documents technical additions, fixes, changes, and deprecations following Keep a Changelog standards.
   - **In-App What's New Card (`web/index.html` & `web/style.css`)**:
     Updates `.about-whats-new-card` in the desktop About modal with:
     - Header: `✨ WHAT'S NEW IN vX.Y.Z` and the release month/year.
     - 4–5 bullet points written in conversational, creator-first language detailing the practical benefits of the update.

3. **Multi-Stage Verification**:
   - Run `python execution/bump_version.py --check` to verify zero version drift.
   - Run `python -m pytest tests -v` to ensure 100% test pass rate.
   - Run headless Chrome CDP visual check to ensure the About modal and canvas render without distortion.

4. **Tag & Publish**:
   - Commit changes: `git commit -m "feat(release): vX.Y.Z - <summary>"`
   - Tag release: `git tag -a vX.Y.Z -m "Release vX.Y.Z - <summary>"`
   - Push to origin: `git push origin main --follow-tags` to trigger automated standalone executable and installer compilation on GitHub Actions.

## Output
- Synchronized repository across all 8 configuration and build files.
- Up-to-date `README.md`, `CHANGELOG.md`, and in-app About modal changelog.
- Validated PyInstaller executable and Inno Setup installer published via GitHub Actions.
