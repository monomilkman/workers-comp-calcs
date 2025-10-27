import type {
  StateRateRow,
  BenefitType,
  WeeklyRateResult,
  StateMinMaxApplication
} from '../types';
import { isDateInPeriod } from './dates';
import {
  SECTION_34_RATE,
  SECTION_35_RATE,
  SECTION_35_EC_RATE,
  SECTION_34A_RATE,
  SECTION_31_RATE,
  SECTION_34_MAX_WEEKS,
  SECTION_35_MAX_WEEKS,
  SECTION_35_EC_MAX_WEEKS,
  COMBINED_34_35_MAX_WEEKS
} from '../constants/statutory';

/**
 * Get the applicable state minimum and maximum rates for a given date of injury
 * 
 * @param dateOfInjury - Date of injury in ISO format (YYYY-MM-DD)
 * @param table - Array of state rate rows with effective periods
 * @returns Object with state_min, state_max, and effective period dates
 * @throws Error if no applicable rate found
 */
export function getStateMinMax(
  dateOfInjury: string, 
  table: StateRateRow[]
): { 
  state_min: number; 
  state_max: number; 
  effective_from: string; 
  effective_to: string 
} {
  const applicableRow = table.find(row => 
    isDateInPeriod(dateOfInjury, row.effective_from, row.effective_to)
  );
  
  if (!applicableRow) {
    throw new Error(
      `No state rate found for date of injury: ${dateOfInjury}. ` +
      `Available periods: ${table.map(r => `${r.effective_from} to ${r.effective_to}`).join(', ')}`
    );
  }
  
  return {
    state_min: applicableRow.state_min,
    state_max: applicableRow.state_max,
    effective_from: applicableRow.effective_from,
    effective_to: applicableRow.effective_to
  };
}

/**
 * Apply Massachusetts state minimum and maximum rate adjustments
 * Implements the exact business rules specified:
 * 1. If raw_weekly > state_max: final_weekly = state_max
 * 2. Else if raw_weekly < state_min:
 *    - If AWW >= state_min: final_weekly = state_min
 *    - Else (AWW < state_min): final_weekly = AWW
 * 3. Else: final_weekly = raw_weekly
 * 
 * @param rawWeekly - The calculated raw weekly benefit
 * @param aww - Average Weekly Wage
 * @param dateOfInjury - Date of injury in ISO format
 * @param table - State rate table
 * @returns Final weekly rate and applied rule information
 */
export function applyStateMinMax(
  rawWeekly: number,
  aww: number, 
  dateOfInjury: string,
  table: StateRateRow[]
): WeeklyRateResult {
  const { state_min, state_max } = getStateMinMax(dateOfInjury, table);
  
  let finalWeekly: number;
  let appliedRule: StateMinMaxApplication;
  
  // Special case: if rawWeekly is 0, no benefit is due (e.g., EC >= AWW)
  if (rawWeekly === 0) {
    finalWeekly = 0;
    appliedRule = 'unchanged';
  } else if (rawWeekly > state_max) {
    finalWeekly = state_max;
    appliedRule = 'capped_to_max';
  } else if (rawWeekly < state_min) {
    if (aww >= state_min) {
      finalWeekly = state_min;
      appliedRule = 'raised_to_min';
    } else {
      // AWW < state_min: pay worker their true AWW, don't bump to min
      finalWeekly = aww;
      appliedRule = 'aww_below_min_keep_aww';
    }
  } else {
    finalWeekly = rawWeekly;
    appliedRule = 'unchanged';
  }
  
  return {
    rawWeekly,
    finalWeekly,
    appliedRule,
    state_min,
    state_max
  };
}

/**
 * Calculate raw weekly benefit rate based on benefit type
 * Implements exact Massachusetts formulas using statutory constants
 * - Section 34 (TTD): AWW * SECTION_34_RATE
 * - Section 35 (TPD no EC): (AWW * SECTION_34_RATE) * SECTION_35_RATE
 * - Section 35 EC: (AWW - EC) * SECTION_35_EC_RATE, min 0
 * - Section 34A (P&T): AWW * SECTION_34A_RATE
 * - Section 31 (Dependent): AWW * SECTION_31_RATE
 */
function calculateRawWeekly(
  type: BenefitType,
  aww: number,
  options: { ec?: number } = {}
): number {
  switch (type) {
    case '34':
      // Section 34: 60% of AWW
      return aww * SECTION_34_RATE;

    case '35':
      // Section 35 (no EC): 75% of Section 34 rate
      return (aww * SECTION_34_RATE) * SECTION_35_RATE;

    case '35ec':
      // Section 35 with Earning Capacity: (AWW - EC) * 60%
      const ec = options.ec || 0;
      if (ec >= aww) {
        return 0; // No benefit if earning capacity >= AWW
      }
      return (aww - ec) * SECTION_35_EC_RATE;

    case '34A':
      // Section 34A: 66⅔% of AWW
      return aww * SECTION_34A_RATE;

    case '31':
      // Section 31: 66⅔% of AWW
      return aww * SECTION_31_RATE;

    default:
      throw new Error(`Unknown benefit type: ${type}`);
  }
}

/**
 * Calculate complete weekly rate including state min/max adjustments
 *
 * @param type - Benefit type ('34', '35', '35ec', '34A', '31')
 * @param aww - Average Weekly Wage
 * @param options - Configuration including earning capacity and state table
 * @returns Complete calculation result with raw and final weekly rates
 */
export function calculateWeeklyRate(
  type: BenefitType,
  aww: number,
  options: {
    ec?: number;
    dateOfInjury: string;
    stateTable: StateRateRow[];
  }
): WeeklyRateResult {
  if (aww <= 0) {
    throw new Error('Average Weekly Wage must be greater than 0');
  }

  // Special handling for Section 35: it must be 75% of the CAPPED Section 34 rate
  if (type === '35') {
    // First calculate Section 34 with state min/max applied
    const section34Result = calculateWeeklyRate('34', aww, options);

    // Apply 75% to the final (capped) Section 34 rate
    const section35Raw = section34Result.finalWeekly * SECTION_35_RATE;

    // Apply state min/max to the Section 35 rate
    return applyStateMinMax(
      section35Raw,
      aww,
      options.dateOfInjury,
      options.stateTable
    );
  }

  const rawWeekly = calculateRawWeekly(type, aww, { ec: options.ec });

  return applyStateMinMax(
    rawWeekly,
    aww,
    options.dateOfInjury,
    options.stateTable
  );
}

/**
 * Get statutory maximum weeks for each benefit type
 * Returns null for life benefits (34A, 31)
 */
export function getStatutoryMaxWeeks(type: BenefitType): number | null {
  switch (type) {
    case '34':
      return SECTION_34_MAX_WEEKS; // 3 years (156 weeks)
    case '35':
      return SECTION_35_MAX_WEEKS; // 4 years (208 weeks)
    case '35ec':
      return SECTION_35_EC_MAX_WEEKS; // 4 years (208 weeks)
    case '34A':
    case '31':
      return null; // Life benefits
    default:
      throw new Error(`Unknown benefit type: ${type}`);
  }
}

/**
 * Get the maximum combined weeks for Section 34 + 35 benefits
 */
export function getCombinedMaxWeeks(): number {
  return COMBINED_34_35_MAX_WEEKS; // 7 years total (364 weeks)
}