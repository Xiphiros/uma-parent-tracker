import argparse
import re
import json
from pathlib import Path
from typing import List, Tuple, Set

# --- Constants ---
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
SRC_DIR = PROJECT_ROOT / 'src'
PUBLIC_DIR = PROJECT_ROOT / 'public'

# --- Regular Expressions for Checks ---
INLINE_STYLE_RE = re.compile(r'style=\{\{')
ID_SELECTOR_RE = re.compile(r'^\s*#[a-zA-Z0-9_-]+.*\{')
DEFAULT_EXPORT_RE = re.compile(r'^export\s+default\s+', re.MULTILINE)
CONSOLE_LOG_RE = re.compile(r'console\.log\s*\(')
HEX_RE = r'#[0-9a-fA-F]{3,8}'
RGB_RE = r'rgb\s*\('
RGBA_RE = r'rgba\s*\('
HSLA_RE = r'hsla\s*\('
COLOR_FUNCS = f'(?:{RGB_RE}|{RGBA_RE}|{HSLA_RE})'
HARDCODED_VALUE = f'(?:{HEX_RE}|{COLOR_FUNCS})'
HARDCODED_COLOR_RE = re.compile(fr':\s*(?!var\(--|color-mix)[\s"\']*{HARDCODED_VALUE}')
COLOR_KEYWORDS_RE = re.compile(r':\s*(red|blue|green|yellow|purple|orange|black|white)\s*;')
# Refined BEM check to be less aggressive and avoid false positives.
# It looks for triple underscores or hyphens, which are invalid.
INVALID_BEM_RE = re.compile(r'(___|---)')

def find_files(directory: Path, extension: str) -> List[Path]:
    """Finds all files with a given extension in a directory."""
    return list(directory.rglob(f'*{extension}'))

def check_inline_styles(file_path: Path) -> List[Tuple[int, str]]:
    violations = []
    allowed_dynamic_styles = {'top:', 'left:', 'backgroundColor:', 'color:', 'borderBottomColor:'}
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f, 1):
                if INLINE_STYLE_RE.search(line):
                    if not any(allowed in line for allowed in allowed_dynamic_styles):
                        violations.append((i, line.strip()))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return violations

def check_id_selectors(file_path: Path) -> List[Tuple[int, str]]:
    violations = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            in_comment_block = False
            for i, line in enumerate(f, 1):
                if '/*' in line: in_comment_block = True
                if '*/' in line: in_comment_block = False
                if not in_comment_block and ID_SELECTOR_RE.search(line):
                    violations.append((i, line.strip()))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return violations

def check_default_export(file_path: Path) -> bool:
    EXCLUDED_FILES = {'icons.tsx', 'Icons.tsx'}
    if file_path.name in EXCLUDED_FILES:
        return True
    try:
        content = file_path.read_text(encoding='utf-8')
        return bool(DEFAULT_EXPORT_RE.search(content))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return True

def check_hardcoded_colors(file_path: Path) -> List[Tuple[int, str]]:
    violations = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            in_comment_block = False
            for i, line in enumerate(f, 1):
                if '/*' in line: in_comment_block = True
                if '*/' in line: in_comment_block = False
                if in_comment_block or line.strip().startswith('--'): continue
                
                if HARDCODED_COLOR_RE.search(line) or COLOR_KEYWORDS_RE.search(line):
                    violations.append((i, line.strip()))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return violations

def check_bem_syntax(file_path: Path) -> List[Tuple[int, str]]:
    violations = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f, 1):
                # Ignore CSS variable definitions and chained modifiers
                if line.strip().startswith('--') or re.search(r'\.\S+--\S+\.\S+--\S+', line):
                    continue
                if INVALID_BEM_RE.search(line):
                    violations.append((i, line.strip()))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return violations

