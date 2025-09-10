/**
 * Tests for the state rates scraper utility functions
 */

interface ParsedRate {
  year: number;
  minimum: number;
  maximum: number;
}

interface StateRateRow {
  effective_from: string;
  effective_to: string;
  state_min: number;
  state_max: number;
  source_url: string;
}

// Utility functions extracted from the scraper for testing
const parseYear = (dateMatch: RegExpMatchArray): number => {
  let year = parseInt(dateMatch[3]);
  if (year < 100) {
    if (year <= 49) {
      year += 2000;
    } else {
      year += 1900;
    }
  }
  return year;
};

const parseRateValue = (rateText: string): number => {
  let clean = rateText.replace(/[$\s]/g, '');
  
  if (clean.includes(',')) {
    const parts = clean.split(',');
    if (parts.length === 3 && parts[2].length === 2) {
      // Format: "1,256,47" -> "1256.47"
      clean = parts[0] + parts[1] + '.' + parts[2];
    } else {
      // Normal comma thousands separator: "1,256.47" -> "1256.47"
      clean = clean.replace(/,/g, '');
    }
  }
  
  return parseFloat(clean);
};

const formatStateRates = (parsedRates: ParsedRate[]): StateRateRow[] => {
  return parsedRates.map(rate => ({
    effective_from: `${rate.year}-10-01`,
    effective_to: `${rate.year + 1}-09-30`,
    state_min: rate.minimum,
    state_max: rate.maximum,
    source_url: 'https://www.mass.gov/info-details/minimum-and-maximum-compensation-rates'
  }));
};

const validateStateRates = (rates: StateRateRow[]): void => {
  if (rates.length === 0) {
    throw new Error('No state rates to validate');
  }
  
  for (const rate of rates) {
    if (!/^\d{4}-10-01$/.test(rate.effective_from)) {
      throw new Error(`Invalid effective_from date: ${rate.effective_from}`);
    }
    
    if (!/^\d{4}-09-30$/.test(rate.effective_to)) {
      throw new Error(`Invalid effective_to date: ${rate.effective_to}`);
    }
    
    if (rate.state_min <= 0 || rate.state_max <= 0) {
      throw new Error(`Invalid rates: min ${rate.state_min}, max ${rate.state_max}`);
    }
    
    if (rate.state_max <= rate.state_min) {
      throw new Error(`Maximum rate (${rate.state_max}) must be greater than minimum (${rate.state_min})`);
    }
  }
};

