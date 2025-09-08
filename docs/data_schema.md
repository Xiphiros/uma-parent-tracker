# Data Schema Versions

This document outlines the structure of the exported JSON data for this application. As features are added, the schema may evolve. The `version` key at the root of the JSON file helps in handling data migrations.

## Version 3 (Current)

Version 3 introduces **Folders** to group projects in the tab bar.

*   A top-level `folders` array is added to store folder definitions.
*   A top-level `layout` array is introduced to define the order and nesting of tabs. It contains folder IDs (strings) and top-level profile IDs (numbers).
*   The `version` key is set to `3`.

```json
{
  "version": 3,
  "activeProfileId": 1725612458123,
  "profiles": [
    {
      "id": 1725612458123,
      "name": "Super Creek Project",
      "isPinned": false,
      "goal": { "...": "..." },
      "roster": [
        { "...": "..." }
      ]
    },
    {
      "id": 1725612458456,
      "name": "Oguri Cap Project",
      "isPinned": false,
      "goal": { "...": "..." },
      "roster": []
    }
  ],
  "folders": [
    {
      "id": "f1725612500000",
      "name": "Stamina Builds",
      "color": "#3b82f6",
      "icon": "runner",
      "isCollapsed": false,
      "profileIds": [ 1725612458123, 1725612458456 ]
    }
  ],
  "layout": [ "f1725612500000" ]
}
```

## Version 2

Version 2 added the `isPinned` property to `Profile` objects, allowing users to pin projects to the front of the tab list.

*   The `isPinned` property is a boolean. If it's missing from a profile, it defaults to `false`.
*   The `version` key is set to `2`.

```json
{
  "version": 2,
  "activeProfileId": 1725612458123,
  "profiles": [
    {
      "id": 1725612458123,
      "name": "Super Creek Project",
      "isPinned": true,
      "goal": {
        "primaryBlue": [ "Stamina", "Power" ],
        "primaryPink": [ "Mile", "Turf" ],
        "uniqueWishlist": [],
        "wishlist": []
      },
      "roster": []
    }
  ]
}
```

## Version 1

This was the initial data structure for the application. It contains the essential `goal` and `roster` data.

*   The top-level `version` key may be `1` or missing entirely.
*   `Profile` objects do not have an `isPinned` property.
*   `goal` objects may be missing the `uniqueWishlist` array.
*   `Parent` objects may be missing the `uniqueSparks` array.

```json
{
  "version": 1,
  "goal": {
    "primaryBlue": [ "Stamina", "Power" ],
    "primaryPink": [ "Mile", "Turf" ],
    "wishlist": [
      { "name": "Groundwork", "tier": "S" }
    ]
  },
  "roster": [
    {
      "id": 1725612458123,
      "name": "Super Creek",
      "gen": 1,
      "blueSpark": { "type": "Stamina", "stars": 3 },
      "pinkSpark": { "type": "Long", "stars": 3 },
      "whiteSparks": [
        { "name": "Groundwork", "stars": 2 }
      ],
      "score": 25
    }
  ]
}
```

*Note: The `v1` schema was fundamentally different, storing only a single project's data. The migration to `v2` wrapped this single project into the `profiles` array structure.*