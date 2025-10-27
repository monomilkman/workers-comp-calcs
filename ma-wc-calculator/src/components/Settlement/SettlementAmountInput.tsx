import { Calculator } from 'lucide-react';
import { CurrencyInput } from '../UI/CurrencyInput';
import { formatCurrency } from '../../utils/money';

interface SettlementAmountInputProps {
  proposedInput: string;
  onAmountChange: (value: string) => void;
  totalRemainingDollars: number;
  showAttorneySection: boolean;
  onToggleAttorneySection: () => void;
}

/**
 * Settlement Amount Input Section
 * Includes quick-fill buttons for common settlement amounts
 */
export function SettlementAmountInput({
  proposedInput,
  onAmountChange,
  totalRemainingDollars,
  showAttorneySection,
  onToggleAttorneySection
}: SettlementAmountInputProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Settlement Calculator
        </h3>
        <div className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <button
            onClick={onToggleAttorneySection}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {showAttorneySection ? 'Hide' : 'Show'} Attorney Fees
          </button>
        </div>
      </div>

      {/* Settlement Amount Input */}
      <div className="mb-6">
        <CurrencyInput
          id="settlement-amount"
          label="Proposed Settlement Amount"
          value={proposedInput}
          onChange={onAmountChange}
          placeholder="50000.00"
        />

        {/* Quick fill buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAmountChange(totalRemainingDollars.toString())}
            className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={totalRemainingDollars === 0}
          >
            Full Remaining: {formatCurrency(totalRemainingDollars)}
          </button>
          <button
            type="button"
            onClick={() => onAmountChange((totalRemainingDollars * 0.75).toString())}
            className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={totalRemainingDollars === 0}
          >
            75%: {formatCurrency(totalRemainingDollars * 0.75)}
          </button>
          <button
            type="button"
            onClick={() => onAmountChange((totalRemainingDollars * 0.5).toString())}
            className="text-xs px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={totalRemainingDollars === 0}
          >
            50%: {formatCurrency(totalRemainingDollars * 0.5)}
          </button>
        </div>
      </div>
    </div>
  );
}
