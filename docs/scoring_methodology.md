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

1.  **Individual Score Calculation:** Each entity in a lineage (the parent and its two grandparents) is first scored individually. An entity's score is the sum of its spark scores, enhanced by a bonus for having a high quantity of white sparks.
    *   `Base Spark Sum = Σ (Base Score × Multipliers)` for all of its sparks.
    *   `White Spark Count Bonus = 1 + (Number of White Sparks * 0.01)`
    *   `Individual Score = Base Spark Sum * White Spark Count Bonus`

2.  **Final Parent Score:** The final score is the parent's own enhanced score plus a bonus from its grandparents' enhanced scores.
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
    *   **Pink Sparks:** `1 / N`, where N is the number of A-rank or higher aptitudes a character has at the end of a training run. This number can vary. For the purpose of establishing a consistent base score for the table below, we use a common example where a character has **N=5** A-rank aptitudes, making the probability **0.20**.

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

After the `Base Score` is determined, it is multiplied by factors based on the user's defined goals. This result is summed up to get the `Base Spark Sum`.

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

## Part 3: White Spark Count Bonus (Objective Potential)

After the `Base Spark Sum` is calculated for an individual, a final multiplier is applied based on the sheer quantity of its white sparks. This bonus is independent of the user's goal and serves as an objective measure of the parent's potential, as a higher number of sparks increases the probability of generating a superior child.

`White Spark Count Bonus = 1 + (Number of White Sparks * 0.01)`

`Individual Score = Base Spark Sum * White Spark Count Bonus`

> **Why This Matters: A Probability Example**
>
> The chance of a child generating a white spark for a skill they've learned is heavily influenced by how many of their ancestors (2 parents + 4 grandparents) also had a spark for that skill.
>
> Consider the astronomical odds of trying to generate a child with 10 specific white sparks:
>
> *   **With no help from ancestors:** The base chance for each spark is ~20%. The combined probability is `0.20 ^ 10`, or roughly **1 in 9.7 million**.
> *   **With all 6 ancestors having those sparks:** The chance for *each* spark is boosted from 20% to ~35.43% (`0.20 * 1.1^6`). The combined probability becomes `0.3543 ^ 10`, or roughly **1 in 32,000**.
>
> This is a **~300x increase** in probability. The White Spark Count Bonus rewards parents that contribute to this massive improvement in odds, making it a critical factor in their objective score.

---

## Full Example

Let's calculate the final score for a parent with the following goal:
*   **Primary Blue:** Stamina, Power
*   **Primary Pink:** Mile
*   **Wishlist:** "Groundwork" (Rank A)

**The Parent:**
*   **Blue Spark:** 3★ Stamina
*   **Pink Spark:** 2★ Mile
*   **White Sparks:** 2★ "Groundwork", 1★ "Pace Chaser Corners"
*   **Grandparent 1:** Also has a "Groundwork" spark. Total Individual Score is `80`.
*   **Grandparent 2:** Total Individual Score is `50`.

**Calculation:**

1.  **Calculate Parent's `Base Spark Sum`:**
    *   **Score for 3★ Stamina Spark:** `30 (base) * 1.5 (primary blue) = 45`
    *   **Score for 2★ Mile Spark:** `17 (base) * 1.5 (primary pink) = 25.5` -> **26**
    *   **Score for 2★ "Groundwork" Spark:**
        *   `P(Acquire)`: Base (0.20) + Ancestor Bonus (0.025 * 1) = `0.225`
        *   `P(Is 2-Star)`: `0.45`
        *   `P(Final)` = 0.225 * 0.45 = `0.10125`
        *   Rarity = `ROUND(sqrt(1 / 0.10125)) = 3`
        *   Utility = `14` (for 2★ white spark)
        *   Base Score = `3 + 14 = 17`
        *   Final Spark Score: `17 * 1.5 (Rank A) = 25.5` -> **26**
    *   **Score for 1★ "Pace Chaser Corners" (not on wishlist):**
        *   `P(Acquire)`: Base (0.20) = `0.20`
        *   `P(Is 1-Star)`: `0.50`
        *   `P(Final)` = 0.20 * 0.50 = `0.10`
        *   Rarity = `ROUND(sqrt(1 / 0.10)) = 3`
        *   Utility = `7` (for 1★ white spark)
        *   Base Score = `3 + 7 = 10`
        *   Final Spark Score: `10 * 1.0 (not on list) = 10`
    *   `Base Spark Sum` = `45 + 26 + 26 + 10 = 107`

2.  **Calculate Parent's `White Spark Count Bonus`:**
    *   The parent has **2** white sparks ("Groundwork", "Pace Chaser Corners").
    *   Bonus Multiplier = `1 + (2 * 0.01) = 1.02`

3.  **Calculate Parent's Final `Individual Score`:**
    *   `107 (Base Spark Sum) * 1.02 (Bonus) = 109.14` -> **109**

4.  **Calculate Grandparent Bonus:**
    *   Grandparent 1's Score: `80`
    *   Grandparent 2's Score: `50`
    *   Bonus = `(80 * 0.5) + (50 * 0.5) = 40 + 25 = 65`

5.  **Final Score:**
    *   `109 (Parent) + 65 (Grandparents) = 174`

---

## Distinction from Probability Model

It is important to distinguish between the **Parent Scoring Model** described above and the **Probability Calculator Model** found within the application.

*   The **Parent Scoring Model** is used for *evaluating and ranking existing parents* in your inventory. It is a standardized benchmark to measure the quality of what you already have.
*   The **Probability Calculator Model** is used for *predicting the outcome of future breeding attempts*. It is a more complex, dynamic model that simulates thousands of potential outcomes.

Unlike the static scoring model, the probability model is almost entirely user-configurable to allow for highly specific scenario planning. Key differences include:

*   **Dynamic Pink Spark Probability:** Instead of a fixed assumption of 5 A-rank aptitudes, the calculator uses the intersection of the user's **Goal** and their user-defined **Target Aptitudes** to dynamically calculate the probability of obtaining a primary pink spark.
*   **Dynamic White Spark Acquisition:** The calculator no longer assumes a fixed number of white sparks per run. Instead, it calculates a full probability distribution for the *number* of white sparks a child might acquire, based on:
    1.  A user-defined **pool of acquirable skills**.
    2.  A user-provided **Skill Point (SP) budget**, which simulates the in-game constraint of purchasing skills.
    3.  A **purchase priority** that prioritizes wishlist skills (`S > A > B > C`) over all other available skills.

This makes the calculator a more powerful predictive tool, while the scoring model remains a stable and consistent tool for evaluation.