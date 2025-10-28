import { useMemo } from 'react';
import type {
  BenefitType,
  BenefitCalculation,
  LedgerEntry,
  RemainingEntitlement,
  StateRateRow
} from '../types';
import {
  calculateWeeklyRate,
  getStatutoryMaxWeeks,
  getCombinedMaxWeeks
} from '../utils/rates';
import { calculateYearly } from '../utils/money';
import { COMBINED_35_MAX_WEEKS } from '../constants/statutory';

/**
 * Custom hook for calculating benefit rates and remaining entitlements
 */
export function useCalculations(
  aww: number,
  dateOfInjury: string,
  earningCapacity: number,
  stateRateTable: StateRateRow[],
  ledger: LedgerEntry[]
) {
  // Calculate all benefit types
  const benefitCalculations = useMemo((): BenefitCalculation[] => {
    if (!aww || !dateOfInjury || stateRateTable.length === 0) {
      return [];
    }

    const benefitTypes: BenefitType[] = ['34', '35', '35ec', '34A', '31'];
    
    return benefitTypes.map(type => {
      try {
        const result = calculateWeeklyRate(type, aww, {
          ec: type === '35ec' ? earningCapacity : undefined,
          dateOfInjury,
          stateTable: stateRateTable
        });
        
        const yearly = calculateYearly(result.finalWeekly);
        const statutoryMaxWeeks = getStatutoryMaxWeeks(type);
        
        return {
          type,
          rawWeekly: result.rawWeekly,
          finalWeekly: result.finalWeekly,
          yearlyAmount: yearly.rounded,
          statutoryMaxWeeks,
          appliedRule: result.appliedRule
        };
      } catch (error) {
        console.error(`Error calculating ${type}:`, error);
        return {
          type,
          rawWeekly: 0,
          finalWeekly: 0,
          yearlyAmount: 0,
          statutoryMaxWeeks: getStatutoryMaxWeeks(type),
          appliedRule: 'unchanged' as const
        };
      }
    });
  }, [aww, dateOfInjury, earningCapacity, stateRateTable]);

  // Calculate weeks used per benefit type
  const weeksUsedByType = useMemo(() => {
    const usage: Record<BenefitType, number> = {
      '34': 0,
      '35': 0,
      '35ec': 0,
      '34A': 0,
      '31': 0
    };

    ledger.forEach(entry => {
      if (entry.type in usage) {
        usage[entry.type] += entry.weeks;
      }
    });

    return usage;
  }, [ledger]);

  // Calculate dollars paid by type
  const dollarsPaidByType = useMemo(() => {
    const payments: Record<BenefitType, number> = {
      '34': 0,
      '35': 0,
      '35ec': 0,
      '34A': 0,
      '31': 0
    };

    ledger.forEach(entry => {
      if (entry.type in payments) {
        payments[entry.type] += entry.dollars_paid;
      }
    });

    return payments;
  }, [ledger]);

  // Calculate remaining entitlements with combined Section 35 + 35EC limit
  const remainingEntitlements = useMemo((): RemainingEntitlement[] => {
    // Calculate combined 35 + 35EC usage for shared 4-year limit
    const combined35Weeks = weeksUsedByType['35'] + weeksUsedByType['35ec'];
    const combined35Remaining = Math.max(0, COMBINED_35_MAX_WEEKS - combined35Weeks);

    return benefitCalculations.map(benefit => {
      const weeksUsed = weeksUsedByType[benefit.type];
      const isLifeBenefit = benefit.statutoryMaxWeeks === null;

      let weeksRemaining: number | null = null;
      let dollarsRemaining: number | null = null;
      let effectiveMaxWeeks = benefit.statutoryMaxWeeks;
      let sharesLimitWith: BenefitType[] | undefined = undefined;

      if (!isLifeBenefit && benefit.statutoryMaxWeeks !== null) {
        if (benefit.type === '35' || benefit.type === '35ec') {
          // For Section 35 and 35EC, use shared limit
          effectiveMaxWeeks = COMBINED_35_MAX_WEEKS;
          weeksRemaining = combined35Remaining;
          dollarsRemaining = weeksRemaining * benefit.finalWeekly;
          // Mark that these benefits share a limit
          sharesLimitWith = benefit.type === '35' ? ['35ec'] : ['35'];
        } else {
          // For other types (like Section 34), use individual limits
          weeksRemaining = Math.max(0, benefit.statutoryMaxWeeks - weeksUsed);
          dollarsRemaining = weeksRemaining * benefit.finalWeekly;
        }
      }

      return {
        type: benefit.type,
        statutoryMaxWeeks: effectiveMaxWeeks,
        weeksUsed: benefit.type === '35' || benefit.type === '35ec' ? combined35Weeks : weeksUsed,
        weeksRemaining,
        dollarsRemaining,
        isLifeBenefit,
        sharesLimitWith
      };
    });
  }, [benefitCalculations, weeksUsedByType]);

  // Calculate combined 34 + 35 usage (7-year cap)
  const combinedUsage = useMemo(() => {
    const combined34And35Weeks = weeksUsedByType['34'] + weeksUsedByType['35'] + weeksUsedByType['35ec'];
    const combinedMaxWeeks = getCombinedMaxWeeks();
    const combinedRemaining = Math.max(0, combinedMaxWeeks - combined34And35Weeks);
    
    return {
      weeksUsed: combined34And35Weeks,
      weeksRemaining: combinedRemaining,
      maxWeeks: combinedMaxWeeks
    };
  }, [weeksUsedByType]);

  // Calculate combined Section 35 + 35EC usage (4-year shared cap)
  const combined35Usage = useMemo(() => {
    const combined35Weeks = weeksUsedByType['35'] + weeksUsedByType['35ec'];
    const combined35Remaining = Math.max(0, COMBINED_35_MAX_WEEKS - combined35Weeks);

    return {
      weeksUsed: combined35Weeks,
      weeksRemaining: combined35Remaining,
      maxWeeks: COMBINED_35_MAX_WEEKS
    };
  }, [weeksUsedByType]);

  // Calculate total dollars paid
  const totalDollarsPaid = useMemo(() => {
    return Object.values(dollarsPaidByType).reduce((sum, amount) => sum + amount, 0);
  }, [dollarsPaidByType]);

  return {
    benefitCalculations,
    weeksUsedByType,
    dollarsPaidByType,
    remainingEntitlements,
    combinedUsage,
    combined35Usage,
    totalDollarsPaid
  };
}