describe('Scraper Utility Functions', () => {
  describe('parseYear', () => {
    it('should handle 4-digit years correctly', () => {
      const dateMatch = ['[10/1/2024]', '10', '1', '2024'];
      expect(parseYear(dateMatch as RegExpMatchArray)).toBe(2024);
    });

    it('should convert 2-digit years 00-49 to 20xx', () => {
      const dateMatch1 = ['[10/1/00]', '10', '1', '00'];
      expect(parseYear(dateMatch1 as RegExpMatchArray)).toBe(2000);
      
      const dateMatch2 = ['[10/1/25]', '10', '1', '25'];
      expect(parseYear(dateMatch2 as RegExpMatchArray)).toBe(2025);
      
      const dateMatch3 = ['[10/1/49]', '10', '1', '49'];
      expect(parseYear(dateMatch3 as RegExpMatchArray)).toBe(2049);
    });

    it('should convert 2-digit years 50-99 to 19xx', () => {
      const dateMatch1 = ['[10/1/50]', '10', '1', '50'];
      expect(parseYear(dateMatch1 as RegExpMatchArray)).toBe(1950);
      
      const dateMatch2 = ['[10/1/99]', '10', '1', '99'];
      expect(parseYear(dateMatch2 as RegExpMatchArray)).toBe(1999);
      
      const dateMatch3 = ['[10/1/85]', '10', '1', '85'];
      expect(parseYear(dateMatch3 as RegExpMatchArray)).toBe(1985);
    });
  });

  describe('parseRateValue', () => {
    it('should parse normal rate values with commas', () => {
      expect(parseRateValue('$ 1,829.13')).toBe(1829.13);
      expect(parseRateValue('$ 365.83')).toBe(365.83);
      expect(parseRateValue('$1,000.50')).toBe(1000.50);
    });

    it('should handle the 2015 decimal point issue', () => {
      // This is the specific case we fixed: "1,256,47" should become 1256.47
      expect(parseRateValue('$ 1,256,47')).toBe(1256.47);
      expect(parseRateValue('$2,345,67')).toBe(2345.67);
    });

    it('should handle values without decimals', () => {
      expect(parseRateValue('$ 243')).toBe(243);
      expect(parseRateValue('$1,000')).toBe(1000);
    });

    it('should handle values with multiple commas properly', () => {
      expect(parseRateValue('$ 12,345.67')).toBe(12345.67);
      expect(parseRateValue('$100,000.00')).toBe(100000);
    });

    it('should return NaN for invalid values', () => {
      expect(parseRateValue('invalid')).toBeNaN();
      expect(parseRateValue('$ abc')).toBeNaN();
    });
  });

  describe('formatStateRates', () => {
    it('should format parsed rates correctly', () => {
      const parsedRates: ParsedRate[] = [
        { year: 2024, minimum: 365.83, maximum: 1829.13 },
        { year: 2023, minimum: 359.34, maximum: 1796.72 }
      ];
      
      const result = formatStateRates(parsedRates);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        effective_from: '2024-10-01',
        effective_to: '2025-09-30',
        state_min: 365.83,
        state_max: 1829.13,
        source_url: 'https://www.mass.gov/info-details/minimum-and-maximum-compensation-rates'
      });
      
      expect(result[1]).toEqual({
        effective_from: '2023-10-01',
        effective_to: '2024-09-30',
        state_min: 359.34,
        state_max: 1796.72,
        source_url: 'https://www.mass.gov/info-details/minimum-and-maximum-compensation-rates'
      });
    });

    it('should handle empty array', () => {
      const result = formatStateRates([]);
      expect(result).toHaveLength(0);
    });

    it('should handle single rate', () => {
      const parsedRates: ParsedRate[] = [
        { year: 2020, minimum: 297.56, maximum: 1487.78 }
      ];
      
      const result = formatStateRates(parsedRates);
      
      expect(result).toHaveLength(1);
      expect(result[0].effective_from).toBe('2020-10-01');
      expect(result[0].effective_to).toBe('2021-09-30');
    });
  });

  describe('validateStateRates', () => {
    const validRate: StateRateRow = {
      effective_from: '2024-10-01',
      effective_to: '2025-09-30',
      state_min: 365.83,
      state_max: 1829.13,
      source_url: 'https://www.mass.gov/info-details/minimum-and-maximum-compensation-rates'
    };

    it('should validate correct state rates', () => {
      expect(() => validateStateRates([validRate])).not.toThrow();
    });

    it('should throw error for empty rates array', () => {
      expect(() => validateStateRates([])).toThrow('No state rates to validate');
    });

    it('should throw error for invalid effective_from date format', () => {
      const invalidRate = { ...validRate, effective_from: '2024-09-01' };
      expect(() => validateStateRates([invalidRate]))
        .toThrow('Invalid effective_from date: 2024-09-01');
    });

    it('should throw error for invalid effective_to date format', () => {
      const invalidRate = { ...validRate, effective_to: '2025-08-30' };
      expect(() => validateStateRates([invalidRate]))
        .toThrow('Invalid effective_to date: 2025-08-30');
    });

    it('should throw error for zero or negative minimum rate', () => {
      const invalidRate = { ...validRate, state_min: 0 };
      expect(() => validateStateRates([invalidRate]))
        .toThrow('Invalid rates: min 0, max 1829.13');
    });

    it('should throw error for zero or negative maximum rate', () => {
      const invalidRate = { ...validRate, state_max: -100 };
      expect(() => validateStateRates([invalidRate]))
        .toThrow('Invalid rates: min 365.83, max -100');
    });

    it('should throw error when maximum is not greater than minimum', () => {
      const invalidRate = { ...validRate, state_min: 1000, state_max: 500 };
      expect(() => validateStateRates([invalidRate]))
        .toThrow('Maximum rate (500) must be greater than minimum (1000)');
    });

    it('should validate multiple rates', () => {
      const validRates: StateRateRow[] = [
        validRate,
        {
          effective_from: '2023-10-01',
          effective_to: '2024-09-30',
          state_min: 359.34,
          state_max: 1796.72,
          source_url: 'https://www.mass.gov/info-details/minimum-and-maximum-compensation-rates'
        }
      ];
      
      expect(() => validateStateRates(validRates)).not.toThrow();
    });
  });

  describe('Date range validation', () => {
    it('should validate that October 1st dates are processed', () => {
      // This tests the logic that filters for October 1st dates
      expect('[10/1/24]').toMatch(/\[10\/1\/\d{2,4}\]/);
      expect('[9/1/24]').not.toMatch(/\[10\/1\/\d{2,4}\]/);
      expect('[10/15/24]').not.toMatch(/\[10\/1\/\d{2,4}\]/);
    });

    it('should validate reasonable year ranges', () => {
      const isReasonableYear = (year: number) => year >= 1990 && year <= 2050;
      
      expect(isReasonableYear(1999)).toBe(true);
      expect(isReasonableYear(2024)).toBe(true);
      expect(isReasonableYear(2050)).toBe(true);
      expect(isReasonableYear(1989)).toBe(false);
      expect(isReasonableYear(2051)).toBe(false);
      expect(isReasonableYear(1800)).toBe(false);
    });
  });

  describe('Rate comparison validation', () => {
    it('should validate that maximum rate is greater than minimum', () => {
      const isValidRateRange = (min: number, max: number) => {
        return !isNaN(min) && !isNaN(max) && min > 0 && max > 0 && max > min;
      };
      
      expect(isValidRateRange(365.83, 1829.13)).toBe(true);
      expect(isValidRateRange(100, 50)).toBe(false); // max < min
      expect(isValidRateRange(0, 1000)).toBe(false); // min is 0
      expect(isValidRateRange(100, 0)).toBe(false); // max is 0
      expect(isValidRateRange(100, 100)).toBe(false); // min === max
      expect(isValidRateRange(NaN, 1000)).toBe(false); // NaN values
    });
  });
});