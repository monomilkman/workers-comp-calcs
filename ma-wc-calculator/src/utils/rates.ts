import type { 
  StateRateRow, 
  BenefitType, 
  WeeklyRateResult,
  StateMinMaxApplication 
} from '../types';
import { isDateInPeriod } from './dates';

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
 * Implements exact Massachusetts formulas:
 * - Section 34 (TTD): AWW * 0.60
 * - Section 35 (TPD no EC): (AWW * 0.60) * 0.75 = AWW * 0.45
 * - Section 35 EC: (AWW - EC) * 0.60, min 0
 * - Section 34A (P&T): AWW * 0.666666666
 * - Section 31 (Dependent): AWW * 0.666666666 (same as 34A)
 */
function calculateRawWeekly(
  type: BenefitType,
  aww: number,
  options: { ec?: number } = {}
): number {
  switch (type) {
    case '34':
      // Section 34: 60% of AWW
      return aww * 0.60;
      
    case '35':
      // Section 35 (no EC): 75% of Section 34 rate = 45% of AWW
      return (aww * 0.60) * 0.75;
      
    case '35ec':
      // Section 35 with Earning Capacity: (AWW - EC) * 60%
      const ec = options.ec || 0;
      if (ec >= aww) {
        return 0; // No benefit if earning capacity >= AWW
      }
      return (aww - ec) * 0.60;
      
    case '34A':
    case '31':
      // Section 34A and 31: 66.6666666% of AWW
      return aww * 0.666666666;
      
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
    const section35Raw = section34Result.finalWeekly * 0.75;

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
      return 156; // 3 years
    case '35':
    case '35ec':
      return 208; // 4 years
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
  return 364; // 7 years total
}