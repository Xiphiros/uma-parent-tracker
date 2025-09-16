import argparse
import re
import json
from pathlib import Path
from typing import List, Tuple, Set, Dict, Any

# --- Constants ---
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
SRC_DIR = PROJECT_ROOT / 'src'
PUBLIC_DIR = PROJECT_ROOT / 'public'
LOCALES_DIR = SRC_DIR / 'locales'
WCAG_AA_RATIO = 4.5

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
INVALID_BEM_RE = re.compile(r'(___|---)')
CSS_VAR_RE = re.compile(r'(--[\w-]+):\s*(#[\da-fA-F]{3,6});')
# Use a word boundary (\b) to ensure we're matching the 't' function and not a variable containing 't'.
# Also improve the optional arguments part of the regex.
I18N_KEY_RE = re.compile(r"""\bt\(\s*['"]([\w.:-]+)['"](?:,.*)?\)""")


# --- Color Contrast Calculation Helpers ---

def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Converts a hex color string to an (R, G, B) tuple."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        return tuple(int(c * 2, 16) for c in hex_color)
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def get_relative_luminance(rgb: Tuple[int, int, int]) -> float:
    """Calculates the relative luminance of an RGB color."""
    r, g, b = rgb
    srgb = [x / 255.0 for x in (r, g, b)]
    linear = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

def get_contrast_ratio(lum1: float, lum2: float) -> float:
    """Calculates the contrast ratio between two luminance values."""
    lighter = max(lum1, lum2)
    darker = min(lum1, lum2)
    return (lighter + 0.05) / (darker + 0.05)


# --- Validation Functions ---

def parse_css_variables(file_path: Path) -> Dict[str, Dict[str, str]]:
    """Parses a CSS file and extracts color variables for light and dark themes."""
    themes = {'light': {}, 'dark': {}}
    try:
        content = file_path.read_text(encoding='utf-8')
        # Simple parsing based on `html` and `html.dark` blocks
        light_theme_match = re.search(r'html\s*\{([^}]+)\}', content, re.DOTALL)
        dark_theme_match = re.search(r'html\.dark\s*\{([^}]+)\}', content, re.DOTALL)

        if light_theme_match:
            themes['light'] = {var: val for var, val in CSS_VAR_RE.findall(light_theme_match.group(1))}
        if dark_theme_match:
            themes['dark'] = {var: val for var, val in CSS_VAR_RE.findall(dark_theme_match.group(1))}
    except Exception as e:
        print(f"Error parsing CSS variables from {file_path}: {e}")
    return themes

def check_color_contrast(css_variables: Dict[str, Dict[str, str]]) -> List[Dict[str, Any]]:
    """Checks predefined color pairs for WCAG AA contrast compliance."""
    violations = []
    pairs_to_test = [
        # Main text on backgrounds
        ('--color-text-primary', '--color-bg'),
        ('--color-text-secondary', '--color-bg'),
        ('--color-text-primary', '--color-card-bg'),
        ('--color-text-secondary', '--color-card-bg'),
        ('--color-text-header', '--color-card-bg'),
        # Button text on button backgrounds
        ('--color-text-inverted', '--color-button-primary-bg'),
        ('--color-text-inverted', '--color-button-secondary-bg'),
        ('--color-text-inverted', '--color-button-danger-bg'),
        # Links
        ('--color-text-link', '--color-card-bg'),
    ]
    for theme_name, variables in css_variables.items():
        for fg_var, bg_var in pairs_to_test:
            fg_hex = variables.get(fg_var)
            bg_hex = variables.get(bg_var)

            if not fg_hex or not bg_hex: continue

            fg_lum = get_relative_luminance(hex_to_rgb(fg_hex))
            bg_lum = get_relative_luminance(hex_to_rgb(bg_hex))
            ratio = get_contrast_ratio(fg_lum, bg_lum)

            if ratio < WCAG_AA_RATIO:
                violations.append({
                    'theme': theme_name,
                    'fg_var': fg_var, 'fg_hex': fg_hex,
                    'bg_var': bg_var, 'bg_hex': bg_hex,
                    'ratio': ratio
                })
    return violations

def find_files(directory: Path, extension: str) -> List[Path]:
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
    EXCLUDED_FILES = {'Icons.tsx'}
    if file_path.name in EXCLUDED_FILES: return True
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
                if line.strip().startswith('--') or re.search(r'\.\S+--\S+\.\S+--\S+', line): continue
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
    EXCLUDED_FILES = {'Icons.tsx'}
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

def _get_nested_keys(data: Dict[str, Any], prefix: str = '') -> Set[str]:
    """Recursively flattens a dictionary and returns a set of its keys."""
    keys = set()
    for key, value in data.items():
        new_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            keys.update(_get_nested_keys(value, new_key))
        else:
            keys.add(new_key)
    return keys

