import sqlite3
import json
import argparse
from pathlib import Path

# This script processes a Japanese master.mdb file to generate raw data JSONs.
# It replicates the logic from the original Perl scripts but is adapted for Python
# and tailored to this project's needs.

# --- Data Schemas and Special Cases ---

# Some unique skills have different effects based on in-race conditions.
# The original data splits these into separate "fake" skills. We will replicate that.
SKILLS_WITH_SPLIT_ALTERNATIVES = {
    '100701',  # Sirius Symboli unique
    '900701',  # Inherited Sirius Symboli unique
}

def get_db_connection(db_path: Path) -> sqlite3.Connection:
    """Establishes a connection to the SQLite database."""
    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found at: {db_path}")
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def prepare_skill_data(conn: sqlite3.Connection, output_dir: Path):
    """Extracts skill data (conditions, effects, rarity)."""
    print("Processing skill_data.json...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            id, rarity,
            precondition_1, condition_1, float_ability_time_1,
            ability_type_1_1, float_ability_value_1_1, target_type_1_1,
            ability_type_1_2, float_ability_value_1_2, target_type_1_2,
            ability_type_1_3, float_ability_value_1_3, target_type_1_3,
            precondition_2, condition_2, float_ability_time_2,
            ability_type_2_1, float_ability_value_2_1, target_type_2_1,
            ability_type_2_2, float_ability_value_2_2, target_type_2_2,
            ability_type_2_3, float_ability_value_2_3, target_type_2_3
        FROM skill_data
        WHERE is_general_skill = 1 OR rarity >= 3;
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
            'precondition': row_dict['precondition_1'],
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
                'precondition': row_dict['precondition_2'],
                'condition': row_dict['condition_2'],
                'baseDuration': row_dict['float_ability_time_2'],
                'effects': effects_2
            })

        if skill_id_str in SKILLS_WITH_SPLIT_ALTERNATIVES:
            for i, alt in enumerate(alternatives):
                suffix = f"-{i+1}" if i > 0 else ""
                skills[f"{skill_id_str}{suffix}"] = {'rarity': row_dict['rarity'], 'alternatives': [alt]}
        else:
            skills[skill_id_str] = {'rarity': row_dict['rarity'], 'alternatives': alternatives}

    with open(output_dir / 'skill_data.json', 'w', encoding='utf-8') as f:
        json.dump(skills, f, indent=2, ensure_ascii=False)
    print(f"  -> Saved skill_data.json with {len(skills)} entries.")

def prepare_skill_meta(conn: sqlite3.Connection, output_dir: Path):
    """Extracts skill metadata (group ID, icon ID, cost)."""
    print("Processing skill_meta.json...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.id, s.group_id, s.icon_id, COALESCE(sp.need_skill_point, 0) as sp_cost, s.disp_order
        FROM skill_data s
        LEFT JOIN single_mode_skill_need_point sp ON s.id = sp.id
        WHERE s.is_general_skill = 1 OR s.rarity >= 3;
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
    """Extracts skill names (JP only for this script)."""
    print("Processing skillnames.json...")
    cursor = conn.cursor()
    cursor.execute("SELECT `index`, text FROM text_data WHERE category = 47;")
    
    skill_names = {}
    for row in cursor.fetchall():
        skill_id = str(row['index'])
        name_jp = row['text']
        name_en = '' # No reliable EN source in JP DB
        
        skill_names[skill_id] = [name_jp, name_en]

        # Handle inherited versions of uniques
        if skill_id.startswith('1') and len(skill_id) > 1:
            inherited_id = '9' + skill_id[1:]
            skill_names[inherited_id] = [f"{name_jp}（継承）", f"{name_en} (Inherited)"]
            
    # Handle special cases for split alternatives
    if '100701' in skill_names:
        skill_names['100701-1'] = [f"{skill_names['100701'][0]}（人気4番以下）", f"{skill_names['100701'][1]} (popularity 4 or lower)"]
        skill_names['100701'][0] = f"{skill_names['100701'][0]}（人気1～3番）"
        skill_names['100701'][1] = f"{skill_names['100701'][1]} (popularity 1-3)"
    if '900701' in skill_names:
        skill_names['900701-1'] = [f"{skill_names['900701'][0].replace('（継承）', '')}（人気4番以下）（継承）", f"{skill_names['900701'][1].replace(' (Inherited)', '')} (popularity 4 or lower) (Inherited)"]
        skill_names['900701'][0] = f"{skill_names['900701'][0].replace('（継承）', '')}（人気1～3番）（継承）"
        skill_names['900701'][1] = f"{skill_names['900701'][1].replace(' (Inherited)', '')} (popularity 1-3) (Inherited)"


    with open(output_dir / 'skillnames.json', 'w', encoding='utf-8') as f:
        json.dump(skill_names, f, indent=2, ensure_ascii=False)
    print(f"  -> Saved skillnames.json with {len(skill_names)} entries.")

def prepare_uma_info(conn: sqlite3.Connection, output_dir: Path):
    """Extracts character and outfit data (JP only)."""
    print("Processing umas.json...")
    cursor = conn.cursor()
    cursor.execute("SELECT `index`, text FROM text_data WHERE category = 6 AND `index` < 2000;")
    
    umas = {}
    for row in cursor.fetchall():
        char_id = str(row['index'])
        name_jp = row['text']
        
        outfits_cursor = conn.cursor()
        outfits_cursor.execute(
            "SELECT `index`, text FROM text_data WHERE category = 5 AND `index` BETWEEN ? AND ? ORDER BY `index` ASC;",
            (int(char_id) * 100, (int(char_id) + 1) * 100 -1)
        )
        
        outfits = {str(outfit['index']): outfit['text'] for outfit in outfits_cursor.fetchall()}
        
        if outfits:
            umas[char_id] = {
                "name": [name_jp, ""], # No EN name in JP DB
                "outfits": outfits
            }

    with open(output_dir / 'umas.json', 'w', encoding='utf-8') as f:
        json.dump(umas, f, indent=2, ensure_ascii=False)
    print(f"  -> Saved umas.json with {len(umas)} entries.")


def main():
    parser = argparse.ArgumentParser(description="Process JP Umamusume master.mdb to generate raw data JSONs.")
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
        print("\nAll JP data processed successfully.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    main()