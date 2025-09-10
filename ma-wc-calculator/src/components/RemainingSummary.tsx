import { formatCurrency } from '../utils/money';
import { TrendingDown, TrendingUp, Clock, Infinity, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import type { RemainingEntitlement } from '../types';

interface RemainingSummaryProps {
  remainingEntitlements: RemainingEntitlement[];
  combinedUsage: {
    weeksUsed: number;
    weeksRemaining: number;
    maxWeeks: number;
  };
  combined35Usage: {
    weeksUsed: number;
    weeksRemaining: number;
    maxWeeks: number;
  };
  totalDollarsPaid: number;
}

export function RemainingSummary({ 
  remainingEntitlements, 
  combinedUsage,
  combined35Usage,
  totalDollarsPaid 
}: RemainingSummaryProps) {
  const getBenefitIcon = (type: string) => {
    switch (type) {
      case '34':
        return <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case '35':
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case '35ec':
        return <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case '34A':
        return <Infinity className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case '31':
        return <Infinity className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getBenefitTitle = (type: string) => {
    switch (type) {
      case '34':
        return 'Section 34';
      case '35':
        return 'Section 35';
      case '35ec':
        return 'Section 35 EC';
      case '34A':
        return 'Section 34A';
      case '31':
        return 'Section 31';
      default:
        return type;
    }
  };

  const combinedProgress = (combinedUsage.weeksUsed / combinedUsage.maxWeeks) * 100;
  const isCombinedHighRisk = combinedProgress >= 90;
  const isCombinedMediumRisk = combinedProgress >= 70;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Entitlement Summary
          </h3>
        </div>

        {/* Individual benefit entitlements */}
        <div className="space-y-4">
          {remainingEntitlements.map((entitlement) => {
            const progressPercent = entitlement.statutoryMaxWeeks ? 
              (entitlement.weeksUsed / entitlement.statutoryMaxWeeks) * 100 : 0;
            const isNearLimit = progressPercent >= 90;
            const isMediumUsage = progressPercent >= 70;
            
            return (
              <div 
                key={entitlement.type} 
                className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getBenefitIcon(entitlement.type)}
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {getBenefitTitle(entitlement.type)}
                    </h4>
                  </div>
                  {entitlement.isLifeBenefit && (
                    <div className="inline-flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
                      <Infinity className="h-3 w-3" />
                      <span>Life Benefit</span>
                    </div>
                  )}
                </div>

                {entitlement.isLifeBenefit ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-900/50 rounded-md p-3">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Weeks Used
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {entitlement.weeksUsed.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        Status
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        No statutory limit
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Week stats in a cleaner layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 min-w-0">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Max Weeks
                        </div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {entitlement.statutoryMaxWeeks}
                        </div>
                      </div>
                      
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 min-w-0">
                        <div className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
                          Used
                        </div>
                        <div className="text-lg font-bold text-red-700 dark:text-red-300">
                          {entitlement.weeksUsed.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 min-w-0">
                        <div className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">
                          Remaining
                        </div>
                        <div className="text-lg font-bold text-green-700 dark:text-green-300">
                          {entitlement.weeksRemaining?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Dollar amount gets its own row for better visibility */}
                    {entitlement.dollarsRemaining !== null && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border-2 border-emerald-200 dark:border-emerald-800">
                        <div className="text-center">
                          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
                            Dollar Value Remaining
                          </div>
                          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(entitlement.dollarsRemaining)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Enhanced progress bar */}
                    {entitlement.statutoryMaxWeeks && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Usage Progress</span>
                          <span className={`font-medium ${
                            isNearLimit ? 'text-red-600 dark:text-red-400' :
                            isMediumUsage ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {progressPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="relative w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isNearLimit ? 'bg-gradient-to-r from-red-400 to-red-600' :
                              isMediumUsage ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                              'bg-gradient-to-r from-green-400 to-green-500'
                            }`}
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                          />
                          {isNearLimit && (
                            <div className="absolute inset-0 bg-red-500 opacity-20 animate-pulse rounded-full" />
                          )}
                        </div>
                        
                        {isNearLimit && (
                          <div className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                            <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                            <span className="text-xs text-red-700 dark:text-red-300 font-medium">
                              Near statutory limit ({progressPercent.toFixed(1)}% used)
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Combined Section 35 + 35EC Summary */}
      {combined35Usage.weeksUsed > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-purple-200 dark:border-purple-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                Combined Section 35 + 35EC (4-year shared cap)
              </h4>
              {(combined35Usage.weeksUsed / combined35Usage.maxWeeks) * 100 >= 90 && (
                <div className="flex items-center space-x-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-xs font-medium">Critical</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Maximum Combined
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {combined35Usage.maxWeeks} weeks
                </div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                <div className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                  Combined Used
                </div>
                <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                  {combined35Usage.weeksUsed.toFixed(2)} weeks
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <div className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                  Combined Remaining
                </div>
                <div className="text-lg font-bold text-green-700 dark:text-green-300">
                  {combined35Usage.weeksRemaining.toFixed(2)} weeks
                </div>
              </div>
            </div>

            {/* Enhanced combined progress bar */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">4-Year Progress</span>
                <span className={`font-bold ${
                  (combined35Usage.weeksUsed / combined35Usage.maxWeeks) * 100 >= 90 ? 'text-red-600 dark:text-red-400' :
                  (combined35Usage.weeksUsed / combined35Usage.maxWeeks) * 100 >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-purple-600 dark:text-purple-400'
                }`}>
                  {((combined35Usage.weeksUsed / combined35Usage.maxWeeks) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="relative w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    (combined35Usage.weeksUsed / combined35Usage.maxWeeks) * 100 >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    (combined35Usage.weeksUsed / combined35Usage.maxWeeks) * 100 >= 70 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                    'bg-gradient-to-r from-purple-400 to-purple-600'
                  }`}
                  style={{ width: `${Math.min((combined35Usage.weeksUsed / combined35Usage.maxWeeks) * 100, 100)}%` }}
                />
                {(combined35Usage.weeksUsed / combined35Usage.maxWeeks) * 100 >= 90 && (
                  <div className="absolute inset-0 bg-red-500 opacity-20 animate-pulse rounded-full" />
                )}
              </div>

              {(combined35Usage.weeksUsed / combined35Usage.maxWeeks) * 100 >= 90 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                      Critical: Approaching combined 4-year limit for Sections 35 and 35EC
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Combined 34 + 35 Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
              Combined 34 + 35 Entitlement (7-year cap)
            </h4>
            {isCombinedHighRisk && (
              <div className="flex items-center space-x-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs font-medium">Critical</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Maximum Combined
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {combinedUsage.maxWeeks} weeks
              </div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
              <div className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                Combined Used
              </div>
              <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                {combinedUsage.weeksUsed.toFixed(2)} weeks
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                Combined Remaining
              </div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                {combinedUsage.weeksRemaining.toFixed(2)} weeks
              </div>
            </div>
          </div>

          {/* Enhanced combined progress bar */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">7-Year Progress</span>
              <span className={`font-bold ${
                isCombinedHighRisk ? 'text-red-600 dark:text-red-400' :
                isCombinedMediumRisk ? 'text-yellow-600 dark:text-yellow-400' :
                'text-blue-600 dark:text-blue-400'
              }`}>
                {combinedProgress.toFixed(1)}%
              </span>
            </div>
            <div className="relative w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${
                  isCombinedHighRisk ? 'bg-gradient-to-r from-red-500 to-red-600' :
                  isCombinedMediumRisk ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                  'bg-gradient-to-r from-blue-400 to-blue-600'
                }`}
                style={{ width: `${Math.min(combinedProgress, 100)}%` }}
              />
              {isCombinedHighRisk && (
                <div className="absolute inset-0 bg-red-500 opacity-20 animate-pulse rounded-full" />
              )}
            </div>

            {isCombinedHighRisk && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                    Critical: Approaching combined 7-year limit for Sections 34 and 35
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Total Dollars Paid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="font-semibold text-green-900 dark:text-green-100">
                Total Dollars Paid to Date
              </span>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(totalDollarsPaid)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}