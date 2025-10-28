import type { MVASettlementData, GLSettlementData, SettlementCalculationResult, Lien, Expense } from '../types/settlement';

/**
 * Calculate settlement distribution for MVA or GL cases
 */
export function calculateSettlement(
  data: MVASettlementData | GLSettlementData
): SettlementCalculationResult {
  const { grossSettlement, attorneyFeePercent, expenses, liens } = data;

  // Calculate attorney fee
  const attorneyFee = grossSettlement * (attorneyFeePercent / 100);

  // Calculate total expenses from itemized list
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate lien totals
  const totalLiensOriginal = liens.reduce((sum, lien) => sum + lien.originalAmount, 0);
  const totalLiensReduced = liens.reduce((sum, lien) => sum + lien.reducedAmount, 0);
  const lienReductionSavings = totalLiensOriginal - totalLiensReduced;

  // Calculate total deductions and net to client
  const totalDeductions = attorneyFee + totalExpenses + totalLiensReduced;
  const netToClient = grossSettlement - totalDeductions;

  return {
    grossSettlement,
    attorneyFee,
    attorneyFeePercent,
    totalExpenses,
    expenses,
    totalLiensOriginal,
    totalLiensReduced,
    lienReductionSavings,
    totalDeductions,
    netToClient
  };
}

/**
 * Validate settlement data
 */
export function validateSettlementData(
  data: MVASettlementData | GLSettlementData
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.grossSettlement || data.grossSettlement <= 0) {
    errors.push('Gross settlement amount must be greater than 0');
  }

  if (!data.attorneyFeePercent || data.attorneyFeePercent < 0 || data.attorneyFeePercent > 100) {
    errors.push('Attorney fee percentage must be between 0 and 100');
  }

  // Validate expenses
  data.expenses.forEach((expense, index) => {
    if (!expense.description.trim()) {
      errors.push(`Expense ${index + 1}: Description is required`);
    }
    if (expense.amount < 0) {
      errors.push(`Expense ${index + 1}: Amount cannot be negative`);
    }
  });

  // Validate liens
  data.liens.forEach((lien, index) => {
    if (!lien.description.trim()) {
      errors.push(`Lien ${index + 1}: Description is required`);
    }
    if (lien.originalAmount < 0) {
      errors.push(`Lien ${index + 1}: Original amount cannot be negative`);
    }
    if (lien.reducedAmount < 0) {
      errors.push(`Lien ${index + 1}: Reduced amount cannot be negative`);
    }
    if (lien.reducedAmount > lien.originalAmount) {
      errors.push(`Lien ${index + 1}: Reduced amount cannot exceed original amount`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a new empty lien
 */
export function createEmptyLien(): Lien {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    description: '',
    originalAmount: 0,
    reducedAmount: 0
  };
}

/**
 * Create a new empty expense
 */
export function createEmptyExpense(): Expense {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    description: '',
    amount: 0
  };
}

/**
 * Format settlement type for display
 */
export function getSettlementTypeLabel(type: 'mva' | 'gl'): string {
  switch (type) {
    case 'mva':
      return 'Motor Vehicle Accident';
    case 'gl':
      return 'General Liability';
    default:
      return 'Settlement';
  }
}