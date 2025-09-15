import json
import argparse
import random
from pathlib import Path
from typing import Dict, Any, Set
from functools import reduce

class AffinityCalculator:
    """Calculates Uma Musume affinity using the strict 'Relationship Group' method."""

    def __init__(self, data_path: Path):
        if not data_path.exists():
            raise FileNotFoundError(
                f"Data file not found: {data_path}. "
                "Please run 'scripts/prepare_raw_affinity_components.py' first."
            )
        print(f"Loading data from {data_path}...")
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            self.relation_points: Dict[int, int] = {
                int(k): v for k, v in data.get("relation_points", {}).items()
            }
            self.chara_relations: Dict[int, Set[int]] = {
                int(k): set(v) for k, v in data.get("chara_relations", {}).items()
            }
            self.chara_map: Dict[int, str] = {
                int(k): v for k, v in data.get("chara_map", {}).items()
            }
        print("Data loaded successfully.")

    def _calculate_affinity_score(self, *char_ids: int) -> int:
        """
        Calculates the affinity score for a group of characters by finding the
        intersection of their relationship groups and summing the points.
        """
        valid_ids = [cid for cid in char_ids if cid and cid in self.chara_relations]
        if len(valid_ids) < 2:
            return 0
        
        # Inbreeding check: If any character is repeated (e.g., trainee is same as grandparent), affinity is 0.
        if len(valid_ids) != len(set(valid_ids)):
            return 0

        # Get the relationship group sets for all valid characters
        relation_sets = [self.chara_relations[cid] for cid in valid_ids]

        # Find the intersection of all sets
        common_relations = reduce(lambda s1, s2: s1.intersection(s2), relation_sets)

        # Sum the points for the common relations
        score = sum(self.relation_points.get(rel_id, 0) for rel_id in common_relations)
        return score

    def calculate_total_affinity(self, trainee_id: int, p1_id: int, p1_gp1_id: int, p1_gp2_id: int, p2_id: int, p2_gp1_id: int, p2_gp2_id: int) -> Dict[str, Any]:
        """
        Calculates the total affinity score using strict 3-way calculation for grandparents.
        """
        # --- 2-Way Affinities ---
        trainee_p1_score = self._calculate_affinity_score(trainee_id, p1_id)
        trainee_p2_score = self._calculate_affinity_score(trainee_id, p2_id)
        cross_parent_score = self._calculate_affinity_score(p1_id, p2_id)

        # --- 3-Way Grandparent Affinities ---
        p1_gp1_score = self._calculate_affinity_score(trainee_id, p1_id, p1_gp1_id)
        p1_gp2_score = self._calculate_affinity_score(trainee_id, p1_id, p1_gp2_id)
        p2_gp1_score = self._calculate_affinity_score(trainee_id, p2_id, p2_gp1_id)
        p2_gp2_score = self._calculate_affinity_score(trainee_id, p2_id, p2_gp2_id)

        # --- Totals ---
        p1_slot_total = trainee_p1_score + p1_gp1_score + p1_gp2_score
        p2_slot_total = trainee_p2_score + p2_gp1_score + p2_gp2_score
        total_score = p1_slot_total + p2_slot_total + cross_parent_score

        # Generate a human-readable breakdown
        breakdown = {
            "Trainee": f"{self.chara_map.get(trainee_id, 'Unknown')} ({trainee_id})",
            "P1": f"{self.chara_map.get(p1_id, 'N/A')} ({p1_id})",
            "P2": f"{self.chara_map.get(p2_id, 'N/A')} ({p2_id})",
            "P1_GP1": f"{self.chara_map.get(p1_gp1_id, 'N/A')} ({p1_gp1_id})",
            "P1_GP2": f"{self.chara_map.get(p1_gp2_id, 'N/A')} ({p1_gp2_id})",
            "P2_GP1": f"{self.chara_map.get(p2_gp1_id, 'N/A')} ({p2_gp1_id})",
            "P2_GP2": f"{self.chara_map.get(p2_gp2_id, 'N/A')} ({p2_gp2_id})",
            "scores": {
                "trainee_p1": trainee_p1_score,
                "p1_gp1": p1_gp1_score,
                "p1_gp2": p1_gp2_score,
                "p1_total": p1_slot_total,
                "trainee_p2": trainee_p2_score,
                "p2_gp1": p2_gp1_score,
                "p2_gp2": p2_gp2_score,
                "p2_total": p2_slot_total,
                "cross_parent": cross_parent_score,
                "total": total_score
            }
        }
        return breakdown

