import { lazy, Suspense } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useCalculations } from './hooks/useCalculations';
import { formatCurrency } from './utils/money';
import { Clock, FileText } from 'lucide-react';
import { Toaster } from 'sonner';
import type { AppState } from './types';

// Layout Components
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { CalculatorProvider, useCalculatorContext } from './contexts/CalculatorContext';
import { Sidebar, type NavigationTab } from './components/Layout/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Spinner } from './components/UI/Spinner';

// Components (Core - loaded immediately)
import { AwwInput } from './components/AwwInput';
import { BenefitCard } from './components/BenefitCard';
import { RemainingSummary } from './components/RemainingSummary';
import { Ledger } from './components/Ledger';
import { SettlementCalculator } from './components/SettlementCalculator';
import { DemandBuilder } from './components/DemandBuilder';
import { ExportButtons } from './components/ExportButtons';
import SettingsStateRates from './components/SettingsStateRates';

// Lazy-loaded components (only loaded when needed)
const MVASettlementCalculator = lazy(() => import('./components/MVASettlementCalculator').then(module => ({ default: module.MVASettlementCalculator })));
const GLSettlementCalculator = lazy(() => import('./components/GLSettlementCalculator').then(module => ({ default: module.GLSettlementCalculator })));

function AppContent() {
  // Theme management
  const { theme, toggleTheme } = useTheme();

  // Calculator state from context
  const {
    aww,
    dateOfInjury,
    earningCapacity,
    prorationMode,
    stateRateTable,
    ledger,
    setAww,
    setDateOfInjury,
    setEarningCapacity,
    setProrationMode,
    setStateRateTable,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useCalculatorContext();

  // Navigation state (kept separate as it's UI-specific, not calculator data)
  const [activeTab, setActiveTab] = useLocalStorage<NavigationTab>('ma_wc_active_tab', 'calculator');

  // Use calculations hook
  const {
    benefitCalculations,
    weeksUsedByType,
    remainingEntitlements,
    combinedUsage,
    combined35Usage,
    totalDollarsPaid
  } = useCalculations(aww, dateOfInjury, earningCapacity, stateRateTable, ledger);

  // Create app state for export
  const appState: AppState = {
    aww,
    date_of_injury: dateOfInjury,
    earning_capacity_default: earningCapacity,
    state_rate_table: stateRateTable,
    ledger,
    settings: {
      proration: prorationMode,
      today: new Date().toISOString().split('T')[0]
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'calculator':
        return (
          <>
            {/* Header Input Section */}
            <div className="mb-8">
              <AwwInput
                aww={aww}
                dateOfInjury={dateOfInjury}
                earningCapacity={earningCapacity}
                stateRateTable={stateRateTable}
                onAwwChange={setAww}
                onDateOfInjuryChange={setDateOfInjury}
                onEarningCapacityChange={setEarningCapacity}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Benefit Cards */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Benefit Summary</h2>
                {benefitCalculations.map((benefit) => {
                  const remaining = remainingEntitlements.find(r => r.type === benefit.type);
                  return (
                    <BenefitCard
                      key={benefit.type}
                      benefit={benefit}
                      weeksUsed={weeksUsedByType[benefit.type]}
                      dollarsRemaining={remaining?.dollarsRemaining}
                      isLifeBenefit={remaining?.isLifeBenefit}
                    />
                  );
                })}
              </div>

              {/* Center Column: Recent Payments */}
              <div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Payments</h3>
                  </div>
                  
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    Switch to Payment Ledger tab to manage entries
                  </p>
                  
                  {ledger.length > 0 ? (
                    <div className="space-y-3">
                      {ledger.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-100 dark:border-gray-600">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Section {entry.type}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {entry.start} - {entry.end || 'Present'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {formatCurrency(entry.final_weekly || 0)}/week × {(entry.weeks || 0).toFixed(2)} weeks
                            </span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(entry.dollars_paid || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {ledger.length > 3 && (
                        <div className="text-center pt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{ledger.length - 3} more entries in Payment Ledger
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                        <FileText className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No payments recorded yet</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                        Add entries in the Payment Ledger tab
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Summary */}
              <div className="space-y-6">
                <RemainingSummary
                  remainingEntitlements={remainingEntitlements}
                  combinedUsage={combinedUsage}
                  combined35Usage={combined35Usage}
                  totalDollarsPaid={totalDollarsPaid}
                />
              </div>
            </div>
          </>
        );

      case 'ledger':
        return (
          <div className="max-w-6xl mx-auto">
            <Ledger
              ledger={ledger}
              aww={aww}
              earningCapacity={earningCapacity}
              dateOfInjury={dateOfInjury}
              stateRateTable={stateRateTable}
              prorationMode={prorationMode}
              onAddEntry={addEntry}
              onUpdateEntry={updateEntry}
              onDeleteEntry={deleteEntry}
            />
          </div>
        );

      case 'settlement':
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            <SettlementCalculator
              benefitCalculations={benefitCalculations}
              remainingEntitlements={remainingEntitlements}
              combinedUsage={combinedUsage}
              combined35Usage={combined35Usage}
              totalDollarsPaid={totalDollarsPaid}
              aww={aww}
              dateOfInjury={dateOfInjury}
            />

            <DemandBuilder
              benefitCalculations={benefitCalculations}
              remainingEntitlements={remainingEntitlements}
            />

            <div className="mt-8">
              <ExportButtons
                appState={appState}
                ledger={ledger}
              />
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Settings Card */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Application Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="input-label">
                    Proration Mode
                  </label>
                  <select
                    value={prorationMode}
                    onChange={(e) => setProrationMode(e.target.value as ProrationMode)}
                    className="w-full"
                  >
                    <option value="days">Days (Default)</option>
                    <option value="calendar">Calendar Weeks</option>
                  </select>
                  <p className="input-help">
                    {prorationMode === 'days' 
                      ? 'Calculates weeks as days ÷ 7 with fractional precision'
                      : 'Counts full Monday-Sunday calendar weeks'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <SettingsStateRates 
                stateRateTable={stateRateTable}
                onRatesUpdated={setStateRateTable}
              />
            </div>
          </div>
        );

      case 'mva':
        return (
          <div className="max-w-6xl mx-auto">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Spinner />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading MVA Calculator...</span>
              </div>
            }>
              <MVASettlementCalculator />
            </Suspense>
          </div>
        );

      case 'gl':
        return (
          <div className="max-w-6xl mx-auto">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Spinner />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading GL Calculator...</span>
              </div>
            }>
              <GLSettlementCalculator />
            </Suspense>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Toaster
        position="top-right"
        expand={true}
        richColors
        closeButton
        theme="system"
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderTabContent()}
          </div>

          {/* Footer */}
          <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                MA Workers' Compensation Benefits Calculator - Built for legal professionals representing injured workers
              </p>
              <p className="mt-1">
                This tool provides calculations based on Massachusetts workers' compensation statutes.
                Always verify calculations and consult current regulations.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CalculatorProvider>
          <AppContent />
        </CalculatorProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
