import sqlite3
import json
import argparse
from pathlib import Path
from collections import defaultdict

def get_db_connection(db_path: Path) -> sqlite3.Connection:
    """Establishes a connection to the SQLite database."""
    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found at: {db_path}")
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def main():
    parser = argparse.ArgumentParser(description="Process Umamusume master.mdb to generate raw affinity components.")
    parser.add_argument("language", choices=['jp', 'global'], help="The language version of the database.")
    parser.add_argument("master_db_path", type=Path, help="Path to the master.mdb file.")
    args = parser.parse_args()

    output_dir = Path(f"raw_data/{args.language}")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "affinity_components.json"

    try:
        conn = get_db_connection(args.master_db_path)
        cursor = conn.cursor()

        # 1. Get character names (only those with succession data)
        print("Fetching character names...")
        cursor.execute("""
            SELECT DISTINCT
                c.id,
                t.text AS name
            FROM chara_data c
            JOIN text_data t ON c.id = t."index"
            JOIN succession_relation_member srm ON c.id = srm.chara_id
            WHERE t.category = 6 AND c.id < 2000;
        """)
        chara_map = {row['id']: row['name'] for row in cursor.fetchall()}
        print(f"Found {len(chara_map)} characters with affinity data.")

        # 2. Get relation points
        print("Fetching affinity relation points...")
        cursor.execute("SELECT relation_type, relation_point FROM succession_relation;")
        relation_points = {row['relation_type']: row['relation_point'] for row in cursor.fetchall()}
        print(f"Found {len(relation_points)} relation types with points.")

        # 3. Map characters to their relations
        print("Mapping characters to their affinity groups...")
        cursor.execute("SELECT chara_id, relation_type FROM succession_relation_member;")
        chara_relations = defaultdict(list)
        for row in cursor.fetchall():
            chara_relations[row['chara_id']].append(row['relation_type'])
        print("Character mapping complete.")

        # 4. Save components to JSON
        output_data = {
            "chara_map": chara_map,
            "relation_points": relation_points,
            "chara_relations": chara_relations
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
            f.write('\n')

        print(f"\nSuccessfully saved affinity components to '{output_path}'.")

        conn.close()

    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    main()