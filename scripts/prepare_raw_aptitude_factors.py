import sqlite3
import json
import argparse
from pathlib import Path

# In the `succession_factor` table, the following factor_types correspond
# to inheritable aptitude factors (green sparks). We use this as the
# source of truth to get all valid factor IDs.
# Type 8: Distance Aptitude Genes (e.g., Mile Gene)
# Type 9: Stat/Condition Aptitude Awakenings (e.g., Guts Awakening)
# Type 10: Surface Aptitude Genes (e.g., Turf Gene)
APTITUDE_FACTOR_TYPES = [8, 9, 10]

# In the `text_data` table, the names for these factors are stored under
# specific categories.
# Category 147: Stat, surface, distance, strategy, and seasonal aptitudes.
# Category 181: Scenario-specific or special event aptitudes.
TEXT_DATA_CATEGORIES = [147, 181]

def get_db_connection(db_path: Path) -> sqlite3.Connection:
    """Establishes a connection to the SQLite database."""
    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found at: {db_path}")
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def main():
    parser = argparse.ArgumentParser(description="Extracts inheritable aptitude factors by cross-referencing succession_factor and text_data tables.")
    parser.add_argument("language", choices=['jp', 'global'], help="The language version of the database.")
    parser.add_argument("master_db_path", type=Path, help="Path to the master.mdb file.")
    args = parser.parse_args()

    output_dir = Path(f"raw_data/{args.language}")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "aptitude_factors.json"
    
    print(f"--- Preparing raw aptitude factors for: {args.language.upper()} ---")

    try:
        conn = get_db_connection(args.master_db_path)
        cursor = conn.cursor()
        
        # Step 1: Get all valid aptitude factor IDs from the definitive source table.
        print(f"Querying `succession_factor` for factor_types: {APTITUDE_FACTOR_TYPES}...")
        factor_type_placeholders = ', '.join('?' for _ in APTITUDE_FACTOR_TYPES)
        cursor.execute(
            f"SELECT factor_id FROM succession_factor WHERE factor_type IN ({factor_type_placeholders});",
            APTITUDE_FACTOR_TYPES
        )
        factor_ids = [row['factor_id'] for row in cursor.fetchall()]
        print(f"Found {len(factor_ids)} potential aptitude factor IDs.")

        if not factor_ids:
            print("No aptitude factors found. Exiting.")
            return

        # Step 2: Use the retrieved IDs to get their names from `text_data`.
        print(f"Querying `text_data` for names using categories: {TEXT_DATA_CATEGORIES}...")
        id_placeholders = ', '.join('?' for _ in factor_ids)
        cat_placeholders = ', '.join('?' for _ in TEXT_DATA_CATEGORIES)
        
        query = f"""
            SELECT DISTINCT text FROM text_data 
            WHERE "index" IN ({id_placeholders}) 
            AND category IN ({cat_placeholders});
        """

        params = factor_ids + TEXT_DATA_CATEGORIES
        cursor.execute(query, params)
        
        # Extract the text from each row and sort it
        factors = sorted([row['text'] for row in cursor.fetchall()])
        
        print(f"Found {len(factors)} unique aptitude factor names.")

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(factors, f, indent=2, ensure_ascii=False)
            f.write('\n')

        print(f"Successfully saved aptitude factors to '{output_path}'.")

        conn.close()

    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    main()