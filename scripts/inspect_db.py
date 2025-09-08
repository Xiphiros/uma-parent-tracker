import sqlite3
import argparse
from pathlib import Path

def inspect_database(db_path: Path):
    """
    Connects to an SQLite database, lists all tables, and prints a sample
    of columns and rows from each table.
    """
    if not db_path.exists():
        print(f"Error: Database file not found at '{db_path}'")
        return

    print(f"--- Inspecting Database: {db_path.name} ---")

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = [row['name'] for row in cursor.fetchall()]
        
        if not tables:
            print("No tables found in the database.")
            return

        print(f"Found {len(tables)} tables: {', '.join(tables)}\n")

        # Iterate through each table and print sample data
        for table_name in tables:
            print(f"--- TABLE: {table_name} ---")
            
            # Get column info
            cursor.execute(f'PRAGMA table_info("{table_name}");')
            columns = [row['name'] for row in cursor.fetchall()]
            
            # Limit columns for wide tables to keep output clean
            max_cols = 10
            display_columns = columns[:max_cols]
            
            print(f"Columns ({len(columns)} total): {', '.join(columns)}")
            if len(columns) > max_cols:
                print(f"(Displaying first {max_cols} columns for brevity)")
            
            # Get sample rows
            query = f'SELECT {", ".join(f"`{c}`" for c in display_columns)} FROM "{table_name}" LIMIT 5;'
            try:
                cursor.execute(query)
                rows = cursor.fetchall()
                
                if not rows:
                    print("-> Table is empty or contains no data in the first 5 rows.\n")
                    continue

                # Format and print the table
                print_table(display_columns, [dict(row) for row in rows])

            except sqlite3.OperationalError as e:
                print(f"Could not query table '{table_name}': {e}\n")

    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

def print_table(headers, data):
    """
    Formats and prints a list of dictionaries in a padded, tabular format.
    """
    # Calculate column widths
    col_widths = {h: len(h) for h in headers}
    for row in data:
        for h in headers:
            cell_value = str(row.get(h, 'NULL'))
            col_widths[h] = max(col_widths[h], len(cell_value))

    # Print header
    header_line = " | ".join(h.ljust(col_widths[h]) for h in headers)
    print(header_line)
    
    # Print separator
    separator_line = "-+-".join("-" * col_widths[h] for h in headers)
    print(separator_line)

    # Print rows
    for row in data:
        row_line = " | ".join(str(row.get(h, 'NULL')).ljust(col_widths[h]) for h in headers)
        print(row_line)
    print()

def main():
    parser = argparse.ArgumentParser(
        description="Inspects an Uma Musume master.mdb file and prints a sample of its contents."
    )
    parser.add_argument(
        "db_path",
        type=Path,
        help="Path to the master.mdb file (JP or Global)."
    )
    args = parser.parse_args()
    inspect_database(args.db_path)

if __name__ == "__main__":
    main()