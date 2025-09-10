import { isValidISODate } from './dates';
import { isValidMoneyAmount } from './money';
import type { BenefitType, LedgerEntry } from '../types';

/**
 * Validation error with field reference
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate Average Weekly Wage input
 */
export function validateAWW(aww: number): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!isValidMoneyAmount(aww)) {
    errors.push({
      field: 'aww',
      message: 'Average Weekly Wage must be a valid positive number'
    });
  } else if (aww <= 0) {
    errors.push({
      field: 'aww',
      message: 'Average Weekly Wage must be greater than $0'
    });
  } else if (aww > 999999) {
    errors.push({
      field: 'aww',
      message: 'Average Weekly Wage seems unusually high. Please verify.'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate Date of Injury input
 */
export function validateDateOfInjury(doi: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!doi) {
    errors.push({
      field: 'dateOfInjury',
      message: 'Date of Injury is required'
    });
  } else if (!isValidISODate(doi)) {
    errors.push({
      field: 'dateOfInjury',
      message: 'Date of Injury must be a valid date in YYYY-MM-DD format'
    });
  } else {
    // Check if date is reasonable (not too far in past or future)
    const injuryDate = new Date(doi);
    const now = new Date();
    const hundredYearsAgo = new Date();
    hundredYearsAgo.setFullYear(now.getFullYear() - 100);
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(now.getFullYear() + 10);
    
    if (injuryDate < hundredYearsAgo) {
      errors.push({
        field: 'dateOfInjury',
        message: 'Date of Injury seems too far in the past'
      });
    } else if (injuryDate > tenYearsFromNow) {
      errors.push({
        field: 'dateOfInjury',
        message: 'Date of Injury cannot be more than 10 years in the future'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate Earning Capacity input
 */
export function validateEarningCapacity(ec: number): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!isValidMoneyAmount(ec)) {
    errors.push({
      field: 'earningCapacity',
      message: 'Earning Capacity must be a valid number'
    });
  } else if (ec < 0) {
    errors.push({
      field: 'earningCapacity',
      message: 'Earning Capacity cannot be negative'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate a ledger entry
 */
export function validateLedgerEntry(entry: Partial<LedgerEntry>, aww?: number): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate benefit type
  const validTypes: BenefitType[] = ['34', '35', '35ec', '34A', '31'];
  if (!entry.type || !validTypes.includes(entry.type)) {
    errors.push({
      field: 'type',
      message: 'Must select a valid benefit type'
    });
  }
  
  // Validate start date
  if (!entry.start) {
    errors.push({
      field: 'start',
      message: 'Start date is required'
    });
  } else if (!isValidISODate(entry.start)) {
    errors.push({
      field: 'start',
      message: 'Start date must be valid'
    });
  }
  
  // Validate end date if provided
  if (entry.end) {
    if (!isValidISODate(entry.end)) {
      errors.push({
        field: 'end',
        message: 'End date must be valid'
      });
    } else if (entry.start && entry.end < entry.start) {
      errors.push({
        field: 'end',
        message: 'End date must be after start date'
      });
    }
  }
  
  // Validate AWW used
  if (entry.aww_used !== undefined) {
    if (!isValidMoneyAmount(entry.aww_used) || entry.aww_used <= 0) {
      errors.push({
        field: 'aww_used',
        message: 'AWW used must be a positive number'
      });
    }
  }
  
  // Validate EC for Section 35 EC entries
  if (entry.type === '35ec') {
    if (entry.ec_used === undefined || entry.ec_used === null) {
      errors.push({
        field: 'ec_used',
        message: 'Earning Capacity is required for Section 35 EC entries'
      });
    } else if (!isValidMoneyAmount(entry.ec_used) || entry.ec_used < 0) {
      errors.push({
        field: 'ec_used',
        message: 'Earning Capacity must be a valid non-negative number'
      });
    } else if (aww && entry.ec_used >= aww) {
      errors.push({
        field: 'ec_used',
        message: 'Warning: Earning Capacity equals or exceeds AWW, resulting in $0 benefit'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check for overlapping ledger entries
 * Returns entries that have overlapping date ranges
 */
export function findOverlappingEntries(entries: LedgerEntry[]): Array<{
  entry1: LedgerEntry;
  entry2: LedgerEntry;
  overlapDays: number;
}> {
  const overlaps: Array<{
    entry1: LedgerEntry;
    entry2: LedgerEntry;
    overlapDays: number;
  }> = [];
  
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const entry1 = entries[i];
      const entry2 = entries[j];
      
      const start1 = new Date(entry1.start);
      const end1 = entry1.end ? new Date(entry1.end) : new Date(); // Use today if no end date
      const start2 = new Date(entry2.start);
      const end2 = entry2.end ? new Date(entry2.end) : new Date();
      
      // Check for overlap
      const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
      const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));
      
      if (overlapStart <= overlapEnd) {
        const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
        overlaps.push({
          entry1,
          entry2,
          overlapDays
        });
      }
    }
  }
  
  return overlaps;
}