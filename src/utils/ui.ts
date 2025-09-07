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