def check_css_imports(css_files: List[Path]) -> List[str]:
    unimported_files = []
    try:
        index_css_path = SRC_DIR / 'index.css'
        index_css_content = index_css_path.read_text(encoding='utf-8')
        
        for file in css_files:
            if 'components' not in str(file): continue
            
            import_pattern = re.compile(f'@import ".*{re.escape(file.name)}";')
            if not import_pattern.search(index_css_content):
                unimported_files.append(str(file.relative_to(PROJECT_ROOT)))
    except Exception as e:
        print(f"Error checking CSS imports: {e}")
    return unimported_files

def check_pascalcase_filenames(tsx_files: List[Path]) -> List[str]:
    violations = []
    EXCLUDED_FILES = {'icons.tsx', 'Icons.tsx'}
    for file in tsx_files:
        if file.name in EXCLUDED_FILES: continue
        if 'components' in str(file) and not file.stem[0].isupper():
            violations.append(str(file.relative_to(PROJECT_ROOT)))
    return violations

def check_console_logs(tsx_files: List[Path]) -> List[Tuple[str, int, str]]:
    violations = []
    for file in tsx_files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                for i, line in enumerate(f, 1):
                    if CONSOLE_LOG_RE.search(line):
                        violations.append((str(file.relative_to(PROJECT_ROOT)), i, line.strip()))
        except Exception as e:
            print(f"Error reading {file}: {e}")
    return violations

def check_unused_assets() -> List[str]:
    violations = []
    try:
        uma_list_path = SRC_DIR / 'data' / 'uma-list.json'
        with open(uma_list_path, 'r', encoding='utf-8') as f:
            uma_data = json.load(f)
        
        used_images: Set[str] = {uma.get('image') for uma in uma_data if uma.get('image')}
        
        asset_dir = PUBLIC_DIR / 'images' / 'umas'
        if not asset_dir.exists(): return []
            
        all_assets = [p for p in asset_dir.iterdir() if p.is_file() and p.name != '.gitkeep']
        
        for asset in all_assets:
            expected_path = f"/images/umas/{asset.name}"
            if expected_path not in used_images:
                violations.append(str(asset.relative_to(PROJECT_ROOT)))
    except Exception as e:
        print(f"Error checking for unused assets: {e}")
    return violations

