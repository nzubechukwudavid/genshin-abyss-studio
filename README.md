# Agentic Workflows Template
## Build Once, Run Forever

You describe what you want. The AI builds it. The workflow gets saved so you never rebuild it.

---

## Getting Started

This is a **GitHub template repository**. Here's how to use it:

### Option 1: Use This Template (Recommended)

1. Click the green **"Use this template"** button at the top of this page
2. Select **"Create a new repository"**
3. Name your repository and create it
4. Clone your new repository locally
5. Continue with setup below

### Option 2: Fork

Use this if you want to pull future updates from this template.

### Option 3: Clone Directly

```bash
git clone <this-repo-url> my-project
cd my-project
rm -rf .git && git init  # Start fresh git history
```

---

## Setup

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your API keys (at minimum: ANTHROPIC_API_KEY)

# 2. Verify
python execution/sync_agent_files.py --check

# 3. Open in Claude Code
claude --dangerously-skip-permissions
# This flag allows Claude to run scripts without confirmation prompts
```

---

## How It Works

**Three layers:**
1. **Directives** - Plain English instructions (`directives/*.md`)
2. **Orchestration** - AI makes decisions
3. **Execution** - Python scripts do the work (`execution/*.py`)

**First time:** "Build a workflow that scrapes competitor prices" -> AI researches, builds, saves

**Every time after:** "Scrape competitor prices" -> AI finds directive, runs script, done

---

## Project Structure

```
your-project/
├── CLAUDE.md              # AI instructions (source of truth)
├── AGENTS.md              # Mirror for other AI tools
├── GEMINI.md              # Mirror for Gemini
├── REFERENCE.md           # Deep documentation
├── directives/            # Your workflows
├── execution/             # Your scripts
└── .env                   # API keys (gitignored)
```

---

## Learn More

- **[REFERENCE.md](REFERENCE.md)** - Full documentation (architecture, error handling, advanced features)
- **[directives/csv_to_json.md](directives/csv_to_json.md)** - Example: Convert CSV files to JSON (no API needed)
- **[directives/weather_lookup.md](directives/weather_lookup.md)** - Example: Look up weather via API (shows dotenv pattern)
- **[directives/_TEMPLATE.md](directives/_TEMPLATE.md)** - Template for new workflows
- **[execution/_TEMPLATE.py](execution/_TEMPLATE.py)** - Template for new scripts

---

## Credits

Based on Nick Saraev's DOE framework. Refined for clarity and self-improvement.
