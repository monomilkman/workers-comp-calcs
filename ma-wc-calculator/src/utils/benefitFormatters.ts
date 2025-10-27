/**
 * Utility functions for formatting benefit type names and labels
 * Extracted to eliminate code duplication across components
 */

import { BENEFIT_TYPE_LABELS, BENEFIT_TYPE_SHORT_LABELS, BENEFIT_TYPE_DESCRIPTIONS } from '../constants/statutory';
import type { BenefitType } from '../types';

/**
 * Get the full display title for a benefit type
 * @example getBenefitTitle('34') => 'Section 34 (TTD)'
 */
export function getBenefitTitle(type: string): string {
  if (type in BENEFIT_TYPE_LABELS) {
    return BENEFIT_TYPE_LABELS[type as keyof typeof BENEFIT_TYPE_LABELS];
  }
  return type;
}

/**
 * Get the short display label for a benefit type
 * @example getBenefitShortLabel('34') => 'S34'
 */
export function getBenefitShortLabel(type: string): string {
  if (type in BENEFIT_TYPE_SHORT_LABELS) {
    return BENEFIT_TYPE_SHORT_LABELS[type as keyof typeof BENEFIT_TYPE_SHORT_LABELS];
  }
  return type;
}

/**
 * Get the descriptive name for a benefit type
 * @example getBenefitDescription('34') => 'Temporary Total Disability'
 */
export function getBenefitDescription(type: string): string {
  if (type in BENEFIT_TYPE_DESCRIPTIONS) {
    return BENEFIT_TYPE_DESCRIPTIONS[type as keyof typeof BENEFIT_TYPE_DESCRIPTIONS];
  }
  return type;
}

/**
 * Get a formatted string showing benefit type with rate
 * @example formatBenefitWithRate('34', 900) => 'Section 34 (TTD) - $900.00/week'
 */
export function formatBenefitWithRate(type: string, weeklyRate: number): string {
  return `${getBenefitTitle(type)} - $${weeklyRate.toFixed(2)}/week`;
}

/**
 * Check if a benefit type is valid
 */
export function isValidBenefitType(type: string): type is BenefitType {
  return ['34', '35', '35ec', '34A', '31'].includes(type);
}

/**
 * Get all valid benefit types as an array
 */
export function getAllBenefitTypes(): BenefitType[] {
  return ['34', '35', '35ec', '34A', '31'];
}
