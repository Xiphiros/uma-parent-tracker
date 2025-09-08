import { Goal, Parent, WhiteSpark, UniqueSpark } from '../types';

const points = {
    blue: { primary: [0, 2, 6, 10], secondary: [0, 1, 4, 8], other: [0, 1, 2, 3] },
    pink: { primary: [0, 3, 6, 10], other: [0, 1, 2, 3] },
    unique: { 'S': [0, 5, 10, 15], 'A': [0, 3, 6, 10], 'B': [0, 2, 4, 6], 'C': [0, 1, 2, 3], 'OTHER': [0, 1, 2, 3] },
    white: { 'S': [0, 5, 10, 15], 'A': [0, 2, 5, 8], 'B': [0, 1, 3, 5], 'C': [0, 1, 2, 3], 'OTHER': [0, 1, 2, 3] }
};

type ScoreCategory = 'blue' | 'pink' | 'unique' | 'white';

function getScore(category: ScoreCategory, type: string, stars: 1 | 2 | 3, goal: Goal): number {
    if (category === 'blue') {
        const primaryBlueLower = goal.primaryBlue.map(s => s.toLowerCase());
        if (primaryBlueLower.includes(type.toLowerCase())) return points.blue.primary[stars];
        // In the methodology, only Speed is a "secondary" blue spark.
        if (type.toLowerCase() === 'speed') return points.blue.secondary[stars];
        return points.blue.other[stars];
    }

    if (category === 'pink') {
        const primaryPinkLower = goal.primaryPink.map(s => s.toLowerCase());
        if (primaryPinkLower.includes(type.toLowerCase())) return points.pink.primary[stars];
        return points.pink.other[stars];
    }

    if (category === 'unique') {
        const wishlistItem = goal.uniqueWishlist.find(w => w.name === type);
        const tier = wishlistItem ? wishlistItem.tier : 'OTHER';
        return points.unique[tier as keyof typeof points.unique]?.[stars] ?? 0;
    }
    
    if (category === 'white') {
        // For white sparks, the 'type' is the tier itself.
        return points.white[type as keyof typeof points.white]?.[stars] ?? 0;
    }

    return 0;
}

// This type precisely defines only the data needed for scoring.
type ScorableParent = Pick<Parent, 'blueSpark' | 'pinkSpark' | 'uniqueSparks' | 'whiteSparks'>;

export function calculateScore(parent: ScorableParent, goal: Goal): number {
    let totalScore = 0;

    // Blue Spark Score
    totalScore += getScore('blue', parent.blueSpark.type, parent.blueSpark.stars, goal);
    
    // Pink Spark Score
    totalScore += getScore('pink', parent.pinkSpark.type, parent.pinkSpark.stars, goal);

    // Unique Sparks Score
    parent.uniqueSparks.forEach((spark: UniqueSpark) => {
        totalScore += getScore('unique', spark.name, spark.stars, goal);
    });

    // White Sparks Score
    parent.whiteSparks.forEach((spark: WhiteSpark) => {
        const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
        if (wishlistItem) {
            totalScore += getScore('white', wishlistItem.tier, spark.stars, goal);
        } else {
            // If the spark is not on the wishlist, give it a baseline "OTHER" score.
            totalScore += getScore('white', 'OTHER', spark.stars, goal);
        }
    });

    return totalScore;
}