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
 * Formats a probability value (0 to 1) into a "1 in X" fractional string.
 * Handles edge cases for 0% and 100% probabilities.
 * @param probability The probability value, from 0 to 1.
 * @returns A formatted string, e.g., "(1 in 5)", "(Never)", or "(Certain)".
 */
export const formatProbabilityAsFraction = (probability: number): string => {
    if (probability <= 0) {
        return "(Never)";
    }
    if (probability >= 1) {
        return "(Certain)";
    }
    const denominator = Math.round(1 / probability);
    return `(1 in ${denominator})`;
};