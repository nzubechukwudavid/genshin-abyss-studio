#!/usr/bin/env python3
"""
Convert CSV file to JSON format.

Directive: directives/csv_to_json.md

Usage:
    python execution/csv_to_json.py data/sample.csv
    python execution/csv_to_json.py input.csv --output output.json
"""

import csv
import json
import sys
import argparse
from pathlib import Path

# =============================================================================
# VERSION - Must match directive
# =============================================================================
DOE_VERSION = "2026.01.23"


def main():
    parser = argparse.ArgumentParser(
        description="Convert CSV file to JSON format"
    )
    parser.add_argument("input", help="Input CSV file path")
    parser.add_argument(
        "--output", "-o",
        help="Output JSON file (default: print to stdout)"
    )
    args = parser.parse_args()

    # Validate input file exists
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: File not found: {args.input}")
        return 1

    if not input_path.suffix.lower() == '.csv':
        print(f"WARNING: File does not have .csv extension: {args.input}")

    try:
        # Read CSV
        with open(input_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            data = list(reader)

        # Convert to JSON
        json_output = json.dumps(data, indent=2, ensure_ascii=False)

        # Output
        if args.output:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json_output, encoding='utf-8')
            print(f"Converted {len(data)} rows to JSON")
            print(f"Output: {args.output}")
        else:
            print(json_output)

        return 0

    except csv.Error as e:
        print(f"CSV Error: {e}")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
