import argparse
import re
from pathlib import Path
from typing import List, Tuple

# --- Constants ---
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
SRC_DIR = PROJECT_ROOT / 'src'

# --- Regular Expressions for Checks ---
# Finds style={{...}} attributes in TSX files.
INLINE_STYLE_RE = re.compile(r'style=\{\{')
# Finds ID selectors in CSS files, ignoring comments.
ID_SELECTOR_RE = re.compile(r'^\s*#[a-zA-Z0-9_-]+.*\{')
# Checks for a default export in TSX files.
DEFAULT_EXPORT_RE = re.compile(r'^export\s+default\s+', re.MULTILINE)

def find_files(directory: Path, extension: str) -> List[Path]:
    """Finds all files with a given extension in a directory."""
    return list(directory.rglob(f'*{extension}'))

def check_inline_styles(file_path: Path) -> List[Tuple[int, str]]:
    """
    Scans a .tsx file for inline style attributes.
    Returns a list of (line_number, line_content) tuples for each violation.
    """
    violations = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f, 1):
                if INLINE_STYLE_RE.search(line):
                    # Exclude the known-good dynamic style for ContextMenu
                    if 'style={{ top: position.y, left: position.x }}' not in line:
                        violations.append((i, line.strip()))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return violations

def check_id_selectors(file_path: Path) -> List[Tuple[int, str]]:
    """
    Scans a .css file for ID selectors used for styling.
    Returns a list of (line_number, line_content) tuples for each violation.
    """
    violations = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            in_comment_block = False
            for i, line in enumerate(f, 1):
                if '/*' in line:
                    in_comment_block = True
                if '*/' in line:
                    in_comment_block = False
                
                if not in_comment_block and ID_SELECTOR_RE.search(line):
                    violations.append((i, line.strip()))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return violations

def check_default_export(file_path: Path) -> bool:
    """
    Checks if a .tsx file has a default export.
    Returns True if a default export is found, False otherwise.
    """
    try:
        content = file_path.read_text(encoding='utf-8')
        return bool(DEFAULT_EXPORT_RE.search(content))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return True # Assume it's fine to avoid false positives on read errors

def main():
    parser = argparse.ArgumentParser(
        description="Validates project files against the style guide conventions."
    )
    parser.parse_args()

    print("--- Starting Project Validation ---")
    total_errors = 0

    # --- Check 1: Inline Styles in TSX ---
    print("\n[1] Checking for inline styles in .tsx files...")
    tsx_files = find_files(SRC_DIR, '.tsx')
    inline_style_errors = 0
    for file in tsx_files:
        violations = check_inline_styles(file)
        if violations:
            print(f"  - \033[93mVIOLATION\033[0m in {file.relative_to(PROJECT_ROOT)}:")
            for line_num, line_content in violations:
                print(f"    - Line {line_num}: {line_content}")
            inline_style_errors += len(violations)
    if inline_style_errors == 0:
        print("  \033[92mPASS:\033[0m No inline styles found.")
    total_errors += inline_style_errors

    # --- Check 2: ID Selectors in CSS ---
    print("\n[2] Checking for ID selectors in .css files...")
    css_files = find_files(SRC_DIR, '.css')
    id_selector_errors = 0
    for file in css_files:
        violations = check_id_selectors(file)
        if violations:
            print(f"  - \033[93mVIOLATION\033[0m in {file.relative_to(PROJECT_ROOT)}:")
            for line_num, line_content in violations:
                print(f"    - Line {line_num}: {line_content}")
            id_selector_errors += len(violations)
    if id_selector_errors == 0:
        print("  \033[92mPASS:\033[0m No ID selectors found.")
    total_errors += id_selector_errors

    # --- Check 3: Default Exports in TSX Components ---
    print("\n[3] Checking for default exports in component .tsx files...")
    component_files = [f for f in tsx_files if f.parent.name == 'components' or f.parent.parent.name == 'components']
    missing_export_errors = 0
    for file in component_files:
        # App.tsx is an exception
        if file.name == 'App.tsx': continue
        if not check_default_export(file):
            print(f"  - \033[93mVIOLATION\033[0m in {file.relative_to(PROJECT_ROOT)}: Missing default export.")
            missing_export_errors += 1
    if missing_export_errors == 0:
        print("  \033[92mPASS:\033[0m All components have a default export.")
    total_errors += missing_export_errors


    # --- Summary ---
    print("\n--- Validation Summary ---")
    if total_errors == 0:
        print("\033[92mAll checks passed successfully!\033[0m")
        exit(0)
    else:
        print(f"\033[91mFound {total_errors} violation(s).\033[0m Please review the logs above.")
        exit(1)

if __name__ == "__main__":
    main()