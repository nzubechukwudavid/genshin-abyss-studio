# Agentic Workflows Reference
## Deep Documentation for the DOE Framework

> Everything you need to understand and extend the framework.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Agent Files (CLAUDE.md, AGENTS.md, GEMINI.md)](#agent-files-claudemd-agentsmd-geminimd)
4. [Creating New Workflows](#creating-new-workflows)
5. [Version Control Protocol](#version-control-protocol)
6. [Error Classification](#error-classification)
7. [Escalation Thresholds](#escalation-thresholds)
8. [Routing Logic](#routing-logic)
9. [Validation Protocol](#validation-protocol)
10. [Cost Tracking](#cost-tracking)
11. [Rollback Protocol](#rollback-protocol)
12. [File Conventions](#file-conventions)
13. [Self-Improvement Loop](#self-improvement-loop)
14. [Environment Setup](#environment-setup)
15. [Troubleshooting](#troubleshooting)
16. [Quick Reference](#quick-reference)

---

## Architecture Overview

### The Core Idea (30 seconds)

You talk to an AI. It builds workflows. Those workflows get saved so you never rebuild them. The system gets smarter over time.

**Three layers:**
1. **Directives** — Instructions in plain English (what to do)
2. **Orchestration** — The AI makes decisions (routing, error handling)
3. **Execution** — Python scripts do the work (reliable, repeatable)

**Why it works:** AI decides. Code executes. Errors don't compound.

### Why This Architecture

LLMs are probabilistic. Business logic is deterministic. When you force an LLM to do everything—research, decide, execute, validate—errors compound. 90% accuracy per step = 59% success over 5 steps.

This framework fixes that mismatch by:
1. Storing proven approaches in **Directives** (what to do)
2. Using the LLM for **Orchestration** (decision-making and routing)
3. Pushing complexity into **Execution** scripts (deterministic code)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR PROJECT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  CLAUDE.md  │ =  │  AGENTS.md  │ =  │  GEMINI.md  │         │
│  │  (source)   │    │  (mirror)   │    │  (mirror)   │         │
│  └──────┬──────┘    └─────────────┘    └─────────────┘         │
│         │                                                       │
│         │ AI reads these instructions                          │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    ORCHESTRATION                         │   │
│  │                     (The AI)                             │   │
│  │                                                          │   │
│  │   • Routes requests to correct directive                 │   │
│  │   • Calls scripts in order                               │   │
│  │   • Handles errors                                       │   │
│  │   • Proposes improvements (with your approval)           │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│         ┌───────────────┼───────────────┐                      │
│         ▼               ▼               ▼                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ directives/ │ │ execution/  │ │   .tmp/     │               │
│  │             │ │             │ │             │               │
│  │ workflow.md │ │ script.py   │ │ temp files  │               │
│  │ workflow.md │ │ script.py   │ │             │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    OPTIONAL                              │   │
│  │                                                          │   │
│  │   pipelines/    → Multi-workflow chains                  │   │
│  │   learnings/    → Failed approaches (prevents re-work)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

### Required Components

| Component | Purpose | You Need It Because |
|-----------|---------|---------------------|
| `CLAUDE.md` | AI instructions (source of truth) | The AI reads this to know how to operate |
| `AGENTS.md` | Mirror of CLAUDE.md | Generic tools look for this filename |
| `GEMINI.md` | Mirror of CLAUDE.md | Gemini looks for this filename |
| `directives/` | Workflow SOPs | Where your saved workflows live |
| `execution/` | Python scripts | Where the actual code lives |
| `.tmp/` | Temp files | Processing artifacts (gitignored) |
| `.env` | API keys | Secrets storage (gitignored) |

### Optional Components

| Component | Purpose | Add It When |
|-----------|---------|-------------|
| `pipelines/` | Multi-workflow chains | You have workflows that feed into each other |
| `learnings/` | Failed approaches | You want to prevent re-trying dead ends |
| `doe_utils.py` | Cost tracking | You want to monitor API spend |

**Start minimal. Add optional components when you need them.**

### Minimal Structure

```
your-project/
├── CLAUDE.md              # AI instructions (REQUIRED, source of truth)
├── AGENTS.md              # Mirror (REQUIRED)
├── GEMINI.md              # Mirror (REQUIRED)
├── directives/            # Your workflows (REQUIRED)
│   └── [workflow].md
├── execution/             # Your scripts (REQUIRED)
│   ├── sync_agent_files.py   # Keeps agent files aligned
│   └── [script].py
├── .tmp/                  # Temp files (REQUIRED, gitignored)
├── .env                   # API keys (REQUIRED, gitignored)
└── .gitignore             # (REQUIRED)
```

### Full Structure

```
your-project/
├── CLAUDE.md              # AI instructions (source of truth)
├── AGENTS.md              # Mirror
├── GEMINI.md              # Mirror
├── directives/
│   ├── _TEMPLATE.md       # For creating new workflows
│   └── [workflow].md
├── execution/
│   ├── _TEMPLATE.py       # For creating new scripts
│   ├── sync_agent_files.py
│   ├── doe_utils.py       # Cost tracking
│   └── [script].py
├── pipelines/
│   └── PIPELINES.md       # Multi-workflow documentation
├── learnings/
│   └── [workflow].md      # Failed approaches
├── .tmp/
├── .env
├── .env.example
└── .gitignore
```

---

## Agent Files (CLAUDE.md, AGENTS.md, GEMINI.md)

The framework maintains three identical agent instruction files:

| File | Purpose | Compatibility |
|------|---------|---------------|
| `CLAUDE.md` | Source of truth | Claude Code |
| `AGENTS.md` | Mirror | Generic, Cursor, others |
| `GEMINI.md` | Mirror | Google Gemini |

**Why three files?** Different AI tools look for different filenames. Having all three ensures the instructions load regardless of which tool you use.

**Source of truth:** `CLAUDE.md` is always the canonical version. Edits go there first, then sync to others.

### Synchronization Commands

```bash
# Check sync status
python execution/sync_agent_files.py --check

# Sync all files from CLAUDE.md
python execution/sync_agent_files.py --sync

# Sync with backups (recommended)
python execution/sync_agent_files.py --sync --backup

# Show differences
python execution/sync_agent_files.py --diff
```

### What Gets Improved

When the AI learns something universal, it proposes edits to these files:

| Learning Type | Destination |
|---------------|-------------|
| Error patterns | Error Classification section |
| Routing logic | Operating Protocol section |
| Escalation rules | Escalation Thresholds section |
| Workflow patterns | Creating New Workflows section |
| Command patterns | Commands Reference section |
| Principles | Remember section |

### Quick Learning Addition

For small learnings that don't need full edits:

```bash
python execution/sync_agent_files.py --add-learning "Always validate JSON before parsing"
```

This appends to the Remember section and syncs all files automatically.

---

## Creating New Workflows

### Core Principles

1. **Check Directives First** — Before doing anything, check `directives/` for an existing workflow. Only build new if none exists.

2. **Check Tools Before Writing Code** — Before writing a script, check `execution/` per the directive. Only create new scripts if none exist.

3. **Crystallize After Success** — After successfully building a new workflow through conversation, immediately create:
   - A directive in `directives/`
   - Script(s) in `execution/`
   - Entry in `learnings/` if alternatives were tested

4. **Self-Anneal When Things Break**
   1. Read error message and stack trace
   2. Classify error type (see Error Classification)
   3. Fix based on classification
   4. Update directive with learnings
   5. Bump version tag

5. **Never Discard Working Knowledge** — Directives are living documents. Update them—don't abandon them. If a directive becomes obsolete, mark it deprecated rather than deleting.

### The Four Phases

#### Phase 1: Research
1. User describes problem
2. Agent searches for existing solutions (APIs, libraries, approaches)
3. Agent presents 3+ options with tradeoffs
4. User selects approach OR agent tests in parallel

#### Phase 2: Build
1. Agent implements selected approach
2. Test with real data
3. Iterate until working

#### Phase 3: Crystallize
1. Create directive from `directives/_TEMPLATE.md`
2. Create script(s) from `execution/_TEMPLATE.py`
3. Document failed approaches in `learnings/`
4. If multi-step, add to `pipelines/PIPELINES.md`

#### Phase 4: Validate
1. Run full workflow from directive (not from memory)
2. Confirm all validation criteria pass
3. Confirm cost tracking works
4. Version tag both directive and script

---

## Version Control Protocol

### Framework Version

This framework follows semantic versioning: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes to directive/script structure
- **MINOR**: New capabilities, backward compatible
- **PATCH**: Bug fixes, clarifications

### Directive-Script Versioning

Every directive and its corresponding script(s) share a version tag:

```markdown
<!-- directives/my_workflow.md -->
<!-- DOE-VERSION: 2025.12.17-a -->
```

```python
# execution/my_workflow.py
DOE_VERSION = "2025.12.17-a"
```

**Version format:** `YYYY.MM.DD-suffix`
- Date of last sync between directive and script
- Suffix (a, b, c...) for multiple updates same day

**The agent MUST check version alignment before execution.** Mismatches indicate drift and require review.

**If versions don't match:** Something changed without the other updating. Review before running.

---

## Error Classification

When something fails, classify before acting:

### Configuration Errors (fix once, no retry)
- Missing API key → Add to `.env`
- Missing credentials → Run auth flow
- Wrong file path → Correct path in directive
- **Action:** Fix config, no directive update needed

### Transient Errors (retry with backoff)
- Rate limiting → Wait and retry (1s, 2s, 4s, 8s, max 60s)
- Network timeout → Retry up to 3x
- Service temporarily unavailable → Retry after 60s
- **Action:** Retry, no directive update unless pattern persists

### Logic Errors (update script + directive)
- Wrong output format → Fix script, update directive's Output section
- Missing edge case → Add handling, update directive's Edge Cases
- Incorrect assumptions → Fix logic, document in Learnings
- **Action:** Fix, update directive, bump version

### External Errors (escalate to human)
- API deprecated → Notify human, document in Learnings
- Service permanently changed → Requires human decision
- Cost threshold exceeded → Pause and confirm
- **Action:** Stop, notify, await human input

---

## Escalation Thresholds

The agent MUST pause and request human input when:

1. **Retry limit reached:** 3 consecutive failures of same error
2. **Cost threshold:** Any single action costing >$1.00 USD
3. **Batch cost:** Cumulative run cost exceeds $10.00 USD
4. **Destructive actions:** Deleting files, overwriting data, sending external communications
5. **No directive match:** Query doesn't map to any existing directive
6. **Version mismatch:** Directive and script versions don't align

---

## Routing Logic

When a user request comes in:

```
1. Parse request for keywords and intent
2. Check each directive's Trigger Phrases section
3. If single match → Execute that directive
4. If multiple matches → Present options to user
5. If no match → Ask if user wants to build new workflow
6. If directive found but version mismatch → Warn user, await confirmation
```

### Trigger Phrase Matching
- Exact phrase match takes priority
- Keyword overlap as fallback
- "Does NOT Apply To" section excludes false positives

---

## Validation Protocol

Every execution must validate success. Each directive specifies validation criteria.

### Standard Validations
- [ ] Output file exists at specified path
- [ ] Output file size > 0 bytes
- [ ] No error messages in execution log
- [ ] Script exit code = 0

### Workflow-Specific Validations
Defined in each directive's Validation section.

### Post-Validation Actions
- **Pass:** Log success, report to user
- **Fail:** Classify error, act per Error Classification

---

## Cost Tracking

Every script that incurs API costs must log them:

```python
from doe_utils import log_cost

log_cost(
    workflow="workflow_name",
    costs={
        "openai": 0.00,
        "anthropic": 0.15,
        "service_name": 0.00
    }
)
```

Logs append to `.tmp/cost_log.jsonl` for aggregation.

---

## Rollback Protocol

When a fix breaks something that was working:

1. **Identify last known good state**
   - Check directive changelog for previous version
   - Check git history if available

2. **Revert changes**
   - Restore previous script version
   - Restore previous directive version

3. **Document failure**
   - Add to `learnings/` why the "fix" failed
   - Note the version that was rolled back

4. **Re-attempt with different approach**
   - Do not retry same fix
   - Research alternatives first

---

## File Conventions

### Naming
- Directives: `snake_case.md` (e.g., `daily_report_generator.md`)
- Scripts: `snake_case.py` (e.g., `daily_report_generator.py`)
- Match names where possible for easy mapping

### Paths
- Always use relative paths from project root
- Scripts reference: `execution/script_name.py`
- Directives reference: `directives/workflow_name.md`

### Intermediate Files
- All temp files go in `.tmp/`
- Subdirectories by date: `.tmp/workflow_name/20251217/`
- Never commit `.tmp/` contents

### Deliverables
- Cloud services (Google Sheets, etc.) for user-facing outputs
- Local files only for processing

---

## Self-Improvement Loop

The agent is expected to improve its own instructions when it learns something universal:

1. **Identify** — What behavior should change framework-wide?
2. **Draft** — Write the specific edit
3. **Approve** — Show user, get explicit confirmation (REQUIRED)
4. **Apply** — Edit CLAUDE.md
5. **Sync** — Run sync script to update AGENTS.md and GEMINI.md
6. **Version** — Bump DOE-VERSION if significant change

**Critical:** The agent cannot modify its own instructions without user approval. This prevents runaway self-modification.

### The Loop Visualized

```
    ┌─────────────────────────────────────┐
    │                                     │
    │   1. AI discovers something new     │
    │      (error pattern, better way)    │
    │                                     │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │                                     │
    │   2. AI proposes improvement        │
    │      (shows you the edit)           │
    │                                     │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │                                     │
    │   3. You approve or reject          │
    │      (YOU are always in control)    │
    │                                     │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │                                     │
    │   4. AI updates CLAUDE.md           │
    │      + syncs AGENTS.md, GEMINI.md   │
    │                                     │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │                                     │
    │   5. Framework is now smarter       │
    │      (applies to ALL workflows)     │
    │                                     │
    └─────────────────────────────────────┘
```

---

## Environment Setup

### Required API Keys

You need at least ONE AI provider key:

```bash
# Option A: Anthropic (Recommended)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Option B: OpenAI
OPENAI_API_KEY=sk-your-key-here
```

**Where to get keys:**
- Anthropic: https://console.anthropic.com/settings/keys
- OpenAI: https://platform.openai.com/api-keys

### Optional Services

Add these as your workflows need them:

```bash
# Web scraping
APIFY_API_TOKEN=...

# Image generation
REPLICATE_API_TOKEN=...

# Any other service your workflows will use
YOUR_SERVICE_API_KEY=...
```

---

## Troubleshooting

### "API key not found"
Make sure your `.env` file exists and has at least one valid API key.

### "Files not in sync"
Run: `python execution/sync_agent_files.py --sync`

### "AI doesn't know about my workflows"
Make sure you're in the project directory when running your AI tool.

### "Version mismatch" warning
The directive and script have different version tags. Review both files to understand what changed, then update versions to match.

### Script fails with import error
Check that all dependencies are installed. If using `doe_utils`, ensure it exists in `execution/`.

### Workflow runs but produces wrong output
1. Check the directive's Output section matches expectations
2. Check the script's output format
3. Update directive and bump version after fixing

---

## Quick Reference

### Commands

| Command | What It Does |
|---------|--------------|
| `python execution/sync_agent_files.py --check` | Check if agent files are synced |
| `python execution/sync_agent_files.py --sync` | Sync agent files from CLAUDE.md |
| `python execution/sync_agent_files.py --diff` | Show differences between agent files |
| `python execution/sync_agent_files.py --add-learning "text"` | Add to Remember section |

### What to Say to Your AI

| You Say | What Happens |
|---------|--------------|
| "Build a workflow that..." | AI researches, builds, and saves a new workflow |
| "Run [workflow name]" | AI finds and executes an existing workflow |
| "What workflows do I have?" | AI lists all your saved workflows |
| "Improve the framework" | AI proposes improvements to how it operates |
| "What have I spent?" | AI reads cost log (if tracking enabled) |

### Quick Action Guide

| I want to... | Do this |
|--------------|---------|
| Run existing workflow | Check `directives/`, find matching trigger phrase, execute |
| Build new workflow | Research 3+ approaches, test, crystallize to directive + script |
| Fix a broken workflow | Classify error, act per classification, update directive |
| Add to existing workflow | Update directive, update script, bump version |
| Deprecate a workflow | Add `DEPRECATED` to directive title, note replacement |
| Track costs | Check `.tmp/cost_log.jsonl` or run cost report |
| Understand past decisions | Check `learnings/` folder |
| Chain workflows | Check `pipelines/PIPELINES.md` |

### Tips for Success

1. **Be specific** — "Scrape pricing from competitor.com daily" beats "scrape stuff"

2. **Let it research** — Don't prescribe solutions. Let the AI find 3+ approaches first.

3. **Test with real data** — The AI will ask. Have a real example ready.

4. **Crystallize immediately** — After something works, make sure it saves the directive.

5. **Improve the framework** — When you notice a pattern, tell the AI to add it to CLAUDE.md.
