#!/usr/bin/env python3
"""
DOE Framework Utilities
Version: 2.0.0

Common utilities for the DOE framework including:
- Cost tracking and reporting
- Version checking
- Directive listing

Usage:
    # View cost report
    python execution/doe_utils.py costs --month 2025-12
    python execution/doe_utils.py costs --today
    python execution/doe_utils.py costs --all

    # List directives
    python execution/doe_utils.py list

    # Check version alignment
    python execution/doe_utils.py check-versions
"""

import os
import sys
import json
import argparse
import re
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict


# =============================================================================
# COST TRACKING
# =============================================================================

def log_cost(workflow: str, costs: dict):
    """
    Log API costs to .tmp/cost_log.jsonl
    
    Call this at the end of any script that incurs API costs.
    
    Args:
        workflow: Name of the workflow (should match directive name)
        costs: Dict of {service_name: cost_in_usd}
        
    Example:
        log_cost("daily_report", {"anthropic": 0.15, "openai": 0.05})
    """
    log_path = Path(".tmp/cost_log.jsonl")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    
    entry = {
        "timestamp": datetime.now().isoformat(),
        "workflow": workflow,
        "costs": costs,
        "total": sum(costs.values())
    }
    
    with open(log_path, "a") as f:
        f.write(json.dumps(entry) + "\n")


def read_cost_log():
    """Read all entries from cost log."""
    log_path = Path(".tmp/cost_log.jsonl")
    if not log_path.exists():
        return []
    
    entries = []
    with open(log_path, "r") as f:
        for line in f:
            if line.strip():
                entries.append(json.loads(line))
    return entries


def cost_report(filter_type: str = "all", filter_value: str = None):
    """
    Generate cost report.
    
    Args:
        filter_type: "all", "month", "today", "workflow"
        filter_value: For month: "2025-12", for workflow: "workflow_name"
    """
    entries = read_cost_log()
    
    if not entries:
        print("No cost data found. Run some workflows first.")
        return
    
    # Filter entries
    filtered = []
    for entry in entries:
        ts = datetime.fromisoformat(entry["timestamp"])
        
        if filter_type == "today":
            if ts.date() == datetime.now().date():
                filtered.append(entry)
        elif filter_type == "month" and filter_value:
            year, month = filter_value.split("-")
            if ts.year == int(year) and ts.month == int(month):
                filtered.append(entry)
        elif filter_type == "workflow" and filter_value:
            if entry["workflow"] == filter_value:
                filtered.append(entry)
        else:
            filtered.append(entry)
    
    if not filtered:
        print(f"No cost data for filter: {filter_type} {filter_value or ''}")
        return
    
    # Aggregate by workflow
    by_workflow = defaultdict(lambda: {"count": 0, "total": 0.0, "services": defaultdict(float)})
    
    for entry in filtered:
        wf = entry["workflow"]
        by_workflow[wf]["count"] += 1
        by_workflow[wf]["total"] += entry["total"]
        for service, cost in entry["costs"].items():
            by_workflow[wf]["services"][service] += cost
    
    # Aggregate by service
    by_service = defaultdict(float)
    for entry in filtered:
        for service, cost in entry["costs"].items():
            by_service[service] += cost
    
    # Print report
    print("=" * 60)
    print(f"DOE Cost Report | {filter_type.upper()}" + (f": {filter_value}" if filter_value else ""))
    print("=" * 60)
    print()
    
    # By workflow
    print("BY WORKFLOW")
    print("-" * 40)
    grand_total = 0
    for wf, data in sorted(by_workflow.items(), key=lambda x: x[1]["total"], reverse=True):
        print(f"  {wf}")
        print(f"    Runs: {data['count']}")
        print(f"    Total: ${data['total']:.2f}")
        for service, cost in sorted(data["services"].items()):
            print(f"      - {service}: ${cost:.2f}")
        grand_total += data["total"]
        print()
    
    # By service
    print("BY SERVICE")
    print("-" * 40)
    for service, cost in sorted(by_service.items(), key=lambda x: x[1], reverse=True):
        print(f"  {service}: ${cost:.2f}")
    print()
    
    # Grand total
    print("=" * 40)
    print(f"GRAND TOTAL: ${grand_total:.2f}")
    print(f"Entries: {len(filtered)}")
    print("=" * 40)


# =============================================================================
# VERSION CHECKING
# =============================================================================

def extract_directive_version(filepath: Path) -> str:
    """Extract DOE version from directive markdown file."""
    try:
        content = filepath.read_text()
        match = re.search(r'DOE-VERSION:\s*([^\s>]+)', content)
        return match.group(1) if match else "NOT_FOUND"
    except Exception:
        return "ERROR"


