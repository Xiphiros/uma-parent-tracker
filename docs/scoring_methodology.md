# Scoring Methodology Documentation

This document provides a detailed breakdown of the point-based parent scoring system used in the Umamusume Parent Tracker application. The system is designed to balance the objective rarity of an inheritable spark with its subjective strategic value to the user.

## Methodology Rationale: A Standardized Baseline

The primary goal of this system is to provide a **standardized, objective score** for comparing potential parents. The game's breeding outcomes are highly variable and depend on a player's support card strength, game knowledge, and the current training scenario. To create a consistent benchmark, this scoring model is based on a specific, justifiable baseline.

**Baseline Stat Range:** `600-1100`
*   **Source:** *Uma Musume Reference Document ~ Global Edition ~, page 40, "3 Star Spark Chance".*
*   **Justification:** This stat range represents the first tier where obtaining a 3-star Blue spark becomes possible (~6% chance). It serves as a practical and accessible target for players who are actively beginning to farm high-quality parents.

While veteran players will consistently achieve stats in the `>1100` range (granting a ~10% chance for a 3-star spark), the scoring model intentionally remains anchored to the `600-1100` baseline. This ensures that the score is a **relative comparison tool** within this application, not an absolute measure of rarity for every possible player level. Better-statted parents will naturally achieve higher scores more consistently by virtue of having a better chance to produce these high-value sparks.

---

## Core Formula

The final score for any given parent is calculated using a multi-stage formula:

1.  **Individual Score Calculation:** Each entity in a lineage (the parent and its two grandparents) is first scored individually.
    *   `Individual Score = Σ (Base Score × Multipliers)` for all of its sparks.

2.  **Final Parent Score:** The final score is the parent's own score plus a bonus from its grandparents.
    *   `Final Score = Parent's Individual Score + (Grandparent1's Score × 0.5) + (Grandparent2's Score × 0.5)`

The result is rounded to the nearest integer.

---

## Part 1: The `Base Score` (Quantified Utility Model)

The `Base Score` is a hybrid value that combines a spark's **Rarity Score** (how hard it is to get) with its **Quantified Utility Score** (how effective it is in-game).

`Base Score = Rarity Score + Quantified Utility Score`

### A. Rarity Score

This component is derived from the statistical probability of *obtaining* a spark after a run. To reduce the impact of extreme rarity, it uses square root scaling.

`Rarity Score = ROUND(sqrt(1 / Probability))`

*   **Source for Star Probability:** *Uma Musume Reference Document ~ Global Edition ~, page 40, "3 Star Spark Chance".*
*   **Star Probabilities (600-1100 Stat Range):**
    *   P(3-Star): **~6%**
    *   P(2-Star): **~45%**
    *   P(1-Star): **~50%**
*   **Category Choice Probability:**
    *   **Blue Sparks:** 1 in 5 (0.20)
    *   **Pink Sparks:** 1 in N, where N is the number of A-rank aptitudes. For standardization, we assume N=5, making the probability **0.20**.

### B. Quantified Utility Score

This component is derived from the spark's documented *in-game effect*.

*   **Blue Spark Utility:** The direct stat points gained during inheritance.
    *   **Source:** *Global Doc, p. 38, "Blue sparks are stats."*
    *   `Utility(1★) = 5`, `Utility(2★) = 12`, `Utility(3★) = 21`

*   **Pink/White/Unique Spark Utility:** The base chance of the spark being *inherited* during a training run.
    *   **Source:** *Global Doc, p. 41, "Chance of Inheriting Sparks."* (Using "Green (Unique Skill)" rates as a consistent baseline for all non-Blue sparks).
    *   `Base Utility(1★) = 5`, `Base Utility(2★) = 10`, `Base Utility(3★) = 15`
    *   **Normalization:** To ensure consistent scoring across all spark types, these values are scaled by **1.4x** to align their maximum value (15) with the maximum value for Blue sparks (21).
    *   `Final Utility(1★) = 7`, `Final Utility(2★) = 14`, `Final Utility(3★) = 21`

