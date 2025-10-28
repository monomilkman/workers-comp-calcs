import { useState, useMemo } from 'react';
import { formatCurrency, parseCurrency } from '../utils/money';
import type { BenefitCalculation, RemainingEntitlement, DemandCalculation, DemandBreakdown } from '../types';

interface DemandBuilderProps {
  benefitCalculations: BenefitCalculation[];
  remainingEntitlements: RemainingEntitlement[];
}

interface DemandInputs {
  [key: string]: {
    years: number;
    yearInput: string;
  };
}

export function DemandBuilder({ 
  benefitCalculations, 
  remainingEntitlements 
}: DemandBuilderProps) {
  const [demandInputs, setDemandInputs] = useState<DemandInputs>({});
  const [section36Amount, setSection36Amount] = useState<number>(0);
  const [section36Input, setSection36Input] = useState<string>('');
  const [section28Applied, setSection28Applied] = useState<boolean>(false);
  const [forceExceedConfirmed, setForceExceedConfirmed] = useState<boolean>(false);
  const [showExceedWarning, setShowExceedWarning] = useState<boolean>(false);

  const getBenefitTitle = (type: string) => {
    switch (type) {
      case '34': return 'Section 34 (TTD)';
      case '35': return 'Section 35 (TPD)';
      case '35ec': return 'Section 35 EC';
      case '34A': return 'Section 34A (P&T)';
      case '31': return 'Section 31 (Dependent)';
      default: return type;
    }
  };

  // Calculate demand breakdown
  const demandCalculation = useMemo((): DemandCalculation => {
    const breakdowns: DemandBreakdown[] = [];
    let subtotal = 0;
    let hasExceededLimits = false;

    benefitCalculations.forEach((benefit) => {
      const input = demandInputs[benefit.type];
      if (!input || input.years <= 0) return;

      const entitlement = remainingEntitlements.find(e => e.type === benefit.type);
      const requestedWeeks = input.years * 52;
      const totalAmount = benefit.finalWeekly * requestedWeeks;

      let exceedsStatutory = false;
      let exceedsRemaining = false;

      // Check statutory limits
      if (benefit.statutoryMaxWeeks && requestedWeeks > benefit.statutoryMaxWeeks) {
        exceedsStatutory = true;
        hasExceededLimits = true;
      }

      // Check remaining entitlement limits
      if (entitlement && !entitlement.isLifeBenefit) {
        if (entitlement.weeksRemaining && requestedWeeks > entitlement.weeksRemaining) {
          exceedsRemaining = true;
          hasExceededLimits = true;
        }
      }

      breakdowns.push({
        type: benefit.type,
        requestedYears: input.years,
        requestedWeeks,
        weeklyRate: benefit.finalWeekly,
        totalAmount,
        exceedsStatutory,
        exceedsRemaining
      });

      subtotal += totalAmount;
    });

    setShowExceedWarning(hasExceededLimits && !forceExceedConfirmed);

    const section28Multiplier = section28Applied ? 2 : 1;
    const preSection28Total = subtotal + section36Amount;
    const grandTotal = preSection28Total * section28Multiplier;

    return {
      breakdowns,
      subtotal,
      section36Amount,
      section28Applied,
      section28Multiplier,
      grandTotal
    };
  }, [demandInputs, benefitCalculations, remainingEntitlements, section36Amount, section28Applied, forceExceedConfirmed]);

  const handleYearChange = (benefitType: string, value: string) => {
    const numericValue = value === '' ? 0 : Math.max(0, parseFloat(value) || 0);
    setDemandInputs(prev => ({
      ...prev,
      [benefitType]: {
        years: numericValue,
        yearInput: value
      }
    }));
  };

  const handleSection36Change = (value: string) => {
    setSection36Input(value);
    const numericValue = parseCurrency(value);
    setSection36Amount(numericValue);
  };

  const handleQuickFill = (benefitType: string, mode: 'remaining' | 'statutory') => {
    const entitlement = remainingEntitlements.find(e => e.type === benefitType);
    const benefit = benefitCalculations.find(b => b.type === benefitType);
    
    if (!entitlement || !benefit) return;

    let weeks = 0;
    
    if (mode === 'remaining' && entitlement.weeksRemaining) {
      weeks = entitlement.weeksRemaining;
    } else if (mode === 'statutory' && benefit.statutoryMaxWeeks) {
      weeks = benefit.statutoryMaxWeeks;
    }
    
    const years = weeks / 52;
    setDemandInputs(prev => ({
      ...prev,
      [benefitType]: {
        years,
        yearInput: years.toFixed(2)
      }
    }));
  };

  const getTotalCombined34And35Years = () => {
    const type34Years = demandInputs['34']?.years || 0;
    const type35Years = demandInputs['35']?.years || 0;
    const type35ecYears = demandInputs['35ec']?.years || 0;
    return type34Years + type35Years + type35ecYears;
  };

  const exceedsCombinedLimit = getTotalCombined34And35Years() > 7;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Demand Builder
      </h3>

      {/* Benefit Type Inputs */}
      <div className="space-y-4 mb-6">
        {benefitCalculations.map((benefit) => {
          const entitlement = remainingEntitlements.find(e => e.type === benefit.type);
          const input = demandInputs[benefit.type];
          const exceedsStatutory = benefit.statutoryMaxWeeks && input && (input.years * 52) > benefit.statutoryMaxWeeks;
          const exceedsRemaining = entitlement && !entitlement.isLifeBenefit && entitlement.weeksRemaining && 
                                   input && (input.years * 52) > entitlement.weeksRemaining;

          return (
            <div key={benefit.type} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  {getBenefitTitle(benefit.type)}
                </h4>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatCurrency(benefit.finalWeekly)}/week
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {/* Years Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Desired Years
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={input?.yearInput || ''}
                    onChange={(e) => handleYearChange(benefit.type, e.target.value)}
                    className={`w-full ${(exceedsStatutory || exceedsRemaining) ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                </div>

                {/* Quick Fill Buttons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quick Fill
                  </label>
                  <div className="flex space-x-2">
                    {entitlement && !entitlement.isLifeBenefit && entitlement.weeksRemaining && entitlement.weeksRemaining > 0 && (
                      <button
                        type="button"
                        onClick={() => handleQuickFill(benefit.type, 'remaining')}
                        className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                      >
                        Remaining: {(entitlement.weeksRemaining / 52).toFixed(1)}y
                      </button>
                    )}
                    {benefit.statutoryMaxWeeks && (
                      <button
                        type="button"
                        onClick={() => handleQuickFill(benefit.type, 'statutory')}
                        className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                        Max: {(benefit.statutoryMaxWeeks / 52).toFixed(1)}y
                      </button>
                    )}
                  </div>
                </div>

                {/* Calculated Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount
                  </label>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {input && input.years > 0
                      ? formatCurrency(benefit.finalWeekly * input.years * 52)
                      : formatCurrency(0)
                    }
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {(exceedsStatutory || exceedsRemaining) && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="text-sm text-red-700 dark:text-red-400">
                    {exceedsStatutory && (
                      <div>⚠️ Exceeds statutory maximum of {benefit.statutoryMaxWeeks} weeks ({(benefit.statutoryMaxWeeks! / 52).toFixed(1)} years)</div>
                    )}
                    {exceedsRemaining && (
                      <div>⚠️ Exceeds remaining entitlement of {entitlement!.weeksRemaining!.toFixed(1)} weeks ({(entitlement!.weeksRemaining! / 52).toFixed(1)} years)</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Combined 34 + 35 Warning */}
      {exceedsCombinedLimit && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>⚠️ Combined 34 + 35 Limit Exceeded</strong>
            <p className="mt-1">
              Total requested years for Sections 34, 35, and 35 EC: <strong>{getTotalCombined34And35Years().toFixed(2)} years</strong>
            </p>
            <p>Massachusetts statutory limit for combined 34 + 35 benefits: <strong>7 years (364 weeks)</strong></p>
          </div>
        </div>
      )}

      {/* Section 36 Scarring/Disfigurement */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Section 36 (Scarring/Disfigurement)
        </h4>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
          <input
            type="text"
            value={section36Input}
            onChange={(e) => handleSection36Change(e.target.value)}
            className="pl-8 w-full md:w-64"
            placeholder="5000.00"
          />
        </div>
      </div>

      {/* Section 28 Penalty */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="section28"
            checked={section28Applied}
            onChange={(e) => setSection28Applied(e.target.checked)}
            className="mr-3"
          />
          <label htmlFor="section28" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Apply Section 28 Penalty (2x multiplier)
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Section 28 penalty doubles the total demand amount for violations of compensation payment requirements.
        </p>
      </div>

      {/* Force Exceed Confirmation */}
      {showExceedWarning && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="force-exceed"
              checked={forceExceedConfirmed}
              onChange={(e) => setForceExceedConfirmed(e.target.checked)}
              className="mr-3 mt-1"
            />
            <div>
              <label htmlFor="force-exceed" className="text-sm font-medium text-red-800 dark:text-red-300">
                I understand that some requested amounts exceed statutory or remaining limits
              </label>
              <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                Check this box to proceed with the demand calculation despite exceeding limits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Demand Calculation Results */}
      {(demandCalculation.breakdowns.length > 0 || section36Amount > 0) &&
       (!showExceedWarning || forceExceedConfirmed) && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Demand Calculation</h4>

          {/* Breakdown Table */}
          {demandCalculation.breakdowns.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Benefit Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Years/Weeks
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Weekly Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {demandCalculation.breakdowns.map((breakdown, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getBenefitTitle(breakdown.type)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div>
                          {breakdown.requestedYears.toFixed(2)} years
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ({breakdown.requestedWeeks.toFixed(1)} weeks)
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(breakdown.weeklyRate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(breakdown.totalAmount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {breakdown.exceedsStatutory && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                              Exceeds Statutory
                            </span>
                          )}
                          {breakdown.exceedsRemaining && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                              Exceeds Remaining
                            </span>
                          )}
                          {!breakdown.exceedsStatutory && !breakdown.exceedsRemaining && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                              Within Limits
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-900 dark:text-blue-300">Subtotal (Benefits):</span>
                <span className="text-lg font-semibold text-blue-900 dark:text-blue-300">
                  {formatCurrency(demandCalculation.subtotal)}
                </span>
              </div>

              {section36Amount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-900 dark:text-blue-300">Section 36 (Scarring):</span>
                  <span className="text-lg font-semibold text-blue-900 dark:text-blue-300">
                    {formatCurrency(section36Amount)}
                  </span>
                </div>
              )}

              {section28Applied && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-900 dark:text-blue-300">Section 28 Penalty (2x):</span>
                  <span className="text-sm text-blue-700 dark:text-blue-400">Applied to total</span>
                </div>
              )}

              <div className="pt-2 border-t border-blue-300 dark:border-blue-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    TOTAL DEMAND:
                  </span>
                  <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {formatCurrency(demandCalculation.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}