def main():
    parser = argparse.ArgumentParser(description="Validates project files against the style guide conventions.")
    parser.add_argument("-v", "--verbose", action="store_true", help="Print detailed information for each violation.")
    args = parser.parse_args()

    print("--- Starting Project Validation ---")
    total_errors = 0
    tsx_files = find_files(SRC_DIR, '.tsx')
    css_files = find_files(SRC_DIR, '.css')

    # --- Group 1: TSX/React Checks ---
    print("\n[1] Checking TSX/React files...")
    inline_style_violations = {f: check_inline_styles(f) for f in tsx_files}
    pascal_case_violations = check_pascalcase_filenames(tsx_files)
    console_log_violations = check_console_logs(tsx_files)
    component_files = [f for f in tsx_files if 'components' in str(f) and f.name != 'App.tsx']
    missing_export_violations = [f for f in component_files if not check_default_export(f)]

    inline_style_errors = sum(len(v) for v in inline_style_violations.values())
    pascal_case_errors = len(pascal_case_violations)
    console_log_errors = len(console_log_violations)
    missing_export_errors = len(missing_export_violations)

    if inline_style_errors == 0: print("  \033[92mPASS:\033[0m No forbidden inline styles found.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {inline_style_errors} instance(s) of inline styles.")
        if args.verbose:
            for file, violations in inline_style_violations.items():
                if violations:
                    print(f"    - {file.relative_to(PROJECT_ROOT)}:")
                    for line_num, line_content in violations: print(f"      - Line {line_num}: {line_content}")
    
    if pascal_case_errors == 0: print("  \033[92mPASS:\033[0m All component filenames use PascalCase.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {pascal_case_errors} component(s) not using PascalCase.")
        if args.verbose:
            for file in pascal_case_violations: print(f"    - {file}")

    if console_log_errors == 0: print("  \033[92mPASS:\033[0m No console.log statements found.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {console_log_errors} console.log statement(s).")
        if args.verbose:
            for file, line_num, line_content in console_log_violations: print(f"    - {file} (Line {line_num}): {line_content}")

    if missing_export_errors == 0: print("  \033[92mPASS:\033[0m All components have a default export.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {missing_export_errors} component(s) missing a default export.")
        if args.verbose:
            for file in missing_export_violations: print(f"    - {file.relative_to(PROJECT_ROOT)}")

    total_errors += inline_style_errors + pascal_case_errors + console_log_errors + missing_export_errors

    # --- Group 2: CSS Checks ---
    print("\n[2] Checking CSS files...")
    id_selector_violations = {f: check_id_selectors(f) for f in css_files}
    hardcoded_color_violations = {f: check_hardcoded_colors(f) for f in css_files}
    bem_syntax_violations = {f: check_bem_syntax(f) for f in css_files}
    unimported_css_violations = check_css_imports(css_files)

    id_selector_errors = sum(len(v) for v in id_selector_violations.values())
    hardcoded_color_errors = sum(len(v) for v in hardcoded_color_violations.values())
    bem_syntax_errors = sum(len(v) for v in bem_syntax_violations.values())
    unimported_css_errors = len(unimported_css_violations)

    if id_selector_errors == 0: print("  \033[92mPASS:\033[0m No ID selectors found.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {id_selector_errors} ID selector(s).")
        if args.verbose:
            for file, violations in id_selector_violations.items():
                if violations:
                    print(f"    - {file.relative_to(PROJECT_ROOT)}:")
                    for line_num, line_content in violations: print(f"      - Line {line_num}: {line_content}")

    if hardcoded_color_errors == 0: print("  \033[92mPASS:\033[0m No hardcoded colors found.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {hardcoded_color_errors} hardcoded color(s).")
        if args.verbose:
            for file, violations in hardcoded_color_violations.items():
                if violations:
                    print(f"    - {file.relative_to(PROJECT_ROOT)}:")
                    for line_num, line_content in violations: print(f"      - Line {line_num}: {line_content}")

    if bem_syntax_errors == 0: print("  \033[92mPASS:\033[0m No BEM syntax violations found.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {bem_syntax_errors} BEM syntax violation(s).")
        if args.verbose:
            for file, violations in bem_syntax_violations.items():
                if violations:
                    print(f"    - {file.relative_to(PROJECT_ROOT)}:")
                    for line_num, line_content in violations: print(f"      - Line {line_num}: {line_content}")

    if unimported_css_errors == 0: print("  \033[92mPASS:\033[0m All component CSS files are imported.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {unimported_css_errors} unimported component CSS file(s).")
        if args.verbose:
            for file in unimported_css_violations: print(f"    - {file}")

    total_errors += id_selector_errors + hardcoded_color_errors + bem_syntax_errors + unimported_css_errors

    # --- Group 3: Project Health ---
    print("\n[3] Checking project health...")
    unused_asset_violations = check_unused_assets()
    unused_asset_errors = len(unused_asset_violations)
    if unused_asset_errors == 0: print("  \033[92mPASS:\033[0m No unused image assets found.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {unused_asset_errors} unused image asset(s).")
        if args.verbose:
            for file in unused_asset_violations: print(f"    - {file}")
    total_errors += unused_asset_errors

    # --- Summary ---
    print("\n--- Validation Summary ---")
    if total_errors == 0:
        print("\033[92mAll checks passed successfully!\033[0m")
        exit(0)
    else:
        print(f"\033[91mFound a total of {total_errors} violation(s).\033[0m Please review the logs above or re-run with the --verbose flag for details.")
        exit(1)

if __name__ == "__main__":
    main()