// Pure CVP math utilities — kept in sync with supabase/functions/analyze-profitpro

export interface CVPInput {
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCosts: number;
  volume: number;
}

export interface CVPMetrics {
  totalRevenue: number;
  totalVariableCosts: number;
  totalFixedCosts: number;
  contributionMargin: number;
  contributionMarginRatio: number;
  contributionMarginPerUnit: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  currentVolume: number;
  operatingIncome: number;
  degreeOfOperatingLeverage: number;
  marginOfSafety: number;
  marginOfSafetyPercent: number;
}

export function computeCVP({ pricePerUnit, variableCostPerUnit, fixedCosts, volume }: CVPInput): CVPMetrics {
  const totalRevenue = pricePerUnit * volume;
  const totalVariableCosts = variableCostPerUnit * volume;
  const contributionMargin = totalRevenue - totalVariableCosts;
  const contributionMarginRatio = totalRevenue > 0 ? contributionMargin / totalRevenue : 0;
  const cmPerUnit = pricePerUnit - variableCostPerUnit;
  const breakEvenUnits = cmPerUnit > 0 ? Math.ceil(fixedCosts / cmPerUnit) : 0;
  const breakEvenRevenue = contributionMarginRatio > 0 ? fixedCosts / contributionMarginRatio : 0;
  const operatingIncome = contributionMargin - fixedCosts;
  const degreeOfOperatingLeverage = operatingIncome !== 0 ? contributionMargin / operatingIncome : 0;
  const marginOfSafety = totalRevenue - breakEvenRevenue;
  const marginOfSafetyPercent = totalRevenue > 0 ? marginOfSafety / totalRevenue : 0;

  return {
    totalRevenue,
    totalVariableCosts,
    totalFixedCosts: fixedCosts,
    contributionMargin,
    contributionMarginRatio,
    contributionMarginPerUnit: cmPerUnit,
    breakEvenUnits,
    breakEvenRevenue,
    currentVolume: volume,
    operatingIncome,
    degreeOfOperatingLeverage,
    marginOfSafety,
    marginOfSafetyPercent,
  };
}

// Period normalization → monthly equivalent
export const PERIOD_FACTORS = {
  daily: 30,
  weekly: 4.333,
  monthly: 1,
  yearly: 1 / 12,
} as const;

export type Period = keyof typeof PERIOD_FACTORS;

/**
 * Units required to reach a specific target profit.
 * Returns Infinity when the contribution margin is zero or negative.
 */
export function unitsForTargetProfit({
  pricePerUnit,
  variableCostPerUnit,
  fixedCosts,
  targetProfit,
}: {
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCosts: number;
  targetProfit: number;
}): number {
  const cm = pricePerUnit - variableCostPerUnit;
  if (cm <= 0) return Infinity;
  return Math.ceil((fixedCosts + Math.max(0, targetProfit)) / cm);
}
