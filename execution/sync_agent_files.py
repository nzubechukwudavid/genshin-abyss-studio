#!/usr/bin/env python3
"""
Script: sync_agent_files.py
Directive: directives/agent_instructions_maintenance.md
DOE Framework: v2.0.0

Purpose:
    Keep AGENTS.md, CLAUDE.md, and GEMINI.md synchronized.
    The most recently modified file becomes the source of truth.
    This allows editing ANY of the three files and syncing to the others.

Cost:
    No API costs - local file operations only

Usage:
    # Check if files are in sync
    python execution/sync_agent_files.py --check

    # Sync all files (auto-detects which file was changed most recently)
    python execution/sync_agent_files.py --sync

    # Force sync from a specific file
    python execution/sync_agent_files.py --sync --source CLAUDE.md

    # Show differences
    python execution/sync_agent_files.py --diff

    # Add a learning to all files
    python execution/sync_agent_files.py --add-learning "Always validate API responses"

    # Create backups before any operation
    python execution/sync_agent_files.py --sync --backup
"""

import os
import sys
import argparse
import difflib
import shutil
import re
from datetime import datetime
from pathlib import Path

# =============================================================================
# VERSION - Must match directive version
# =============================================================================
DOE_VERSION = "2025.12.19"

# =============================================================================
# CONFIGURATION
# =============================================================================

# The three agent instruction files
AGENT_FILES = ["AGENTS.md", "CLAUDE.md", "GEMINI.md"]

# Default source (used as fallback when all files are identical)
DEFAULT_SOURCE = "CLAUDE.md"

# Backup directory
BACKUP_DIR = ".tmp/agent_backups"

# Section markers for adding learnings
REMEMBER_SECTION = "## Remember"


# =============================================================================
# CORE FUNCTIONS
# =============================================================================

def get_file_content(filepath: Path) -> str | None:
    """Read file content, return None if file doesn't exist."""
    if not filepath.exists():
        return None
    return filepath.read_text()


def get_file_hash(content: str) -> str:
    """Get a simple hash for comparison."""
    import hashlib
    return hashlib.md5(content.encode()).hexdigest()[:12]


def get_most_recent_modified() -> str | None:
    """
    Detect which agent file was most recently modified.

    Returns:
        Filename of the most recently modified file, or None if no files exist.
    """
    latest_file = None
    latest_time = 0

    for filename in AGENT_FILES:
        filepath = Path(filename)
        if filepath.exists():
            mtime = filepath.stat().st_mtime
            if mtime > latest_time:
                latest_time = mtime
                latest_file = filename

    return latest_file


def detect_source_file() -> tuple[str, str]:
    """
    Detect which file should be the source for syncing.

    Logic:
    1. If files have different content, use the most recently modified
    2. If all files are identical, use default (AGENTS.md)
    3. If some files missing, use an existing file

    Returns:
        Tuple of (source_filename, reason_string)
    """
    existing_files = {}
    contents = {}

    for filename in AGENT_FILES:
        filepath = Path(filename)
        if filepath.exists():
            content = filepath.read_text()
            existing_files[filename] = filepath.stat().st_mtime
            contents[filename] = content

    if not existing_files:
        return DEFAULT_SOURCE, "no files exist"

    if len(existing_files) == 1:
        only_file = list(existing_files.keys())[0]
        return only_file, "only existing file"

    # Check if all existing files have identical content
    unique_contents = set(contents.values())

    if len(unique_contents) == 1:
        # All identical - use default if it exists, otherwise most recent
        if DEFAULT_SOURCE in existing_files:
            return DEFAULT_SOURCE, "all files identical (using default)"
        return get_most_recent_modified(), "all files identical (using most recent)"

    # Files differ - use most recently modified
    most_recent = max(existing_files, key=existing_files.get)
    return most_recent, f"most recently modified ({datetime.fromtimestamp(existing_files[most_recent]).strftime('%Y-%m-%d %H:%M:%S')})"


