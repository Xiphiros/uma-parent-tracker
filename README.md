# Umamusume Parent Farming: A Point-Based Methodology

This guide outlines a structured, progressive methodology for farming high-quality parents in Umamusume: Pretty Derby. It is designed to be used with the accompanying `index.html` application, which automates the scoring and tracking process.

The core principle is to replace subjective guesswork with a quantitative **Parent Score**. This allows for consistent, incremental improvement of your breeding stock over generations.

### The Methodology

The process is broken down into three main steps: defining your goal, scoring your results, and executing the breeding loop.

#### **Step 1: Define Your Goal Parent**

Before starting, you must establish what a "perfect" parent looks like for your specific objective. This provides the foundation for the scoring system.

1.  **Primary Blue Sparks**: Identify the two most crucial stats for your target build (e.g., Stamina and Power for a long-distance runner). These will be weighted most heavily.

2.  **Primary Pink Sparks**: Identify the most important aptitudes (e.g., "Turf" and "Mile" for a Mile specialist). These will also receive the highest weight in their category.

3.  **Unique Spark Wishlist**: Select the specific inheritable unique skills you want to prioritize (e.g., `Victory Shot! (Inherited)`).

4.  **White Spark Wishlist**: Create a ranked list of the skill-based white sparks you want to accumulate.

    * **Rank S (Essential)**: Absolutely critical skills for the build to function.
    * **Rank A (High-Value)**: Important skills that define the build's effectiveness.
    * **Rank B (Beneficial)**: Good supplementary skills that provide a solid advantage.
    * **Rank C (Nice-to-have)**: Minor skills that are a welcome bonus but not a priority.

#### **Step 2: The Parent Rating System**

After each training run, the resulting uma is assigned a **Parent Score** based on your defined goals. This score provides an objective measure of its quality.

The scoring is as follows:

| Category | Spark Type | ★ (1-Star) | ★★ (2-Star) | ★★★ (3-Star) |
| :--- | :--- | :--- | :--- | :--- |
| **Blue Sparks** | **Primary (Stamina/Power)** | 2 pts | 6 pts | **10 pts** |
| | **Secondary (Speed)** | 1 pt | 4 pts | 8 pts |
| | **Other (Guts/Wit)** | 1 pt | 2 pts | 3 pts |
| **Pink Sparks** | **Primary (Turf/Mile)** | 3 pts | 6 pts | **10 pts** |
| | **Other** | 1 pt | 2 pts | 3 pts |
| **Unique Sparks**| **Wishlisted** | 3 pts | 6 pts | **10 pts** |
| | **Other** | 1 pt | 2 pts | 3 pts |
| **White Sparks** | **Rank S (Essential)** | 5 pts | 10 pts | **15 pts** |
| | **Rank A (High-Value)**| 2 pts | 5 pts | 8 pts |
| | **Rank B (Beneficial)** | 1 pt | 3 pts | 5 pts |
| | **Rank C (Nice-to-have)**| 1 pt | 2 pts | 3 pts |

*The tracker tool automatically calculates this score for each parent you add.*

#### **Step 3: The Generational Farming Loop**

This is an iterative process where you consistently breed from your highest-quality stock to improve the odds of producing an even better result.

1.  **Generation 0 (Foundation)**: Begin with your two best available parents. These can be from your existing stock or rentals. Their scores establish your starting baseline.

2.  **First Runs (Generation 1)**:

    * Train a set number of umas (e.g., five runs).
    * Score each result. The one with the highest score becomes your first primary parent.
    * Keep any other results that score higher than your G0 starters.

3.  **The Golden Rule of Breeding**:

    > **Always use the two highest-scoring parents you currently possess, regardless of their generation.**

4.  **Subsequent Generations**:

    * For each new generation, use your top two parents (as identified by the "Top Breeding Pair" in the tracker) to train your next set of umas.
    * Score the new results.
    * If a new uma scores higher than one of your current top two, it replaces the lower-scoring parent in the breeding pair.
    * Continue to keep any high-scoring "reserve" parents and discard any results that do not improve upon your worst-kept parent.

By following this cycle, you create a powerful feedback loop. A lucky, high-scoring parent from an early generation can be used for a long time, accelerating your progress until a definitively superior heir is produced. This ensures that the genetic potential of your breeding roster is always on an upward trajectory.

---

### Import/Export Data

You can save and load your progress using the Import and Export buttons in the header.

* **Export Data**: Click this button to download a JSON file containing all your current goal definitions and roster data. It's recommended to do this periodically as a backup.
* **Import Data**: Click this button to select a previously exported JSON file. **Warning**: Importing a file will overwrite all of your current data. A confirmation prompt will appear before the data is replaced.

#### Data Schema

The exported data is stored in a JSON file with the following structure:

```json
{
  "version": 1,
  "goal": {
    "primaryBlue": [ "Stamina", "Power" ],
    "primaryPink": [ "Mile", "Turf" ],
    "uniqueWishlist": [ "Victory Shot! (Inherited)" ],
    "wishlist": [
      { "name": "Groundwork", "tier": "S" },
      { "name": "Mile Corners", "tier": "A" }
    ]
  },
  "roster": [
    {
      "id": 1725612458123,
      "name": "Super Creek",
      "gen": 1,
      "blueSpark": { "type": "Stamina", "stars": 3 },
      "pinkSpark": { "type": "Long", "stars": 3 },
      "uniqueSparks": [
        { "name": "Victory Shot! (Inherited)", "stars": 3 }
      ],
      "whiteSparks": [
        { "name": "Groundwork", "stars": 2 }
      ],
      "score": 30
    }
  ]
}
```

* **`version`**: The schema version number. This helps with migrating data in future updates.
* **`goal`**: An object containing your goal parent definition.
* **`roster`**: An array of objects, where each object represents a parent in your roster.