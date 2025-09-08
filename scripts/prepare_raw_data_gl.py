import sqlite3
import json
import argparse
from pathlib import Path

# This script processes a Global master.mdb file to generate raw data JSONs.
# It accounts for schema differences from the JP version (e.g., no preconditions).

def get_db_connection(db_path: Path) -> sqlite3.Connection:
    """Establishes a connection to the SQLite database."""
    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found at: {db_path}")
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def prepare_skill_data(conn: sqlite3.Connection, output_dir: Path):
    """Extracts skill data for the Global version."""
    print("Processing skill_data.json...")
    cursor = conn.cursor()
    # Global version schema is simpler and doesn't have preconditions.
    cursor.execute("""
        SELECT
            id, rarity,
            condition_1, float_ability_time_1,
            ability_type_1_1, float_ability_value_1_1, target_type_1_1,
            ability_type_1_2, float_ability_value_1_2, target_type_1_2,
            ability_type_1_3, float_ability_value_1_3, target_type_1_3,
            condition_2, float_ability_time_2,
            ability_type_2_1, float_ability_value_2_1, target_type_2_1,
            ability_type_2_2, float_ability_value_2_2, target_type_2_2,
            ability_type_2_3, float_ability_value_2_3, target_type_2_3
        FROM skill_data;
    """)
    
    skills = {}
    for row in cursor.fetchall():
        row_dict = dict(row)
        skill_id_str = str(row_dict['id'])
        
        alternatives = []
        # Alternative 1
        effects_1 = []
        if row_dict['ability_type_1_1'] != 0:
            effects_1.append({'type': row_dict['ability_type_1_1'], 'modifier': row_dict['float_ability_value_1_1'], 'target': row_dict['target_type_1_1']})
        if row_dict['ability_type_1_2'] != 0:
            effects_1.append({'type': row_dict['ability_type_1_2'], 'modifier': row_dict['float_ability_value_1_2'], 'target': row_dict['target_type_1_2']})
        if row_dict['ability_type_1_3'] != 0:
            effects_1.append({'type': row_dict['ability_type_1_3'], 'modifier': row_dict['float_ability_value_1_3'], 'target': row_dict['target_type_1_3']})
        
        alternatives.append({
            'precondition': '', # Not present in GL schema
            'condition': row_dict['condition_1'],
            'baseDuration': row_dict['float_ability_time_1'],
            'effects': effects_1
        })
        
        # Alternative 2
        if row_dict['condition_2'] and row_dict['condition_2'] != '0':
            effects_2 = []
            if row_dict['ability_type_2_1'] != 0:
                effects_2.append({'type': row_dict['ability_type_2_1'], 'modifier': row_dict['float_ability_value_2_1'], 'target': row_dict['target_type_2_1']})
            if row_dict['ability_type_2_2'] != 0:
                effects_2.append({'type': row_dict['ability_type_2_2'], 'modifier': row_dict['float_ability_value_2_2'], 'target': row_dict['target_type_2_2']})
            if row_dict['ability_type_2_3'] != 0:
                effects_2.append({'type': row_dict['ability_type_2_3'], 'modifier': row_dict['float_ability_value_2_3'], 'target': row_dict['target_type_2_3']})

            alternatives.append({
                'precondition': '',
                'condition': row_dict['condition_2'],
                'baseDuration': row_dict['float_ability_time_2'],
                'effects': effects_2
            })

        skills[skill_id_str] = {'rarity': row_dict['rarity'], 'alternatives': alternatives}

    with open(output_dir / 'skill_data.json', 'w', encoding='utf-8') as f:
        json.dump(skills, f, indent=2, ensure_ascii=False)
    print(f"  -> Saved skill_data.json with {len(skills)} entries.")

def prepare_skill_meta(conn: sqlite3.Connection, output_dir: Path):
    """Extracts skill metadata for the Global version."""
    print("Processing skill_meta.json...")
    cursor = conn.cursor()
    # Global version seems to include all skills for meta, not just general/rare ones.
    cursor.execute("""
        SELECT s.id, s.group_id, s.icon_id, COALESCE(sp.need_skill_point, 0) as sp_cost, s.disp_order
        FROM skill_data s
        LEFT JOIN single_mode_skill_need_point sp ON s.id = sp.id;
    """)
    
    skill_meta = {str(row['id']): {
        'groupId': row['group_id'],
        'iconId': str(row['icon_id']),
        'baseCost': row['sp_cost'],
        'order': row['disp_order']
    } for row in cursor.fetchall()}

    with open(output_dir / 'skill_meta.json', 'w', encoding='utf-8') as f:
        json.dump(skill_meta, f, indent=2, ensure_ascii=False)
    print(f"  -> Saved skill_meta.json with {len(skill_meta)} entries.")

def prepare_skill_names(conn: sqlite3.Connection, output_dir: Path):
    """Extracts skill names (English for Global version)."""
    print("Processing skillnames.json...")
    cursor = conn.cursor()
    cursor.execute("SELECT `index`, text FROM text_data WHERE category = 47;")
    
    skill_names = {}
    for row in cursor.fetchall():
        skill_id = str(row['index'])
        name_en = row['text']
        
        skill_names[skill_id] = ["", name_en] # JP name is placeholder

        # Handle inherited versions of uniques
        if skill_id.startswith('1') and len(skill_id) > 1:
            inherited_id = '9' + skill_id[1:]
            skill_names[inherited_id] = ["", f"{name_en} (Inherited)"]

    with open(output_dir / 'skillnames.json', 'w', encoding='utf-8') as f:
        json.dump(skill_names, f, indent=2, ensure_ascii=False)
    print(f"  -> Saved skillnames.json with {len(skill_names)} entries.")

def prepare_uma_info(conn: sqlite3.Connection, output_dir: Path):
    """Extracts character and outfit data (English for Global version)."""
    print("Processing umas.json...")
    cursor = conn.cursor()
    cursor.execute("SELECT `index`, text FROM text_data WHERE category = 6 AND `index` < 2000;")
    
    umas = {}
    for row in cursor.fetchall():
        char_id = str(row['index'])
        name_en = row['text']
        
        outfits_cursor = conn.cursor()
        outfits_cursor.execute(
            "SELECT `index`, text FROM text_data WHERE category = 5 AND `index` BETWEEN ? AND ? ORDER BY `index` ASC;",
            (int(char_id) * 100, (int(char_id) + 1) * 100 - 1)
        )
        
        outfits = {str(outfit['index']): outfit['text'] for outfit in outfits_cursor.fetchall()}
        
        if outfits:
            umas[char_id] = {
                "name": ["", name_en],
                "outfits": outfits
            }

    with open(output_dir / 'umas.json', 'w', encoding='utf-8') as f:
        json.dump(umas, f, indent=2, ensure_ascii=False)
    print(f"  -> Saved umas.json with {len(umas)} entries.")


def main():
    parser = argparse.ArgumentParser(description="Process Global Umamusume master.mdb to generate raw data JSONs.")
    parser.add_argument("master_db_path", type=Path, help="Path to the master.mdb file.")
    args = parser.parse_args()

    output_dir = Path("raw_data")
    output_dir.mkdir(exist_ok=True)

    try:
        conn = get_db_connection(args.master_db_path)
        
        prepare_skill_data(conn, output_dir)
        prepare_skill_meta(conn, output_dir)
        prepare_skill_names(conn, output_dir)
        prepare_uma_info(conn, output_dir)
        
        conn.close()
        print("\nAll Global data processed successfully.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    main()