def check_sync() -> dict:
    """
    Check if all agent files are in sync.

    Returns:
        Dict with status and details
    """
    result = {
        "in_sync": True,
        "files": {},
        "missing": [],
        "detected_source": None,
        "source_reason": None,
        "reference_hash": None
    }

    # Detect which file would be the source
    detected_source, reason = detect_source_file()
    result["detected_source"] = detected_source
    result["source_reason"] = reason

    # Get reference content (from any existing file for comparison)
    reference_content = None
    for filename in AGENT_FILES:
        filepath = Path(filename)
        content = get_file_content(filepath)
        if content is not None:
            if reference_content is None:
                reference_content = content
                result["reference_hash"] = get_file_hash(content)

            file_hash = get_file_hash(content)
            result["files"][filename] = {
                "exists": True,
                "hash": file_hash,
                "mtime": datetime.fromtimestamp(filepath.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            }

            # Check if matches reference
            if content != reference_content:
                result["in_sync"] = False
        else:
            result["in_sync"] = False
            result["missing"].append(filename)
            result["files"][filename] = {
                "exists": False,
                "hash": None,
                "mtime": None
            }

    return result


def show_diff(file1: str, file2: str) -> None:
    """Show diff between two files."""
    path1, path2 = Path(file1), Path(file2)
    
    content1 = get_file_content(path1)
    content2 = get_file_content(path2)
    
    if content1 is None:
        print(f"❌ {file1} does not exist")
        return
    if content2 is None:
        print(f"❌ {file2} does not exist")
        return
    
    if content1 == content2:
        print(f"✅ {file1} and {file2} are identical")
        return
    
    lines1 = content1.splitlines(keepends=True)
    lines2 = content2.splitlines(keepends=True)
    
    diff = difflib.unified_diff(
        lines1, lines2,
        fromfile=file1,
        tofile=file2,
        lineterm=""
    )
    
    print(f"\n{'='*60}")
    print(f"DIFF: {file1} → {file2}")
    print('='*60)
    
    for line in diff:
        if line.startswith('+') and not line.startswith('+++'):
            print(f"\033[92m{line}\033[0m", end='')  # Green
        elif line.startswith('-') and not line.startswith('---'):
            print(f"\033[91m{line}\033[0m", end='')  # Red
        else:
            print(line, end='')
    print()


def create_backup(filename: str) -> str | None:
    """Create a timestamped backup of a file."""
    filepath = Path(filename)
    if not filepath.exists():
        return None
    
    backup_dir = Path(BACKUP_DIR)
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y.%m.%d_%H%M%S")
    backup_name = f"{filepath.stem}_{timestamp}{filepath.suffix}"
    backup_path = backup_dir / backup_name
    
    shutil.copy2(filepath, backup_path)
    return str(backup_path)


def sync_files(create_backups: bool = False, source_file: str | None = None) -> dict:
    """
    Sync all agent files from the detected or specified source.

    Args:
        create_backups: Whether to backup files before overwriting
        source_file: Optional explicit source file. If None, auto-detects.

    Returns:
        Dict with sync results
    """
    result = {
        "success": True,
        "source": None,
        "source_reason": None,
        "synced": [],
        "created": [],
        "backups": [],
        "errors": []
    }

    # Determine source
    if source_file:
        if source_file not in AGENT_FILES:
            result["success"] = False
            result["errors"].append(f"Invalid source file: {source_file}. Must be one of: {', '.join(AGENT_FILES)}")
            return result
        result["source"] = source_file
        result["source_reason"] = "explicitly specified"
    else:
        detected, reason = detect_source_file()
        result["source"] = detected
        result["source_reason"] = reason

    source = result["source"]

    # Read source
    source_path = Path(source)
    source_content = get_file_content(source_path)

    if source_content is None:
        result["success"] = False
        result["errors"].append(f"Source file {source} not found")
        return result

    # Sync each target file
    for filename in AGENT_FILES:
        if filename == source:
            continue

        filepath = Path(filename)

        try:
            # Backup if requested and file exists
            if create_backups and filepath.exists():
                backup_path = create_backup(filename)
                if backup_path:
                    result["backups"].append(backup_path)

            # Check if file exists
            existed = filepath.exists()

            # Write content
            filepath.write_text(source_content)

            if existed:
                result["synced"].append(filename)
            else:
                result["created"].append(filename)

        except Exception as e:
            result["success"] = False
            result["errors"].append(f"{filename}: {str(e)}")

    return result


def add_learning(learning: str, create_backups: bool = False, source_file: str | None = None) -> dict:
    """
    Add a learning to the Remember section of all agent files.

    Args:
        learning: The learning text to add
        create_backups: Whether to backup before modifying
        source_file: Optional explicit source file. If None, uses DEFAULT_SOURCE.

    Returns:
        Dict with results
    """
    result = {
        "success": True,
        "source": None,
        "modified": [],
        "backups": [],
        "errors": []
    }

    # For add_learning, we use the specified source or default
    # (not auto-detect, since we need a consistent base)
    source = source_file if source_file else DEFAULT_SOURCE
    result["source"] = source

    source_path = Path(source)
    source_content = get_file_content(source_path)
    
    if source_content is None:
        result["success"] = False
        result["errors"].append(f"Source file {source} not found")
        return result
    
    # Find the Remember section
    if REMEMBER_SECTION not in source_content:
        result["success"] = False
        result["errors"].append(f"'{REMEMBER_SECTION}' section not found in {source}")
        return result
    
    # Find existing numbered items in Remember section
    remember_pattern = r'## Remember\s*\n((?:\d+\.\s+\*\*[^*]+\*\*[^\n]*\n?)+)'
    match = re.search(remember_pattern, source_content)
    
    if match:
        # Count existing items
        existing_items = re.findall(r'^\d+\.', match.group(1), re.MULTILINE)
        next_num = len(existing_items) + 1
    else:
        next_num = 1
    
    # Format the new learning
    # Extract a bold keyword from the learning if possible
    words = learning.split()
    if len(words) >= 2:
        keyword = words[0].strip('.,!?')
        rest = ' '.join(words[1:])
        new_item = f"{next_num}. **{keyword}** — {rest}\n"
    else:
        new_item = f"{next_num}. **Learning** — {learning}\n"
    
    # Find where to insert (after the last numbered item in Remember section)
    # Look for the section and find its end
    sections = source_content.split('\n## ')
    modified_content = None

    for i, section in enumerate(sections):
        if section.startswith('Remember'):
            # Find the last line of the numbered list or the comment line
            lines = section.split('\n')
            insert_index = None

            # Find insertion point: after last numbered item, or after comment if no items
            for j, line in enumerate(lines):
                if re.match(r'^\d+\.', line):
                    insert_index = j + 1
                elif insert_index is None and line.strip().startswith('<!--') and 'add-learning' in line:
                    # Insert after the comment line if no numbered items found yet
                    insert_index = j + 1

            # Fallback: insert after the header line if nothing else found
            if insert_index is None:
                insert_index = 1

            # Ensure blank line before first item if inserting right after comment
            if insert_index > 0 and not lines[insert_index - 1].strip() == '':
                lines.insert(insert_index, '')
                insert_index += 1

            # Insert the new learning
            lines.insert(insert_index, new_item.rstrip())
            sections[i] = '\n'.join(lines)
            modified_content = '\n## '.join(sections)
            break
    
    if modified_content is None:
        result["success"] = False
        result["errors"].append("Could not locate insertion point in Remember section")
        return result
    
    # Backup if requested
    if create_backups:
        for filename in AGENT_FILES:
            if Path(filename).exists():
                backup_path = create_backup(filename)
                if backup_path:
                    result["backups"].append(backup_path)
    
    # Write to source file
    try:
        source_path.write_text(modified_content)
        result["modified"].append(source)
    except Exception as e:
        result["success"] = False
        result["errors"].append(f"{source}: {str(e)}")
        return result

    # Sync to other files
    for filename in AGENT_FILES:
        if filename == source:
            continue
        try:
            Path(filename).write_text(modified_content)
            result["modified"].append(filename)
        except Exception as e:
            result["success"] = False
            result["errors"].append(f"{filename}: {str(e)}")
    
    return result


def get_framework_version() -> str | None:
    """Extract framework version from the default source file."""
    source_content = get_file_content(Path(DEFAULT_SOURCE))
    if source_content is None:
        # Try any existing file
        for filename in AGENT_FILES:
            content = get_file_content(Path(filename))
            if content:
                source_content = content
                break

    if source_content is None:
        return None

    match = re.search(r'DOE Framework v([\d.]+)', source_content)
    return match.group(1) if match else None


def ensure_all_files_exist() -> dict:
    """Create any missing agent files from the first existing file."""
    result = {"created": [], "source": None, "errors": []}

    # Find any existing file to use as source
    source_content = None
    source_file = None
    for filename in AGENT_FILES:
        content = get_file_content(Path(filename))
        if content:
            source_content = content
            source_file = filename
            break

    if source_content is None:
        result["errors"].append("No agent files exist - cannot create others")
        return result

    result["source"] = source_file

    for filename in AGENT_FILES:
        if filename == source_file:
            continue

        filepath = Path(filename)
        if not filepath.exists():
            try:
                filepath.write_text(source_content)
                result["created"].append(filename)
            except Exception as e:
                result["errors"].append(f"{filename}: {str(e)}")

    return result


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Sync and maintain agent instruction files. Auto-detects which file was most recently modified and syncs from that source.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Examples:
    %(prog)s --check                    # Check sync status
    %(prog)s --sync                     # Auto-detect source and sync (uses most recently modified)
    %(prog)s --sync --source CLAUDE.md  # Force sync from CLAUDE.md
    %(prog)s --sync --backup            # Sync with backups
    %(prog)s --diff                     # Show all differences
    %(prog)s --add-learning "Always check rate limits"

Default fallback source: {DEFAULT_SOURCE}
        """
    )

    parser.add_argument(
        "--check", "-c",
        action="store_true",
        help="Check if all agent files are in sync"
    )
    parser.add_argument(
        "--sync", "-s",
        action="store_true",
        help="Sync all files from the most recently modified (or specified --source)"
    )
    parser.add_argument(
        "--source",
        type=str,
        choices=AGENT_FILES,
        metavar="FILE",
        help=f"Force sync from a specific file. Choices: {', '.join(AGENT_FILES)}"
    )
    parser.add_argument(
        "--diff", "-d",
        action="store_true",
        help="Show differences between files"
    )
    parser.add_argument(
        "--add-learning", "-a",
        type=str,
        metavar="TEXT",
        help="Add a learning to the Remember section of all files"
    )
    parser.add_argument(
        "--backup", "-b",
        action="store_true",
        help="Create backups before modifying files"
    )
    parser.add_argument(
        "--show-version",
        action="store_true",
        help="Show current framework version"
    )
    parser.add_argument(
        "--ensure-files",
        action="store_true",
        help="Create any missing agent files from source"
    )
    
    args = parser.parse_args()
    
    # Print header
    print(f"[sync_agent_files] DOE Version: {DOE_VERSION}")
    print()
    
    # Handle commands
    if args.show_version:
        version = get_framework_version()
        if version:
            print(f"Framework Version: {version}")
        else:
            print("Could not determine framework version")
        return 0
    
    if args.ensure_files:
        result = ensure_all_files_exist()
        if result["created"]:
            print(f"✅ Created: {', '.join(result['created'])}")
        if result["errors"]:
            for error in result["errors"]:
                print(f"❌ Error: {error}")
            return 1
        if not result["created"]:
            print("✅ All agent files already exist")
        return 0
    
    if args.check:
        result = check_sync()

        print("SYNC STATUS")
        print("-" * 40)

        if result["missing"]:
            print(f"❌ Missing files: {', '.join(result['missing'])}")

        for filename, info in result["files"].items():
            if info["exists"]:
                is_source = " (would be source)" if filename == result["detected_source"] else ""
                print(f"  {filename}: {info['hash']} [{info['mtime']}]{is_source}")
            else:
                print(f"  {filename}: MISSING")

        print()
        if result["in_sync"]:
            print("✅ All files are in sync")
        else:
            print(f"⚠️  Files are NOT in sync.")
            print(f"   Detected source: {result['detected_source']} ({result['source_reason']})")
            print(f"   Run --sync to propagate from {result['detected_source']} to others.")

        return 0 if result["in_sync"] else 1

    if args.diff:
        # Show diffs between all pairs
        first_file = AGENT_FILES[0]
        for filename in AGENT_FILES[1:]:
            show_diff(first_file, filename)
        return 0

    if args.sync:
        result = sync_files(create_backups=args.backup, source_file=args.source)

        print(f"📍 Source: {result['source']} ({result['source_reason']})")

        if result["backups"]:
            print(f"📦 Backups created:")
            for backup in result["backups"]:
                print(f"   {backup}")

        if result["created"]:
            print(f"✨ Created: {', '.join(result['created'])}")

        if result["synced"]:
            print(f"✅ Synced: {', '.join(result['synced'])}")
        
        if result["errors"]:
            for error in result["errors"]:
                print(f"❌ Error: {error}")
            return 1

        print(f"\n✅ All agent files synchronized from {result['source']}")
        return 0

    if args.add_learning:
        result = add_learning(args.add_learning, create_backups=args.backup, source_file=args.source)
        
        if result["backups"]:
            print(f"📦 Backups created:")
            for backup in result["backups"]:
                print(f"   {backup}")
        
        if result["success"]:
            print(f"✅ Learning added to: {', '.join(result['modified'])}")
            print(f"   \"{args.add_learning}\"")
        else:
            for error in result["errors"]:
                print(f"❌ Error: {error}")
            return 1
        
        return 0
    
    # No command specified
    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
