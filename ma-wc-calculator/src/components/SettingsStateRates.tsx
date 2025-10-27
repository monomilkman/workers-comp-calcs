import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { StateRateRow } from '../types';

interface SettingsStateRatesProps {
  stateRateTable: StateRateRow[];
  onRatesUpdated: (newRates: StateRateRow[]) => void;
}

export default function SettingsStateRates({ stateRateTable, onRatesUpdated }: SettingsStateRatesProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Get the last update time from the rates file
  useEffect(() => {
    const loadLastUpdateTime = async () => {
      try {
        const response = await fetch('/state_rates.json');
        if (response.ok) {
          const data = await response.json();
          if (data.last_updated) {
            setLastUpdateTime(data.last_updated);
          }
        }
      } catch (err) {
        // Ignore errors when loading update time
        console.debug('Could not load last update time:', err);
      }
    };
    
    loadLastUpdateTime();
  }, []);

  const handleUpdateRates = async () => {
    setIsUpdating(true);
    setError(null);

    try {
      // For development mode, show instructions to run the script manually
      if (import.meta.env.DEV) {
        const shouldProceed = window.confirm(
          'Development Mode: To fetch new rates from Mass.gov, run:\n\n' +
          'npm run update:rates\n\n' +
          'Then click "OK" to reload the rates file, or "Cancel" to abort.\n\n' +
          'Note: In production, rates update automatically via GitHub Actions on the 2nd of each month.'
        );

        if (!shouldProceed) {
          setIsUpdating(false);
          return;
        }
      } else {
        // In production, explain that this only reloads the file
        const shouldProceed = window.confirm(
          'This will reload the state rates file from the server.\n\n' +
          'Note: New rates are automatically fetched from Mass.gov monthly via GitHub Actions.\n\n' +
          'Click OK to reload the current rates file.'
        );

        if (!shouldProceed) {
          setIsUpdating(false);
          return;
        }
      }

      // Reload the rates from the updated file
      const ratesResponse = await fetch('/state_rates.json?' + new Date().getTime());
      if (!ratesResponse.ok) {
        throw new Error('Failed to reload state rates');
      }

      const ratesData = await ratesResponse.json();
      const newRates = ratesData.rates || ratesData;

      onRatesUpdated(newRates);
      setLastUpdateTime(ratesData.last_updated || new Date().toISOString());

      // Show success notification
      toast.success(`Successfully reloaded state rates! Found ${newRates.length} rate periods.`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to reload state rates:', err);

      // Show error notification
      toast.error(`Failed to reload state rates: ${errorMessage}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">State Compensation Rates</h3>
          <p className="text-sm text-gray-600">
            {import.meta.env.DEV
              ? 'Run update script to fetch latest rates from Mass.gov'
              : 'Rates update automatically monthly via GitHub Actions'}
          </p>
        </div>
        <button
          onClick={handleUpdateRates}
          disabled={isUpdating}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isUpdating
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          }`}
        >
          {isUpdating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {import.meta.env.DEV ? 'Updating...' : 'Reloading...'}
            </span>
          ) : (
            import.meta.env.DEV ? 'Update Rates' : 'Reload Rates'
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Update Failed</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Rate Periods:</span>
            <p className="text-gray-900">{stateRateTable.length} available</p>
          </div>
          
          {stateRateTable.length > 0 && (
            <>
              <div>
                <span className="font-medium text-gray-700">Latest Period:</span>
                <p className="text-gray-900">
                  {formatDate(stateRateTable[0].effective_from)} - {formatDate(stateRateTable[0].effective_to)}
                </p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Current Rates:</span>
                <p className="text-gray-900">
                  ${stateRateTable[0].state_min} - ${stateRateTable[0].state_max}
                </p>
              </div>
            </>
          )}
        </div>

        {lastUpdateTime && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Last updated: {formatDate(lastUpdateTime)} at {new Date(lastUpdateTime).toLocaleTimeString()}
            </p>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            {showDetails ? 'Hide' : 'Show'} Rate History
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900">Complete Rate History</h4>
            <p className="text-xs text-gray-600">All compensation rate periods from Mass.gov</p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective Period
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Minimum Rate
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Maximum Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stateRateTable.map((rate, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {formatDate(rate.effective_from)} - {formatDate(rate.effective_to)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      ${rate.state_min.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      ${rate.state_max.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          <strong>How it works:</strong> Rates are automatically fetched from Mass.gov on the 2nd of each month via GitHub Actions.
        </p>
        <p>
          <strong>Data source:</strong> <a
            href="https://www.mass.gov/info-details/minimum-and-maximum-compensation-rates"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Mass.gov Compensation Rates
          </a>
        </p>
        <p>
          <strong>Update schedule:</strong> Automated monthly updates ensure current rates. New rates are posted to Mass.gov every October 1st.
        </p>
      </div>
    </div>
  );
}