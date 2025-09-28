# Uma Musume Inheritance Factor Data Analysis

This document provides a detailed analysis and refined categorization of the inheritance factors ("sparks") in the Uma Musume Pretty Derby database. The analysis is based on a provided data structure and cross-referenced with common player terminology to create a clear and structured overview for repository reference.

---

## **Core Data Concepts**

Before diving into categories, it is important to understand the fundamental data columns.

*   `factor_id`: A unique identifier for a specific factor, which includes its group and rarity (star level). For example, `201` represents a 1-star Stamina factor.
*   `factor_group_id`: Identifies the core type of the factor, stripping away the rarity. For the `factor_id` `201`, the `factor_group_id` is `2` (Stamina). For unique skills, this ID corresponds to a specific character and outfit combination (e.g., `100101` for Special Week's base outfit).
*   `rarity`: A simple integer (`1`, `2`, or `3`) representing the 1-star, 2-star, or 3-star level of the factor. A higher rarity increases the effectiveness of the factor during inheritance.
*   `grade`: A key differentiator.
    *   `grade: 1`: Represents all common factors (Blue, Pink, White).
    *   `grade: 2`: Specifically designates a Green (Unique Skill) factor.
*   `factor_type`: A numerical ID used to broadly classify factors. A single conceptual group (e.g., White Sparks) can be represented by multiple `factor_type` IDs. This document clarifies these functional groupings.
*   `effect_group_id`: A grouping that appears to control the visual representation and categorization of factors in the UI. The last digit of this ID consistently corresponds to the factor's `rarity`.

---

## **Primary Factor Categories**

The factors can be organized into four main color-coded groups, which is the standard convention among players.

### **1. Blue Sparks (青因子) - Stats**

Blue factors provide direct boosts to a character's five core stats during the three inheritance events in a training run.

*   **`factor_type`**: `1`
*   **`effect_group_id`**: `11` (★1), `12` (★★), `13` (★★★)
*   **Factors**: Speed, Stamina, Power, Guts, Intelligence.

### **2. Pink Sparks (赤因子) - Aptitudes**

Commonly called Red Factors (赤因子), these increase a character's base Aptitude Ranks (from G up to A) at the start of a training run. They can also be inherited during a run, which is the only way to raise an aptitude from A to S.

*   **`factor_type`**: `2`
*   **`effect_group_id`**: `21` (★1), `22` (★★), `23` (★★★)
*   **Aptitude Sub-Categories**:
    *   **Terrain (バ場適性)**: 芝 (Turf), ダート (Dirt)
    *   **Distance (距離適性)**: 短距離 (Short), マイル (Mile), 中距離 (Medium), 長距離 (Long)
    *   **Strategy (脚質適性)**: 逃げ (Runner), 先行 (Leader), 差し (Betweener), 追込 (Closer)

### **3. Green Sparks (緑因子) - Uniques**

Green factors allow a character to inherit a slightly less powerful version of another character's unique skill. A character must be 3-star rarity or higher to produce a Green Factor.

*   **`factor_type`**: `3`
*   **`grade`**: `2` (This is the primary differentiator for this category.)
*   **`effect_group_id`**: `31` (★1), `32` (★★), `33` (★★★)
*   **Structure**: The `factor_group_id` (e.g., `100101`) identifies the character and their specific outfit.

### **4. White Sparks (白因子) - Miscellaneous**

This is the most diverse category, covering a wide range of skill hints, race victories, scenario bonuses, and other boosts.

*   **`factor_type`**: `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`
*   **`effect_group_id` Ranges**: `0`, `41-43`, `51-53`, `61-63`
*   **Sub-Categories**: Includes Skill Hints, G1 Race Factors, Scenario Factors, Stat "Awakening" Factors, and "Gene" Factors. "Gene" factors (e.g., `芝の遺伝子`) are a special type of white factor that provide a direct stat boost and a skill hint upon inheritance.

---

### **Refined Categorization Summary**

| Factor Category | `factor_type`(s) | `effect_group_id`(s) | Description |
| :--- | :--- | :--- | :--- |
| **Blue Sparks (Stats)** | `1` | `11`, `12`, `13` | Increases one of the five core stats. |
| **Pink Sparks (Aptitudes)** | `2` | `21`, `22`, `23` | Improves aptitude for Terrain, Distance, or Strategy. |
| **Green Sparks (Uniques)** | `3` | `31`, `32`, `33` | Allows inheritance of a character's Unique Skill. Distinguished by `grade: 2`. |
| **White Sparks (Misc.)** | `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11` | `0`, `41-43`, `51-53`, `61-63` | A broad category for skills, race/scenario bonuses, stat boosts, and "Gene" factors. |

---

## **Additional Reference Tables**

### White Spark `effect_group_id` Breakdown

This table details the contents of the `effect_group_id` ranges associated with White Sparks.

| `effect_group_id` Range | Associated `factor_type`(s) | Primary Content |
| :--- | :--- | :--- |
| **`41`, `42`, `43`** | `4` (Skills), `6` (Scenario Skills), `9` (Stat Aptitudes) | Contains the vast majority of general skill hints (e.g., `コーナー巧者○`), along with some scenario-specific skills (`L'Arc・海外洋芝適性`) and season/track-related "Awakening" factors (`右回りの目覚め`). |
| **`51`, `52`, `53`** | `5` (Race Sparks), `6` (Scenario Sparks), `9` (Stat Aptitudes) | Contains factors obtained from winning major G1 races (`有馬記念`), completing main training scenarios (`URAシナリオ`), and core stat "Awakening" factors (`スピードの目覚め`). |
| **`61`, `62`, `63`** | `6` (Scenario Sparks) | Appears to be designated for newer or more specialized training scenario factors (e.g., `メカウマ娘シナリオ`). |
| **`0`** | `7` (Event Sparks) | A special group exclusively for limited-time event factors, such as `カーニバルボーナス`. |
| **`21`, `22`, `23`** | `8`, `10`, `11` ("Gene" Factors) | Although these effect groups are shared with Pink Sparks, they also contain the "Gene" type White Sparks (e.g. `芝の遺伝子`). |

### `factor_type` Reference Table

This table maps the raw `factor_type` ID to its functional category. Note that multiple `factor_type`s can belong to the same functional group.

| `factor_type` ID | Description from Notes | Functional Group |
| :--- | :--- | :--- |
| 1 | Blue Sparks | **Blue Sparks (Stats)** |
| 2 | Pink Sparks | **Pink Sparks (Aptitudes)** |
| 3 | Uniques | **Green Sparks (Uniques)** |
| 4 | Normal Skills | **White Sparks (Misc.)** |
| 5 | Race Sparks | **White Sparks (Misc.)** |
| 6 | Scenario Sparks | **White Sparks (Misc.)** |
| 7 | Limited Time Event Spark | **White Sparks (Misc.)** |
| 8 | Distance Sparks (Genes) | **White Sparks (Misc.)** |
| 9 | Stat Sparks (Awakenings) | **White Sparks (Misc.)** |
| 10 | Terrain Sparks (Genes) | **White Sparks (Misc.)** |
| 11 | Strategy Sparks (Genes) | **White Sparks (Misc.)** |