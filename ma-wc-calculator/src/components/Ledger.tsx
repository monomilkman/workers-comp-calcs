import { useState } from 'react';
import { formatCurrency } from '../utils/money';
import { findOverlappingEntries } from '../utils/validation';
import type { LedgerEntry, BenefitType, StateRateRow } from '../types';
import { LedgerEditor } from './LedgerEditor';

interface LedgerProps {
  ledger: LedgerEntry[];
  aww: number;
  earningCapacity: number;
  dateOfInjury: string;
  stateRateTable: StateRateRow[];
  prorationMode: 'days' | 'calendar';
  onAddEntry: (entry: LedgerEntry) => void;
  onUpdateEntry: (entry: LedgerEntry) => void;
  onDeleteEntry: (id: string) => void;
}

export function Ledger({
  ledger,
  aww,
  earningCapacity,
  dateOfInjury,
  stateRateTable,
  prorationMode,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry
}: LedgerProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [showOverlaps, setShowOverlaps] = useState(true);

  // Find overlapping entries
  const overlaps = findOverlappingEntries(ledger);
  const hasOverlaps = overlaps.length > 0;

  const getBenefitTypeLabel = (type: BenefitType) => {
    switch (type) {
      case '34': return 'Section 34';
      case '35': return 'Section 35';
      case '35ec': return 'Section 35 EC';
      case '34A': return 'Section 34A';
      case '31': return 'Section 31';
      default: return type;
    }
  };

  const getBenefitTypeBadge = (type: BenefitType) => {
    const colors = {
      '34': 'bg-blue-100 text-blue-800',
      '35': 'bg-green-100 text-green-800',
      '35ec': 'bg-purple-100 text-purple-800',
      '34A': 'bg-red-100 text-red-800',
      '31': 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
        {getBenefitTypeLabel(type)}
      </span>
    );
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    setIsEditorOpen(true);
  };

  const handleEditEntry = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setIsEditorOpen(true);
  };

  const handleSaveEntry = (entry: LedgerEntry) => {
    if (editingEntry) {
      onUpdateEntry(entry);
    } else {
      onAddEntry(entry);
    }
    setIsEditorOpen(false);
    setEditingEntry(null);
  };

  const handleCancelEdit = () => {
    setIsEditorOpen(false);
    setEditingEntry(null);
  };

  const isEntryOverlapping = (entryId: string) => {
    return overlaps.some(overlap => 
      overlap.entry1.id === entryId || overlap.entry2.id === entryId
    );
  };

  const sortedLedger = [...ledger].sort((a, b) => {
    const dateA = new Date(a.start);
    const dateB = new Date(b.start);
    return dateB.getTime() - dateA.getTime(); // Most recent first
  });

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment Ledger</h3>
        <button
          onClick={handleAddEntry}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Entry
        </button>
      </div>

      {/* Overlaps Warning */}
      {hasOverlaps && showOverlaps && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                ⚠️ Overlapping Entries Detected
              </h4>
              <div className="text-sm text-yellow-700">
                <p className="mb-2">The following entries have overlapping date ranges:</p>
                <ul className="list-disc list-inside space-y-1">
                  {overlaps.map((overlap, index) => (
                    <li key={index}>
                      {getBenefitTypeLabel(overlap.entry1.type)} ({overlap.entry1.start} - {overlap.entry1.end || 'Present'}) 
                      {' overlaps with '}
                      {getBenefitTypeLabel(overlap.entry2.type)} ({overlap.entry2.start} - {overlap.entry2.end || 'Present'})
                      {' by '}{overlap.overlapDays} days
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowOverlaps(false)}
              className="text-yellow-400 hover:text-yellow-600 ml-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      {sortedLedger.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No entries yet</h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Add your first payment entry to get started.</p>
          <button
            onClick={handleAddEntry}
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add First Entry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weeks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weekly Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dollars Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedLedger.map((entry) => (
                <tr 
                  key={entry.id}
                  className={`hover:bg-gray-50 ${isEntryOverlapping(entry.id) ? 'bg-yellow-25 border-l-4 border-yellow-400' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getBenefitTypeBadge(entry.type)}
                      {isEntryOverlapping(entry.id) && (
                        <span className="ml-2 text-yellow-600" title="Overlapping dates">
                          ⚠️
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{entry.start}</div>
                      <div className="text-gray-500 text-xs">
                        to {entry.end || 'Present'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{entry.weeks.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        ({Math.floor(entry.weeks)} full + {(entry.weeks % 1).toFixed(2)} partial)
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{formatCurrency(entry.final_weekly)}</div>
                      {entry.raw_weekly !== entry.final_weekly && (
                        <div className="text-xs text-gray-500">
                          (Raw: {formatCurrency(entry.raw_weekly)})
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(entry.dollars_paid)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditEntry(entry)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this entry?')) {
                            onDeleteEntry(entry.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {sortedLedger.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Entries:</span>
              <div className="font-medium text-gray-900">{ledger.length}</div>
            </div>
            <div>
              <span className="text-gray-600">Total Weeks:</span>
              <div className="font-medium text-gray-900">
                {ledger.reduce((sum, entry) => sum + entry.weeks, 0).toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Total Paid:</span>
              <div className="font-medium text-gray-900">
                {formatCurrency(ledger.reduce((sum, entry) => sum + entry.dollars_paid, 0))}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Proration Mode:</span>
              <div className="font-medium text-gray-900 capitalize">{prorationMode}</div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Editor Modal */}
      <LedgerEditor
        entry={editingEntry}
        isOpen={isEditorOpen}
        aww={aww}
        earningCapacity={earningCapacity}
        dateOfInjury={dateOfInjury}
        stateRateTable={stateRateTable}
        prorationMode={prorationMode}
        onSave={handleSaveEntry}
        onCancel={handleCancelEdit}
      />
    </div>
  );
}