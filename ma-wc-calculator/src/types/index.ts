export type BenefitType = '34' | '35' | '35ec' | '34A' | '31';

export type ProrationMode = 'days' | 'calendar';

export type StateMinMaxApplication = 'capped_to_max' | 'raised_to_min' | 'aww_below_min_keep_aww' | 'unchanged';

export interface StateRateRow {
  effective_from: string; // "YYYY-10-01"
  effective_to: string;   // "YYYY+1-09-30"
  state_min: number;
  state_max: number;
  source_url?: string;
}

export interface LedgerEntry {
  id: string;
  type: BenefitType;
  start: string; // ISO date string
  end?: string; // ISO date string, undefined if "present"
  aww_used?: number;
  ec_used?: number; // For Section 35 EC
  weeks: number;
  raw_weekly: number;
  final_weekly: number;
  dollars_paid: number;
  notes?: string;
}

export interface WeekCalculation {
  days: number;
  weeksDecimal: number;
  fullWeeks: number;
  fractionalWeeks: number;
}

export interface WeeklyRateResult {
  rawWeekly: number;
  finalWeekly: number;
  appliedRule: StateMinMaxApplication;
  state_min: number;
  state_max: number;
}

export interface BenefitCalculation {
  type: BenefitType;
  rawWeekly: number;
  finalWeekly: number;
  yearlyAmount: number;
  statutoryMaxWeeks: number | null; // null for life benefits (34A, 31)
  appliedRule: StateMinMaxApplication;
}

export interface RemainingEntitlement {
  type: BenefitType;
  statutoryMaxWeeks: number | null;
  weeksUsed: number;
  weeksRemaining: number | null;
  dollarsRemaining: number | null;
  isLifeBenefit: boolean;
}

export interface SettlementCalculation {
  proposedAmount: number;
  breakdownByType: Array<{
    type: BenefitType;
    weeksCovered: number;
    yearsCovered: number;
    exhaustsEntitlement: boolean;
    finalWeekly: number;
    totalAllocated: number;
  }>;
  leftoverCash: number;
}

export interface DemandBreakdown {
  type: BenefitType;
  requestedYears: number;
  requestedWeeks: number;
  weeklyRate: number;
  totalAmount: number;
  exceedsStatutory: boolean;
  exceedsRemaining: boolean;
}

export interface DemandCalculation {
  breakdowns: DemandBreakdown[];
  subtotal: number;
  section36Amount: number;
  section28Applied: boolean;
  section28Multiplier: number;
  grandTotal: number;
}

export interface AppState {
  aww: number;
  date_of_injury: string;
  earning_capacity_default: number;
  state_rate_table: StateRateRow[];
  ledger: LedgerEntry[];
  settings: {
    proration: ProrationMode;
    today: string;
  };
}

export interface SessionData {
  version: string;
  timestamp: string;
  data: AppState;
  metadata: {
    name: string;
    description?: string;
  };
}