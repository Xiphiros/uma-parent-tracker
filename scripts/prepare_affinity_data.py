import json
import re
from pathlib import Path

# This script processes the raw, name-based affinity data from UmaiShow (credit: mee1080)
# and converts it into a programmatically useful format using character IDs.

# --- PATHS ---
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
RAW_DATA_DIR = PROJECT_ROOT / 'raw_data'
DATA_DIR = PROJECT_ROOT / 'src' / 'data'
UMA_LIST_PATH = DATA_DIR / 'uma-list.json'
AFFINITY_SCORES_PATH = RAW_DATA_DIR / 'affinity_scores.json'
OUTPUT_PATH = DATA_DIR / 'affinity_data.json'

def create_name_to_id_map(uma_list: list) -> dict:
    """
    Creates a mapping from a Japanese base character name to its character ID.
    It strips outfit prefixes like "[衣装名]" from the full name.
    """
    name_map = {}
    # Regex to capture the base name, ignoring any prefix in brackets.
    # Example: "[スペシャルドリーマー]スペシャルウィーク" -> "スペシャルウィーク"
    prefix_re = re.compile(r'\[.*?\](.*)')
    
    for uma in uma_list:
        name_jp = uma['name_jp']
        char_id = uma['characterId']
        
        match = prefix_re.match(name_jp)
        base_name = match.group(1) if match else name_jp
        
        # We only need one entry per character, as all outfits share the same base name and ID.
        if base_name not in name_map:
            name_map[base_name] = char_id
            
    return name_map

def main():
    print("--- Preparing Affinity Data ---")
    
    # 1. Load source files
    try:
        with open(UMA_LIST_PATH, 'r', encoding='utf-8') as f:
            uma_list = json.load(f)
        print(f"Loaded {len(uma_list)} uma entries from {UMA_LIST_PATH.relative_to(PROJECT_ROOT)}")

        with open(AFFINITY_SCORES_PATH, 'r', encoding='utf-8') as f:
            affinity_scores = json.load(f)
        print(f"Loaded affinity data for {len(affinity_scores)} characters from {AFFINITY_SCORES_PATH.relative_to(PROJECT_ROOT)}")
    except FileNotFoundError as e:
        print(f"Error: Required data file not found. {e}")
        return

    # 2. Create the name-to-ID map
    name_to_id_map = create_name_to_id_map(uma_list)
    print(f"Created a map for {len(name_to_id_map)} unique character names.")

    # 3. Transform the affinity data
    id_based_affinity = {}
    missing_names = set()
    
    for source_name, scores in affinity_scores.items():
        source_id = name_to_id_map.get(source_name)
        if not source_id:
            missing_names.add(source_name)
            continue
            
        id_based_affinity[source_id] = {}
        
        for target_name, score in scores.items():
            target_id = name_to_id_map.get(target_name)
            if not target_id:
                missing_names.add(target_name)
                continue
            
            id_based_affinity[source_id][target_id] = score
    
    print("Transformation complete.")
    if missing_names:
        print(f"\nWarning: Could not find IDs for {len(missing_names)} names:")
        for name in sorted(list(missing_names)):
            print(f"  - {name}")

    # 4. Save the processed data
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(id_based_affinity, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f"\nSuccessfully saved ID-based affinity data to {OUTPUT_PATH.relative_to(PROJECT_ROOT)}")

if __name__ == "__main__":
    main()