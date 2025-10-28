import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { LedgerEntry, StateRateRow, ProrationMode } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface CalculatorState {
  aww: number;
  dateOfInjury: string;
  earningCapacity: number;
  prorationMode: ProrationMode;
  stateRateTable: StateRateRow[];
}

type CalculatorAction =
  | { type: 'SET_AWW'; payload: number }
  | { type: 'SET_DATE_OF_INJURY'; payload: string }
  | { type: 'SET_EARNING_CAPACITY'; payload: number }
  | { type: 'SET_PRORATION_MODE'; payload: ProrationMode }
  | { type: 'SET_STATE_RATE_TABLE'; payload: StateRateRow[] }
  | { type: 'RESET_CALCULATOR' };

type LedgerAction =
  | { type: 'ADD_ENTRY'; payload: LedgerEntry }
  | { type: 'UPDATE_ENTRY'; payload: LedgerEntry }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'SET_LEDGER'; payload: LedgerEntry[] }
  | { type: 'CLEAR_LEDGER' };

interface CalculatorContextType {
  // Calculator state
  aww: number;
  dateOfInjury: string;
  earningCapacity: number;
  prorationMode: ProrationMode;
  stateRateTable: StateRateRow[];

  // Calculator actions
  setAww: (aww: number) => void;
  setDateOfInjury: (date: string) => void;
  setEarningCapacity: (capacity: number) => void;
  setProrationMode: (mode: ProrationMode) => void;
  setStateRateTable: (rates: StateRateRow[]) => void;
  resetCalculator: () => void;

  // Ledger state
  ledger: LedgerEntry[];

  // Ledger actions
  addEntry: (entry: LedgerEntry) => void;
  updateEntry: (entry: LedgerEntry) => void;
  deleteEntry: (id: string) => void;
  clearLedger: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

// ============================================================================
// REDUCERS
// ============================================================================

function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'SET_AWW':
      return { ...state, aww: action.payload };

    case 'SET_DATE_OF_INJURY':
      return { ...state, dateOfInjury: action.payload };

    case 'SET_EARNING_CAPACITY':
      return { ...state, earningCapacity: action.payload };

    case 'SET_PRORATION_MODE':
      return { ...state, prorationMode: action.payload };

    case 'SET_STATE_RATE_TABLE':
      return { ...state, stateRateTable: action.payload };

    case 'RESET_CALCULATOR':
      return {
        aww: 1000,
        dateOfInjury: new Date().toISOString().split('T')[0],
        earningCapacity: 600,
        prorationMode: 'days',
        stateRateTable: state.stateRateTable, // Keep rates
      };

    default:
      return state;
  }
}

function ledgerReducer(state: LedgerEntry[], action: LedgerAction): LedgerEntry[] {
  switch (action.type) {
    case 'ADD_ENTRY':
      return [...state, action.payload];

    case 'UPDATE_ENTRY':
      return state.map(entry =>
        entry.id === action.payload.id ? action.payload : entry
      );

    case 'DELETE_ENTRY':
      return state.filter(entry => entry.id !== action.payload);

    case 'SET_LEDGER':
      return action.payload;

    case 'CLEAR_LEDGER':
      return [];

    default:
      return state;
  }
}

// ============================================================================
// PROVIDER
// ============================================================================

interface CalculatorProviderProps {
  children: ReactNode;
}

