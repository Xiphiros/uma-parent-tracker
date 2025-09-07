import json
from pathlib import Path

# --- INSTRUCTIONS ---
# 1. Create a `raw_data/` directory in your project root.
# 2. Copy `skill_data.json`, `skillnames.json`, and `umas.json` from the `uma-tools` project into `raw_data/`.
# 3. Create a `src/data/` directory in your project root if it doesn't exist.
# 4. Run this script from your project root: `python scripts/prepare_data.py`
# 5. It will generate `src/data/skill-list.json` and `src/data/uma-list.json`.

# Define paths relative to the script's location
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
RAW_DATA_DIR = PROJECT_ROOT / 'raw_data'
OUTPUT_DATA_DIR = PROJECT_ROOT / 'src' / 'data'

def prepare_skills():
    """Processes raw skill data into a format usable by the application."""
    print("Processing skills...")
    
    skill_data_path = RAW_DATA_DIR / 'skill_data.json'
    skill_names_path = RAW_DATA_DIR / 'skillnames.json'
    output_path = OUTPUT_DATA_DIR / 'skill-list.json'

    if not all([skill_data_path.exists(), skill_names_path.exists()]):
        print("Error: skill_data.json or skillnames.json not found in raw_data/. Skipping skill preparation.")
        return

    with open(skill_data_path, 'r', encoding='utf-8') as f:
        skill_data = json.load(f)
    with open(skill_names_path, 'r', encoding='utf-8') as f:
        skill_names = json.load(f)
        
    inheritable_skills = []
    
    # Rarity IDs: 1=White, 2=Gold. Uniques (3,4,5) are handled by checking the ID prefix.
    INHERITABLE_RARITIES = {1, 2}
    
    for skill_id, skill in skill_data.items():
        is_inherited_unique = skill_id.startswith('9')

        # Only include white/gold skills and inherited uniques.
        if skill.get('rarity') not in INHERITABLE_RARITIES and not is_inherited_unique:
            continue
            
        # Skip skills with no name entry (usually dummy skills)
        if skill_id not in skill_names:
            continue
            
        # Skip green skills (effects are only stat boosts)
        alternatives = skill.get('alternatives', [])
        if alternatives:
            first_alt = alternatives[0]
            effects = first_alt.get('effects', [])
            if effects and all(1 <= e.get('type', 0) <= 5 for e in effects):
                continue
                
        inheritable_skills.append({
            'id': skill_id,
            'name_jp': skill_names[skill_id][0],
            'name_en': skill_names[skill_id][1] or skill_names[skill_id][0],
            'type': 'unique' if is_inherited_unique else 'normal',
            'rarity': skill.get('rarity')
        })

    # Ensure output directory exists
    OUTPUT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(inheritable_skills, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully processed {len(inheritable_skills)} skills.")
    print(f"Skill output saved to: {output_path.relative_to(PROJECT_ROOT)}")

def prepare_umas():
    """Processes raw uma data into a format usable by the application."""
    print("\nProcessing umas...")

    umas_path = RAW_DATA_DIR / 'umas.json'
    output_path = OUTPUT_DATA_DIR / 'uma-list.json'

    if not umas_path.exists():
        print("Error: umas.json not found in raw_data/. Skipping uma preparation.")
        return

    with open(umas_path, 'r', encoding='utf-8') as f:
        umas_data = json.load(f)

    uma_list = []
    for uma_id, uma in umas_data.items():
        # The name is the second element in the name array
        name_array = uma.get('name', [])
        if len(name_array) > 1 and name_array[1]:
            uma_list.append({
                'id': uma_id,
                'name_en': name_array[1]
            })

    # Sort alphabetically by name
    uma_list.sort(key=lambda x: x['name_en'])

    # Ensure output directory exists
    OUTPUT_DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(uma_list, f, indent=2, ensure_ascii=False)

    print(f"Successfully processed {len(uma_list)} umas.")
    print(f"Uma output saved to: {output_path.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    prepare_skills()
    prepare_umas()