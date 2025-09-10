import { useState, useMemo } from 'react';
import { formatCurrency, parseCurrency } from '../utils/money';
import { calculateSettlement, validateSettlementData, createEmptyLien } from '../utils/settlementCalculations';
import { generateSettlementStatementPDF, generateSettlementStatementExcel, generateSettlementStatementWord, downloadBlob } from '../utils/export';
import { Plus, Trash2, Download, FileText, File, Shield, AlertCircle } from 'lucide-react';
import type { GLSettlementData, Lien, ClientInfo } from '../types/settlement';

export function GLSettlementCalculator() {
  const [grossSettlement, setGrossSettlement] = useState<number>(0);
  const [grossSettlementInput, setGrossSettlementInput] = useState<string>('');
  const [attorneyFeePercent, setAttorneyFeePercent] = useState<number>(33.33);
  const [caseExpenses, setCaseExpenses] = useState<number>(0);
  const [caseExpensesInput, setCaseExpensesInput] = useState<string>('');
  const [liens, setLiens] = useState<Lien[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    attorneyName: '',
    clientName: '',
    dateOfInjury: '',
    date: new Date().toISOString().split('T')[0]
  });

  const settlementData: GLSettlementData = {
    grossSettlement,
    attorneyFeePercent,
    caseExpenses,
    liens: liens.filter(l => l.originalAmount > 0 || l.reducedAmount > 0)
  };

  const calculation = useMemo(() => 
    calculateSettlement(settlementData), 
    [settlementData]
  );

  const validation = useMemo(() => 
    validateSettlementData(settlementData), 
    [settlementData]
  );

  const handleGrossSettlementChange = (value: string) => {
    setGrossSettlementInput(value);
    const numericValue = parseCurrency(value);
    setGrossSettlement(numericValue);
  };

  const handleCaseExpensesChange = (value: string) => {
    setCaseExpensesInput(value);
    const numericValue = parseCurrency(value);
    setCaseExpenses(numericValue);
  };

  const updateClientInfo = (field: keyof ClientInfo, value: string) => {
    setClientInfo(prev => ({ ...prev, [field]: value }));
  };

  const addLien = () => {
    setLiens(prev => [...prev, createEmptyLien()]);
  };

  const updateLien = (id: string, field: keyof Lien, value: string | number) => {
    setLiens(prev => prev.map(lien => 
      lien.id === id ? { ...lien, [field]: value } : lien
    ));
  };

  const removeLien = (id: string) => {
    setLiens(prev => prev.filter(lien => lien.id !== id));
  };

  const createSettlementDataForExport = () => ({
    proposedAmount: calculation.grossSettlement,
    liabilityType: 'accepted' as const,
    standardFee: calculation.attorneyFee,
    actualFee: calculation.attorneyFee,
    feeReduction: 0,
    expenses: calculation.caseExpenses,
    deductions: liens.filter(l => l.reducedAmount > 0).map(l => ({
      description: l.description,
      amount: l.reducedAmount
    })),
    totalDeductions: calculation.totalLiensReduced,
    netToEmployee: calculation.netToClient
  });

  const handleDownloadPDF = async () => {
    try {
      const exportData = createSettlementDataForExport();
      const pdfDataUri = await generateSettlementStatementPDF(exportData, clientInfo);
      
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `gl-settlement-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating GL PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleDownloadExcel = () => {
    try {
      const exportData = createSettlementDataForExport();
      const excelBlob = generateSettlementStatementExcel(exportData, clientInfo);
      downloadBlob(excelBlob, `gl-settlement-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error generating GL Excel:', error);
      alert('Error generating Excel file. Please try again.');
    }
  };

  const handleDownloadWord = async () => {
    try {
      const exportData = createSettlementDataForExport();
      const wordBlob = await generateSettlementStatementWord(exportData, clientInfo);
      downloadBlob(wordBlob, `gl-settlement-${new Date().toISOString().split('T')[0]}.docx`);
    } catch (error) {
      console.error('Error generating GL Word:', error);
      alert('Error generating Word document. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            General Liability Settlement Calculator
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate attorney fees, case expenses, lien reductions, and net settlement distribution for general liability cases.
        </p>
      </div>

      {/* Client Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Client Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="gl-attorney-name" className="input-label">
              Attorney Name
            </label>
            <input
              type="text"
              id="gl-attorney-name"
              value={clientInfo.attorneyName}
              onChange={(e) => updateClientInfo('attorneyName', e.target.value)}
              className="w-full"
              placeholder="Attorney Name"
            />
          </div>
          <div>
            <label htmlFor="gl-client-name" className="input-label">
              Client Name
            </label>
            <input
              type="text"
              id="gl-client-name"
              value={clientInfo.clientName}
              onChange={(e) => updateClientInfo('clientName', e.target.value)}
              className="w-full"
              placeholder="Client Name"
            />
          </div>
          <div>
            <label htmlFor="gl-date-of-injury" className="input-label">
              Date of Incident
            </label>
            <input
              type="date"
              id="gl-date-of-injury"
              value={clientInfo.dateOfInjury}
              onChange={(e) => updateClientInfo('dateOfInjury', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="gl-statement-date" className="input-label">
              Date
            </label>
            <input
              type="date"
              id="gl-statement-date"
              value={clientInfo.date}
              onChange={(e) => updateClientInfo('date', e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Settlement Details */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Settlement Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="gl-gross-settlement" className="input-label">
              Gross Settlement Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
              <input
                type="text"
                id="gl-gross-settlement"
                value={grossSettlementInput}
                onChange={(e) => handleGrossSettlementChange(e.target.value)}
                className="pl-8 w-full"
                placeholder="100000.00"
              />
            </div>
          </div>
          <div>
            <label htmlFor="gl-attorney-fee" className="input-label">
              Attorney Fee %
            </label>
            <input
              type="number"
              id="gl-attorney-fee"
              value={attorneyFeePercent}
              onChange={(e) => setAttorneyFeePercent(parseFloat(e.target.value) || 0)}
              className="w-full"
              placeholder="33.33"
              step="0.01"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label htmlFor="gl-case-expenses" className="input-label">
              Case Expenses
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
              <input
                type="text"
                id="gl-case-expenses"
                value={caseExpensesInput}
                onChange={(e) => handleCaseExpensesChange(e.target.value)}
                className="pl-8 w-full"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Liens Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Liens
          </h3>
          <button
            type="button"
            onClick={addLien}
            className="btn-secondary btn-sm flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add Lien</span>
          </button>
        </div>

        {liens.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 dark:text-gray-400">
              No liens added. Click "Add Lien" to include medical liens, insurance subrogation, etc.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {liens.map((lien) => (
              <div key={lien.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <label className="input-label text-xs">Description</label>
                  <input
                    type="text"
                    value={lien.description}
                    onChange={(e) => updateLien(lien.id, 'description', e.target.value)}
                    placeholder="Medical lien, insurance subrogation, etc."
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="input-label text-xs">Original Amount</label>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      value={lien.originalAmount > 0 ? lien.originalAmount.toString() : ''}
                      onChange={(e) => updateLien(lien.id, 'originalAmount', parseCurrency(e.target.value))}
                      placeholder="0.00"
                      className="pl-6 w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="input-label text-xs">Reduced Amount</label>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      value={lien.reducedAmount > 0 ? lien.reducedAmount.toString() : ''}
                      onChange={(e) => updateLien(lien.id, 'reducedAmount', parseCurrency(e.target.value))}
                      placeholder="0.00"
                      className="pl-6 w-full"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLien(lien.id)}
                    className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {!validation.isValid && (
        <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">
                Please correct the following errors:
              </h4>
              <ul className="mt-1 text-sm text-red-700 dark:text-red-300">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Calculation Results */}
      {grossSettlement > 0 && validation.isValid && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Settlement Distribution
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    Gross Settlement Amount
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">
                    {formatCurrency(calculation.grossSettlement)}
                  </td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    Attorney Fee ({calculation.attorneyFeePercent}%)
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">
                    ({formatCurrency(calculation.attorneyFee)})
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    Case Expenses
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">
                    ({formatCurrency(calculation.caseExpenses)})
                  </td>
                </tr>
                {calculation.totalLiensReduced > 0 && (
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      Total Liens (Reduced)
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">
                      ({formatCurrency(calculation.totalLiensReduced)})
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="px-4 py-3 text-lg font-bold text-gray-900 dark:text-gray-100">
                    Net to Client
                  </td>
                  <td className="px-4 py-3 text-lg font-bold text-green-600 dark:text-green-400 text-right">
                    {formatCurrency(calculation.netToClient)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Lien Summary */}
          {calculation.lienReductionSavings > 0 && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="text-green-600 dark:text-green-400">
                  💰 Lien reduction savings: {formatCurrency(calculation.lienReductionSavings)}
                </div>
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                Original liens: {formatCurrency(calculation.totalLiensOriginal)} → 
                Reduced to: {formatCurrency(calculation.totalLiensReduced)}
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-600 pt-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Settlement Distribution Statement</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate professional settlement distribution documents
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="btn-primary flex items-center space-x-2"
                  disabled={!validation.isValid}
                >
                  <Download className="h-4 w-4" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="btn-secondary flex items-center space-x-2"
                  disabled={!validation.isValid}
                >
                  <FileText className="h-4 w-4" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={handleDownloadWord}
                  className="btn-secondary flex items-center space-x-2"
                  disabled={!validation.isValid}
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
  );
}