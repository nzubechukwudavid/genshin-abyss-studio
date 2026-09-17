# Roadmap: Agentic Workflows Template v1.0-polish

**Created:** 2025-01-23
**Milestone:** v1.0-polish
**Phases:** 4
**Requirements:** 18

## Overview

| Phase | Name | Goal | Requirements | Status |
|-------|------|------|--------------|--------|
| 1 | Critical Fixes | Make existing functionality work correctly | FIX-01 through FIX-05 | ✓ Complete |
| 2 | Documentation Restructure | Consolidate 7 docs into 3 focused docs | DOC-01 through DOC-08 | ✓ Complete |
| 3 | Example Workflows | Provide working examples to learn from | EX-01, EX-02 | ✓ Complete |
| 4 | Polish | Final cleanup and verification | POL-01 through POL-04 | Pending |

---

## Phase 1: Critical Fixes

**Goal:** Make the existing functionality work correctly. Fix bugs that would cause first-run failures.

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Add Remember section + create requirements.txt
- [x] 01-02-PLAN.md — Update docs for canonical source + Python version

**Requirements:**
- FIX-01: Add `## Remember` section to CLAUDE.md
- FIX-02: Update sync script DEFAULT_SOURCE to CLAUDE.md
- FIX-03: Update docs to state CLAUDE.md is canonical
- FIX-04: Create requirements.txt
- FIX-05: Update Python version to 3.10+

**Success Criteria:**
1. `python execution/sync_agent_files.py --add-learning "test"` works without error
2. `python execution/sync_agent_files.py --check` shows CLAUDE.md as detected source
3. `pip install -r requirements.txt` installs python-dotenv
4. All docs that mention Python version say 3.10+
5. All docs that mention canonical source say CLAUDE.md

**Dependencies:** None (first phase)

---

## Phase 2: Documentation Restructure

**Goal:** Consolidate 7 overlapping docs into 3 focused docs. README for entry, CLAUDE.md for AI instructions, REFERENCE.md for deep dive.

**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Create REFERENCE.md (consolidate FRAMEWORK.md + ARCHITECTURE.md + unique content)
- [x] 02-02-PLAN.md — Simplify README.md + delete redundant docs (SETUP, QUICKSTART, ARCHITECTURE, FRAMEWORK, MIGRATION)

**Requirements:**
- DOC-01: Create REFERENCE.md (from FRAMEWORK.md + ARCHITECTURE.md)
- DOC-02: Simplify README.md to minimal entry point
- DOC-08: Add Getting Started section (template/fork/clone guidance)
- DOC-03: Remove SETUP.md
- DOC-04: Remove QUICKSTART.md
- DOC-05: Remove ARCHITECTURE.md
- DOC-06: Remove FRAMEWORK.md
- DOC-07: Remove MIGRATION.md

**Success Criteria:**
1. Only 3 main docs exist: README.md, CLAUDE.md (+ mirrors), REFERENCE.md
2. README explains GitHub template workflow clearly
3. README recommends `claude --dangerously-skip-permissions`
4. No orphaned references to deleted docs
5. All valuable content from deleted docs preserved in REFERENCE.md

**Dependencies:** Phase 1 (canonical source must be established first)

---

## Phase 3: Example Workflows

**Goal:** Provide two working examples that demonstrate the pattern without requiring special setup.

**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md — CSV to JSON file utility (no external API)
- [x] 03-02-PLAN.md — Weather lookup API workflow (demonstrates dotenv + requests pattern)
- [x] 03-03-PLAN.md — Add example workflow references to README.md (gap closure)

**Requirements:**
- EX-01: Simple file utility workflow (no external API)
- EX-02: Simple API workflow (demonstrates API key pattern)

**Success Criteria:**
1. Both examples have matching directive + script with same version tag
2. Simple workflow runs with `python execution/[script].py` and produces output
3. API workflow clearly shows the API key pattern (even if user doesn't have key)
4. Both directives have clear trigger phrases
5. Examples are referenced in README or CLAUDE.md

**Dependencies:** Phase 1 (fixes must be in place), Phase 2 (docs restructure helps provide context)

---

## Phase 4: Polish

**Goal:** Final cleanup, fix remaining issues, verify everything works end-to-end.

**Requirements:**
- POL-01: Fix .gitignore for .tmp/.gitkeep
- POL-02: Implement or remove cost tracking env vars
- POL-03: Fix import path in _TEMPLATE.py
- POL-04: Verify all scripts work from project root

**Success Criteria:**
1. `.tmp/.gitkeep` is tracked by git
2. Cost tracking either works or env vars are removed
3. `_TEMPLATE.py` import comments are correct
4. Running `python execution/sync_agent_files.py --check` from project root works
5. Running `python execution/doe_utils.py list` from project root works
6. All example scripts run successfully from project root

**Dependencies:** Phase 1, 2, 3 (polish happens last)

---

## Execution Order

```
Phase 1: Critical Fixes
    |
Phase 2: Documentation Restructure
    |
Phase 3: Example Workflows
    |
Phase 4: Polish
    |
Ready for release
```

---

## Notes

- **Phase 1** is purely technical fixes — no creative decisions needed
- **Phase 2** involves content decisions — what to keep vs. cut from docs
- **Phase 3** requires designing good examples — simple but illustrative
- **Phase 4** is verification — making sure everything actually works

---
*Roadmap created: 2025-01-23*
*Last updated: 2026-01-23 (Phase 3 complete)*
