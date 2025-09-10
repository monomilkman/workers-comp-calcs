import { useState, useMemo } from 'react';
import { formatCurrency, parseCurrency } from '../utils/money';
import { generateSettlementStatementPDF, generateSettlementStatementExcel, generateSettlementStatementWord, downloadBlob } from '../utils/export';
import { Plus, Trash2, Download, Calculator, FileText, File } from 'lucide-react';
import type { BenefitCalculation, RemainingEntitlement } from '../types';

interface SettlementCalculatorProps {
  benefitCalculations: BenefitCalculation[];
  remainingEntitlements: RemainingEntitlement[];
}

interface SettlementBreakdown {
  type: string;
  finalWeekly: number;
  weeksCovered: number;
  yearsCovered: number;
  totalAllocated: number;
  exhaustsEntitlement: boolean;
  dollarsRemaining: number;
}

interface Deduction {
  id: string;
  description: string;
  amount: number;
}

interface ClientInfo {
  attorneyName: string;
  clientName: string;
  dateOfInjury: string;
  date: string;
}

type LiabilityType = 'accepted' | 'unaccepted';

export function SettlementCalculator({ 
  benefitCalculations, 
  remainingEntitlements 
}: SettlementCalculatorProps) {
  const [proposedAmount, setProposedAmount] = useState<number>(0);
  const [proposedInput, setProposedInput] = useState<string>('');
  const [liabilityType, setLiabilityType] = useState<LiabilityType>('accepted');
  const [attorneyFeeOverride, setAttorneyFeeOverride] = useState<number>(0);
  const [attorneyFeeOverrideInput, setAttorneyFeeOverrideInput] = useState<string>('');
  const [expenses, setExpenses] = useState<number>(0);
  const [expensesInput, setExpensesInput] = useState<string>('');
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [showAttorneySection, setShowAttorneySection] = useState<boolean>(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    attorneyName: '',
    clientName: '',
    dateOfInjury: '',
    date: new Date().toISOString().split('T')[0]
  });

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

  // Calculate attorney fees and net settlement
  const attorneyFeesCalculation = useMemo(() => {
    const standardRate = liabilityType === 'accepted' ? 0.20 : 0.15;
    const standardFee = proposedAmount * standardRate;
    const actualFee = attorneyFeeOverride > 0 ? attorneyFeeOverride : standardFee;
    const feeReduction = standardFee - actualFee;
    const netAfterFees = proposedAmount - actualFee;
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const netToEmployee = netAfterFees - expenses - totalDeductions;

    return {
      standardRate,
      standardFee,
      actualFee,
      feeReduction,
      netAfterFees,
      totalDeductions,
      netToEmployee,
      expenses
    };
  }, [proposedAmount, liabilityType, attorneyFeeOverride, expenses, deductions]);

  // Calculate settlement breakdown
  const settlementBreakdown = useMemo((): {
    breakdown: SettlementBreakdown[];
    totalAllocated: number;
    leftoverCash: number;
  } => {
    if (proposedAmount <= 0) {
      return { breakdown: [], totalAllocated: 0, leftoverCash: 0 };
    }

    const breakdown: SettlementBreakdown[] = [];
    let remainingAmount = proposedAmount;

    // Create breakdown for each benefit type that has remaining entitlement
    remainingEntitlements.forEach((entitlement) => {
      if (remainingAmount <= 0) return;

      const benefit = benefitCalculations.find(b => b.type === entitlement.type);
      if (!benefit || benefit.finalWeekly === 0) return;

      let amountToAllocate = 0;
      let weeksCovered = 0;
      let exhaustsEntitlement = false;

      if (entitlement.isLifeBenefit) {
        // For life benefits, calculate how many weeks the remaining amount would cover
        weeksCovered = remainingAmount / benefit.finalWeekly;
        amountToAllocate = remainingAmount;
        remainingAmount = 0;
      } else if (entitlement.dollarsRemaining && entitlement.dollarsRemaining > 0) {
        // For finite benefits with remaining entitlement
        if (remainingAmount >= entitlement.dollarsRemaining) {
          // Settlement amount fully covers remaining entitlement
          amountToAllocate = entitlement.dollarsRemaining;
          weeksCovered = entitlement.weeksRemaining || 0;
          exhaustsEntitlement = true;
          remainingAmount -= entitlement.dollarsRemaining;
        } else {
          // Settlement amount partially covers remaining entitlement
          amountToAllocate = remainingAmount;
          weeksCovered = remainingAmount / benefit.finalWeekly;
          remainingAmount = 0;
        }
      }

      if (amountToAllocate > 0) {
        breakdown.push({
          type: entitlement.type,
          finalWeekly: benefit.finalWeekly,
          weeksCovered,
          yearsCovered: weeksCovered / 52,
          totalAllocated: amountToAllocate,
          exhaustsEntitlement,
          dollarsRemaining: entitlement.dollarsRemaining || 0
        });
      }
    });

    const totalAllocated = breakdown.reduce((sum, item) => sum + item.totalAllocated, 0);
    const leftoverCash = proposedAmount - totalAllocated;

    return { breakdown, totalAllocated, leftoverCash };
  }, [proposedAmount, benefitCalculations, remainingEntitlements]);

  const handleAmountChange = (value: string) => {
    setProposedInput(value);
    const numericValue = parseCurrency(value);
    setProposedAmount(numericValue);
  };

  const handleAttorneyFeeOverrideChange = (value: string) => {
    setAttorneyFeeOverrideInput(value);
    const numericValue = parseCurrency(value);
    setAttorneyFeeOverride(numericValue);
  };

  const handleExpensesChange = (value: string) => {
    setExpensesInput(value);
    const numericValue = parseCurrency(value);
    setExpenses(numericValue);
  };

  const addDeduction = () => {
    const newDeduction: Deduction = {
      id: Date.now().toString(),
      description: '',
      amount: 0
    };
    setDeductions(prev => [...prev, newDeduction]);
  };

  const updateDeduction = (id: string, field: 'description' | 'amount', value: string | number) => {
    setDeductions(prev => prev.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const removeDeduction = (id: string) => {
    setDeductions(prev => prev.filter(d => d.id !== id));
  };

  const updateClientInfo = (field: keyof ClientInfo, value: string) => {
    setClientInfo(prev => ({ ...prev, [field]: value }));
  };

  const getSettlementData = () => ({
    proposedAmount,
    liabilityType,
    standardFee: attorneyFeesCalculation.standardFee,
    actualFee: attorneyFeesCalculation.actualFee,
    feeReduction: attorneyFeesCalculation.feeReduction,
    expenses: attorneyFeesCalculation.expenses,
    deductions: deductions.filter(d => d.amount > 0),
    totalDeductions: attorneyFeesCalculation.totalDeductions,
    netToEmployee: attorneyFeesCalculation.netToEmployee
  });

  const getClientInfoForExport = () => ({
    name: clientInfo.clientName,
    attorney: clientInfo.attorneyName,
    dateOfInjury: clientInfo.dateOfInjury,
    date: clientInfo.date
  });

  const handleDownloadPDF = async () => {
    try {
      const settlementData = getSettlementData();
      const clientInfoForExport = getClientInfoForExport();

      const pdfDataUri = await generateSettlementStatementPDF(settlementData, clientInfoForExport);

      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `settlement-statement-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating PDF settlement statement:', error);
      alert('Error generating PDF settlement statement. Please try again.');
    }
  };

  const handleDownloadExcel = () => {
    try {
      const settlementData = getSettlementData();
      const clientInfoForExport = getClientInfoForExport();

      const excelBlob = generateSettlementStatementExcel(settlementData, clientInfoForExport);
      downloadBlob(excelBlob, `settlement-statement-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel settlement statement:', error);
      alert('Error generating Excel settlement statement. Please try again.');
    }
  };

  const handleDownloadWord = async () => {
    try {
      const settlementData = getSettlementData();
      const clientInfoForExport = getClientInfoForExport();

      const wordBlob = await generateSettlementStatementWord(settlementData, clientInfoForExport);
      downloadBlob(wordBlob, `settlement-statement-${new Date().toISOString().split('T')[0]}.docx`);
    } catch (error) {
      console.error('Error generating Word settlement statement:', error);
      alert('Error generating Word settlement statement. Please try again.');
    }
  };

  const getTotalRemainingDollars = () => {
    return remainingEntitlements
      .filter(e => !e.isLifeBenefit && e.dollarsRemaining)
      .reduce((sum, e) => sum + (e.dollarsRemaining || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Client Information Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Client Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="attorney-name" className="input-label">
              Attorney Name
            </label>
            <input
              type="text"
              id="attorney-name"
              value={clientInfo.attorneyName}
              onChange={(e) => updateClientInfo('attorneyName', e.target.value)}
              className="w-full"
              placeholder="Attorney Name"
            />
          </div>
          <div>
            <label htmlFor="client-name" className="input-label">
              Client Name
            </label>
            <input
              type="text"
              id="client-name"
              value={clientInfo.clientName}
              onChange={(e) => updateClientInfo('clientName', e.target.value)}
              className="w-full"
              placeholder="Client Name"
            />
          </div>
          <div>
            <label htmlFor="date-of-injury" className="input-label">
              Date of Injury
            </label>
            <input
              type="date"
              id="date-of-injury"
              value={clientInfo.dateOfInjury}
              onChange={(e) => updateClientInfo('dateOfInjury', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="statement-date" className="input-label">
              Date
            </label>
            <input
              type="date"
              id="statement-date"
              value={clientInfo.date}
              onChange={(e) => updateClientInfo('date', e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Settlement Calculator
          </h3>
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <button
              onClick={() => setShowAttorneySection(!showAttorneySection)}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {showAttorneySection ? 'Hide' : 'Show'} Attorney Fees
            </button>
          </div>
        </div>

        {/* Settlement Amount Input */}
        <div className="mb-6">
          <label htmlFor="settlement-amount" className="input-label">
            Proposed Settlement Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
            <input
              type="text"
              id="settlement-amount"
              value={proposedInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="pl-8 w-full"
              placeholder="50000.00"
            />
          </div>
        
        {/* Quick fill buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAmountChange(getTotalRemainingDollars().toString())}
            className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
            disabled={getTotalRemainingDollars() === 0}
          >
            Full Remaining: {formatCurrency(getTotalRemainingDollars())}
          </button>
          <button
            type="button"
            onClick={() => handleAmountChange((getTotalRemainingDollars() * 0.75).toString())}
            className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded-full hover:bg-green-200"
            disabled={getTotalRemainingDollars() === 0}
          >
            75%: {formatCurrency(getTotalRemainingDollars() * 0.75)}
          </button>
          <button
            type="button"
            onClick={() => handleAmountChange((getTotalRemainingDollars() * 0.5).toString())}
            className="text-xs px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200"
            disabled={getTotalRemainingDollars() === 0}
          >
            50%: {formatCurrency(getTotalRemainingDollars() * 0.5)}
          </button>
        </div>
        </div>
      </div>

      {/* Attorney Fees & Deductions Section */}
      {showAttorneySection && (
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Attorney Fees & Deductions
          </h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Attorney Fees */}
            <div className="space-y-4">
              {/* Liability Type */}
              <div>
                <label className="input-label">Liability Status</label>
                <select
                  value={liabilityType}
                  onChange={(e) => setLiabilityType(e.target.value as LiabilityType)}
                  className="w-full"
                >
                  <option value="accepted">Accepted Liability (20% fee)</option>
                  <option value="unaccepted">Unaccepted Liability (15% fee)</option>
                </select>
              </div>

              {/* Attorney Fee Override */}
              <div>
                <label className="input-label">
                  Attorney Fee Override
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    (leave blank for standard {liabilityType === 'accepted' ? '20%' : '15%'})
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="text"
                    value={attorneyFeeOverrideInput}
                    onChange={(e) => handleAttorneyFeeOverrideChange(e.target.value)}
                    className="pl-8 w-full"
                    placeholder="Optional custom amount"
                  />
                </div>
              </div>

              {/* Expenses */}
              <div>
                <label className="input-label">Attorney Expenses</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="text"
                    value={expensesInput}
                    onChange={(e) => handleExpensesChange(e.target.value)}
                    className="pl-8 w-full"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Additional Deductions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="input-label mb-0">Additional Deductions</label>
                <button
                  type="button"
                  onClick={addDeduction}
                  className="btn-secondary btn-sm flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>

              {deductions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                  No additional deductions. Click "Add" to include child support, tax liens, etc.
                </p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {deductions.map((deduction) => (
                    <div key={deduction.id} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={deduction.description}
                        onChange={(e) => updateDeduction(deduction.id, 'description', e.target.value)}
                        placeholder="Child support, tax lien, etc."
                        className="flex-1"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2 top-2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                        <input
                          type="text"
                          value={deduction.amount > 0 ? deduction.amount.toString() : ''}
                          onChange={(e) => updateDeduction(deduction.id, 'amount', parseCurrency(e.target.value))}
                          placeholder="0.00"
                          className="pl-6 w-full text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeduction(deduction.id)}
                        className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fee Calculation Summary */}
          {proposedAmount > 0 && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Fee Calculation</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Standard Fee ({(attorneyFeesCalculation.standardRate * 100)}%):</span>
                  <div className="font-semibold">{formatCurrency(attorneyFeesCalculation.standardFee)}</div>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Actual Fee:</span>
                  <div className="font-semibold">{formatCurrency(attorneyFeesCalculation.actualFee)}</div>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Total Deductions:</span>
                  <div className="font-semibold">{formatCurrency(attorneyFeesCalculation.totalDeductions + attorneyFeesCalculation.expenses)}</div>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Net to Employee:</span>
                  <div className="font-bold text-lg text-blue-900 dark:text-blue-100">{formatCurrency(attorneyFeesCalculation.netToEmployee)}</div>
                </div>
              </div>
              {attorneyFeesCalculation.feeReduction > 0 && (
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  💡 Fee reduction: {formatCurrency(attorneyFeesCalculation.feeReduction)} saved for client
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {proposedAmount > 0 && settlementBreakdown.breakdown.length > 0 && (
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Settlement Breakdown</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Benefit Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weekly Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weeks Covered
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Years Covered
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Allocated
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settlementBreakdown.breakdown.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getBenefitTitle(item.type)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.finalWeekly)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.weeksCovered.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.yearsCovered.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(item.totalAllocated)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {item.exhaustsEntitlement ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Fully Funded
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Partial
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-600">Proposed Settlement:</span>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(proposedAmount)}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Allocated:</span>
                <div className="text-lg font-semibold text-blue-600">
                  {formatCurrency(settlementBreakdown.totalAllocated)}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">
                  {settlementBreakdown.leftoverCash > 0 ? 'Leftover Cash:' : 'Shortfall:'}
                </span>
                <div className={`text-lg font-semibold ${
                  settlementBreakdown.leftoverCash > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(Math.abs(settlementBreakdown.leftoverCash))}
                </div>
              </div>
            </div>
          </div>

          {/* Warnings and Notes */}
          <div className="space-y-2">
            {settlementBreakdown.leftoverCash > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  💡 The settlement amount exceeds the cost of remaining benefits by{' '}
                  <strong>{formatCurrency(settlementBreakdown.leftoverCash)}</strong>.
                  This represents additional compensation beyond future benefit payments.
                </p>
              </div>
            )}

            {settlementBreakdown.breakdown.some(item => remainingEntitlements.find(e => e.type === item.type)?.isLifeBenefit) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  ℹ️ Life benefits (34A, 31) have no statutory limit. The settlement covers{' '}
                  {settlementBreakdown.breakdown
                    .filter(item => remainingEntitlements.find(e => e.type === item.type)?.isLifeBenefit)
                    .map(item => `${item.yearsCovered.toFixed(1)} years of ${getBenefitTitle(item.type)}`)
                    .join(' and ')
                  }.
                </p>
              </div>
            )}
          </div>

          {/* Settlement Statement Download */}
          {showAttorneySection && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-600 pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100">Settlement Statement</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Generate a professional statement showing fee breakdown and net payment
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="btn-primary flex items-center space-x-2"
                    disabled={!proposedAmount}
                  >
                    <Download className="h-4 w-4" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={handleDownloadExcel}
                    className="btn-secondary flex items-center space-x-2"
                    disabled={!proposedAmount}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={handleDownloadWord}
                    className="btn-secondary flex items-center space-x-2"
                    disabled={!proposedAmount}
                  >
                    <File className="h-4 w-4" />
                    <span>Word</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {proposedAmount > 0 && settlementBreakdown.breakdown.length === 0 && (
        <div className="card">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No remaining benefit entitlements to allocate settlement funds to.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}