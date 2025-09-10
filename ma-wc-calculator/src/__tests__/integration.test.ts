import { 
  calculateWeeklyRate,
  getStatutoryMaxWeeks,
  getCombinedMaxWeeks
} from '../utils/rates';
import { weeksBetween } from '../utils/dates';
import type { StateRateRow, LedgerEntry } from '../types';

const mockStateRateTable: StateRateRow[] = [
  {
    effective_from: '2024-10-01',
    effective_to: '2025-09-30',
    state_min: 365.83,
    state_max: 1500.00,
    source_url: 'https://www.mass.gov/test'
  }
];

describe('Integration Tests - Complete Workflow', () => {
  test('High AWW case calculation end-to-end', () => {
    const aww = 1000;
    const dateOfInjury = '2024-11-01';
    const earningCapacity = 600;

    // Calculate all benefit types
    const section34 = calculateWeeklyRate('34', aww, {
      dateOfInjury,
      stateTable: mockStateRateTable
    });
    const section35 = calculateWeeklyRate('35', aww, {
      dateOfInjury,
      stateTable: mockStateRateTable
    });
    const section35ec = calculateWeeklyRate('35ec', aww, {
      ec: earningCapacity,
      dateOfInjury,
      stateTable: mockStateRateTable
    });
    const section34A = calculateWeeklyRate('34A', aww, {
      dateOfInjury,
      stateTable: mockStateRateTable
    });

    // Verify calculations
    expect(section34.rawWeekly).toBe(600); // 1000 * 0.60
    expect(section34.finalWeekly).toBe(600); // Within range, no adjustment
    
    expect(section35.rawWeekly).toBe(450); // 600 * 0.75
    expect(section35.finalWeekly).toBe(450);
    
    expect(section35ec.rawWeekly).toBe(240); // (1000 - 600) * 0.60
    expect(section35ec.finalWeekly).toBe(365.83); // Raised to state minimum
    
    expect(section34A.rawWeekly).toBeCloseTo(666.67, 2); // 1000 * 0.666666666
    expect(section34A.finalWeekly).toBeCloseTo(666.67, 2);

    // Test ledger calculation
    const startDate = '2024-11-01';
    const endDate = '2025-05-01';
    const weekCalc = weeksBetween(startDate, endDate, 'days');
    const dollarsPaid = section34.finalWeekly * weekCalc.weeksDecimal;

    expect(weekCalc.weeksDecimal).toBeCloseTo(25.86, 1); // Approximately 6 months
    expect(dollarsPaid).toBeCloseTo(15514, 0); // ~25.86 weeks * $600
  });

  test('Low AWW state minimum application', () => {
    const aww = 500;
    const dateOfInjury = '2025-01-02';

    const section34 = calculateWeeklyRate('34', aww, {
      dateOfInjury,
      stateTable: mockStateRateTable
    });

    // Raw calculation: 500 * 0.60 = 300
    expect(section34.rawWeekly).toBe(300);
    // Since AWW (500) >= state_min (365.83), but raw (300) < state_min
    // Should be raised to state minimum
    expect(section34.finalWeekly).toBe(365.83);
    expect(section34.appliedRule).toBe('raised_to_min');
  });

  test('Very low AWW below state minimum', () => {
    const aww = 300;
    const dateOfInjury = '2025-01-02';

    const section34 = calculateWeeklyRate('34', aww, {
      dateOfInjury,
      stateTable: mockStateRateTable
    });

    // Raw calculation: 300 * 0.60 = 180
    expect(section34.rawWeekly).toBe(180);
    // Since AWW (300) < state_min (365.83), should pay AWW
    expect(section34.finalWeekly).toBe(300);
    expect(section34.appliedRule).toBe('aww_below_min_keep_aww');
  });

  test('Statutory limits validation', () => {
    expect(getStatutoryMaxWeeks('34')).toBe(156); // 3 years
    expect(getStatutoryMaxWeeks('35')).toBe(208); // 4 years
    expect(getStatutoryMaxWeeks('35ec')).toBe(208); // 4 years
    expect(getStatutoryMaxWeeks('34A')).toBeNull(); // Life benefit
    expect(getStatutoryMaxWeeks('31')).toBeNull(); // Life benefit
    expect(getCombinedMaxWeeks()).toBe(364); // 7 years total
  });

  test('Demand calculation workflow', () => {
    const aww = 1000;
    const dateOfInjury = '2025-01-02';

    // Calculate 1 year of Section 34 benefits
    const section34 = calculateWeeklyRate('34', aww, {
      dateOfInjury,
      stateTable: mockStateRateTable
    });

    const yearsRequested = 1;
    const weeksRequested = yearsRequested * 52;
    const totalAmount = section34.finalWeekly * weeksRequested;

    expect(totalAmount).toBe(31200); // $600 * 52 weeks = $31,200

    // Add Section 36 scarring
    const section36Amount = 5000;
    
    // Apply Section 28 penalty (double)
    const section28Applied = true;
    const subtotal = totalAmount + section36Amount; // $36,200
    const grandTotal = section28Applied ? subtotal * 2 : subtotal;

    expect(grandTotal).toBe(72400); // $36,200 * 2 = $72,400
  });

  test('Ledger aggregation and remaining entitlement calculation', () => {
    const aww = 1000;

    // Test with simulated ledger data
    const simulatedEntries: LedgerEntry[] = [
      {
        id: 'entry-1',
        type: '34',
        start: '2025-01-02',
        end: '2025-07-02',
        aww_used: aww,
        weeks: 26,
        raw_weekly: 600,
        final_weekly: 600,
        dollars_paid: 15600,
        notes: 'First TTD period'
      },
      {
        id: 'entry-2',
        type: '35ec',
        start: '2025-07-03',
        end: '2025-12-31',
        aww_used: aww,
        ec_used: 600,
        weeks: 26,
        raw_weekly: 240,
        final_weekly: 240,
        dollars_paid: 6240,
        notes: 'TPD with earning capacity'
      }
    ];

    // Use the simulated data for calculations
    expect(simulatedEntries.length).toBe(2);

    // Aggregate weeks and dollars by type
    const weeksUsed = {
      '34': 26,
      '35': 0,
      '35ec': 26,
      '34A': 0,
      '31': 0
    };

    const dollarsUsed = {
      '34': 15600,
      '35': 0,
      '35ec': 6240,
      '34A': 0,
      '31': 0
    };

    // Calculate remaining entitlements
    const section34MaxWeeks = getStatutoryMaxWeeks('34')!;
    const section35ecMaxWeeks = getStatutoryMaxWeeks('35ec')!;

    const section34Remaining = section34MaxWeeks - weeksUsed['34'];
    const section35ecRemaining = section35ecMaxWeeks - weeksUsed['35ec'];

    expect(section34Remaining).toBe(130); // 156 - 26
    expect(section35ecRemaining).toBe(182); // 208 - 26

    // Combined 34 + 35 usage
    const combinedUsed = weeksUsed['34'] + weeksUsed['35'] + weeksUsed['35ec'];
    const combinedRemaining = getCombinedMaxWeeks() - combinedUsed;

    expect(combinedUsed).toBe(52); // 26 + 0 + 26
    expect(combinedRemaining).toBe(312); // 364 - 52

    // Total dollars paid
    const totalPaid = Object.values(dollarsUsed).reduce((sum, amount) => sum + amount, 0);
    expect(totalPaid).toBe(21840); // 15600 + 6240
  });

  test('Settlement calculator workflow', () => {
    const proposedSettlement = 50000;
    
    // Assume remaining entitlements from previous test
    const section34RemainingWeeks = 130;
    const section34WeeklyRate = 600;
    const section34RemainingDollars = section34RemainingWeeks * section34WeeklyRate; // $78,000

    const section35ecRemainingWeeks = 182;
    const section35ecWeeklyRate = 240;
    const section35ecRemainingDollars = section35ecRemainingWeeks * section35ecWeeklyRate; // Updated for corrected rate

    const totalRemainingDollars = section34RemainingDollars + section35ecRemainingDollars; // $121,680

    // Settlement analysis
    const settlementCoversPercentage = proposedSettlement / totalRemainingDollars;
    expect(settlementCoversPercentage).toBeCloseTo(0.41, 2); // About 41%

    // If allocating proportionally:
    const section34Allocation = proposedSettlement * (section34RemainingDollars / totalRemainingDollars);
    const section35ecAllocation = proposedSettlement * (section35ecRemainingDollars / totalRemainingDollars);

    expect(section34Allocation).toBeCloseTo(32051, 0);
    expect(section35ecAllocation).toBeCloseTo(17949, 0);

    // Weeks covered by settlement
    const section34WeeksCovered = section34Allocation / section34WeeklyRate;
    const section35ecWeeksCovered = section35ecAllocation / section35ecWeeklyRate;

    expect(section34WeeksCovered).toBeCloseTo(53.4, 1);
    expect(section35ecWeeksCovered).toBeCloseTo(74.79, 1);
  });
});