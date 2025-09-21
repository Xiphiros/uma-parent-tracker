import json
from pathlib import Path
import re
import hashlib

# --- INSTRUCTIONS ---
# To generate all production data, run the scripts in the following order from the project root:
# 1. `python scripts/prepare_raw_data_gl.py path/to/global/master.mdb`
# 2. `python scripts/prepare_raw_data_jp.py path/to/jp/master.mdb`
# 3. `python scripts/prepare_raw_affinity_components.py global path/to/global/master.mdb`
# 4. `python scripts/prepare_raw_affinity_components.py jp path/to/jp/master.mdb`
# 5. `python scripts/prepare_raw_aptitude_factors.py jp path/to/jp/master.mdb`
# 6. `python scripts/prepare_data.py` (This script)
#
# Note: Factor data for races and scenarios must be manually placed in raw_data/
# from the appropriate sources before running this script.
#
# This pipeline will generate the final production files:
#    - `src/data/skill-list.json`
#    - `src/data/uma-list.json`
#    - `src/data/affinity_jp.json`
#    - `src/data/affinity_gl.json`
#    - `src/data/skill-list-dev.json` (an unfiltered list for dev tools)

# --- PATHS ---
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
RAW_DATA_DIR = PROJECT_ROOT / 'raw_data'
OUTPUT_DATA_DIR = PROJECT_ROOT / 'src' / 'data'
UMA_IMG_DIR = PROJECT_ROOT / 'public' / 'images' / 'umas'
EXCLUSION_PATH = OUTPUT_DATA_DIR / 'skill-exclusions.json'
FACTOR_MAP_PATH = RAW_DATA_DIR / 'factor-map.json'
COMMUNITY_TRANSLATIONS_DIR = OUTPUT_DATA_DIR / 'community_translations'

# --- DATA LOADING AND MERGING ---

def _load_json(path: Path):
    if path.exists():
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    print(f"Warning: {path} not found. Continuing with empty data.")
    return {}

def load_all_translations(directory: Path) -> dict:
    """Loads all JSON files from a directory and merges them by category."""
    merged_translations = {
        'characters': {}, 'outfits': {}, 'skills': {},
    }
    if not directory.exists():
        print("Community translations directory not found. Skipping.")
        return merged_translations

    for file_path in directory.glob('*.json'):
        category_data = _load_json(file_path)
        if 'skills' in file_path.name:
            merged_translations['skills'].update(category_data)
        elif 'characters' in file_path.name:
            merged_translations['characters'].update(category_data)
        elif 'outfits' in file_path.name:
            merged_translations['outfits'].update(category_data)
            
    print(f"Loaded {len(merged_translations['skills'])} skill, {len(merged_translations['characters'])} character, and {len(merged_translations['outfits'])} outfit community translations.")
    return merged_translations


def load_and_merge_skill_data():
    """Loads and merges JP and Global skill-related data sources."""
    print("Loading and merging skill data...")
    
    jp_skill_data = _load_json(RAW_DATA_DIR / 'jp' / 'skill_data.json')
    gl_skill_data = _load_json(RAW_DATA_DIR / 'global' / 'skill_data.json')
    skill_data = {**jp_skill_data, **gl_skill_data}
    
    jp_skill_meta = _load_json(RAW_DATA_DIR / 'jp' / 'skill_meta.json')
    gl_skill_meta = _load_json(RAW_DATA_DIR / 'global' / 'skill_meta.json')
    skill_meta = {**jp_skill_meta, **gl_skill_meta}

    jp_names = _load_json(RAW_DATA_DIR / 'jp' / 'skillnames.json')
    gl_names = _load_json(RAW_DATA_DIR / 'global' / 'skillnames.json')

    # A skill is global ONLY if its data exists in the global skill_data file.
    # The name might be present for future content, but the data is what matters.
    global_skill_ids = set(gl_skill_data.keys())

    skill_names = {}
    all_skill_ids = set(jp_names.keys()) | set(gl_names.keys())
    for skill_id in all_skill_ids:
        jp_name = jp_names.get(skill_id, ["", ""])[0]
        gl_name = gl_names.get(skill_id, ["", ""])[1]

        # Determine isGlobal status. For uniques, we need to check the base skill ID.
        base_id = skill_id.split('-')[0]
        is_inherited_unique = base_id.startswith('9')
        source_skill_id = base_id
        if is_inherited_unique:
            source_skill_id = '1' + base_id[1:]
        
        is_global = source_skill_id in global_skill_ids

        skill_names[skill_id] = [jp_name, gl_name or jp_name, is_global] # [jp, en, isGlobal]

    print("Skill data merging complete.")
    return skill_data, skill_meta, skill_names

