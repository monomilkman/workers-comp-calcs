/**
 * Massachusetts Workers' Compensation Statutory Constants
 *
 * This file contains all statutory limits, benefit rate multipliers,
 * and other constants defined by Massachusetts General Laws Chapter 152.
 *
 * References:
 * - M.G.L. c. 152, § 34 (Temporary Total Disability)
 * - M.G.L. c. 152, § 35 (Temporary Partial Disability)
 * - M.G.L. c. 152, § 34A (Permanent and Total Disability)
 * - M.G.L. c. 152, § 31 (Widow/Dependent Benefits)
 */

// ============================================================================
// BENEFIT RATE MULTIPLIERS
// ============================================================================

/**
 * Section 34 (TTD - Temporary Total Disability) rate multiplier
 * Worker receives 60% of Average Weekly Wage
 */
export const SECTION_34_RATE = 0.60;

/**
 * Section 35 (TPD - Temporary Partial Disability) rate multiplier
 * Worker receives 75% of their Section 34 rate (after state min/max caps)
 * This equals 45% of AWW if no caps apply (0.60 * 0.75 = 0.45)
 */
export const SECTION_35_RATE = 0.75; // Applied to CAPPED Section 34 rate

/**
 * Section 35 EC (with Earning Capacity) rate multiplier
 * Worker receives 60% of the difference between AWW and Earning Capacity
 */
export const SECTION_35_EC_RATE = 0.60;

/**
 * Section 34A (P&T - Permanent & Total) rate multiplier
 * Worker receives 66⅔% of Average Weekly Wage
 */
export const SECTION_34A_RATE = 0.666666666;

/**
 * Section 31 (Widow/Dependent Benefits) rate multiplier
 * Dependent receives 66⅔% of deceased worker's Average Weekly Wage
 */
export const SECTION_31_RATE = 0.666666666;

/**
 * Convenience constant: Effective rate for Section 35 when applied to uncapped AWW
 * This is 60% * 75% = 45%
 */
export const SECTION_35_EFFECTIVE_RATE = SECTION_34_RATE * SECTION_35_RATE;

// ============================================================================
// STATUTORY MAXIMUM WEEKS (DURATION LIMITS)
// ============================================================================

/**
 * Section 34 (TTD) maximum weeks
 * 156 weeks = 3 years
 */
export const SECTION_34_MAX_WEEKS = 156;

/**
 * Section 35 (TPD) maximum weeks
 * 208 weeks = 4 years
 * Note: Shared with Section 35 EC (combined limit)
 */
export const SECTION_35_MAX_WEEKS = 208;

/**
 * Section 35 EC maximum weeks
 * 208 weeks = 4 years
 * Note: Shared with Section 35 (combined limit)
 */
export const SECTION_35_EC_MAX_WEEKS = 208;

/**
 * Combined Section 35 + Section 35 EC maximum weeks
 * When a worker has both Section 35 and Section 35 EC periods,
 * they share this 208-week limit
 */
export const COMBINED_35_MAX_WEEKS = 208;

/**
 * Combined Section 34 + Section 35 maximum weeks
 * Total combined TTD and TPD benefits cannot exceed 364 weeks (7 years)
 */
export const COMBINED_34_35_MAX_WEEKS = 364;

/**
 * Section 34A (P&T) maximum weeks
 * null = Life benefit (no statutory limit)
 */
export const SECTION_34A_MAX_WEEKS = null;

/**
 * Section 31 (Widow/Dependent) maximum weeks
 * null = Life benefit (no statutory limit)
 */
export const SECTION_31_MAX_WEEKS = null;

// ============================================================================
// CONVERSION CONSTANTS
// ============================================================================

/**
 * Weeks per year (standard calculation)
 */
export const WEEKS_PER_YEAR = 52;

/**
 * Days per week (for proration calculations)
 */
export const DAYS_PER_WEEK = 7;

// ============================================================================
// ATTORNEY FEE PERCENTAGES
// ============================================================================

/**
 * Standard attorney fee when liability is accepted
 * 20% of settlement amount
 */
export const ATTORNEY_FEE_ACCEPTED_LIABILITY = 0.20;

/**
 * Standard attorney fee when liability is unaccepted (contested)
 * 15% of settlement amount
 */
export const ATTORNEY_FEE_UNACCEPTED_LIABILITY = 0.15;

// ============================================================================
// SECTION 36 (SCARRING/DISFIGUREMENT) LIMITS
// ============================================================================

/**
 * Section 36 maximum award for scarring and disfigurement
 * Statutory maximum amount (in dollars)
 * Note: This limit is periodically adjusted - verify current statutory maximum
 */
export const SECTION_36_MAX_AWARD = 15000; // Verify this value with current statute

// ============================================================================
// SECTION 28 (PENALTIES)
// ============================================================================

/**
 * Section 28 penalty multiplier
 * When insurer unreasonably delays or denies benefits,
 * the award may be doubled
 */
export const SECTION_28_PENALTY_MULTIPLIER = 2;

// ============================================================================
// BENEFIT TYPE LABELS
// ============================================================================

/**
 * Display names for benefit types
 */
export const BENEFIT_TYPE_LABELS = {
  '34': 'Section 34 (TTD)',
  '35': 'Section 35 (TPD)',
  '35ec': 'Section 35 EC',
  '34A': 'Section 34A (P&T)',
  '31': 'Section 31 (Dependent)'
} as const;

/**
 * Short display names for benefit types
 */
export const BENEFIT_TYPE_SHORT_LABELS = {
  '34': 'S34',
  '35': 'S35',
  '35ec': 'S35 EC',
  '34A': 'S34A',
  '31': 'S31'
} as const;

/**
 * Full descriptive names for benefit types
 */
export const BENEFIT_TYPE_DESCRIPTIONS = {
  '34': 'Temporary Total Disability',
  '35': 'Temporary Partial Disability',
  '35ec': 'Temporary Partial Disability with Earning Capacity',
  '34A': 'Permanent and Total Disability',
  '31': 'Widow/Dependent Benefits'
} as const;

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

/**
 * Check if a benefit type has a finite duration limit
 */
export function isFiniteBenefit(type: '34' | '35' | '35ec' | '34A' | '31'): boolean {
  return type === '34' || type === '35' || type === '35ec';
}

/**
 * Check if a benefit type is a life benefit
 */
export function isLifeBenefit(type: '34' | '35' | '35ec' | '34A' | '31'): boolean {
  return type === '34A' || type === '31';
}

/**
 * Get the statutory maximum weeks for a given benefit type
 * Returns null for life benefits
 */
export function getStatutoryMaxWeeks(type: '34' | '35' | '35ec' | '34A' | '31'): number | null {
  switch (type) {
    case '34':
      return SECTION_34_MAX_WEEKS;
    case '35':
      return SECTION_35_MAX_WEEKS;
    case '35ec':
      return SECTION_35_EC_MAX_WEEKS;
    case '34A':
      return SECTION_34A_MAX_WEEKS;
    case '31':
      return SECTION_31_MAX_WEEKS;
  }
}

/**
 * Get the benefit rate multiplier for a given benefit type
 * Note: Section 35 is special - it's 75% of the CAPPED Section 34 rate
 */
export function getBenefitRateMultiplier(type: '34' | '35' | '35ec' | '34A' | '31'): number {
  switch (type) {
    case '34':
      return SECTION_34_RATE;
    case '35':
      return SECTION_35_RATE; // Applied to Section 34 rate, not AWW
    case '35ec':
      return SECTION_35_EC_RATE;
    case '34A':
      return SECTION_34A_RATE;
    case '31':
      return SECTION_31_RATE;
  }
}
