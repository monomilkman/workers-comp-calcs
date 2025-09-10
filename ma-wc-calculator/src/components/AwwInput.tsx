import React, { useState, useEffect } from 'react';
import { formatCurrency, parseCurrency } from '../utils/money';
import { validateAWW, validateDateOfInjury, validateEarningCapacity } from '../utils/validation';
import { getStateMinMax } from '../utils/rates';
import { DollarSign, Calendar, TrendingUp, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Tooltip } from './UI/Tooltip';
import type { StateRateRow } from '../types';

interface AwwInputProps {
  aww: number;
  dateOfInjury: string;
  earningCapacity: number;
  stateRateTable: StateRateRow[];
  onAwwChange: (aww: number) => void;
  onDateOfInjuryChange: (date: string) => void;
  onEarningCapacityChange: (ec: number) => void;
}

export function AwwInput({
  aww,
  dateOfInjury,
  earningCapacity,
  stateRateTable,
  onAwwChange,
  onDateOfInjuryChange,
  onEarningCapacityChange
}: AwwInputProps) {
  const [awwInput, setAwwInput] = useState(aww.toString());
  const [ecInput, setEcInput] = useState(earningCapacity.toString());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update input fields when props change
  useEffect(() => {
    setAwwInput(aww.toString());
  }, [aww]);

  useEffect(() => {
    setEcInput(earningCapacity.toString());
  }, [earningCapacity]);

  // Get current state min/max rates
  const currentRates = React.useMemo(() => {
    if (!dateOfInjury || stateRateTable.length === 0) {
      return null;
    }
    try {
      return getStateMinMax(dateOfInjury, stateRateTable);
    } catch (error) {
      return null;
    }
  }, [dateOfInjury, stateRateTable]);

  const handleAwwChange = (value: string) => {
    setAwwInput(value);
    const numericValue = parseCurrency(value);
    const validation = validateAWW(numericValue);
    
    if (validation.isValid) {
      onAwwChange(numericValue);
      setErrors(prev => ({ ...prev, aww: '' }));
    } else {
      setErrors(prev => ({ 
        ...prev, 
        aww: validation.errors[0]?.message || 'Invalid AWW' 
      }));
    }
  };

  const handleDateChange = (value: string) => {
    onDateOfInjuryChange(value);
    const validation = validateDateOfInjury(value);
    
    if (validation.isValid) {
      setErrors(prev => ({ ...prev, dateOfInjury: '' }));
    } else {
      setErrors(prev => ({ 
        ...prev, 
        dateOfInjury: validation.errors[0]?.message || 'Invalid date' 
      }));
    }
  };

  const handleEcChange = (value: string) => {
    setEcInput(value);
    const numericValue = parseCurrency(value);
    const validation = validateEarningCapacity(numericValue);
    
    if (validation.isValid) {
      onEarningCapacityChange(numericValue);
      setErrors(prev => ({ ...prev, earningCapacity: '' }));
    } else {
      setErrors(prev => ({ 
        ...prev, 
        earningCapacity: validation.errors[0]?.message || 'Invalid EC' 
      }));
    }
  };

  const isValidInput = (fieldName: string) => !errors[fieldName];
  const hasValue = (value: string | number) => value !== '' && value !== 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
              MA WC Benefits Calculator
            </h2>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Enter case details to calculate worker compensation benefits
            </p>
          </div>
        </div>
      </div>
      
      {/* Input Fields */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Average Weekly Wage */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label htmlFor="aww" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Average Weekly Wage
              </label>
              <Tooltip 
                content="The worker's average weekly wage before injury. Used as the base for all benefit calculations."
                placement="top"
              >
                <Info className="h-4 w-4 text-gray-400 dark:text-gray-500 cursor-help" />
              </Tooltip>
            </div>
            
            <div className="relative group">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center">
                <DollarSign className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                id="aww"
                value={awwInput}
                onChange={(e) => handleAwwChange(e.target.value)}
                className={`
                  pl-10 pr-10 w-full h-12 rounded-lg border-2 
                  bg-white dark:bg-gray-900 
                  text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  transition-all duration-200
                  ${errors.aww 
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                    : isValidInput('aww') && hasValue(awwInput)
                    ? 'border-green-300 dark:border-green-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800'
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800'
                  }
                `}
                placeholder="1000.00"
                aria-describedby={errors.aww ? 'aww-error' : undefined}
              />
              
              {/* Status indicator */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {errors.aww ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : isValidInput('aww') && hasValue(awwInput) ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : null}
              </div>
            </div>
            
            {errors.aww && (
              <div className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                  {errors.aww}
                </p>
              </div>
            )}
          </div>

          {/* Date of Injury */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label htmlFor="doi" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Date of Injury
              </label>
              <Tooltip 
                content="The date when the workplace injury occurred. Determines which state compensation rates apply."
                placement="top"
              >
                <Info className="h-4 w-4 text-gray-400 dark:text-gray-500 cursor-help" />
              </Tooltip>
            </div>
            
            <div className="relative group">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="date"
                id="doi"
                value={dateOfInjury}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`
                  pl-10 pr-10 w-full h-12 rounded-lg border-2 
                  bg-white dark:bg-gray-900 
                  text-gray-900 dark:text-gray-100
                  transition-all duration-200
                  ${errors.dateOfInjury 
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                    : isValidInput('dateOfInjury') && hasValue(dateOfInjury)
                    ? 'border-green-300 dark:border-green-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800'
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800'
                  }
                `}
                aria-describedby={errors.dateOfInjury ? 'doi-error' : undefined}
              />
              
              {/* Status indicator */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {errors.dateOfInjury ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : isValidInput('dateOfInjury') && hasValue(dateOfInjury) ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : null}
              </div>
            </div>
            
            {errors.dateOfInjury && (
              <div className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                  {errors.dateOfInjury}
                </p>
              </div>
            )}
          </div>

          {/* Earning Capacity */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label htmlFor="ec" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Earning Capacity
              </label>
              <Tooltip 
                content="Current earning capacity for Section 35 EC calculations. Amount the worker can earn in suitable employment."
                placement="top"
              >
                <Info className="h-4 w-4 text-gray-400 dark:text-gray-500 cursor-help" />
              </Tooltip>
            </div>
            
            <div className="relative group">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center">
                <TrendingUp className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                id="ec"
                value={ecInput}
                onChange={(e) => handleEcChange(e.target.value)}
                className={`
                  pl-10 pr-10 w-full h-12 rounded-lg border-2 
                  bg-white dark:bg-gray-900 
                  text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  transition-all duration-200
                  ${errors.earningCapacity 
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800' 
                    : isValidInput('earningCapacity') && hasValue(ecInput)
                    ? 'border-green-300 dark:border-green-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800'
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800'
                  }
                `}
                placeholder="600.00"
                aria-describedby={errors.earningCapacity ? 'ec-error' : undefined}
              />
              
              {/* Status indicator */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {errors.earningCapacity ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : isValidInput('earningCapacity') && hasValue(ecInput) ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : null}
              </div>
            </div>
            
            {errors.earningCapacity && (
              <div className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                  {errors.earningCapacity}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* State Min/Max Display */}
        {currentRates && (
          <div className="mt-6 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                    Active Rate Period: {currentRates.effective_from} to {currentRates.effective_to}
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300">
                    State compensation rates governing this injury date
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">
                    State Minimum
                  </div>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(currentRates.state_min)}/week
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">
                    State Maximum
                  </div>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(currentRates.state_max)}/week
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}