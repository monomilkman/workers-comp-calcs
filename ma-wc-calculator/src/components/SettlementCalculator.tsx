import { useState, useMemo } from 'react';
import { formatCurrency, parseCurrency } from '../utils/money';
import { generateSettlementStatementPDF, generateSettlementStatementExcel, generateSettlementStatementWord, generateBenefitsRemainingPDF, generateBenefitsRemainingExcel, generateBenefitsRemainingWord, downloadBlob } from '../utils/export';
import { Plus, Trash2, Download, Calculator, FileText, File, FileSpreadsheet, Info } from 'lucide-react';
import type { BenefitCalculation, RemainingEntitlement } from '../types';
import type { BenefitsRemainingOptions, BenefitsRemainingData } from '../types/settlement';

interface SettlementCalculatorProps {
  benefitCalculations: BenefitCalculation[];
  remainingEntitlements: RemainingEntitlement[];
  combinedUsage?: {
    weeksUsed: number;
    weeksRemaining: number;
    maxWeeks: number;
  };
  combined35Usage?: {
    weeksUsed: number;
    weeksRemaining: number;
    maxWeeks: number;
  };
  totalDollarsPaid?: number;
  aww?: number;
  dateOfInjury?: string;
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
  remainingEntitlements,
  combinedUsage = { weeksUsed: 0, weeksRemaining: 0, maxWeeks: 364 },
  combined35Usage = { weeksUsed: 0, weeksRemaining: 0, maxWeeks: 208 },
  totalDollarsPaid = 0,
  aww: _aww,
  dateOfInjury
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
    dateOfInjury: dateOfInjury || '',
    date: new Date().toISOString().split('T')[0]
  });

  // Benefits Remaining Sheet state
  const [showBenefitsModal, setShowBenefitsModal] = useState<boolean>(false);
  const [benefitsOptions, setBenefitsOptions] = useState<BenefitsRemainingOptions>({
    includeIndividualBenefits: true,
    includeCombinedLimits: true,
    includeTotalPaid: true,
    includeProgressBars: true,
    includeSettlementOffer: false,
    customNotes: '',
    selectedBenefitTypes: [],
    settlementAmount: 0,
    settlementAllocations: [],
    section36Amount: 0
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

  // Benefits Remaining Sheet handlers
  const handleToggleBenefitType = (type: string) => {
    setBenefitsOptions(prev => {
      const currentTypes = prev.selectedBenefitTypes || [];
      const isSelected = currentTypes.includes(type);

      return {
        ...prev,
        selectedBenefitTypes: isSelected
          ? currentTypes.filter(t => t !== type)
          : [...currentTypes, type]
      };
    });
  };

  const getBenefitsRemainingData = (): BenefitsRemainingData => ({
    clientInfo: {
      attorneyName: clientInfo.attorneyName,
      clientName: clientInfo.clientName,
      dateOfInjury: clientInfo.dateOfInjury,
      date: clientInfo.date
    },
    benefitCalculations: benefitCalculations.map(b => ({
      type: b.type,
      rawWeekly: b.rawWeekly,
      finalWeekly: b.finalWeekly
    })),
    remainingEntitlements: remainingEntitlements.map(e => ({
      type: e.type,
      statutoryMaxWeeks: e.statutoryMaxWeeks,
      weeksUsed: e.weeksUsed,
      weeksRemaining: e.weeksRemaining,
      dollarsRemaining: e.dollarsRemaining,
      isLifeBenefit: e.isLifeBenefit
    })),
    combinedUsage,
    combined35Usage,
    totalDollarsPaid,
    options: benefitsOptions
  });

  const handleDownloadBenefitsPDF = async () => {
    try {
      const data = getBenefitsRemainingData();
      const pdfDataUri = await generateBenefitsRemainingPDF(data);

      const link = document.createElement('a');
      link.href = pdfDataUri;
      const fileName = `benefits-remaining-${clientInfo.clientName || 'client'}-${new Date().toISOString().split('T')[0]}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating Benefits Remaining PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleDownloadBenefitsExcel = () => {
    try {
      const data = getBenefitsRemainingData();
      const excelBlob = generateBenefitsRemainingExcel(data);
      const fileName = `benefits-remaining-${clientInfo.clientName || 'client'}-${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadBlob(excelBlob, fileName);
    } catch (error) {
      console.error('Error generating Benefits Remaining Excel:', error);
      alert('Error generating Excel file. Please try again.');
    }
  };

  const handleDownloadBenefitsWord = async () => {
    try {
      const data = getBenefitsRemainingData();
      const wordBlob = await generateBenefitsRemainingWord(data);
      const fileName = `benefits-remaining-${clientInfo.clientName || 'client'}-${new Date().toISOString().split('T')[0]}.docx`;
      downloadBlob(wordBlob, fileName);
    } catch (error) {
      console.error('Error generating Benefits Remaining Word:', error);
      alert('Error generating Word document. Please try again.');
    }
  };

  // Settlement Offer handlers
  const handleSettlementAmountChange = (amount: number) => {
    setBenefitsOptions(prev => ({
      ...prev,
      settlementAmount: amount
      // No longer auto-populating allocations - let user manually select benefits
    }));
  };

  const handleAddAllocation = (benefitType: string) => {
    const benefit = benefitCalculations.find(b => b.type === benefitType);
    if (!benefit) return;

    setBenefitsOptions(prev => ({
      ...prev,
      settlementAllocations: [
        ...(prev.settlementAllocations || []),
        {
          type: benefitType,
          amountAllocated: 0,
          weeksCovered: 0,
          yearsCovered: 0,
          weeklyRate: benefit.finalWeekly,
          inputMode: 'years' as const,
          yearInput: '',
          dollarInput: ''
        }
      ]
    }));
  };

  const handleRemoveAllocation = (benefitType: string) => {
    setBenefitsOptions(prev => ({
      ...prev,
      settlementAllocations: prev.settlementAllocations?.filter(a => a.type !== benefitType) || []
    }));
  };

  const handleAllocationYearsChange = (type: string, inputValue: string) => {
    const benefit = benefitCalculations.find(b => b.type === type);
    if (!benefit || benefit.finalWeekly === 0) return;

    const years = inputValue === '' ? 0 : parseFloat(inputValue) || 0;
    const weeksCovered = years * 52;
    const amountAllocated = weeksCovered * benefit.finalWeekly;

    setBenefitsOptions(prev => ({
      ...prev,
      settlementAllocations: prev.settlementAllocations?.map(alloc =>
        alloc.type === type
          ? {
              ...alloc,
              yearsCovered: years,
              weeksCovered,
              amountAllocated,
              inputMode: 'years' as const,
              yearInput: inputValue,
              dollarInput: amountAllocated > 0 ? amountAllocated.toFixed(2) : ''
            }
          : alloc
      ) || []
    }));
  };

  const handleAllocationDollarsChange = (type: string, inputValue: string) => {
    const benefit = benefitCalculations.find(b => b.type === type);
    if (!benefit || benefit.finalWeekly === 0) return;

    const dollars = parseCurrency(inputValue);
    const weeksCovered = dollars / benefit.finalWeekly;
    const yearsCovered = weeksCovered / 52;

    setBenefitsOptions(prev => ({
      ...prev,
      settlementAllocations: prev.settlementAllocations?.map(alloc =>
        alloc.type === type
          ? {
              ...alloc,
              amountAllocated: dollars,
              weeksCovered,
              yearsCovered,
              inputMode: 'dollars' as const,
              dollarInput: inputValue,
              yearInput: yearsCovered > 0 ? yearsCovered.toFixed(2) : ''
            }
          : alloc
      ) || []
    }));
  };

  const handleUseProposedSettlement = () => {
    if (proposedAmount > 0) {
      handleSettlementAmountChange(proposedAmount);
    }
  };

  const handleSection36AmountChange = (amount: number) => {
    setBenefitsOptions(prev => ({
      ...prev,
      section36Amount: amount
    }));
  };

  const handleFillRemaining = (benefitType: string) => {
    const entitlement = remainingEntitlements.find(e => e.type === benefitType);
    const benefit = benefitCalculations.find(b => b.type === benefitType);

    if (!entitlement || !benefit || benefit.finalWeekly === 0) return;

    // Can't fill remaining for life benefits or benefits with no remaining weeks
    if (entitlement.isLifeBenefit ||
        entitlement.weeksRemaining === null ||
        entitlement.weeksRemaining <= 0 ||
        entitlement.dollarsRemaining === null) {
      return;
    }

    const years = entitlement.weeksRemaining / 52;
    const amountAllocated = entitlement.dollarsRemaining;

    setBenefitsOptions(prev => ({
      ...prev,
      settlementAllocations: prev.settlementAllocations?.map(alloc =>
        alloc.type === benefitType
          ? {
              ...alloc,
              yearsCovered: years,
              weeksCovered: entitlement.weeksRemaining as number,
              amountAllocated,
              inputMode: 'years' as const,
              yearInput: years.toFixed(2),
              dollarInput: amountAllocated.toFixed(2)
            }
          : alloc
      ) || []
    }));
  };

  // Calculate allocation status
  const allocationStatus = useMemo(() => {
    const regularAllocations = benefitsOptions.settlementAllocations?.reduce((sum, a) => sum + a.amountAllocated, 0) || 0;
    const section36 = benefitsOptions.section36Amount || 0;

    const totalAllocated = regularAllocations + section36;
    const settlementAmount = benefitsOptions.settlementAmount || 0;
    const difference = settlementAmount - totalAllocated;

    let status: 'perfect' | 'under' | 'over' = 'under';
    if (Math.abs(difference) < 100) status = 'perfect';
    else if (difference < -100) status = 'over';

    return { totalAllocated, settlementAmount, difference, status };
  }, [benefitsOptions]);

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

      {/* Benefits Remaining Sheet Section */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
              Client Benefits Summary Sheet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Generate a customizable document showing remaining benefits for client presentations
            </p>
          </div>
          <button
            onClick={() => setShowBenefitsModal(!showBenefitsModal)}
            className="btn-primary flex items-center space-x-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{showBenefitsModal ? 'Hide Options' : 'Generate Sheet'}</span>
          </button>
        </div>

        {showBenefitsModal && (
          <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg space-y-6">
            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">Purpose</p>
                <p>
                  This sheet helps you explain to clients what benefits they have remaining, making it easier to discuss settlement options and why a particular settlement amount makes sense for their case.
                </p>
              </div>
            </div>

            {/* Customization Options */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">What to Include</h4>

              {/* Main Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={benefitsOptions.includeIndividualBenefits}
                    onChange={(e) => setBenefitsOptions(prev => ({ ...prev, includeIndividualBenefits: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Individual Benefits Breakdown</span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={benefitsOptions.includeCombinedLimits}
                    onChange={(e) => setBenefitsOptions(prev => ({ ...prev, includeCombinedLimits: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Combined Benefit Limits</span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={benefitsOptions.includeTotalPaid}
                    onChange={(e) => setBenefitsOptions(prev => ({ ...prev, includeTotalPaid: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Total Dollars Paid</span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={benefitsOptions.includeProgressBars}
                    onChange={(e) => setBenefitsOptions(prev => ({ ...prev, includeProgressBars: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Visual Progress Bars</span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={benefitsOptions.includeSettlementOffer}
                    onChange={(e) => setBenefitsOptions(prev => ({ ...prev, includeSettlementOffer: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Settlement Offer Analysis</span>
                </label>
              </div>

              {/* Settlement Offer Section */}
              {benefitsOptions.includeSettlementOffer && (
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100">Settlement Offer Details</h5>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Settlement Amount</label>
                      <div className="flex gap-2 mt-1">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                          <input
                            type="text"
                            value={benefitsOptions.settlementAmount || ''}
                            onChange={(e) => handleSettlementAmountChange(parseCurrency(e.target.value))}
                            className="pl-8 w-full"
                            placeholder="Enter settlement amount"
                          />
                        </div>
                        {proposedAmount > 0 && (
                          <button
                            onClick={handleUseProposedSettlement}
                            className="btn-secondary whitespace-nowrap"
                          >
                            Use ${formatCurrency(proposedAmount)}
                          </button>
                        )}
                      </div>
                    </div>

                    {benefitsOptions.settlementAmount && benefitsOptions.settlementAmount > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Benefit Allocation</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Manually select which benefits to include</p>
                        </div>

                        {/* Add Benefit Dropdown */}
                        <div className="flex gap-2">
                          <select
                            className="flex-1 text-sm"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddAllocation(e.target.value);
                                e.target.value = ''; // Reset selection
                              }
                            }}
                            value=""
                          >
                            <option value="">+ Add Benefit Type</option>
                            {benefitCalculations
                              .filter(b => !benefitsOptions.settlementAllocations?.some(a => a.type === b.type))
                              .map(benefit => (
                                <option key={benefit.type} value={benefit.type}>
                                  {getBenefitTitle(benefit.type)} - {formatCurrency(benefit.finalWeekly)}/week
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Benefit Allocations List */}
                        {benefitsOptions.settlementAllocations && benefitsOptions.settlementAllocations.length > 0 && (
                          <div className="space-y-2">
                            {benefitsOptions.settlementAllocations.map((allocation) => {
                              const benefit = benefitCalculations.find(b => b.type === allocation.type);
                              if (!benefit) return null;

                              return (
                                <div key={allocation.type} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{getBenefitTitle(allocation.type)}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatCurrency(benefit.finalWeekly)}/week
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const entitlement = remainingEntitlements.find(e => e.type === allocation.type);
                                        const hasRemaining = entitlement && !entitlement.isLifeBenefit &&
                                          entitlement.weeksRemaining && entitlement.weeksRemaining > 0;

                                        if (hasRemaining) {
                                          const years = (entitlement.weeksRemaining || 0) / 52;
                                          return (
                                            <button
                                              onClick={() => handleFillRemaining(allocation.type)}
                                              className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 whitespace-nowrap"
                                              title={`Fill with remaining ${years.toFixed(1)} years`}
                                            >
                                              Fill: {years.toFixed(1)}y
                                            </button>
                                          );
                                        }
                                        return null;
                                      })()}
                                      <button
                                        onClick={() => handleRemoveAllocation(allocation.type)}
                                        className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                        title="Remove this benefit"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Dual Input: Years OR Dollars */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-xs text-gray-600 dark:text-gray-400">Years</label>
                                      <input
                                        type="text"
                                        value={allocation.yearInput || ''}
                                        onChange={(e) => handleAllocationYearsChange(allocation.type, e.target.value)}
                                        className="w-full text-sm"
                                        placeholder="0.0"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-600 dark:text-gray-400">Dollar Amount</label>
                                      <div className="relative">
                                        <span className="absolute left-2 top-2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                                        <input
                                          type="text"
                                          value={allocation.dollarInput || ''}
                                          onChange={(e) => handleAllocationDollarsChange(allocation.type, e.target.value)}
                                          className="pl-6 w-full text-sm"
                                          placeholder="0.00"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Display calculated values */}
                                  {allocation.amountAllocated > 0 && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      = {allocation.weeksCovered.toFixed(1)} weeks ({allocation.yearsCovered.toFixed(2)} years) at {formatCurrency(benefit.finalWeekly)}/week
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section 36 (Scarring/Disfigurement) */}
                    <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Section 36 (Scarring/Disfigurement)</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="text"
                          value={benefitsOptions.section36Amount || ''}
                          onChange={(e) => handleSection36AmountChange(parseCurrency(e.target.value))}
                          className="pl-8 w-full"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Flat amount for scarring/disfigurement benefits
                      </p>
                    </div>

                    {/* Allocation Status Indicator */}
                    {benefitsOptions.settlementAmount && benefitsOptions.settlementAmount > 0 && (
                      <div className={`pt-3 mt-3 border-t border-gray-300 dark:border-gray-600 p-3 rounded-lg ${
                        allocationStatus.status === 'perfect' ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-700' :
                        allocationStatus.status === 'over' ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700' :
                        'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Settlement Amount:</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(allocationStatus.settlementAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Allocated:</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(allocationStatus.totalAllocated)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {allocationStatus.difference >= 0 ? 'Unallocated:' : 'Over-allocated:'}
                          </span>
                          <span className={`text-sm font-bold ${
                            allocationStatus.status === 'perfect' ? 'text-green-700 dark:text-green-400' :
                            allocationStatus.status === 'over' ? 'text-red-700 dark:text-red-400' :
                            'text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {formatCurrency(Math.abs(allocationStatus.difference))}
                          </span>
                        </div>
                        {allocationStatus.status === 'perfect' && (
                          <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                            ✓ Fully allocated (within $100)
                          </p>
                        )}
                        {allocationStatus.status === 'over' && (
                          <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                            ⚠ Warning: Allocated amount exceeds settlement
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Benefit Type Selection */}
              {benefitsOptions.includeIndividualBenefits && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Specific Benefits (leave all unchecked to include all)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {remainingEntitlements.map(entitlement => (
                      <label
                        key={entitlement.type}
                        className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <input
                          type="checkbox"
                          checked={benefitsOptions.selectedBenefitTypes?.includes(entitlement.type) || false}
                          onChange={() => handleToggleBenefitType(entitlement.type)}
                          className="h-4 w-4"
                        />
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                          {getBenefitTitle(entitlement.type)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Notes */}
              <div className="space-y-2">
                <label htmlFor="benefits-custom-notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attorney Notes (Optional)
                </label>
                <textarea
                  id="benefits-custom-notes"
                  value={benefitsOptions.customNotes}
                  onChange={(e) => setBenefitsOptions(prev => ({ ...prev, customNotes: e.target.value }))}
                  className="w-full"
                  rows={4}
                  placeholder="Add any explanations or context for the client about their benefits, settlement recommendations, or next steps..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This text will appear at the end of the document to help explain the benefits to your client.
                </p>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Ready to Generate</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Choose your preferred format below
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleDownloadBenefitsPDF}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={handleDownloadBenefitsExcel}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={handleDownloadBenefitsWord}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <File className="h-4 w-4" />
                    <span>Word</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}