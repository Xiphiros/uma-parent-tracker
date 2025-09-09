import json
from pathlib import Path
import re

# --- INSTRUCTIONS ---
# To generate all production data, run the scripts in the following order from the project root:
# 1. `python scripts/prepare_raw_data_gl.py path/to/global/master.mdb`
# 2. `python scripts/prepare_raw_data_jp.py path/to/jp/master.mdb`
# 3. `python scripts/prepare_data.py` (This script)
#
# Note: Factor data for races and scenarios must be manually placed in raw_data/
# from the appropriate sources before running this script.
#
# This pipeline will generate the final production files:
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
        skill_names[skill_id] = [jp_name, gl_name or jp_name, bool(gl_name)] # [jp, en, isGlobal]

    print("Skill data merging complete.")
    return skill_data, skill_meta, skill_names

def prepare_skills(skill_data, skill_meta, skill_names):
    """Processes merged skill and race data into a format usable by the application."""
    print("Processing skills and factors...")
    
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
        is_global = name_list[2]
                
        if '◎' in name_jp or '×' in name_jp:
            continue

        all_possible_skills.append({
            'id': skill_id,
            'name_jp': name_jp,
            'name_en': name_en,
            'type': 'unique' if is_inherited_unique else 'normal',
            'rarity': skill.get('rarity'),
            'groupId': skill_meta[base_id].get('groupId'),
            'isGlobal': is_global
        })
        
    # Process and add race and scenario factors
    race_factors = set()
    for ver in ['jp', 'global']:
        race_file = RAW_DATA_DIR / ver / 'races.json'
        if race_file.exists():
            with open(race_file, 'r', encoding='utf-8') as f:
                race_factors.update(json.load(f))
    
    scenario_factors = set()
    for ver in ['jp', 'global']:
        scenario_file = RAW_DATA_DIR / ver / 'scenarios.json'
        if scenario_file.exists():
            with open(scenario_file, 'r', encoding='utf-8') as f:
                scenario_factors.update(json.load(f))

    all_race_factors = sorted(list(race_factors))
    all_scenario_factors = sorted(list(scenario_factors))

    def add_factor_to_list(name: str, prefix: str):
        factor_id = prefix + re.sub(r'[^a-z0-9]+', '', name.lower())
        all_possible_skills.append({
            'id': factor_id,
            'name_jp': name,
            'name_en': name,
            'type': 'normal',
            'rarity': 1,
            'groupId': None,
            'isGlobal': True # Assume global by default for simplicity
        })
    
    print(f"Loaded {len(all_race_factors)} unique race factors.")
    for factor in all_race_factors: add_factor_to_list(factor, 'race_')
        
    print(f"Loaded {len(all_scenario_factors)} unique scenario factors.")
    for factor in all_scenario_factors: add_factor_to_list(factor, 'scenario_')

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
        
    print(f"Successfully processed {len(inheritable_skills)} skills and factors for production.")
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
                'isGlobal': bool(gl_outfits.get(outfit_id)) and bool(gl_uma.get('name', ['', ''])[1])
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