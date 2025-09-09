import json
from pathlib import Path
import argparse

# --- PATHS ---
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
RAW_DATA_DIR = PROJECT_ROOT / 'raw_data'
OUTPUT_DIR = PROJECT_ROOT / 'src' / 'data'
TRANSLATION_FILE_PATH = OUTPUT_DIR / 'community-translations.json'

def _load_raw_json(version: str, filename: str):
    file_path = RAW_DATA_DIR / version / filename
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def main():
    parser = argparse.ArgumentParser(
        description="Generates a template file for providing unofficial English translations."
    )
    parser.parse_args()

    print("--- Generating community translation file ---")

    # 1. Load existing translations or create a new structure
    if TRANSLATION_FILE_PATH.exists():
        with open(TRANSLATION_FILE_PATH, 'r', encoding='utf-8') as f:
            translations = json.load(f)
        print(f"Loaded existing translation file with {len(translations.get('skills', {}))} skills, {len(translations.get('characters', {}))} characters, {len(translations.get('outfits', {}))} outfits.")
    else:
        translations = {"skills": {}, "characters": {}, "outfits": {}}
        print("No existing translation file found. A new one will be created.")

    # 2. Load raw data
    jp_skill_names = _load_raw_json('jp', 'skillnames.json')
    gl_skill_names = _load_raw_json('global', 'skillnames.json')
    jp_umas = _load_raw_json('jp', 'umas.json')
    gl_umas = _load_raw_json('global', 'umas.json')

    new_entries_count = 0

    # 3. Process Skills
    for skill_id, names in jp_skill_names.items():
        jp_name = names[0]
        gl_name = gl_skill_names.get(skill_id, [None, None])[1]
        if jp_name and not gl_name and skill_id not in translations["skills"]:
            translations["skills"][skill_id] = {
                "jp_text": jp_name,
                "unofficialTranslation": ""
            }
            new_entries_count += 1
            
    # 4. Process Characters and Outfits
    for char_id, uma_info in jp_umas.items():
        jp_char_name = uma_info.get("name", [None, None])[0]
        gl_char_info = gl_umas.get(char_id, {})
        gl_char_name = gl_char_info.get("name", [None, None])[1]

        if jp_char_name and not gl_char_name and char_id not in translations["characters"]:
            translations["characters"][char_id] = {
                "jp_text": jp_char_name,
                "unofficialTranslation": ""
            }
            new_entries_count += 1

        for outfit_id, jp_outfit_name in uma_info.get("outfits", {}).items():
            gl_outfit_name = gl_char_info.get("outfits", {}).get(outfit_id)
            if jp_outfit_name and not gl_outfit_name and outfit_id not in translations["outfits"]:
                 translations["outfits"][outfit_id] = {
                    "jp_text": jp_outfit_name,
                    "unofficialTranslation": ""
                }
                 new_entries_count += 1

    # 5. Sort entries by ID for consistency
    translations['skills'] = dict(sorted(translations['skills'].items()))
    translations['characters'] = dict(sorted(translations['characters'].items()))
    translations['outfits'] = dict(sorted(translations['outfits'].items()))

    # 6. Write back to the file
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(TRANSLATION_FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(translations, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f"\nProcess complete. Added {new_entries_count} new untranslated entries.")
    print(f"Translation file saved to: {TRANSLATION_FILE_PATH.relative_to(PROJECT_ROOT)}")
    if new_entries_count > 0:
        print("Please edit this file to add translations, then run 'prepare_data.py'.")

if __name__ == "__main__":
    main()