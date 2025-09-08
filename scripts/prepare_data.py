import json
from pathlib import Path
import re

# --- INSTRUCTIONS ---
# 1. Ensure you have run `scripts/prepare_raw_data_jp.py` and `scripts/prepare_raw_data_gl.py`
#    to generate the necessary JSON files in `raw_data/jp/` and `raw_data/global/`.
# 2. (Optional) Update `raw_data/races.json` with a list of race names.
# 3. (Optional) Update `src/data/skill-exclusions.json` to exclude skills from the final list.
# 4. Run this script from your project root: `python scripts/prepare_data.py`
# 5. This will merge the JP and Global data and generate the final production files:
#    - `src/data/skill-list.json`
#    - `src/data/uma-list.json`
#    - `src/data/skill-list-dev.json` (an unfiltered list for dev tools)

# --- PATHS ---
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
RAW_DATA_DIR = PROJECT_ROOT / 'raw_data'
OUTPUT_DATA_DIR = PROJECT_ROOT / 'src' / 'data'
UMA_IMG_DIR = PROJECT_ROOT / 'public' / 'images' / 'umas'
EXCLUSION_PATH = OUTPUT_DATA_DIR / 'skill-exclusions.json'

# --- DATA LOADING AND MERGING ---

def _load_json(version: str, filename: str):
    file_path = RAW_DATA_DIR / version / filename
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    print(f"Warning: {file_path} not found. Continuing with empty data.")
    return {}

def load_and_merge_skill_data():
    """Loads and merges JP and Global skill-related data sources."""
    print("Loading and merging skill data...")
    
    jp_skill_data = _load_json('jp', 'skill_data.json')
    gl_skill_data = _load_json('global', 'skill_data.json')
    skill_data = {**jp_skill_data, **gl_skill_data}
    
    jp_skill_meta = _load_json('jp', 'skill_meta.json')
    gl_skill_meta = _load_json('global', 'skill_meta.json')
    skill_meta = {**jp_skill_meta, **gl_skill_meta}

    jp_names = _load_json('jp', 'skillnames.json')
    gl_names = _load_json('global', 'skillnames.json')
    skill_names = {}
    all_skill_ids = set(jp_names.keys()) | set(gl_names.keys())
    for skill_id in all_skill_ids:
        jp_name = jp_names.get(skill_id, ["", ""])[0]
        gl_name = gl_names.get(skill_id, ["", ""])[1]
        skill_names[skill_id] = [jp_name, gl_name or jp_name]

    print("Skill data merging complete.")
    return skill_data, skill_meta, skill_names

