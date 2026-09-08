# Workflow Pipelines
<!-- DOE Framework v2.0.0 -->

This document maps multi-step workflows where one directive's output feeds into another.

---

## Meta-Workflow: Framework Self-Improvement

The framework improves itself through a defined protocol.

### Flow

```
┌─────────────────────────┐
│ Agent discovers         │
│ universal learning      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Draft improvement to    │
│ AGENTS.md               │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Show user, get approval │
│ (REQUIRED)              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Apply edit to AGENTS.md │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ sync_agent_files.py     │
│ --sync                  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ CLAUDE.md + GEMINI.md   │
│ now updated             │
└─────────────────────────┘
```

### Trigger Phrases
- "improve the framework"
- "add this to how you operate"
- "remember this for all workflows"

---

## How to Use This Document

When a user request involves multiple workflows chained together, reference this document to:
1. Identify the correct sequence
2. Understand data handoffs between steps
3. Know which outputs feed which inputs

---

## Pipeline: [Pipeline Name]

### Purpose
[What this end-to-end pipeline accomplishes]

### Steps

```
┌─────────────────────┐
│ 1. workflow_one     │
│    directives/...   │
└──────────┬──────────┘
           │ [what data passes]
           ▼
┌─────────────────────┐
│ 2. workflow_two     │
│    directives/...   │
└──────────┬──────────┘
           │ [what data passes]
           ▼
┌─────────────────────┐
│ 3. workflow_three   │
│    directives/...   │
└─────────────────────┘
```

### Detailed Flow

| Step | Directive | Input | Output | Handoff |
|------|-----------|-------|--------|---------|
| 1 | `workflow_one.md` | [User provides] | [What's produced] | [Column/field that feeds step 2] |
| 2 | `workflow_two.md` | [From step 1] | [What's produced] | [Column/field that feeds step 3] |
| 3 | `workflow_three.md` | [From step 2] | [Final deliverable] | — |

### Quick Run

```bash
# Step 1
python execution/step_one.py --args

# Step 2 (uses output from step 1)
python execution/step_two.py --input [step1_output]

# Step 3 (uses output from step 2)
python execution/step_three.py --input [step2_output]
```

### Trigger Phrases

User might say:
- "[Full pipeline phrase]"
- "[Abbreviated version]"

### Cost & Time (Full Pipeline)

| Scenario | Time | Cost |
|----------|------|------|
| Typical | X min | $X.XX |
| Heavy | X min | $X.XX |

---

## Pipeline: [Another Pipeline Name]

[Repeat structure above]

---

## Dependency Graph

Visual overview of all workflow relationships (example):

```
                    ┌──────────────────┐
                    │   data_fetcher   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │   report   │  │   export   │  │   notify   │
     │ generator  │  │  formatter │  │   sender   │
     └────────────┘  └────────────┘  └────────────┘
```

---

## Adding New Pipelines

When you discover workflows that chain together:

1. Document the pipeline here using the template above
2. Update each directive's "Related Workflows" section
3. Add trigger phrases that reference the full pipeline
4. Test the full pipeline end-to-end

---

## Changelog

### YYYY-MM-DD
- Initial pipeline documentation
