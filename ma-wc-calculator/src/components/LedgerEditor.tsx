import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { LedgerEntry, BenefitType, StateRateRow } from '../types';
import { validateLedgerEntry } from '../utils/validation';
import { weeksBetween } from '../utils/dates';
import { calculateWeeklyRate } from '../utils/rates';
import { formatCurrency, parseCurrency } from '../utils/money';

interface LedgerEditorProps {
  entry?: LedgerEntry | null;
  isOpen: boolean;
  aww: number;
  earningCapacity: number;
  dateOfInjury: string;
  stateRateTable: StateRateRow[];
  prorationMode: 'days' | 'calendar';
  onSave: (entry: LedgerEntry) => void;
  onCancel: () => void;
}

const BENEFIT_TYPES: { value: BenefitType; label: string }[] = [
  { value: '34', label: 'Section 34 (TTD)' },
  { value: '35', label: 'Section 35 (TPD)' },
  { value: '35ec', label: 'Section 35 EC' },
  { value: '34A', label: 'Section 34A (P&T)' },
  { value: '31', label: 'Section 31 (Dependent)' }
];

export function LedgerEditor({
  entry,
  isOpen,
  aww,
  earningCapacity,
  dateOfInjury,
  stateRateTable,
  prorationMode,
  onSave,
  onCancel
}: LedgerEditorProps) {
  const [formData, setFormData] = useState({
    type: '34' as BenefitType,
    start: '',
    end: '',
    isPresentDate: false,
    aww_used: aww,
    ec_used: earningCapacity,
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedValues, setCalculatedValues] = useState({
    weeks: 0,
    raw_weekly: 0,
    final_weekly: 0,
    dollars_paid: 0
  });

  // Initialize form when entry changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setFormData({
          type: entry.type,
          start: entry.start,
          end: entry.end || '',
          isPresentDate: !entry.end,
          aww_used: entry.aww_used || aww,
          ec_used: entry.ec_used || earningCapacity,
          notes: entry.notes || ''
        });
      } else {
        setFormData({
          type: '34',
          start: '',
          end: '',
          isPresentDate: false,
          aww_used: aww,
          ec_used: earningCapacity,
          notes: ''
        });
      }
      setErrors({});
    }
  }, [entry, isOpen, aww, earningCapacity]);

  // Recalculate values when form data changes
  useEffect(() => {
    if (formData.start && (formData.end || formData.isPresentDate)) {
      try {
        const endDate = formData.isPresentDate ? new Date().toISOString().split('T')[0] : formData.end;
        const weekCalc = weeksBetween(formData.start, endDate, prorationMode);
        
        const rateResult = calculateWeeklyRate(formData.type, formData.aww_used, {
          ec: formData.type === '35ec' ? formData.ec_used : undefined,
          dateOfInjury,
          stateTable: stateRateTable
        });

        const dollarsPaid = rateResult.finalWeekly * weekCalc.weeksDecimal;

        setCalculatedValues({
          weeks: weekCalc.weeksDecimal,
          raw_weekly: rateResult.rawWeekly,
          final_weekly: rateResult.finalWeekly,
          dollars_paid: dollarsPaid
        });
      } catch (error) {
        console.error('Error calculating values:', error);
        setCalculatedValues({
          weeks: 0,
          raw_weekly: 0,
          final_weekly: 0,
          dollars_paid: 0
        });
      }
    }
  }, [formData, dateOfInjury, stateRateTable, prorationMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const ledgerEntry: Partial<LedgerEntry> = {
      type: formData.type,
      start: formData.start,
      end: formData.isPresentDate ? undefined : formData.end,
      aww_used: formData.aww_used,
      ec_used: formData.type === '35ec' ? formData.ec_used : undefined,
      notes: formData.notes
    };

    const validation = validateLedgerEntry(ledgerEntry, aww);
    
    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach(error => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
      return;
    }

    const completeEntry: LedgerEntry = {
      id: entry?.id || uuidv4(),
      type: formData.type,
      start: formData.start,
      end: formData.isPresentDate ? undefined : formData.end,
      aww_used: formData.aww_used,
      ec_used: formData.type === '35ec' ? formData.ec_used : undefined,
      weeks: calculatedValues.weeks,
      raw_weekly: calculatedValues.raw_weekly,
      final_weekly: calculatedValues.final_weekly,
      dollars_paid: calculatedValues.dollars_paid,
      notes: formData.notes
    };

    onSave(completeEntry);
  };

  const handleAwwUsedChange = (value: string) => {
    const numericValue = parseCurrency(value);
    setFormData(prev => ({ ...prev, aww_used: numericValue }));
  };

  const handleEcUsedChange = (value: string) => {
    const numericValue = parseCurrency(value);
    setFormData(prev => ({ ...prev, ec_used: numericValue }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onCancel} />
        
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {entry ? 'Edit Ledger Entry' : 'Add Ledger Entry'}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Benefit Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benefit Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as BenefitType }))}
                  className={errors.type ? 'border-red-500' : ''}
                  required
                >
                  {BENEFIT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
              </div>

              {/* AWW Used */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AWW Used
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={formData.aww_used.toString()}
                    onChange={(e) => handleAwwUsedChange(e.target.value)}
                    className={`pl-8 ${errors.aww_used ? 'border-red-500' : ''}`}
                    placeholder="1000.00"
                  />
                </div>
                {errors.aww_used && <p className="mt-1 text-sm text-red-600">{errors.aww_used}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start}
                  onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
                  className={errors.start ? 'border-red-500' : ''}
                  required
                />
                {errors.start && <p className="mt-1 text-sm text-red-600">{errors.start}</p>}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end}
                  onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
                  className={errors.end ? 'border-red-500' : ''}
                  disabled={formData.isPresentDate}
                />
                <div className="mt-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isPresentDate}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        isPresentDate: e.target.checked,
                        end: e.target.checked ? '' : prev.end
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Present (ongoing)</span>
                  </label>
                </div>
                {errors.end && <p className="mt-1 text-sm text-red-600">{errors.end}</p>}
              </div>
            </div>

            {/* Earning Capacity (only for Section 35 EC) */}
            {formData.type === '35ec' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Earning Capacity Used *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={formData.ec_used.toString()}
                    onChange={(e) => handleEcUsedChange(e.target.value)}
                    className={`pl-8 ${errors.ec_used ? 'border-red-500' : ''}`}
                    placeholder="600.00"
                    required
                  />
                </div>
                {errors.ec_used && <p className="mt-1 text-sm text-red-600">{errors.ec_used}</p>}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full"
                placeholder="Optional notes about this entry..."
              />
            </div>

            {/* Calculated Values Preview */}
            {(formData.start && (formData.end || formData.isPresentDate)) && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Calculated Values</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Weeks:</span>
                    <div className="font-medium">{calculatedValues.weeks.toFixed(4)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Raw Weekly:</span>
                    <div className="font-medium">{formatCurrency(calculatedValues.raw_weekly)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Final Weekly:</span>
                    <div className="font-medium">{formatCurrency(calculatedValues.final_weekly)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Dollars Paid:</span>
                    <div className="font-medium">{formatCurrency(calculatedValues.dollars_paid)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {entry ? 'Update Entry' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}