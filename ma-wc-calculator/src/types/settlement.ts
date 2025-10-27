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

export interface BenefitsRemainingOptions {
  includeIndividualBenefits: boolean;
  includeCombinedLimits: boolean;
  includeTotalPaid: boolean;
  includeProgressBars: boolean;
  customNotes?: string;
  selectedBenefitTypes?: string[]; // Array of benefit types to include (e.g., ['34', '35'])
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