def prepare_skills(skill_data, skill_meta, skill_names, translations):
    """Processes merged skill and race data into a format usable by the application."""
    print("Processing skills and factors...")
    
    output_path = OUTPUT_DATA_DIR / 'skill-list.json'
    dev_output_path = OUTPUT_DATA_DIR / 'skill-list-dev.json'

    # Create a full list of potentially inheritable skills before any exclusions
    all_possible_skills = []
    INHERITABLE_RARITIES = {1, 2}
    
    for skill_id in skill_names.keys():
        base_id = skill_id.split('-')[0]
        is_inherited_unique = base_id.startswith('9')
        
        source_skill_id = base_id
        if is_inherited_unique:
            # Inherited skill data comes from the base unique skill
            source_skill_id = '1' + base_id[1:]
        
        skill = skill_data.get(source_skill_id)
        meta = skill_meta.get(source_skill_id)

        # Skip if we can't find base data for this skill name
        if not skill or not meta:
            continue

        # Filter out skills that aren't inheritable sparks
        # (i.e., base uniques, skills with rarity > 2, etc.)
        if skill.get('rarity') not in INHERITABLE_RARITIES and not is_inherited_unique:
            continue
            
        name_list = skill_names[skill_id]
        jp_name = name_list[0]
        name_en = name_list[1]
        is_global = name_list[2]
        community_translation = translations.get('skills', {}).get(skill_id, {}).get('unofficialTranslation')

        if '◎' in jp_name or jp_name.endswith('×'):
            continue

        skill_entry = {
            'id': skill_id,
            'name_jp': jp_name,
            'name_en': name_en,
            'type': 'unique' if is_inherited_unique else 'normal',
            'rarity': skill.get('rarity'),
            'groupId': meta.get('groupId'),
            'isGlobal': is_global
        }

        if community_translation and not is_global:
            skill_entry['name_en_community'] = community_translation
        
        all_possible_skills.append(skill_entry)
        
    # --- New Factor Processing Logic ---
    print("Processing race, scenario, and aptitude factors...")

    # 1. Load the canonical map and raw factor lists
    factor_map = _load_json(FACTOR_MAP_PATH)
    
    global_race_factors = set(_load_json(RAW_DATA_DIR / 'global' / 'races.json'))
    jp_race_factors = set(_load_json(RAW_DATA_DIR / 'jp' / 'races.json'))
    global_scenario_factors = set(_load_json(RAW_DATA_DIR / 'global' / 'scenarios.json'))
    jp_scenario_factors = set(_load_json(RAW_DATA_DIR / 'jp' / 'scenarios.json'))
    global_aptitude_factors = set(_load_json(RAW_DATA_DIR / 'global' / 'aptitude_factors.json'))
    jp_aptitude_factors = set(_load_json(RAW_DATA_DIR / 'jp' / 'aptitude_factors.json'))

    processed_names = set()

    # 2. Process all mapped factors first, creating unified entries
    for factor_type, factors in factor_map.items():
        prefix = "race_" if factor_type == "races" else "scenario_"
        global_factors = global_race_factors if factor_type == "races" else global_scenario_factors
        for factor_id, names in factors.items():
            all_possible_skills.append({
                'id': factor_id,
                'name_en': names['en'],
                'name_jp': names['jp'],
                'type': 'normal', 'rarity': 1, 'groupId': None,
                'isGlobal': names['en'] in global_factors
            })
            processed_names.add(names['en'])
            processed_names.add(names['jp'])

    # 3. Process unmapped factors (version-exclusive)
    unmapped_gl_races = global_race_factors - processed_names
    unmapped_jp_races = jp_race_factors - processed_names
    unmapped_gl_scenarios = global_scenario_factors - processed_names
    unmapped_jp_scenarios = jp_scenario_factors - processed_names
    
    def add_unmapped_factor(name: str, prefix: str, is_global: bool):
        factor_hash = hashlib.md5(name.encode('utf-8')).hexdigest()
        factor_id = prefix + factor_hash
        
        skill_entry = {
            'id': factor_id,
            'name_jp': name, 'name_en': name,
            'type': 'normal', 'rarity': 1, 'groupId': None,
            'isGlobal': is_global
        }
        
        community_translation = translations.get('skills', {}).get(factor_id, {}).get('unofficialTranslation')
        if community_translation and not is_global:
            skill_entry['name_en_community'] = community_translation
            
        all_possible_skills.append(skill_entry)

    for factor in sorted(list(unmapped_gl_races)): add_unmapped_factor(factor, 'race_', True)
    for factor in sorted(list(unmapped_jp_races)): add_unmapped_factor(factor, 'race_', False)
    for factor in sorted(list(unmapped_gl_scenarios)): add_unmapped_factor(factor, 'scenario_', True)
    for factor in sorted(list(unmapped_jp_scenarios)): add_unmapped_factor(factor, 'scenario_', False)

    # 4. Process Aptitude Factors (Green Sparks)
    all_aptitude_factors = jp_aptitude_factors.union(global_aptitude_factors)
    for factor in sorted(list(all_aptitude_factors)):
        add_unmapped_factor(factor, 'aptitude_', factor in global_aptitude_factors)


    print(f"Processed {len(factor_map.get('races', [])) + len(factor_map.get('scenarios', []))} mapped factors.")
    print(f"Processed {len(unmapped_gl_races | unmapped_jp_races)} unmapped race factors.")
    print(f"Processed {len(unmapped_gl_scenarios | unmapped_jp_scenarios)} unmapped scenario factors.")
    print(f"Processed {len(all_aptitude_factors)} aptitude factors.")

    # --- End of New Factor Logic ---

    all_possible_skills.sort(key=lambda x: x['name_en'])
    with open(dev_output_path, 'w', encoding='utf-8') as f:
        json.dump(all_possible_skills, f, indent=2, ensure_ascii=False)
    print(f"Dev skill list saved to: {dev_output_path.relative_to(PROJECT_ROOT)}")

    exclusions = set(_load_json(EXCLUSION_PATH))
    print(f"Loaded {len(exclusions)} skill exclusions.")
    
    inheritable_skills = [s for s in all_possible_skills if s['id'] not in exclusions]

    OUTPUT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(inheritable_skills, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully processed {len(inheritable_skills)} skills and factors for production.")
    print(f"Skill output saved to: {output_path.relative_to(PROJECT_ROOT)}")

def prepare_umas(translations):
    """Processes merged uma data and links it with available images."""
    print("\nProcessing umas...")
    jp_umas_data = _load_json(RAW_DATA_DIR / 'jp' / 'umas.json')
    gl_umas_data = _load_json(RAW_DATA_DIR / 'global' / 'umas.json')

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
        char_name_en_official = gl_uma.get('name', ['', ''])[1]
        char_name_en_community = translations.get('characters', {}).get(char_id, {}).get('unofficialTranslation')
        is_char_global = bool(char_name_en_official)
        char_name_en_base = char_name_en_official or char_name_jp

        jp_outfits = jp_uma.get('outfits', {})
        gl_outfits = gl_uma.get('outfits', {})
        all_outfit_ids = set(jp_outfits.keys()) | set(gl_outfits.keys())

        if not char_name_en_base: continue

        for outfit_id in sorted(list(all_outfit_ids)):
            outfit_name_jp = jp_outfits.get(outfit_id)
            outfit_name_en_official = gl_outfits.get(outfit_id)
            outfit_name_en_community = translations.get('outfits', {}).get(outfit_id, {}).get('unofficialTranslation')
            is_outfit_global = bool(outfit_name_en_official)
            outfit_name_en_base = outfit_name_en_official or outfit_name_jp

            formatted_name_jp = f"{outfit_name_jp}{char_name_jp}" if outfit_name_jp else char_name_jp
            
            # Base EN name (Official > JP)
            outfit_prefix_en = outfit_name_en_base
            formatted_name_en = f"{outfit_prefix_en} {char_name_en_base}" if outfit_prefix_en else char_name_en_base

            # Community EN name
            final_char_name_comm = char_name_en_community if char_name_en_community and not is_char_global else char_name_en_base
            final_outfit_name_comm = outfit_name_en_community if outfit_name_en_community and not is_outfit_global else outfit_name_en_base
            formatted_name_en_community = f"{final_outfit_name_comm} {final_char_name_comm}" if final_outfit_name_comm else final_char_name_comm

            uma_entry = {
                'id': outfit_id,
                'characterId': char_id,
                'name_jp': formatted_name_jp,
                'name_en': formatted_name_en,
                'isGlobal': is_char_global and is_outfit_global
            }
            
            if formatted_name_en_community != formatted_name_en:
                 uma_entry['name_en_community'] = formatted_name_en_community
            
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

def prepare_affinity_components():
    """Copies raw JP and Global affinity components into separate production files."""
    print("\nProcessing affinity components...")
    
    # Define paths
    jp_source_path = RAW_DATA_DIR / 'jp' / 'affinity_components.json'
    gl_source_path = RAW_DATA_DIR / 'global' / 'affinity_components.json'
    jp_dest_path = OUTPUT_DATA_DIR / 'affinity_jp.json'
    gl_dest_path = OUTPUT_DATA_DIR / 'affinity_gl.json'

    OUTPUT_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Process JP data
    jp_data = _load_json(jp_source_path)
    if jp_data:
        with open(jp_dest_path, 'w', encoding='utf-8') as f:
            json.dump(jp_data, f, ensure_ascii=False)
        print(f"Successfully copied JP affinity components to: {jp_dest_path.relative_to(PROJECT_ROOT)}")
    else:
        print(f"Warning: JP affinity source not found at {jp_source_path}")

    # Process Global data
    gl_data = _load_json(gl_source_path)
    if gl_data:
        with open(gl_dest_path, 'w', encoding='utf-8') as f:
            json.dump(gl_data, f, ensure_ascii=False)
        print(f"Successfully copied Global affinity components to: {gl_dest_path.relative_to(PROJECT_ROOT)}")
    else:
        print(f"Warning: Global affinity source not found at {gl_source_path}")


if __name__ == "__main__":
    try:
        translations = load_all_translations(COMMUNITY_TRANSLATIONS_DIR)
        skill_data, skill_meta, skill_names = load_and_merge_skill_data()
        prepare_skills(skill_data, skill_meta, skill_names, translations)
        prepare_umas(translations)
        prepare_affinity_components()
    except Exception as e:
        print(f"\nAn error occurred during data preparation: {e}")