### C. Final Base Score Tables

**Blue & Pink Sparks:**

| Spark Type | ★ | Rarity Score | Utility Score | **Final Base Score** |
| :--- | :-: | :---: | :---: | :---: |
| **Blue** | 1 | 3 | 5 | **8** |
| | 2 | 3 | 12 | **15** |
| | 3 | 9 | 21 | **30** |
| **Pink** | 1 | 3 | 7 | **10** |
| | 2 | 3 | 14 | **17** |
| | 3 | 9 | 21 | **30** |

**White & Unique Sparks (Dynamic):**

The `Base Score` for White and Unique sparks is calculated dynamically, as their generation probability changes based on lineage and source skill rarity.

*   **Rarity Score:** `ROUND(sqrt(1 / (P(Acquire Spark) * P(Is Specific Star))))`
*   **Utility Score:** `7` for 1★, `14` for 2★, `21` for 3★.
*   **Final Base Score:** `Rarity Score + Utility Score`

---

## Part 2: The `Multipliers` (Strategic Value)

After the `Base Score` is determined, it is multiplied by factors based on the user's defined goals.

| Multiplier Type | Condition | Value |
| :--- | :--- | :--- |
| **Blue Spark** | Primary Stat | **1.5x** |
| | Secondary Stat | **1.2x** |
| | Other Stat | **0.5x** |
| **Pink Spark** | Primary Aptitude | **1.5x** |
| | Other Aptitude | **0.5x** |
| **Wishlist Spark** | Rank S | **2.0x** |
| | Rank A | **1.5x** |
| | Rank B | **1.2x** |
| | Rank C | **1.0x** |
| | **Other (Not on list)** | **1.0x** |

---

## Full Example

Let's calculate the final score for a parent with the following goal:
*   **Primary Blue:** Stamina, Power
*   **Primary Pink:** Mile
*   **Wishlist:** "Groundwork" (Rank A, originates from a standard White skill)

**The Parent:**
*   **Blue Spark:** 3★ Stamina
*   **Pink Spark:** 2★ Mile
*   **White Spark:** 2★ "Groundwork"
*   **Grandparent 1:** Also has a "Groundwork" spark.

**Calculation:**

1.  **Score for 3★ Stamina Spark:**
    *   Base Score (from table): `30`
    *   Multiplier (Primary Blue): `1.5x`
    *   Spark Score: `30 * 1.5 = 45`

2.  **Score for 2★ Mile Spark:**
    *   Base Score (from table): `17`
    *   Multiplier (Primary Pink): `1.5x`
    *   Spark Score: `17 * 1.5 = 25.5` -> **26** (rounded)

3.  **Score for 2★ "Groundwork" Spark:**
    *   **Dynamic Base Score Calculation:**
        *   `P(Acquire Spark)`: Base (0.20) + Ancestor Bonus (0.025 * 1) = `0.225`
        *   `P(Is 2-Star)`: `0.45`
        *   `P(Final)` = 0.225 * 0.45 = `0.10125`
        *   Rarity Score = `ROUND(sqrt(1 / 0.10125)) = 3`
        *   Utility Score = `14` (for a 2★ White spark)
        *   Base Score = `3 + 14 = 17`
    *   **Multiplier Calculation:**
        *   Multiplier (Rank A Wishlist): `1.5x`
    *   Spark Score: `17 * 1.5 = 25.5` -> **26** (rounded)

4.  **Parent's Individual Score:**
    *   `45 (Stamina) + 26 (Mile) + 26 (Groundwork) = 97`

5.  **Grandparent Bonus:**
    *   Assume Grandparent 1's total individual score is `80`.
    *   Assume Grandparent 2's score is `50`.
    *   Bonus = `(80 * 0.5) + (50 * 0.5) = 40 + 25 = 65`

6.  **Final Score:**
    *   `97 (Parent) + 65 (Grandparents) = 162`