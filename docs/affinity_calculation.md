# Understanding Affinity (Compatibility) - The Detailed Calculation

Affinity, also known as Compatibility, is a crucial mechanic in the breeding system of Uma Musume. A higher affinity score between the trainee, her parents, and grandparents significantly increases the chance of inheriting higher-star factors (Blue, Pink, Green) and unique skills during the two inheritance events in a training run. This document explains the exact logic behind the affinity score calculation.

## The Core Concept: Relationship Groups

The entire affinity system is built on the concept of **"Relationship Groups."** Every character in the game is assigned a large number of these groups, which act like tags. These groups represent everything from their racing aptitudes to their real-world bloodline and in-game friendships.

The affinity score between any two or more characters is determined by the **sum of points from the Relationship Groups they all share.**

### Group Point Values

Each Relationship Group has a specific point value. The most significant are:

*   **7-Point Groups (High Value):** These are the most impactful and relate to a character's core racing aptitudes.
    *   **Ground Aptitude:** (e.g., Turf Group, Dirt Group)
    *   **Distance Aptitude:** (e.g., Short Distance Group, Mile Group, Medium Distance Group, Long Distance Group)
    *   **Strategy Aptitude:** (e.g., Runner Group, Leader Group, Betweener Group, Chaser Group)

*   **2-Point Groups (Medium Value):** These generally relate to in-game profile details and relationships.
    *   Examples: Same Dorm (Ritō/Miho), Same School Year, Friend Relationships, etc.

*   **1-Point Groups (Low Value):** These are the most numerous and often relate to real-world horse data.
    *   Examples: Bloodline relations, shared G1 race wins (as a group tag), same birth month, etc.

## The "Strict" Affinity Calculation Method

The affinity score is calculated by finding the intersection of Relationship Groups between characters and summing the points of only the shared groups.

`Affinity(A, B, ...)` = *Sum of points from all shared Relationship Groups between A, B, and any other specified characters.*

**Example (2-Way):** If Daiwa Scarlet and Oguri Cap both belong to the Turf Group (7pts), Mile Group (7pts), and Ritō Dorm Group (2pts), their base affinity score would include `7 + 7 + 2 = 16` points from just those three shared groups.

**Example (3-Way):** If Special Week is added to the above pairing, and she also belongs to the Turf and Mile groups but *not* the Ritō Dorm group, the 3-way affinity `Affinity(Daiwa, Oguri, Special)` would only include `7 + 7 = 14` points. The 2-point dorm bonus is lost because it's not shared by all three.

## The Full Breeding Formula

The total affinity score shown in the breeding screen is the sum of scores for every connection in the inheritance tree, using the strict calculation method for each part.

1.  **Parent 1 Slot Score:**
    *This score is a sum of three separate calculations.*
    *   `Score_P1_base = Affinity(Trainee, Parent1)` (2-way)
    *   `Score_P1_gp1 = Affinity(Trainee, Parent1, Grandparent1.1)` (3-way)
    *   `Score_P1_gp2 = Affinity(Trainee, Parent1, Grandparent1.2)` (3-way)
    *   `Total_Score_P1 = Score_P1_base + Score_P1_gp1 + Score_P1_gp2`

2.  **Parent 2 Slot Score:**
    *   `Score_P2_base = Affinity(Trainee, Parent2)` (2-way)
    *   `Score_P2_gp1 = Affinity(Trainee, Parent2, Grandparent2.1)` (3-way)
    *   `Score_P2_gp2 = Affinity(Trainee, Parent2, Grandparent2.2)` (3-way)
    *   `Total_Score_P2 = Score_P2_base + Score_P2_gp1 + Score_P2_gp2`

3.  **Cross-Parent Score:**
    *   `Score_Cross = Affinity(Parent1, Parent2)` (2-way)

**`Total Score = Total_Score_P1 + Total_Score_P2 + Score_Cross`**

This total score determines the compatibility icon:
*   **△ (Triangle):** <= 50 points
*   **◯ (Circle):** 51 - 150 points
*   **◎ (Double Circle):** >= 151 points

## Important Note: G1 Race Wins Bonus

Separate from the base affinity score calculated above, there is an **additional bonus** for mutual G1 race wins between characters in the tree. This bonus is added *on top* of the base score and is not part of the core Relationship Group calculation.