def prepare_skills(skill_data, skill_meta, skill_names):
    """Processes merged skill and race data into a format usable by the application."""
    print("Processing skills and races...")
    
    races_path = RAW_DATA_DIR / 'races.json'
    output_path = OUTPUT_DATA_DIR / 'skill-list.json'
    dev_output_path = OUTPUT_DATA_DIR / 'skill-list-dev.json'

    # Create a full list of potentially inheritable skills before any exclusions
    all_possible_skills = []
    INHERITABLE_RARITIES = {1, 2}
    
    for skill_id, skill in skill_data.items():
        base_id = skill_id.split('-')[0]
        is_inherited_unique = base_id.startswith('9')

        if skill.get('rarity') not in INHERITABLE_RARITIES and not is_inherited_unique:
            continue
        if skill_id not in skill_names or not skill_names[skill_id] or base_id not in skill_meta:
            continue
            
        name_list = skill_names[skill_id]
        name_jp = name_list[0]
        name_en = name_list[1]
                
        if '◎' in name_jp or '×' in name_jp:
            continue

        all_possible_skills.append({
            'id': skill_id,
            'name_jp': name_jp,
            'name_en': name_en,
            'type': 'unique' if is_inherited_unique else 'normal',
            'rarity': skill.get('rarity'),
            'groupId': skill_meta[base_id].get('groupId')
        })
        
    # Process and add races
    if races_path.exists():
        with open(races_path, 'r', encoding='utf-8') as f:
            races = json.load(f)
        print(f"Loaded {len(races)} races.")
        for race_name in races:
            race_id = "race_" + re.sub(r'[^a-z0-9]+', '', race_name.lower())
            all_possible_skills.append({
                'id': race_id,
                'name_jp': race_name,
                'name_en': race_name,
                'type': 'normal',
                'rarity': 1,
                'groupId': None
            })
    else:
        print("Warning: races.json not found in raw_data/. No races will be added.")

    all_possible_skills.sort(key=lambda x: x['name_en'])
    with open(dev_output_path, 'w', encoding='utf-8') as f:
        json.dump(all_possible_skills, f, indent=2, ensure_ascii=False)
    print(f"Dev skill list saved to: {dev_output_path.relative_to(PROJECT_ROOT)}")

    exclusions = set()
    if EXCLUSION_PATH.exists():
        with open(EXCLUSION_PATH, 'r', encoding='utf-8') as f:
            exclusions = set(json.load(f))
        print(f"Loaded {len(exclusions)} skill exclusions.")
    else:
        print("No skill-exclusions.json file found. Creating an empty one.")
        with open(EXCLUSION_PATH, 'w', encoding='utf-8') as f:
            json.dump([], f, indent=2)
    
    inheritable_skills = [s for s in all_possible_skills if s['id'] not in exclusions]

    OUTPUT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(inheritable_skills, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully processed {len(inheritable_skills)} skills and races for production.")
    print(f"Skill output saved to: {output_path.relative_to(PROJECT_ROOT)}")

def prepare_umas():
    """Processes merged uma data and links it with available images."""
    print("\nProcessing umas...")
    jp_umas_data = _load_json('jp', 'umas.json')
    gl_umas_data = _load_json('global', 'umas.json')

    output_path = OUTPUT_DATA_DIR / 'uma-list.json'

    UMA_IMG_DIR.mkdir(parents=True, exist_ok=True)
    image_files = {p.stem: p for p in UMA_IMG_DIR.glob('*')}
    print(f"Found {len(image_files)} images in {UMA_IMG_DIR.relative_to(PROJECT_ROOT)}")

    uma_list = []
    all_char_ids = set(jp_umas_data.keys()) | set(gl_umas_data.keys())

    for char_id in sorted(list(all_char_ids)):
        jp_uma = jp_umas_data.get(char_id, {})
        gl_uma = gl_umas_data.get(char_id, {})

        char_name_jp = jp_uma.get('name', ['', ''])[0]
        char_name_en = gl_uma.get('name', ['', ''])[1] or char_name_jp

        jp_outfits = jp_uma.get('outfits', {})
        gl_outfits = gl_uma.get('outfits', {})
        all_outfit_ids = set(jp_outfits.keys()) | set(gl_outfits.keys())

        if not char_name_en: continue # Skip if no English name for the character

        for outfit_id in sorted(list(all_outfit_ids)):
            outfit_name_jp = jp_outfits.get(outfit_id)
            outfit_name_en = gl_outfits.get(outfit_id)

            # Construct the full names
            formatted_name_jp = f"{outfit_name_jp}{char_name_jp}" if outfit_name_jp else char_name_jp
            formatted_name_en = f"{outfit_name_en} {char_name_en}" if outfit_name_en else char_name_en

            uma_entry = {
                'id': outfit_id,
                'characterId': char_id,
                'name_jp': formatted_name_jp,
                'name_en': formatted_name_en,
            }
            
            if outfit_id in image_files:
                image_path = image_files[outfit_id]
                uma_entry['image'] = f"/images/umas/{image_path.name}"
            
            uma_list.append(uma_entry)

    uma_list.sort(key=lambda x: x['name_en'])

    OUTPUT_DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(uma_list, f, indent=2, ensure_ascii=False)

    print(f"Successfully processed {len(uma_list)} umas.")
    print(f"Uma output saved to: {output_path.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    try:
        skill_data, skill_meta, skill_names = load_and_merge_skill_data()
        prepare_skills(skill_data, skill_meta, skill_names)
        prepare_umas()
    except Exception as e:
        print(f"\nAn error occurred during data preparation: {e}")