def print_affinity_tree(result: Dict[str, Any]):
    """Prints the affinity breakdown in a formatted tree."""
    scores = result['scores']
    
    print("\n--- Affinity Calculation Tree ---")
    print(f"Trainee: {result['Trainee']}")
    
    # Parent 1
    print(f"├── Parent 1 Slot: {result['P1']} [Subtotal: {scores['p1_total']}]")
    print(f"│   ├── Trainee <-> P1 (2-way): {scores['trainee_p1']}")
    print(f"│   └── Grandparents")
    print(f"│       ├── T <-> P1 <-> GP1.1 ({result['P1_GP1']}) (3-way): {scores['p1_gp1']}")
    print(f"│       └── T <-> P1 <-> GP1.2 ({result['P1_GP2']}) (3-way): {scores['p1_gp2']}")
    print("│")

    # Parent 2
    print(f"├── Parent 2 Slot: {result['P2']} [Subtotal: {scores['p2_total']}]")
    print(f"│   ├── Trainee <-> P2 (2-way): {scores['trainee_p2']}")
    print(f"│   └── Grandparents")
    print(f"│       ├── T <-> P2 <-> GP2.1 ({result['P2_GP1']}) (3-way): {scores['p2_gp1']}")
    print(f"│       └── T <-> P2 <-> GP2.2 ({result['P2_GP2']}) (3-way): {scores['p2_gp2']}")
    print("│")
    
    # Cross-Parent and Total
    print(f"├── Cross-Parent Affinity (P1 <-> P2) (2-way): {scores['cross_parent']}")
    print(f"│")
    print(f"└── TOTAL AFFINITY SCORE: {scores['total']}")
    print("---------------------------------")


def main():
    parser = argparse.ArgumentParser(description="Calculate Uma Musume breeding affinity using the strict method.")
    parser.add_argument("data_path", type=Path, help="Path to the affinity_components.json file.")
    parser.add_argument("trainee_id", type=int, nargs='?', default=0, help="The ID of the character being trained (required if not using --random).")
    parser.add_argument("p1_id", type=int, nargs='?', default=0, help="The ID of the first parent (required if not using --random).")
    parser.add_argument("p2_id", type=int, nargs='?', default=0, help="The ID of the second parent (required if not using --random).")
    parser.add_argument("--p1_gp1", type=int, default=0, help="Parent 1's first grandparent.")
    parser.add_argument("--p1_gp2", type=int, default=0, help="Parent 1's second grandparent.")
    parser.add_argument("--p2_gp1", type=int, default=0, help="Parent 2's first grandparent.")
    parser.add_argument("--p2_gp2", type=int, default=0, help="Parent 2's second grandparent.")
    parser.add_argument("--random", action="store_true", help="Generate a random set of 7 characters for the calculation.")

    args = parser.parse_args()
    
    if not args.random and (args.trainee_id == 0 or args.p1_id == 0 or args.p2_id == 0):
        parser.error("trainee_id, p1_id, and p2_id are required when not using --random")

    try:
        calculator = AffinityCalculator(args.data_path)

        if args.random:
            print("\n--- Generating Random Combination ---")
            all_ids = list(calculator.chara_map.keys())
            if len(all_ids) < 7:
                raise ValueError("Not enough characters in the data source to select 7 unique ones.")
            
            random_ids = random.sample(all_ids, 7)
            args.trainee_id, args.p1_id, args.p2_id, args.p1_gp1, args.p1_gp2, args.p2_gp1, args.p2_gp2 = random_ids

            print(f"Trainee : {calculator.chara_map.get(args.trainee_id)} ({args.trainee_id})")
            print(f"Parent 1: {calculator.chara_map.get(args.p1_id)} ({args.p1_id})")
            print(f"  GP 1.1: {calculator.chara_map.get(args.p1_gp1)} ({args.p1_gp1})")
            print(f"  GP 1.2: {calculator.chara_map.get(args.p1_gp2)} ({args.p1_gp2})")
            print(f"Parent 2: {calculator.chara_map.get(args.p2_id)} ({args.p2_id})")
            print(f"  GP 2.1: {calculator.chara_map.get(args.p2_gp1)} ({args.p2_gp1})")
            print(f"  GP 2.2: {calculator.chara_map.get(args.p2_gp2)} ({args.p2_gp2})")
        
        result = calculator.calculate_total_affinity(
            args.trainee_id, args.p1_id, args.p1_gp1, args.p1_gp2,
            args.p2_id, args.p2_gp1, args.p2_gp2
        )
        
        print_affinity_tree(result)

        print("\nNote: This score does not include bonuses from mutual G1 race wins.")

    except FileNotFoundError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()