def extract_script_version(filepath: Path) -> str:
    """Extract DOE version from Python script."""
    try:
        content = filepath.read_text()
        match = re.search(r'DOE_VERSION\s*=\s*["\']([^"\']+)["\']', content)
        return match.group(1) if match else "NOT_FOUND"
    except Exception:
        return "ERROR"


def check_versions():
    """Check version alignment between directives and scripts."""
    directives_dir = Path("directives")
    execution_dir = Path("execution")
    
    if not directives_dir.exists():
        print("No directives/ directory found")
        return
    
    print("VERSION ALIGNMENT CHECK")
    print("=" * 60)
    print()
    
    issues = []
    
    for directive_path in sorted(directives_dir.glob("*.md")):
        if directive_path.name.startswith("_"):
            continue
            
        directive_version = extract_directive_version(directive_path)
        workflow_name = directive_path.stem
        
        # Look for matching script(s)
        script_versions = {}
        for script_path in execution_dir.glob("*.py"):
            if script_path.name.startswith("_"):
                continue
            # Check if script mentions this directive
            try:
                content = script_path.read_text()
                if workflow_name in content or directive_path.name in content:
                    script_versions[script_path.name] = extract_script_version(script_path)
            except Exception:
                pass
        
        # Report
        print(f"📄 {directive_path.name}")
        print(f"   Directive version: {directive_version}")
        
        if script_versions:
            for script_name, script_version in script_versions.items():
                status = "✅" if script_version == directive_version else "⚠️ MISMATCH"
                print(f"   📜 {script_name}: {script_version} {status}")
                if script_version != directive_version:
                    issues.append((directive_path.name, script_name, directive_version, script_version))
        else:
            print(f"   📜 No linked scripts found")
        print()
    
    # Summary
    if issues:
        print("=" * 60)
        print("⚠️  VERSION MISMATCHES FOUND")
        print("-" * 40)
        for directive, script, d_ver, s_ver in issues:
            print(f"  {directive} ({d_ver}) ↔ {script} ({s_ver})")
        print()
        print("Run the workflow to sync, or manually update versions.")
    else:
        print("=" * 60)
        print("✅ All versions aligned")


# =============================================================================
# DIRECTIVE LISTING
# =============================================================================

def list_directives():
    """List all directives with their trigger phrases."""
    directives_dir = Path("directives")
    
    if not directives_dir.exists():
        print("No directives/ directory found")
        return
    
    print("AVAILABLE WORKFLOWS")
    print("=" * 60)
    print()
    
    for directive_path in sorted(directives_dir.glob("*.md")):
        if directive_path.name.startswith("_"):
            continue
        
        content = directive_path.read_text()
        
        # Extract goal
        goal_match = re.search(r'## Goal\s*\n+([^\n#]+)', content)
        goal = goal_match.group(1).strip() if goal_match else "No goal specified"
        
        # Extract trigger phrases
        triggers = []
        trigger_section = re.search(r'\*\*Matches:\*\*\s*\n((?:- [^\n]+\n?)+)', content)
        if trigger_section:
            triggers = re.findall(r'- "([^"]+)"', trigger_section.group(1))
        
        # Extract version
        version = extract_directive_version(directive_path)
        
        print(f"📄 {directive_path.stem}")
        print(f"   Version: {version}")
        print(f"   Goal: {goal[:60]}{'...' if len(goal) > 60 else ''}")
        if triggers:
            print(f"   Triggers: {', '.join(triggers[:3])}")
        print()


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="DOE Framework Utilities",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Cost command
    cost_parser = subparsers.add_parser("costs", help="View cost report")
    cost_parser.add_argument("--month", help="Filter by month (YYYY-MM)")
    cost_parser.add_argument("--today", action="store_true", help="Show today only")
    cost_parser.add_argument("--workflow", help="Filter by workflow name")
    cost_parser.add_argument("--all", action="store_true", help="Show all (default)")
    
    # List command
    subparsers.add_parser("list", help="List all directives")
    
    # Version check command
    subparsers.add_parser("check-versions", help="Check directive/script version alignment")
    
    args = parser.parse_args()
    
    if args.command == "costs":
        if args.today:
            cost_report("today")
        elif args.month:
            cost_report("month", args.month)
        elif args.workflow:
            cost_report("workflow", args.workflow)
        else:
            cost_report("all")
    
    elif args.command == "list":
        list_directives()
    
    elif args.command == "check-versions":
        check_versions()
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
