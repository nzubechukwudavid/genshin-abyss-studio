# Phase 2: Documentation Restructure - Research

**Researched:** 2026-01-23
**Domain:** Documentation architecture and consolidation
**Confidence:** HIGH

## Summary

This research examines best practices for consolidating 7 overlapping documentation files into 3 focused docs (README.md, CLAUDE.md, REFERENCE.md) for a GitHub template repository. The current structure has significant redundancy with FRAMEWORK.md (394 lines), ARCHITECTURE.md (245 lines), SETUP.md, QUICKSTART.md, and MIGRATION.md covering overlapping content.

Research shows that documentation consolidation follows principles similar to software design: avoid redundancy (DRY principle), maintain single sources of truth, prevent broken cross-references, and structure information by user journey rather than arbitrary categorization. GitHub template repositories specifically need minimal READMEs that explain the "Use this template" workflow upfront.

The key insight is that documentation debt accumulates the same way code debt does - through copy-paste additions, incremental patches without refactoring, and failure to deprecate superseded content. The solution is aggressive consolidation around three distinct use cases: (1) first-time discovery (README), (2) AI agent instructions (CLAUDE.md), and (3) deep reference for experienced users (REFERENCE.md).

**Primary recommendation:** Use content migration (not just file deletion) with a cross-reference audit to ensure no orphaned links remain.

## Standard Stack

Documentation consolidation is primarily a content architecture task, not a technical implementation task. The "stack" consists of markdown best practices and file structure conventions.

### Core
| Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Markdown | CommonMark | Documentation format | Universal GitHub support, human-readable |
| Git | 2.0+ | Version control | Track content moves, rollback if needed |
| Grep/ripgrep | Any | Cross-reference audit | Find all links to files being deleted |

### Supporting
| Tool | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Link checkers | Various | Validation | Post-consolidation verification |
| Diff tools | Any | Content comparison | Ensure no valuable content lost |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown files | Wiki/Notion | More features but breaks GitHub template simplicity |
| Manual grep | Link checker tools | Automation but may miss context-dependent references |

**Installation:**
```bash
# No installation needed - standard git and markdown
# Optional: link validation
npm install -g markdown-link-check  # if desired
```

## Architecture Patterns

### Recommended Project Structure
```
project-root/
├── README.md              # Entry point: what, why, how to start
├── CLAUDE.md              # AI instructions (already canonical)
├── AGENTS.md              # Mirror of CLAUDE.md
├── GEMINI.md              # Mirror of CLAUDE.md
├── REFERENCE.md           # Deep dive: everything else
├── directives/
├── execution/
└── [no SETUP, QUICKSTART, ARCHITECTURE, FRAMEWORK, MIGRATION]
```

### Pattern 1: Progressive Disclosure Structure

**What:** Structure documentation from simple to complex, entry to expert.

**When to use:** Multi-audience documentation where users have different needs at different stages.

**Example:**
```markdown
# README.md
- Project title
- One-sentence description
- GitHub template instructions (USE THIS TEMPLATE button)
- Getting started (3-5 steps max)
- Link to REFERENCE.md for deep dive

# REFERENCE.md (organized by topic, not by journey)
## Table of Contents
- Architecture Overview
- Directory Structure
- Version Control Protocol
- Error Classification
- Creating New Workflows
- Rollback Protocol
- etc.
```

