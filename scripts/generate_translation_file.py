import json
from pathlib import Path
import argparse

# --- PATHS ---
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
RAW_DATA_DIR = PROJECT_ROOT / 'raw_data'
TRANSLATIONS_DIR = PROJECT_ROOT / 'src' / 'data' / 'community_translations'

# --- Category Definitions ---
CATEGORIES = {
    'characters': 'characters.json',
    'outfits': 'outfits.json',
    'skills_unique': 'skills_unique.json',
    'skills_normal': 'skills_normal.json',
    'skills_misc': 'skills_misc.json', # For races, scenarios, etc.
}

def _load_raw_json(version: str, filename: str):
    file_path = RAW_DATA_DIR / version / filename
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def load_existing_translations():
    """Loads all categorized translation files from the directory."""
    translations = {}
    TRANSLATIONS_DIR.mkdir(parents=True, exist_ok=True)
    for category, filename in CATEGORIES.items():
        file_path = TRANSLATIONS_DIR / filename
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                translations[category] = json.load(f)
        else:
            translations[category] = {}
    return translations

def save_translations(translations):
    """Saves translations back to their categorized files."""
    for category, data in translations.items():
        # Sort data by key before saving for consistent file order
        sorted_data = dict(sorted(data.items()))
        file_path = TRANSLATIONS_DIR / CATEGORIES[category]
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(sorted_data, f, indent=2, ensure_ascii=False)
            f.write('\n')

def main():
    parser = argparse.ArgumentParser(
        description="Generates categorized template files for providing unofficial English translations."
    )
    parser.parse_args()

    print("--- Generating community translation files ---")

    translations = load_existing_translations()
    print(f"Loaded existing translations from: {TRANSLATIONS_DIR.relative_to(PROJECT_ROOT)}")

    # Load raw data
    jp_skill_names = _load_raw_json('jp', 'skillnames.json')
    gl_skill_names = _load_raw_json('global', 'skillnames.json')
    jp_umas = _load_raw_json('jp', 'umas.json')
    gl_umas = _load_raw_json('global', 'umas.json')

    new_entries_count = 0

    # Process Skills
    for skill_id, names in jp_skill_names.items():
        jp_name = names[0]
        gl_name = gl_skill_names.get(skill_id, [None, None])[1]
        
        if jp_name and not gl_name:
            # Determine category
            if skill_id.startswith('9') or (skill_id.startswith('1') and len(skill_id) > 4): # Heuristic for uniques
                category = 'skills_unique'
            else:
                category = 'skills_normal'
            
            if skill_id not in translations[category]:
                translations[category][skill_id] = { "jp_text": jp_name, "unofficialTranslation": "" }
                new_entries_count += 1
            
    # Process Characters and Outfits
    for char_id, uma_info in jp_umas.items():
        jp_char_name = uma_info.get("name", [None, None])[0]
        gl_char_info = gl_umas.get(char_id, {})
        gl_char_name = gl_char_info.get("name", [None, None])[1]

        if jp_char_name and not gl_char_name and char_id not in translations["characters"]:
            translations["characters"][char_id] = { "jp_text": jp_char_name, "unofficialTranslation": "" }
            new_entries_count += 1

        for outfit_id, jp_outfit_name in uma_info.get("outfits", {}).items():
            gl_outfit_name = gl_char_info.get("outfits", {}).get(outfit_id)
            if jp_outfit_name and not gl_outfit_name and outfit_id not in translations["outfits"]:
                 translations["outfits"][outfit_id] = { "jp_text": jp_outfit_name, "unofficialTranslation": "" }
                 new_entries_count += 1

    save_translations(translations)
    
    print(f"\nProcess complete. Added {new_entries_count} new untranslated entries.")
    print(f"Translation files saved in: {TRANSLATIONS_DIR.relative_to(PROJECT_ROOT)}")
    if new_entries_count > 0:
        print("Please edit the relevant JSON files to add translations, then run 'prepare_data.py'.")

if __name__ == "__main__":
    main()