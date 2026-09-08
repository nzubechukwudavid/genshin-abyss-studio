# CSV to JSON Converter
<!-- DOE-VERSION: 2026.01.23 -->

## Goal

Convert CSV files to JSON format. Useful for data transformation, API preparation, or format conversion.

---

## Trigger Phrases

**Matches:**
- "convert csv to json"
- "csv to json"
- "transform csv file"

---

## Quick Start

```bash
python execution/csv_to_json.py data/sample.csv
python execution/csv_to_json.py input.csv --output output.json
```

---

## What It Does

1. **Read** — Loads the CSV file using Python's csv module
2. **Convert** — Transforms rows into JSON objects (headers become keys)
3. **Output** — Prints to stdout or writes to file if --output specified

---

## Output

**Deliverable:** JSON array of objects, one per CSV row
**Location:** stdout (default) or file specified by --output

---

## CLI Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `input` | (required) | Path to input CSV file |
| `--output` | stdout | Path to output JSON file |

---

## Edge Cases

### Empty CSV
**Fix:** Outputs empty JSON array `[]`

### Missing Headers
**Fix:** First row is always treated as headers

---

## Changelog

### 2026.01.23
- Created
