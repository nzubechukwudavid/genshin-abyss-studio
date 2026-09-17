# Requirements: Agentic Workflows Template v1.0-polish

**Defined:** 2025-01-23
**Core Value:** Someone clones this, opens it in Claude Code, and can immediately start building workflows that persist.

## v1 Requirements

### Critical Fixes ✓

- [x] **FIX-01**: Add `## Remember` section to CLAUDE.md to enable `--add-learning` feature
- [x] **FIX-02**: Update `sync_agent_files.py` to use CLAUDE.md as DEFAULT_SOURCE
- [x] **FIX-03**: Update all documentation to state CLAUDE.md is canonical source
- [x] **FIX-04**: Create `requirements.txt` with `python-dotenv>=1.0.0`
- [x] **FIX-05**: Update Python version requirement to 3.10+ in all docs

### Documentation Restructure

- [ ] **DOC-01**: Create consolidated REFERENCE.md from FRAMEWORK.md + ARCHITECTURE.md content
- [ ] **DOC-02**: Simplify README.md to minimal entry point
- [ ] **DOC-03**: Remove SETUP.md (merge relevant content)
- [ ] **DOC-04**: Remove QUICKSTART.md (merge relevant content)
- [ ] **DOC-05**: Remove ARCHITECTURE.md (content moved to REFERENCE.md)
- [ ] **DOC-06**: Remove FRAMEWORK.md (content moved to REFERENCE.md)
- [ ] **DOC-07**: Remove MIGRATION.md (not needed for clean template)
- [ ] **DOC-08**: Add "Getting Started" section to README with template/fork/clone guidance

### Example Workflows

- [ ] **EX-01**: Create simple file utility workflow (directive + script, no external API)
- [ ] **EX-02**: Create simple API workflow (directive + script, demonstrates API key pattern)

### Polish

- [ ] **POL-01**: Fix `.gitignore` to preserve `.tmp/.gitkeep` with `!.tmp/.gitkeep`
- [ ] **POL-02**: Implement cost tracking env vars OR remove from `.env.example`
- [ ] **POL-03**: Fix import path in `_TEMPLATE.py` comments
- [ ] **POL-04**: Verify all scripts work when run from project root

## Out of Scope

| Feature | Reason |
|---------|--------|
| Test suite | Claude Code handles validation; not needed for template |
| CI/CD setup | Not needed for a template users customize |
| Additional agent mirrors | AGENTS/CLAUDE/GEMINI covers all major tools |
| Complex example workflows | Keep examples simple and universal |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 1 | Complete |
| FIX-02 | Phase 1 | Complete |
| FIX-03 | Phase 1 | Complete |
| FIX-04 | Phase 1 | Complete |
| FIX-05 | Phase 1 | Complete |
| DOC-01 | Phase 2 | Pending |
| DOC-02 | Phase 2 | Pending |
| DOC-03 | Phase 2 | Pending |
| DOC-04 | Phase 2 | Pending |
| DOC-05 | Phase 2 | Pending |
| DOC-06 | Phase 2 | Pending |
| DOC-07 | Phase 2 | Pending |
| DOC-08 | Phase 2 | Pending |
| EX-01 | Phase 3 | Pending |
| EX-02 | Phase 3 | Pending |
| POL-01 | Phase 4 | Pending |
| POL-02 | Phase 4 | Pending |
| POL-03 | Phase 4 | Pending |
| POL-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2025-01-23*
*Last updated: 2026-01-23 — Phase 1 complete*
