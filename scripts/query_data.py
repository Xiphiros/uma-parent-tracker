import json
import argparse
from pathlib import Path
import re

# --- Constants ---
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
RAW_DATA_DIR = PROJECT_ROOT / 'raw_data'

# --- Data Loading and Merging ---

class GameData:
    """A container for loaded and merged game data from JP and Global sources."""
    def __init__(self, base_path: Path):
        self.base_path = base_path
        print("Loading and merging data...")
        self.skill_data = self._load_and_merge('skill_data.json')
        self.skill_meta = self._load_and_merge('skill_meta.json')
        self.umas = self._load_and_merge('umas.json')
        self.skill_names = self._load_skill_names()
        print("Data loading complete.")

    def _load_json(self, version: str, filename: str):
        file_path = self.base_path / version / filename
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def _load_and_merge(self, filename: str):
        jp_data = self._load_json('jp', filename)
        gl_data = self._load_json('global', filename)
        # Global data takes precedence where keys overlap
        return {**jp_data, **gl_data}

    def _load_skill_names(self):
        jp_names = self._load_json('jp', 'skillnames.json')
        gl_names = self._load_json('global', 'skillnames.json')
        
        merged = {}
        all_ids = set(jp_names.keys()) | set(gl_names.keys())

        for skill_id in all_ids:
            jp_name = jp_names.get(skill_id, ["", ""])[0]
            gl_name = gl_names.get(skill_id, ["", ""])[1]
            merged[skill_id] = [jp_name, gl_name or jp_name] # Fallback EN to JP
        return merged

# --- Search Functions ---

def find_skills_by_name(data: GameData, search_term: str):
    """Finds skill IDs by matching against their JP or EN names."""
    search_lower = search_term.lower()
    matches = []
    for skill_id, names in data.skill_names.items():
        if search_lower in names[0].lower() or search_lower in names[1].lower():
            matches.append(skill_id)
    return matches

def find_umas_by_name(data: GameData, search_term: str):
    """Finds character IDs by matching against their names or outfit names."""
    search_lower = search_term.lower()
    matches = set()
    for char_id, uma_info in data.umas.items():
        name_jp, name_en = uma_info.get('name', ['', ''])
        if search_lower in name_jp.lower() or search_lower in name_en.lower():
            matches.add(char_id)
            continue
        for outfit_name in uma_info.get('outfits', {}).values():
            if search_lower in outfit_name.lower():
                matches.add(char_id)
                break
    return list(matches)

# --- Display Functions ---

def display_skill_info(skill_id: str, data: GameData):
    """Prints a detailed, cross-referenced view of a single skill."""
    print(f"\n--- Skill Details for ID: {skill_id} ---")
    
    # 1. From skillnames.json
    names = data.skill_names.get(skill_id)
    if names:
        print(f"  - Name (JP): {names[0] or 'N/A'}")
        print(f"  - Name (EN): {names[1] or 'N/A'}")
    else:
        print("  - Name: Not Found")

    # 2. From skill_meta.json
    meta = data.skill_meta.get(skill_id)
    if meta:
        print("  - Meta Info (from skill_meta.json):")
        print(f"    - Group ID: {meta.get('groupId')}")
        print(f"    - Icon ID:  {meta.get('iconId')}")
        print(f"    - Cost:     {meta.get('baseCost', 'N/A')}")
    else:
        print("  - Meta Info: Not Found")

    # 3. From skill_data.json
    skill = data.skill_data.get(skill_id)
    if skill:
        print("  - Data Info (from skill_data.json):")
        print(f"    - Rarity:   {skill.get('rarity')}")
        for i, alt in enumerate(skill.get('alternatives', [])):
            print(f"    - Alternative {i+1}:")
            print(f"      - Precondition: {alt.get('precondition') or 'None'}")
            print(f"      - Condition:    {alt.get('condition') or 'None'}")
            print(f"      - Duration:     {alt.get('baseDuration') / 10000.0}s")
            for j, effect in enumerate(alt.get('effects', [])):
                print(f"      - Effect {j+1}: Type {effect.get('type')}, Value {effect.get('modifier') / 10000.0}, Target {effect.get('target')}")
    else:
        print("  - Data Info: Not Found")

def display_uma_info(char_id: str, data: GameData):
    """Prints a detailed, cross-referenced view of a single character."""
    uma = data.umas.get(char_id)
    if not uma:
        print(f"Could not find character with ID: {char_id}")
        return

    print(f"\n--- Character Details for ID: {char_id} ---")
    name_jp, name_en = uma.get('name', ['', ''])
    print(f"  - Name (JP): {name_jp or 'N/A'}")
    print(f"  - Name (EN): {name_en or 'N/A'}")
    
    outfits = uma.get('outfits', {})
    if outfits:
        print("\n  Outfits & Unique Skills:")
        for outfit_id, outfit_name in sorted(outfits.items()):
            # Calculate the unique skill ID from the outfit ID
            char_num = int(outfit_id[1:4])
            version_num = int(outfit_id[4:])
            unique_skill_id = str(100000 + 10000 * (version_num - 1) + char_num * 10 + 1)
            inherited_id = '9' + unique_skill_id[1:]
            
            print(f"\n  - Outfit ID: {outfit_id}")
            print(f"    - Name: {outfit_name}")
            print(f"    - Links to Unique Skill ID: {unique_skill_id}")
            if data.skill_names.get(unique_skill_id):
                skill_name_en = data.skill_names[unique_skill_id][1]
                print(f"      -> {skill_name_en}")
                print(f"    - Links to Inherited Skill ID: {inherited_id}")

# --- Main CLI Logic ---

def main():
    parser = argparse.ArgumentParser(description="Query raw Umamusume data.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    skill_parser = subparsers.add_parser("skill", help="Search for a skill by name.")
    skill_parser.add_argument("name", help="The name of the skill to search for (EN or JP).")
    
    uma_parser = subparsers.add_parser("uma", help="Search for an uma by name.")
    uma_parser.add_argument("name", help="The name of the uma to search for.")

    args = parser.parse_args()
    
    data = GameData(RAW_DATA_DIR)

    if args.command == "skill":
        matches = find_skills_by_name(data, args.name)
        if not matches:
            print(f"No skills found matching '{args.name}'.")
        else:
            print(f"\nFound {len(matches)} skill(s) matching '{args.name}':")
            for skill_id in matches:
                display_skill_info(skill_id, data)

    elif args.command == "uma":
        matches = find_umas_by_name(data, args.name)
        if not matches:
            print(f"No umas found matching '{args.name}'.")
        else:
            print(f"\nFound {len(matches)} character(s) matching '{args.name}':")
            for char_id in matches:
                display_uma_info(char_id, data)

if __name__ == "__main__":
    main()