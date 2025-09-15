import sqlite3
import json
import argparse
from pathlib import Path
from collections import defaultdict
from itertools import combinations

def get_db_connection(db_path: Path) -> sqlite3.Connection:
    """Establishes a connection to the SQLite database."""
    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found at: {db_path}")
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def main():
    parser = argparse.ArgumentParser(description="Process Umamusume master.mdb to generate a raw affinity data JSON.")
    parser.add_argument("language", choices=['jp', 'global'], help="The language version of the database.")
    parser.add_argument("master_db_path", type=Path, help="Path to the master.mdb file.")
    args = parser.parse_args()

    output_dir = Path(f"raw_data/{args.language}")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "affinity.json"

    try:
        conn = get_db_connection(args.master_db_path)
        cursor = conn.cursor()
        
        # 1. Get all character IDs
        print("Fetching all character IDs...")
        cursor.execute("SELECT id FROM chara_data WHERE id < 2000;")
        all_chara_ids = {row['id'] for row in cursor.fetchall()}
        print(f"Found {len(all_chara_ids)} characters.")

        # 2. Get relation points
        print("Fetching affinity relation points...")
        cursor.execute("SELECT relation_type, relation_point FROM succession_relation;")
        relation_points = {row['relation_type']: row['relation_point'] for row in cursor.fetchall()}

        # 3. Map characters to their relations
        print("Mapping characters to their affinity groups...")
        cursor.execute("SELECT chara_id, relation_type FROM succession_relation_member;")
        chara_relations = defaultdict(set)
        for row in cursor.fetchall():
            chara_relations[row['chara_id']].add(row['relation_type'])

        # 4. Pre-calculate all pairwise affinity scores
        print("Pre-calculating pairwise affinity scores...")
        affinity_matrix = defaultdict(dict)
        
        sorted_chara_ids = sorted(list(all_chara_ids))

        for id1, id2 in combinations(sorted_chara_ids, 2):
            # Find common relation types
            common_relations = chara_relations[id1].intersection(chara_relations[id2])
            
            # Sum the points for common relations
            score = sum(relation_points.get(rel_type, 0) for rel_type in common_relations)
            
            if score > 0:
                affinity_matrix[id1][id2] = score
                affinity_matrix[id2][id1] = score
                
        print("Calculation complete.")

        # 5. Save to JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(affinity_matrix, f, indent=2, ensure_ascii=False)
            f.write('\n')

        print(f"\nSuccessfully saved affinity data to '{output_path}'.")

        conn.close()

    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    main()