export function CalculatorProvider({ children }: CalculatorProviderProps) {
  // Load persisted calculator state from localStorage
  const [aww, setAwwStorage] = useLocalStorage('ma_wc_aww', 1000);
  const [dateOfInjury, setDateOfInjuryStorage] = useLocalStorage('ma_wc_doi', new Date().toISOString().split('T')[0]);
  const [earningCapacity, setEarningCapacityStorage] = useLocalStorage('ma_wc_ec', 600);
  const [prorationMode, setProrationModeStorage] = useLocalStorage<ProrationMode>('ma_wc_proration', 'days');
  const [ledgerStorage, setLedgerStorage] = useLocalStorage<LedgerEntry[]>('ma_wc_ledger', []);

  // Initialize calculator state with localStorage values
  const [calculatorState, dispatchCalculator] = useReducer(calculatorReducer, {
    aww,
    dateOfInjury,
    earningCapacity,
    prorationMode,
    stateRateTable: [],
  });

  // Initialize ledger state with localStorage values
  const [ledger, dispatchLedger] = useReducer(ledgerReducer, ledgerStorage);

  // Load state rates on mount
  useEffect(() => {
    const loadStateRates = async () => {
      try {
        const response = await fetch('/state_rates.json');
        const ratesData = await response.json();
        const rates = ratesData.rates || ratesData;
        dispatchCalculator({ type: 'SET_STATE_RATE_TABLE', payload: rates });
      } catch (error) {
        console.error('Error loading state rates:', error);
        // Fallback to hardcoded rates
        dispatchCalculator({
          type: 'SET_STATE_RATE_TABLE',
          payload: [{
            effective_from: '2024-10-01',
            effective_to: '2025-09-30',
            state_min: 365.83,
            state_max: 1500.00,
            source_url: 'https://www.mass.gov/info-details/minimum-and-maximum-compensation-rates'
          }]
        });
      }
    };

    loadStateRates();
  }, []);

  // Sync calculator state with localStorage
  useEffect(() => {
    setAwwStorage(calculatorState.aww);
  }, [calculatorState.aww, setAwwStorage]);

  useEffect(() => {
    setDateOfInjuryStorage(calculatorState.dateOfInjury);
  }, [calculatorState.dateOfInjury, setDateOfInjuryStorage]);

  useEffect(() => {
    setEarningCapacityStorage(calculatorState.earningCapacity);
  }, [calculatorState.earningCapacity, setEarningCapacityStorage]);

  useEffect(() => {
    setProrationModeStorage(calculatorState.prorationMode);
  }, [calculatorState.prorationMode, setProrationModeStorage]);

  // Sync ledger with localStorage
  useEffect(() => {
    setLedgerStorage(ledger);
  }, [ledger, setLedgerStorage]);

  // Calculator actions
  const setAww = (value: number) => {
    dispatchCalculator({ type: 'SET_AWW', payload: value });
  };

  const setDateOfInjury = (date: string) => {
    dispatchCalculator({ type: 'SET_DATE_OF_INJURY', payload: date });
  };

  const setEarningCapacity = (capacity: number) => {
    dispatchCalculator({ type: 'SET_EARNING_CAPACITY', payload: capacity });
  };

  const setProrationMode = (mode: ProrationMode) => {
    dispatchCalculator({ type: 'SET_PRORATION_MODE', payload: mode });
  };

  const setStateRateTable = (rates: StateRateRow[]) => {
    dispatchCalculator({ type: 'SET_STATE_RATE_TABLE', payload: rates });
  };

  const resetCalculator = () => {
    dispatchCalculator({ type: 'RESET_CALCULATOR' });
  };

  // Ledger actions
  const addEntry = (entry: LedgerEntry) => {
    dispatchLedger({ type: 'ADD_ENTRY', payload: entry });
  };

  const updateEntry = (entry: LedgerEntry) => {
    dispatchLedger({ type: 'UPDATE_ENTRY', payload: entry });
  };

  const deleteEntry = (id: string) => {
    dispatchLedger({ type: 'DELETE_ENTRY', payload: id });
  };

  const clearLedger = () => {
    dispatchLedger({ type: 'CLEAR_LEDGER' });
  };

  const value: CalculatorContextType = {
    // Calculator state
    aww: calculatorState.aww,
    dateOfInjury: calculatorState.dateOfInjury,
    earningCapacity: calculatorState.earningCapacity,
    prorationMode: calculatorState.prorationMode,
    stateRateTable: calculatorState.stateRateTable,

    // Calculator actions
    setAww,
    setDateOfInjury,
    setEarningCapacity,
    setProrationMode,
    setStateRateTable,
    resetCalculator,

    // Ledger state
    ledger,

    // Ledger actions
    addEntry,
    updateEntry,
    deleteEntry,
    clearLedger,
  };

  return (
    <CalculatorContext.Provider value={value}>
      {children}
    </CalculatorContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useCalculatorContext() {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error('useCalculatorContext must be used within a CalculatorProvider');
  }
  return context;
}
