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