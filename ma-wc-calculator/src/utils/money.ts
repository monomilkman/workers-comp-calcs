/**
 * Format a number as currency (US dollars)
 * 
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number, 
  options: { 
    showCents?: boolean;
    showSymbol?: boolean;
  } = {}
): string {
  const { showCents = true, showSymbol = true } = options;
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
  
  return formatter.format(amount);
}

/**
 * Round to exactly 2 decimal places for currency display
 * Keeps higher precision internally during calculations
 */
export function roundToCurrency(amount: number): number {
  return Number((Math.round(amount * 100) / 100).toFixed(2));
}

/**
 * Round to 4 decimal places for week calculations
 */
export function roundToWeeks(weeks: number): number {
  return Number(weeks.toFixed(4));
}

/**
 * Parse a currency string and return the numeric value
 * Handles various input formats like "$1,234.56", "1234.56", etc.
 */
export function parseCurrency(value: string): number {
  if (!value || typeof value !== 'string') {
    return 0;
  }
  
  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate yearly amount from weekly rate
 * Returns both exact calculation and currency-rounded version
 */
export function calculateYearly(weeklyRate: number): { exact: number; rounded: number } {
  const exact = weeklyRate * 52;
  const rounded = roundToCurrency(exact);
  
  return { exact, rounded };
}

/**
 * Validate that a numeric input is positive and reasonable for financial calculations
 */
export function isValidMoneyAmount(amount: number): boolean {
  return typeof amount === 'number' && 
         !isNaN(amount) && 
         isFinite(amount) && 
         amount >= 0 && 
         amount <= 999999999.99; // Reasonable upper limit
}