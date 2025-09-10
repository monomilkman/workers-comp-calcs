import { 
  calculateWeeklyRate, 
  getStateMinMax, 
  applyStateMinMax,
  getStatutoryMaxWeeks,
  getCombinedMaxWeeks 
} from '../utils/rates';
import type { StateRateRow } from '../types';

const mockStateRateTable: StateRateRow[] = [
  {
    effective_from: '2024-10-01',
    effective_to: '2025-09-30',
    state_min: 365.83,
    state_max: 1500.00,
    source_url: 'https://www.mass.gov/test'
  },
  {
    effective_from: '2023-10-01',
    effective_to: '2024-09-30',
    state_min: 345.50,
    state_max: 1418.75,
    source_url: 'https://www.mass.gov/test'
  }
];

describe('calculateWeeklyRate', () => {
  test('Section 34 calculates 60% of AWW', () => {
    const result = calculateWeeklyRate('34', 1000, {
      dateOfInjury: '2025-01-02',
      stateTable: mockStateRateTable
    });
    expect(result.rawWeekly).toBe(600); // 1000 * 0.60
    expect(result.finalWeekly).toBe(600); // No adjustment needed
  });

  test('Section 35 calculates 75% of Section 34 rate', () => {
    const result = calculateWeeklyRate('35', 1000, {
      dateOfInjury: '2025-01-02',
      stateTable: mockStateRateTable
    });
    expect(result.rawWeekly).toBe(450); // (1000 * 0.60) * 0.75
    expect(result.finalWeekly).toBe(450); // No adjustment needed
  });

  test('Section 35 EC calculates (AWW - EC) * 60%', () => {
    const result = calculateWeeklyRate('35ec', 1000, {
      ec: 600,
      dateOfInjury: '2025-01-02',
      stateTable: mockStateRateTable
    });
    expect(result.rawWeekly).toBe(240); // (1000 - 600) * 0.60
    expect(result.finalWeekly).toBe(365.83); // Raised to state minimum
    expect(result.appliedRule).toBe('raised_to_min');
  });

  test('Section 35 EC returns 0 when EC >= AWW', () => {
    const result = calculateWeeklyRate('35ec', 500, {
      ec: 600,
      dateOfInjury: '2025-01-02',
      stateTable: mockStateRateTable
    });
    expect(result.rawWeekly).toBe(0); // EC >= AWW
    expect(result.finalWeekly).toBe(0); // No benefit due
    expect(result.appliedRule).toBe('unchanged');
  });

  test('Section 34A calculates 66.6666666% of AWW', () => {
    const result = calculateWeeklyRate('34A', 900, {
      dateOfInjury: '2025-01-02',
      stateTable: mockStateRateTable
    });
    expect(result.rawWeekly).toBeCloseTo(600, 2); // 900 * 0.666666666
    expect(result.finalWeekly).toBeCloseTo(600, 2);
  });

  test('Section 31 calculates same as 34A', () => {
    const result31 = calculateWeeklyRate('31', 900, {
      dateOfInjury: '2025-01-02',
      stateTable: mockStateRateTable
    });
    const result34A = calculateWeeklyRate('34A', 900, {
      dateOfInjury: '2025-01-02',
      stateTable: mockStateRateTable
    });
    expect(result31.rawWeekly).toBe(result34A.rawWeekly);
    expect(result31.finalWeekly).toBe(result34A.finalWeekly);
  });

  test('throws error for invalid AWW', () => {
    expect(() => {
      calculateWeeklyRate('34', 0, {
        dateOfInjury: '2025-01-02',
        stateTable: mockStateRateTable
      });
    }).toThrow('Average Weekly Wage must be greater than 0');
  });
});

describe('applyStateMinMax', () => {
  test('caps rate to state maximum when exceeded', () => {
    const result = applyStateMinMax(2000, 3000, '2025-01-02', mockStateRateTable);
    expect(result.finalWeekly).toBe(1500); // Capped to state max
    expect(result.appliedRule).toBe('capped_to_max');
  });

  test('raises rate to state minimum when AWW >= state_min', () => {
    const result = applyStateMinMax(300, 500, '2025-01-02', mockStateRateTable);
    expect(result.finalWeekly).toBe(365.83); // Raised to state min
    expect(result.appliedRule).toBe('raised_to_min');
  });

  test('pays AWW when AWW < state_min', () => {
    const result = applyStateMinMax(180, 300, '2025-01-02', mockStateRateTable);
    expect(result.finalWeekly).toBe(300); // Pays AWW, not state min
    expect(result.appliedRule).toBe('aww_below_min_keep_aww');
  });

  test('leaves rate unchanged when within range', () => {
    const result = applyStateMinMax(800, 1200, '2025-01-02', mockStateRateTable);
    expect(result.finalWeekly).toBe(800); // No change
    expect(result.appliedRule).toBe('unchanged');
  });
});

describe('getStateMinMax', () => {
  test('returns correct rates for date within period', () => {
    const result = getStateMinMax('2025-01-02', mockStateRateTable);
    expect(result.state_min).toBe(365.83);
    expect(result.state_max).toBe(1500.00);
  });

  test('returns correct rates for older date', () => {
    const result = getStateMinMax('2024-01-15', mockStateRateTable);
    expect(result.state_min).toBe(345.50);
    expect(result.state_max).toBe(1418.75);
  });

  test('throws error when no rate found', () => {
    expect(() => {
      getStateMinMax('2020-01-01', mockStateRateTable);
    }).toThrow('No state rate found');
  });
});

describe('getStatutoryMaxWeeks', () => {
  test('returns correct weeks for each benefit type', () => {
    expect(getStatutoryMaxWeeks('34')).toBe(156); // 3 years
    expect(getStatutoryMaxWeeks('35')).toBe(208); // 4 years
    expect(getStatutoryMaxWeeks('35ec')).toBe(208); // 4 years
    expect(getStatutoryMaxWeeks('34A')).toBeNull(); // Life benefit
    expect(getStatutoryMaxWeeks('31')).toBeNull(); // Life benefit
  });
});

describe('getCombinedMaxWeeks', () => {
  test('returns 364 weeks for combined limit', () => {
    expect(getCombinedMaxWeeks()).toBe(364); // 7 years
  });
});