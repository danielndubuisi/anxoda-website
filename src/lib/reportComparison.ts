/**
 * Utility functions for comparing reports and detecting changes
 */

/**
 * Calculate percentage change between two numeric values
 * @param oldValue - The older value
 * @param newValue - The newer value
 * @returns Percentage change (positive for increase, negative for decrease)
 */
export const calculateChange = (
  oldValue: number | null,
  newValue: number | null
): number => {
  if (oldValue === null || newValue === null || oldValue === 0) {
    return 0;
  }

  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
};

/**
 * Format a percentage change for display
 * @param change - The percentage change value
 * @returns Formatted string with sign and percentage
 */
export const formatChangePercentage = (change: number): string => {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
};

/**
 * Determine if a change is significant (>5% change)
 * @param change - The percentage change value
 * @returns Whether the change is significant
 */
export const isSignificantChange = (change: number): boolean => {
  return Math.abs(change) > 5;
};

/**
 * Compare two arrays of strings and identify new, removed, and common items
 * @param oldItems - Array from older report
 * @param newItems - Array from newer report
 * @returns Object with new, removed, and common items
 */
export const compareArrays = (
  oldItems: string[],
  newItems: string[]
): {
  new: string[];
  removed: string[];
  common: string[];
} => {
  const oldSet = new Set(oldItems);
  const newSet = new Set(newItems);

  const newArr = newItems.filter((item) => !oldSet.has(item));
  const removed = oldItems.filter((item) => !newSet.has(item));
  const common = oldItems.filter((item) => newSet.has(item));

  return { new: newArr, removed, common };
};

/**
 * Calculate trend direction from a change value
 * @param change - The percentage change value
 * @returns 'up', 'down', or 'neutral'
 */
export const getTrendDirection = (
  change: number
): "up" | "down" | "neutral" => {
  if (change > 0.5) return "up";
  if (change < -0.5) return "down";
  return "neutral";
};
