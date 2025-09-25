/**
 * Formats a number of stars into a 3-star string with filled and empty stars.
 * e.g., 1 -> ★☆☆, 2 -> ★★☆, 3 -> ★★★
 * @param count The number of filled stars (1, 2, or 3).
 * @returns A formatted string of 3 stars.
 */
export const formatStars = (count: number): string => {
    if (count < 1) count = 1;
    if (count > 3) count = 3;
    const filled = '★'.repeat(count);
    const empty = '☆'.repeat(3 - count);
    return filled + empty;
};

/**
 * Formats a probability value (0 to 1) into a user-friendly string.
 * Uses "1 in X" for probabilities < 50% and "XX.X%" for probabilities >= 50%.
 * Handles edge cases for near-zero and near-one probabilities.
 * @param probability The probability value, from 0 to 1.
 * @returns A formatted string, e.g., "1 in 5", "75.2%", "Never", or "Certain".
 */
export const formatProbability = (probability: number): string => {
    if (probability < 0.0001) { // Handles cases like 1 in 10,000 or less
        return "Never";
    }
    if (probability >= 0.9999) { // Handles 99.99% or more
        return "Certain";
    }
    if (probability < 0.5) {
        const denominator = Math.round(1 / probability);
        return `1 in ${denominator}`;
    }
    return `${(probability * 100).toFixed(1)}%`;
};