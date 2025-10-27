export interface Lien {
  id: string;
  description: string;
  originalAmount: number;
  reducedAmount: number;
}

export interface MVASettlementData {
  grossSettlement: number;
  attorneyFeePercent: number;
  caseExpenses: number;
  liens: Lien[];
}

export interface GLSettlementData {
  grossSettlement: number;
  attorneyFeePercent: number;
  caseExpenses: number;
  liens: Lien[];
}

export interface SettlementCalculationResult {
  grossSettlement: number;
  attorneyFee: number;
  attorneyFeePercent: number;
  caseExpenses: number;
  totalLiensOriginal: number;
  totalLiensReduced: number;
  lienReductionSavings: number;
  totalDeductions: number;
  netToClient: number;
}

export interface ClientInfo {
  attorneyName: string;
  clientName: string;
  dateOfInjury?: string;
  date: string;
}

export interface SettlementAllocation {
  type: string;
  amountAllocated: number;
  weeksCovered: number;
  yearsCovered: number;
  weeklyRate?: number; // For manual entries like 34A
  inputMode?: 'years' | 'dollars'; // Track which input method is being used
  yearInput?: string; // Store raw input to prevent formatting interference
  dollarInput?: string; // Store raw input to prevent formatting interference
}

export interface BenefitsRemainingOptions {
  includeIndividualBenefits: boolean;
  includeCombinedLimits: boolean;
  includeTotalPaid: boolean;
  includeProgressBars: boolean;
  includeSettlementOffer: boolean;
  customNotes?: string;
  selectedBenefitTypes?: string[]; // Array of benefit types to include (e.g., ['34', '35'])
  settlementAmount?: number;
  settlementAllocations?: SettlementAllocation[];
  section36Amount?: number; // Scarring/disfigurement flat amount
}

export interface BenefitsRemainingData {
  clientInfo: ClientInfo;
  benefitCalculations: Array<{
    type: string;
    rawWeekly: number;
    finalWeekly: number;
  }>;
  remainingEntitlements: Array<{
    type: string;
    statutoryMaxWeeks: number | null;
    weeksUsed: number;
    weeksRemaining: number | null;
    dollarsRemaining: number | null;
    isLifeBenefit: boolean;
  }>;
  combinedUsage: {
    weeksUsed: number;
    weeksRemaining: number;
    maxWeeks: number;
  };
  combined35Usage: {
    weeksUsed: number;
    weeksRemaining: number;
    maxWeeks: number;
  };
  totalDollarsPaid: number;
  options: BenefitsRemainingOptions;
}