def check_translations() -> List[str]:
    """Checks for missing translation keys across all supported languages."""
    violations = []
    base_lang = 'en'
    other_langs = [d.name for d in LOCALES_DIR.iterdir() if d.is_dir() and d.name != base_lang]
    
    base_files = find_files(LOCALES_DIR / base_lang, '.json')
    
    for base_file in base_files:
        try:
            with open(base_file, 'r', encoding='utf-8') as f:
                base_data = json.load(f)
            base_keys = _get_nested_keys(base_data)
            
            for lang in other_langs:
                other_file = LOCALES_DIR / lang / base_file.name
                if not other_file.exists():
                    violations.append(f"File missing: {other_file.relative_to(PROJECT_ROOT)}")
                    continue
                
                with open(other_file, 'r', encoding='utf-8') as f:
                    other_data = json.load(f)
                other_keys = _get_nested_keys(other_data)
                
                missing_keys = base_keys - other_keys
                for key in sorted(list(missing_keys)):
                    violations.append(f"Missing key '{key}' in {other_file.relative_to(PROJECT_ROOT)}")

        except Exception as e:
            violations.append(f"Error processing file {base_file.relative_to(PROJECT_ROOT)}: {e}")
            
    return violations

def check_source_code_keys(tsx_files: List[Path]) -> List[str]:
    """Checks for translation keys used in source code but not defined in 'en' locales."""
    # 1. Get all keys defined in the base 'en' locale files.
    defined_keys: Set[str] = set()
    en_locale_dir = LOCALES_DIR / 'en'
    en_files = find_files(en_locale_dir, '.json')
    for en_file in en_files:
        namespace = en_file.stem
        try:
            with open(en_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            flattened_keys = _get_nested_keys(data)
            for key in flattened_keys:
                defined_keys.add(key)  # For use with useTranslation(['ns1', 'ns2'])
                defined_keys.add(f"{namespace}:{key}")  # For use with t('ns1:key')
        except Exception as e:
            return [f"Error parsing {en_file.relative_to(PROJECT_ROOT)}: {e}"]

    # 2. Get all keys used in the source code.
    used_keys: Set[str] = set()
    for tsx_file in tsx_files:
        try:
            content = tsx_file.read_text(encoding='utf-8')
            matches = I18N_KEY_RE.findall(content)
            for key in matches:
                used_keys.add(key)
        except Exception:
            continue

    # 3. Find the difference.
    missing_keys = used_keys - defined_keys
    
    return sorted(list(missing_keys))


def main():
    parser = argparse.ArgumentParser(description="Validates project files against the style guide conventions.")
    parser.add_argument("-v", "--verbose", action="store_true", help="Print detailed information for each violation.")
    args = parser.parse_args()

    print("--- Starting Project Validation ---")
    total_errors = 0
    tsx_files = find_files(SRC_DIR, '.tsx')
    css_files = find_files(SRC_DIR, '.css')

    # --- Group 1: TSX/React Checks ---
    print("\n Checking TSX/React files...")
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
    print("\n Checking CSS files...")
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
    print("\n Checking project health...")
    unused_asset_violations = check_unused_assets()
    unused_asset_errors = len(unused_asset_violations)
    if unused_asset_errors == 0: print("  \033[92mPASS:\033[0m No unused image assets found.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {unused_asset_errors} unused image asset(s).")
        if args.verbose:
            for file in unused_asset_violations: print(f"    - {file}")
    total_errors += unused_asset_errors

    # --- Group 4: Accessibility Checks ---
    print("\n Checking Accessibility...")
    css_vars = parse_css_variables(SRC_DIR / 'css' / 'main.css')
    contrast_violations = check_color_contrast(css_vars)
    contrast_errors = len(contrast_violations)
    if contrast_errors == 0:
        print(f"  \033[92mPASS:\033[0m All color pairs meet WCAG AA contrast ratio ({WCAG_AA_RATIO}:1).")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {contrast_errors} color pair(s) that fail WCAG AA contrast ratio.")
        if args.verbose:
            for v in contrast_violations:
                print(f"    - [{v['theme'].upper()}] {v['fg_var']} on {v['bg_var']} has a ratio of {v['ratio']:.2f}:1.")
    total_errors += contrast_errors

    # --- Group 5: Localization Checks ---
    print("\n Checking Localization files...")
    translation_violations = check_translations()
    translation_errors = len(translation_violations)
    if translation_errors == 0:
        print("  \033[92mPASS:\033[0m All translation keys are consistent across languages.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {translation_errors} missing translation key(s).")
        if args.verbose:
            for violation in translation_violations:
                print(f"    - {violation}")
    total_errors += translation_errors
    
    source_key_violations = check_source_code_keys(tsx_files)
    source_key_errors = len(source_key_violations)
    if source_key_errors == 0:
        print("  \033[92mPASS:\033[0m All translation keys used in source code are defined.")
    else:
        print(f"  \033[91mFAIL:\033[0m Found {source_key_errors} undefined key(s) used in source code.")
        if args.verbose:
            for key in source_key_violations:
                print(f"    - Missing key definition for: '{key}'")
    total_errors += source_key_errors


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