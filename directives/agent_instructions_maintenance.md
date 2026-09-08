# Agent Instructions Maintenance
<!-- DOE-VERSION: 2025.12.19 -->

## Goal

Keep the three agent instruction files (AGENTS.md, CLAUDE.md, GEMINI.md) synchronized and continuously improved based on learnings from workflow execution. Any of the three files can be edited—the sync script auto-detects which file was changed and propagates to the others.

---

## Trigger Phrases

**Matches:**
- "update agent instructions"
- "sync agent files"
- "improve the framework"
- "add this learning to the framework"
- "the agent should remember this"
- "update how you operate"
- "improve AGENTS.md"
- "framework improvement"

**Does NOT Apply To:**
- Individual workflow directives (use that workflow's directive)
- Script fixes (update the script directly)
- One-off instructions (just say them, don't persist)

---

## Prerequisites

### Files Required
All three files must exist in project root:
- `AGENTS.md` — Generic/Cursor compatible
- `CLAUDE.md` — Claude Code specific
- `GEMINI.md` — Gemini specific

### Script
- `execution/sync_agent_files.py`

---

## Execution Scripts

| Script | Purpose |
|--------|---------|
| `execution/sync_agent_files.py` | Sync content across all three agent files |

---

## Quick Start

```bash
# Check sync status (shows which file would be used as source)
python execution/sync_agent_files.py --check

# Sync all files (auto-detects most recently modified as source)
python execution/sync_agent_files.py --sync

# Force sync from a specific file
python execution/sync_agent_files.py --sync --source CLAUDE.md

# Add a learning to all agent files
python execution/sync_agent_files.py --add-learning "Always check for rate limits before batch API calls"

# View diff between files
python execution/sync_agent_files.py --diff
```

---

## What It Does

### File Synchronization
1. **Edit ANY file** — AGENTS.md, CLAUDE.md, or GEMINI.md
2. **Auto-detection** — Sync script detects which file was most recently modified
3. **Propagation** — Most recent file becomes source, syncs to the other two
4. **Fallback** — If all files are identical, CLAUDE.md is the default source

### Source Detection Logic
| Scenario | Source Used |
|----------|-------------|
| Files differ | Most recently modified file |
| All files identical | CLAUDE.md (default) |
| Only one file exists | That file |
| `--source` specified | Explicitly specified file |

### Self-Improvement Loop
When the agent discovers something that should change how it operates:

1. **Identify the learning** — What behavior should change?
2. **Classify the change**:
   - **Routing logic** → Update "Your Operating Protocol" section
   - **Error handling** → Update "Error Classification" section
   - **New capability** → Add to relevant section
   - **Edge case** → Add to "Remember" section or create new subsection
3. **Edit any agent file** — Make the edit to whichever file you're working with
4. **Sync to other files** — Run sync script (auto-detects source)
5. **Bump framework version** — If significant change

---

## When to Update Agent Instructions

### DO Update For:
- New error patterns that need classification
- Routing ambiguities that caused wrong directive selection
- Missing escalation rules that caused problems
- Workflow patterns that should be standard
- Cost thresholds that need adjustment
- Validation patterns that should be universal

### DON'T Update For:
- Workflow-specific logic (put in that directive)
- One-time instructions from user
- Temporary workarounds
- User preferences (those go in user config, not agent instructions)

---

## Self-Improvement Triggers

The agent should consider updating its own instructions when:

1. **Repeated mistakes** — Same error type occurs 3+ times across workflows
2. **Missing guidance** — Agent had to make judgment call not covered by instructions
3. **User correction** — User says "you should always/never do X"
4. **New pattern discovered** — A better approach emerges from workflow execution
5. **Framework version update** — New DOE version introduces changes

### Self-Improvement Protocol

```
1. Identify what should change
2. Draft the specific edit (show user)
3. Get user approval (REQUIRED for agent instruction changes)
4. Apply edit to AGENTS.md
5. Run sync script
6. Bump version if significant
7. Log the change in this directive's Changelog section
```

**CRITICAL:** Agent instruction changes ALWAYS require user approval. The agent cannot modify its own instructions without confirmation.

---

## CLI Arguments

| Argument | Description |
|----------|-------------|
| `--check` | Verify all three files are in sync (shows detected source) |
| `--sync` | Sync from most recently modified file to others |
| `--source FILE` | Force sync from specific file (AGENTS.md, CLAUDE.md, or GEMINI.md) |
| `--diff` | Show differences between files |
| `--add-learning "text"` | Add a learning to the Remember section |
| `--show-version` | Display current framework version |
| `--backup` | Create timestamped backups before changes |

---

## File Structure

```
project-root/
├── AGENTS.md      ← Edit here (or any other)
├── CLAUDE.md      ← Edit here (or any other) - Default fallback
├── GEMINI.md      ← Edit here (or any other)
└── .tmp/
    └── agent_backups/
        ├── AGENTS_2025.12.19_103045.md
        └── ...
```

All three files are equal—edit whichever one your tool uses, then sync.

---

## Validation

After any agent file update:
- [ ] All three files have identical content
- [ ] Version tag is consistent across files
- [ ] No syntax errors in markdown
- [ ] Backup created before changes

---

## Edge Cases & Troubleshooting

### Files Out of Sync
**Symptom:** `--check` shows differences
**Cause:** Manual edit to one file without syncing
**Fix:** Run `--sync` to propagate from the most recently modified file, or `--diff` to review first

### Conflicting Edits
**Symptom:** Different changes made to different files
**Cause:** Multiple people editing different files
**Fix:**
1. Run `--check` to see which file would be used as source
2. Run `--diff` to see all differences
3. Either: Accept the detected source and run `--sync`
4. Or: Manually merge into preferred file, then `--sync --source THAT_FILE`

### Wrong Source Detected
**Symptom:** `--sync` used wrong file as source
**Cause:** File modification times don't reflect actual intent
**Fix:** Use `--sync --source FILENAME` to explicitly specify the source

### Learning Doesn't Apply
**Symptom:** Agent keeps making same mistake after learning added
**Cause:** Learning added to wrong section, or not specific enough
**Fix:** Review placement, make instruction more explicit

---

## Error Classification

### Configuration Errors (fix once)
- File not found → Create missing file from AGENTS.md
- Permission denied → Fix file permissions

### Logic Errors (update + sync)
- Wrong section updated → Move content, re-sync
- Instruction unclear → Rewrite, re-sync

---

## Cost & Time Estimates

| Operation | Time | Cost |
|-----------|------|------|
| Check sync | <1s | $0.00 |
| Sync files | <1s | $0.00 |
| Add learning | <1s | $0.00 |
| Full diff | <1s | $0.00 |

No API costs — all local file operations.

---

## Related Workflows

- **Upstream:** Any workflow that discovers a framework improvement
- **Downstream:** All workflows (they read agent instructions)

---

## Change Categories

When updating agent instructions, categorize the change:

| Category | Section to Update | Example |
|----------|-------------------|---------|
| Routing | "Your Operating Protocol" | New trigger phrase pattern |
| Errors | "Error Classification" | New error type discovered |
| Escalation | "Escalation Rules" | New threshold needed |
| Workflow | "Creating New Workflows" | New phase or step |
| Commands | "Commands Reference" | New user command pattern |
| Principles | "Remember" | New guiding principle |

---

## Changelog

### 2025.12.19
- **Bidirectional sync**: Any file can now be edited and synced to others
- Auto-detects most recently modified file as source
- Added `--source` flag to force sync from specific file
- Changed default fallback from AGENTS.md to CLAUDE.md
- Updated documentation to reflect bidirectional workflow

### 2025.12.17-a
- Initial creation
- Added self-improvement protocol
- Added sync script integration
- Defined change categories
