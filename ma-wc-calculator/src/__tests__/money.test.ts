import { 
  formatCurrency, 
  roundToCurrency, 
  roundToWeeks,
  parseCurrency,
  calculateYearly,
  isValidMoneyAmount
} from '../utils/money';

describe('formatCurrency', () => {
  test('formats positive amounts with default options', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(100)).toBe('$100.00');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  test('formats without symbol when showSymbol is false', () => {
    expect(formatCurrency(1234.56, { showSymbol: false })).toBe('1,234.56');
  });

  test('formats without cents when showCents is false', () => {
    expect(formatCurrency(1234.56, { showCents: false })).toBe('$1,235');
    expect(formatCurrency(1234.99, { showCents: false })).toBe('$1,235');
  });

  test('handles large amounts', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  test('handles decimal amounts', () => {
    expect(formatCurrency(0.99)).toBe('$0.99');
    expect(formatCurrency(0.01)).toBe('$0.01');
  });
});

describe('roundToCurrency', () => {
  test('rounds to 2 decimal places', () => {
    expect(roundToCurrency(123.456)).toBe(123.46);
    expect(roundToCurrency(123.454)).toBe(123.45);
    expect(roundToCurrency(123.455)).toBe(123.46); // Banker's rounding
  });

  test('handles whole numbers', () => {
    expect(roundToCurrency(100)).toBe(100.00);
  });

  test('handles negative numbers', () => {
    expect(roundToCurrency(-123.456)).toBe(-123.46);
  });
});

describe('roundToWeeks', () => {
  test('rounds to 4 decimal places', () => {
    expect(roundToWeeks(12.123456)).toBe(12.1235);
    expect(roundToWeeks(12.123444)).toBe(12.1234);
  });

  test('handles whole numbers', () => {
    expect(roundToWeeks(52)).toBe(52.0000);
  });
});

describe('parseCurrency', () => {
  test('parses valid currency strings', () => {
    expect(parseCurrency('$1,234.56')).toBe(1234.56);
    expect(parseCurrency('1234.56')).toBe(1234.56);
    expect(parseCurrency('1,234')).toBe(1234);
    expect(parseCurrency('$100')).toBe(100);
  });

  test('handles strings with spaces', () => {
    expect(parseCurrency(' $1,234.56 ')).toBe(1234.56);
    expect(parseCurrency('$ 1,234.56')).toBe(1234.56);
  });

  test('returns 0 for invalid input', () => {
    expect(parseCurrency('')).toBe(0);
    expect(parseCurrency('invalid')).toBe(0);
    expect(parseCurrency('$abc')).toBe(0);
  });

  test('handles edge cases', () => {
    expect(parseCurrency('0')).toBe(0);
    expect(parseCurrency('0.00')).toBe(0);
    expect(parseCurrency('.50')).toBe(0.5);
  });
});

describe('calculateYearly', () => {
  test('calculates yearly amount from weekly rate', () => {
    const result = calculateYearly(600);
    expect(result.exact).toBe(31200); // 600 * 52
    expect(result.rounded).toBe(31200.00);
  });

  test('handles fractional weekly rates', () => {
    const result = calculateYearly(123.456);
    expect(result.exact).toBe(6419.712); // 123.456 * 52
    expect(result.rounded).toBe(6419.71);
  });

  test('handles zero', () => {
    const result = calculateYearly(0);
    expect(result.exact).toBe(0);
    expect(result.rounded).toBe(0);
  });
});

describe('isValidMoneyAmount', () => {
  test('returns true for valid amounts', () => {
    expect(isValidMoneyAmount(100)).toBe(true);
    expect(isValidMoneyAmount(0)).toBe(true);
    expect(isValidMoneyAmount(1234.56)).toBe(true);
    expect(isValidMoneyAmount(999999999.99)).toBe(true);
  });

  test('returns false for invalid amounts', () => {
    expect(isValidMoneyAmount(-1)).toBe(false); // Negative
    expect(isValidMoneyAmount(NaN)).toBe(false);
    expect(isValidMoneyAmount(Infinity)).toBe(false);
    expect(isValidMoneyAmount(1000000000)).toBe(false); // Too large
  });

  test('returns false for non-numbers', () => {
    expect(isValidMoneyAmount('100' as any)).toBe(false);
    expect(isValidMoneyAmount(null as any)).toBe(false);
    expect(isValidMoneyAmount(undefined as any)).toBe(false);
  });
});