**Source:** [README Best Practices - Tilburg Science Hub](https://tilburgsciencehub.com/topics/collaborate-share/share-your-work/content-creation/readme-best-practices/)

### Pattern 2: Single Source of Truth (SSOT)

**What:** Each piece of information exists in exactly one place. Other locations link to it, never duplicate it.

**When to use:** Always. Prevents documentation drift and conflicting information.

**Example:**
```markdown
<!-- SETUP.md has "Step 1: Copy .env.example" -->
<!-- QUICKSTART.md has "Step 2: Set up environment: cp .env.example .env" -->
<!-- MIGRATION.md has "Create .env: cp .env.example .env" -->

<!-- After consolidation: ONE place in REFERENCE.md -->
## Environment Setup
1. Copy the example: `cp .env.example .env`
2. Edit with your API keys

<!-- README.md just links -->
See [Environment Setup](REFERENCE.md#environment-setup) for details.
```

**Source:** [7 Document Management Best Practices in 2026](https://thedigitalprojectmanager.com/project-management/document-management-best-practices/)

### Pattern 3: GitHub Template Workflow

**What:** GitHub template repositories have a distinct workflow that must be explained upfront.

**When to use:** Any repository marked as a template on GitHub.

**Example:**
```markdown
# README.md

## Getting Started

This is a GitHub template repository. Here's how to use it:

### Option 1: Use This Template (Recommended)
1. Click the "Use this template" button at the top of this page
2. Choose "Create a new repository"
3. Name your repository
4. Clone your new repository
5. Follow setup instructions below

### Option 2: Fork
[explain tradeoffs]

### Option 3: Clone Directly
[explain when this makes sense]
```

**Source:** [Creating a repository from a template - GitHub Docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)

### Anti-Patterns to Avoid

- **Copy-Paste Documentation:** Duplicating instructions in multiple files leads to version drift and conflicting information. Source: [Top Software Anti-Patterns to Avoid in Development](https://medium.com/@chirag.dave/top-software-anti-patterns-to-avoid-in-development-c9791b603a35)

- **Lava Flow Documentation:** Keeping old docs "just in case" because deletion feels risky. Mark as deprecated or remove completely. Source: [6 Types of Anti Patterns to Avoid in Software Development](https://www.geeksforgeeks.org/blogs/types-of-anti-patterns-to-avoid-in-software-development/)

- **Implicit Links Without Validation:** Assuming filename changes won't break references. Always grep for cross-references before deleting files. Source: [MyST-Parser Cross-referencing](https://myst-parser.readthedocs.io/en/latest/syntax/cross-referencing.html)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding all cross-references | Manual search | `grep -r "filename.md"` or ripgrep | Regex can find markdown links, text references, and code comments |
| Content deduplication | Copy-paste to new file | Diff tools to identify unique sections | Prevents accidentally losing content that only appears once |
| Link validation | Manual clicking | `markdown-link-check` or CI integration | Automated validation catches broken internal links |
| Content migration tracking | Ad-hoc notes | Git commits with descriptive messages | Version control lets you rollback if needed |

**Key insight:** Documentation consolidation fails when you treat it like file deletion instead of content migration. Each file being deleted contains unique information that must be preserved somewhere.

## Common Pitfalls

### Pitfall 1: Orphaned Cross-References

**What goes wrong:** You delete SETUP.md but README.md still has `[see SETUP.md](SETUP.md)` links. Users click, get 404.

**Why it happens:** Not auditing all references before deletion. Cross-references exist as markdown links `[text](file.md)`, inline text "see SETUP.md", and implicit references in prose.

**How to avoid:**
```bash
# Before deleting ANY file, find all references
grep -r "SETUP.md" . --include="*.md"
grep -ri "setup guide" . --include="*.md"  # case insensitive text refs
```

**Warning signs:** User reports broken links after merge, documentation feels incomplete.

### Pitfall 2: Content Loss During Migration

**What goes wrong:** QUICKSTART.md had a tip about `--dangerously-skip-permissions` that doesn't appear in any other file. You delete QUICKSTART.md. The tip is lost forever.

**Why it happens:** Assuming files are completely redundant without doing content diff. Each doc may have 5-10% unique content.

**How to avoid:**
1. For each file being deleted, extract all unique paragraphs
2. Use diff tools or side-by-side comparison
3. Migrate unique content to REFERENCE.md before deletion
4. Commit migration first, deletion second (allows rollback)

**Warning signs:** Users ask "didn't this used to explain X?" after consolidation.

### Pitfall 3: Scope Creep During Consolidation

**What goes wrong:** While consolidating docs, you start rewriting sections, adding new content, restructuring beyond the original scope. Task takes 3x longer than planned.

**Why it happens:** Consolidation surfaces documentation issues you want to fix. But fixing everything at once risks introducing errors.

**How to avoid:**
- Phase 1: Pure consolidation (move content, preserve structure)
- Phase 2: Validation (ensure nothing broke)
- Phase 3: Improvement (rewrite as separate task)

**Warning signs:** Task is "95% done" for multiple days.

### Pitfall 4: README Remains Too Detailed

**What goes wrong:** After consolidation, README.md is still 150+ lines because you moved content from other files into it instead of into REFERENCE.md.

**Why it happens:** Unclear on what belongs in README vs REFERENCE. README should be entry point only.

**How to avoid:**
- README: What is this? How do I start? (< 100 lines ideal)
- REFERENCE: Everything else, organized by topic
- Rule of thumb: If it takes >5 minutes to read, it belongs in REFERENCE

**Warning signs:** README has sections like "Advanced Configuration", "Troubleshooting", "Rollback Protocol".

### Pitfall 5: Not Testing the Template Workflow

**What goes wrong:** You document "click Use this template" but never test creating a repo from the template. Instructions are wrong or incomplete.

**Why it happens:** Focusing on code/content without validating the actual user flow.

**How to avoid:**
1. Mark repo as template on GitHub (Settings > Template repository)
2. Create a test repository from the template
3. Follow README instructions step-by-step
4. Note any gaps or errors
5. Update README before finalizing

**Warning signs:** First user reports "Use this template button doesn't work" or "instructions don't match what I see".

## Code Examples

These are content migration patterns, not code. Examples provided use bash/grep for demonstration.

### Finding All References to a File

```bash
# Source: Standard Unix tools
# Find all markdown links to SETUP.md
grep -r "\[.*\](SETUP\.md)" . --include="*.md"

# Find all text references (case insensitive)
grep -ri "SETUP\.md\|setup guide\|first-time setup" . --include="*.md"

# Find any mention in all files (code, docs, scripts)
rg "SETUP" --type-add 'docs:*.md' --type docs
```

### Content Diff for Migration

```bash
# Source: Git documentation
# See what's unique in QUICKSTART.md vs README.md
git diff --no-index README.md QUICKSTART.md > quickstart_delta.txt

# Or use diff directly
diff -u README.md QUICKSTART.md | grep "^+" | grep -v "^+++"
```

### Safe Multi-Step Migration

```bash
# Source: Best practices from git workflows
# Step 1: Create REFERENCE.md with migrated content
git add REFERENCE.md
git commit -m "docs: create REFERENCE.md from FRAMEWORK.md + ARCHITECTURE.md"

# Step 2: Update cross-references
git add README.md
git commit -m "docs: update README links to point to REFERENCE.md"

# Step 3: Delete old files (separate commit for easy rollback)
git rm FRAMEWORK.md ARCHITECTURE.md SETUP.md QUICKSTART.md MIGRATION.md
git commit -m "docs: remove redundant documentation files"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Detailed README | Minimal README + REFERENCE | ~2020 | GitHub templates prioritize fast starts |
| One file per topic | Consolidate by user journey | 2023-2024 | Reduces navigation overhead |
| Manual link checking | CI-integrated link validation | 2024-2025 | Catches broken links before merge |
| Version comments | Git history as source of truth | Always preferred | Cleaner files, full history in git |

**Deprecated/outdated:**
- **Separate SETUP.md:** GitHub template workflow makes this redundant - setup is "use template, then configure"
- **MIGRATION.md:** Only relevant for existing users; not needed in template
- **QUICKSTART.md:** Redundant with streamlined README

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal length for REFERENCE.md**
   - What we know: FRAMEWORK.md (394 lines) + ARCHITECTURE.md (245 lines) = ~640 lines merged
   - What's unclear: Whether this should be split into multiple sections or kept as one file
   - Recommendation: Create single REFERENCE.md with detailed table of contents for navigation. Only split if file exceeds 1000 lines.

2. **Whether to preserve git history across file renames**
   - What we know: Git can track file renames with `git mv`, content moves require manual reference
   - What's unclear: If preserving `git blame` history is valuable for consolidated content
   - Recommendation: Less important for this use case since docs are reference material, not code. Clean consolidation is more valuable than git blame continuity.

3. **Template repository checkbox timing**
   - What we know: Repository must be marked as template in GitHub settings
   - What's unclear: Whether this should be done before or after doc restructure
   - Recommendation: Can be done anytime; doesn't affect doc structure. Note: this is already a template repo.

## Sources

### Primary (HIGH confidence)
- [Creating a repository from a template - GitHub Docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)
- [Creating a template repository - GitHub Docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository)
- [Cross-references and linking - Google developer documentation style guide](https://developers.google.com/style/cross-references)
- Current repository analysis (README.md, FRAMEWORK.md, ARCHITECTURE.md, etc.)

### Secondary (MEDIUM confidence)
- [7 Document Management Best Practices in 2026](https://thedigitalprojectmanager.com/project-management/document-management-best-practices/)
- [README Best Practices - Tilburg Science Hub](https://tilburgsciencehub.com/topics/collaborate-share/share-your-work/content-creation/readme-best-practices/)
- [Best-README-Template on GitHub](https://github.com/othneildrew/Best-README-Template)
- [Top 7 Code Documentation Best Practices for Teams (2026)](https://www.qodo.ai/blog/code-documentation-best-practices-2026/)

### Tertiary (LOW confidence - general principles)
- [Top Software Anti-Patterns to Avoid in Development](https://medium.com/@chirag.dave/top-software-anti-patterns-to-avoid-in-development-c9791b603a35)
- [6 Types of Anti Patterns to Avoid in Software Development](https://www.geeksforgeeks.org/blogs/types-of-anti-patterns-to-avoid-in-software-development/)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Standard markdown/git tooling is well-established
- Architecture: HIGH - GitHub template patterns documented in official docs, current repo structure analyzed
- Pitfalls: HIGH - Cross-reference issues are universal documentation problems with known solutions

**Research date:** 2026-01-23
**Valid until:** 90 days (documentation best practices evolve slowly)
