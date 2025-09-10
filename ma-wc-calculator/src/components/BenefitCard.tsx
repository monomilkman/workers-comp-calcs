import { formatCurrency } from '../utils/money';
import { Info, TrendingUp, TrendingDown, AlertTriangle, Clock, Infinity } from 'lucide-react';
import { Tooltip } from './UI/Tooltip';
import type { BenefitCalculation } from '../types';

interface BenefitCardProps {
  benefit: BenefitCalculation;
  weeksUsed?: number;
  dollarsRemaining?: number | null;
  isLifeBenefit?: boolean;
}

export function BenefitCard({ 
  benefit, 
  weeksUsed = 0, 
  dollarsRemaining,
  isLifeBenefit = false 
}: BenefitCardProps) {
  const getBenefitIcon = (type: string) => {
    switch (type) {
      case '34':
        return <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case '35':
        return <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case '35ec':
        return <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case '34A':
        return <Infinity className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case '31':
        return <Infinity className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
      default:
        return <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getBenefitTitle = (type: string) => {
    switch (type) {
      case '34':
        return 'Section 34 (TTD)';
      case '35':
        return 'Section 35 (TPD)';
      case '35ec':
        return 'Section 35 EC';
      case '34A':
        return 'Section 34A (P&T)';
      case '31':
        return 'Section 31 (Dependent)';
      default:
        return type;
    }
  };

  const getBenefitDescription = (type: string) => {
    switch (type) {
      case '34':
        return 'Temporary Total Disability - 60% of AWW, max 3 years (156 weeks)';
      case '35':
        return 'Temporary Partial Disability - 75% of Section 34 rate, max 4 years (208 weeks)';
      case '35ec':
        return 'Section 35 with Earning Capacity - (AWW - EC) × 60%, max 4 years (208 weeks)';
      case '34A':
        return 'Permanent & Total Disability - 66.67% of AWW, life benefit';
      case '31':
        return 'Widow/Dependent Benefits - 66.67% of AWW, life benefit (children until age 18)';
      default:
        return '';
    }
  };

  const getAppliedRuleBadge = (rule: string) => {
    switch (rule) {
      case 'capped_to_max':
        return <span className="badge badge-red">Capped to Max</span>;
      case 'raised_to_min':
        return <span className="badge badge-yellow">Raised to Min</span>;
      case 'aww_below_min_keep_aww':
        return <span className="badge badge-primary">AWW Below Min</span>;
      case 'unchanged':
        return <span className="badge badge-accent">No Adjustment</span>;
      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    if (isLifeBenefit || !benefit.statutoryMaxWeeks) {
      return 0;
    }
    return Math.min((weeksUsed / benefit.statutoryMaxWeeks) * 100, 100);
  };

  const progressPercentage = getProgressPercentage();
  const isNearlyExhausted = progressPercentage >= 90;
  const isHighUsage = progressPercentage >= 70;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white dark:bg-gray-900 shadow-sm">
              {getBenefitIcon(benefit.type)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {getBenefitTitle(benefit.type)}
              </h3>
              <Tooltip content={getBenefitDescription(benefit.type)} placement="bottom">
                <p className="text-sm text-gray-600 dark:text-gray-400 cursor-help flex items-center">
                  {getBenefitDescription(benefit.type)}
                  <Info className="ml-1 h-3 w-3 opacity-60" />
                </p>
              </Tooltip>
            </div>
          </div>
          {getAppliedRuleBadge(benefit.appliedRule)}
        </div>
      </div>

      {/* Main content */}
      <div className="p-6 space-y-4">
        {/* Key amounts section */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Raw Weekly
              </div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                {formatCurrency(benefit.rawWeekly)}
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                Final Weekly
              </div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
                {formatCurrency(benefit.finalWeekly)}
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
              Yearly Amount
            </div>
            <div className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">
              {formatCurrency(benefit.yearlyAmount)}
            </div>
          </div>
        </div>

        {/* Statutory limits and progress */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          {isLifeBenefit ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full">
                <Infinity className="h-4 w-4" />
                <span className="font-medium">Life Benefit</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Statutory Maximum
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {benefit.statutoryMaxWeeks} weeks
                </span>
              </div>
              
              {weeksUsed > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Weeks Used
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {weeksUsed.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Enhanced progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Progress</span>
                      <span className={`font-medium ${
                        isNearlyExhausted ? 'text-red-600 dark:text-red-400' :
                        isHighUsage ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isNearlyExhausted ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          isHighUsage ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                          'bg-gradient-to-r from-green-400 to-green-500'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                      {isNearlyExhausted && (
                        <div className="absolute inset-0 bg-red-500 opacity-20 animate-pulse rounded-full" />
                      )}
                    </div>
                  </div>
                  
                  {dollarsRemaining !== null && dollarsRemaining !== undefined && (
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Remaining Value
                      </span>
                      <span className={`text-sm font-bold ${
                        dollarsRemaining < 10000 ? 'text-red-600 dark:text-red-400' :
                        dollarsRemaining < 50000 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {formatCurrency(dollarsRemaining)}
                      </span>
                    </div>
                  )}

                  {/* Low remaining benefits alert */}
                  {isNearlyExhausted && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                          Warning: Benefits nearly exhausted ({progressPercentage.toFixed(1)}% used)
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Special warning for Section 35 EC */}
        {benefit.type === '35ec' && benefit.finalWeekly === 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                No benefit due: Earning Capacity equals or exceeds AWW
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}