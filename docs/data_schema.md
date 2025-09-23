# Data Schema Versions

This document outlines the structure of the exported JSON data for this application. As features are added, the schema may evolve. The `version` key at the root of the JSON file helps in handling data migrations.

## Version 8 (Current)

Version 8 introduces a more flexible goal definition system by adding support for **Secondary Blue Sparks**. This allows for a three-tiered priority system (Primary, Secondary, Other) in the parent scoring calculation.

*   A `secondaryBlue: string[]` array is added to the `Goal` object within each `Profile`.
*   The migration process ensures this key exists on all profiles, initializing it as an empty array if it's missing from older data.
*   The `version` key is set to `8`.

```json
{
  "version": 8,
  "activeServer": "jp",
  "inventory": [
    { "...": "..." }
  ],
  "serverData": {
    "jp": {
      "activeProfileId": 1725612458123,
      "profiles": [
        {
          "id": 1725612458123,
          "name": "Super Creek Project (JP)",
          "isPinned": false,
          "goal": {
            "primaryBlue": ["Stamina", "Power"],
            "secondaryBlue": ["Guts"],
            "primaryPink": ["Mile", "Long"],
            "uniqueWishlist": [],
            "wishlist": []
          },
          "roster": [ 1725612900123 ]
        }
      ],
      "folders": [],
      "layout": [ 1725612458123 ]
    },
    "global": { "...": "..." }
  }
}
```

## Version 7

Version 7 adds an optional `isBorrowed` boolean property to each `Parent` object in the `inventory`. This flag is used to distinguish between a user's owned parents and borrowed parents (e.g., from a friend list).

*   An optional `isBorrowed` boolean is added to each `Parent` object. It defaults to `false` if missing.
*   The `version` key is set to `7`.

```json
{
  "version": 7,
  "activeServer": "jp",
  "inventory": [
    {
      "id": 1725612900123,
      "umaId": "100401",
      "name": "Super Creek",
      "server": "jp",
      "isBorrowed": true,
      "hash": "uma:100401;blue:Stamina|3;...",
      "...": "..."
    },
    {
      "id": 1725612900456,
      "umaId": "100101",
      "name": "Special Week",
      "server": "global",
      "isBorrowed": false,
      "hash": "uma:100101;blue:Speed|2;...",
      "...": "..."
    }
  ],
  "serverData": {
    "jp": { "...": "..." },
    "global": { "...": "..." }
  }
}
```

## Version 6

Version 6 adds an optional `hash` property to each `Parent` object in the `inventory`. This hash is a string generated from the parent's core characteristics (sparks, lineage, etc.) and is used internally to prevent the creation of duplicate parents.

*   An optional `hash` string is added to each `Parent` object.
*   The `version` key is set to `6`.

```json
{
  "version": 6,
  "activeServer": "jp",
  "inventory": [
    {
      "id": 1725612900123,
      "umaId": "100401",
      "name": "Super Creek",
      "server": "jp",
      "hash": "uma:100401;blue:Stamina|3;...",
      "...": "..."
    },
    {
      "id": 1725612900456,
      "umaId": "100101",
      "name": "Special Week",
      "server": "global",
      "hash": "uma:100101;blue:Speed|2;...",
      "...": "..."
    }
  ],
  "serverData": {
    "jp": {
      "activeProfileId": 1725612458123,
      "profiles": [
        {
          "id": 1725612458123,
          "name": "Super Creek Project (JP)",
          "isPinned": false,
          "goal": { "...": "..." },
          "roster": [ 1725612900123 ]
        }
      ],
      "folders": [],
      "layout": [ 1725612458123 ]
    },
    "global": {
      "activeProfileId": 1725613000000,
      "profiles": [
         {
          "id": 1725613000000,
          "name": "Special Week Project (Global)",
          "isPinned": false,
          "goal": { "...": "..." },
          "roster": [ 1725612900456 ]
        }
      ],
      "folders": [],
      "layout": [ 1725613000000 ]
    }
  }
}```

## Version 5

Version 5 introduces **server-specific workspaces**, allowing users to maintain separate sets of projects, folders, and layouts for the JP and Global game servers while sharing a single global inventory of parents.

*   A top-level `serverData` object is added. It contains two keys, `jp` and `global`.
*   Each key within `serverData` holds an object containing the server-specific `activeProfileId`, `profiles`, `folders`, and `layout`.
*   The `inventory` and `activeServer` properties remain at the top level.
*   The `version` key is set to `5`.

```json
{
  "version": 5,
  "activeServer": "jp",
  "inventory": [
    {
      "id": 1725612900123,
      "umaId": "100401",
      "name": "Super Creek",
      "server": "jp",
      "...": "..."
    },
    {
      "id": 1725612900456,
      "umaId": "100101",
      "name": "Special Week",
      "server": "global",
      "...": "..."
    }
  ],
  "serverData": {
    "jp": {
      "activeProfileId": 1725612458123,
      "profiles": [
        {
          "id": 1725612458123,
          "name": "Super Creek Project (JP)",
          "isPinned": false,
          "goal": { "...": "..." },
          "roster": [ 1725612900123 ]
        }
      ],
      "folders": [],
      "layout": [ 1725612458123 ]
    },
    "global": {
      "activeProfileId": 1725613000000,
      "profiles": [
         {
          "id": 1725613000000,
          "name": "Special Week Project (Global)",
          "isPinned": false,
          "goal": { "...": "..." },
          "roster": [ 1725612900456 ]
        }
      ],
      "folders": [],
      "layout": [ 1725613000000 ]
    }
  }
}
```

## Version 4

Version 4 represents a major architectural shift to a global inventory system.

*   A top-level `inventory` array is added to store all `Parent` objects.
*   A `server` property (`'jp' | 'global'`) is added to each `Parent` object.
*   The `roster` array within each `Profile` object is changed from an array of `Parent` objects to an array of `number`s, which are the IDs of parents in the global `inventory`.
*   A top-level `activeServer` property is added to track the user's current server context.
*   The `version` key is set to `4`.

```json
{
  "version": 4,
  "activeProfileId": 1725612458123,
  "activeServer": "jp",
  "profiles": [
    {
      "id": 1725612458123,
      "name": "Super Creek Project",
      "isPinned": false,
      "goal": { "...": "..." },
      "roster": [ 1725612900123 ]
    }
  ],
  "inventory": [
    {
      "id": 1725612900123,
      "umaId": "100401",
      "name": "Super Creek",
      "gen": 1,
      "blueSpark": { "type": "Stamina", "stars": 3 },
      "pinkSpark": { "type": "Long", "stars": 3 },
      "uniqueSparks": [],
      "whiteSparks": [],
      "score": 0,
      "server": "jp"
    }
  ],
  "folders": [],
  "layout": [ 1725612458123 ]
}
```

## Version 3

Version 3 introduced **Folders** to group projects in the tab bar.

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