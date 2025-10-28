import { useState } from 'react';
import { toast } from 'sonner';
import {
  exportLedgerToCSV,
  exportSessionToJSON,
  generateDemandPDF,
  createDownloadBlob,
  downloadBlob
} from '../utils/export';
import { useSessionStorage } from '../hooks/useLocalStorage';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcut';
import type { AppState, LedgerEntry, DemandCalculation } from '../types';

interface ExportButtonsProps {
  appState: AppState;
  ledger: LedgerEntry[];
  demandCalculation?: DemandCalculation;
}

export function ExportButtons({ 
  appState, 
  ledger,
  demandCalculation 
}: ExportButtonsProps) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [clientInfo] = useState({
    name: '',
    caseNumber: ''
  });
  
  const { saveSession, loadSession, getAllSessions, deleteSession } = useSessionStorage();

  const handleExportCSV = () => {
    try {
      const csvContent = exportLedgerToCSV(ledger);
      const blob = createDownloadBlob(csvContent, 'text/csv');
      const fileName = `ma-wc-ledger-${new Date().toISOString().split('T')[0]}.csv`;
      downloadBlob(blob, fileName);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Error exporting CSV file. Please try again.');
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonContent = exportSessionToJSON(appState, {
        name: `Session ${new Date().toLocaleDateString()}`,
        description: 'Manual export'
      });
      const blob = createDownloadBlob(jsonContent, 'application/json');
      const fileName = `ma-wc-session-${new Date().toISOString().split('T')[0]}.json`;
      downloadBlob(blob, fileName);
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error('Error exporting session file. Please try again.');
    }
  };

  const handleExportPDF = () => {
    if (!demandCalculation) {
      toast.warning('No demand calculation available to export.');
      return;
    }

    try {
      const pdfDataUri = generateDemandPDF(demandCalculation, appState, clientInfo);
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `ma-wc-demand-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF. Please try again.');
    }
  };

  const handleSaveSession = () => {
    if (!sessionName.trim()) {
      toast.warning('Please enter a session name.');
      return;
    }

    try {
      saveSession(appState, sessionName.trim());
      toast.success(`Session "${sessionName}" saved successfully!`);
      setShowSaveModal(false);
      setSessionName('');
      setSessionDescription('');
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Error saving session. Please try again.');
    }
  };

  const handleLoadSession = (sessionKey: string) => {
    try {
      const sessionData = loadSession(sessionKey);
      if (sessionData) {
        // In a real app, this would update the parent component's state
        // For now, we'll just download the session data
        const jsonContent = JSON.stringify(sessionData, null, 2);
        const blob = createDownloadBlob(jsonContent, 'application/json');
        downloadBlob(blob, `loaded-session-${sessionKey}.json`);
        toast.info('Session data downloaded. Import functionality would be implemented in the main app.');
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Error loading session. Please try again.');
    }
  };

  const savedSessions = getAllSessions();
  const sessionKeys = Object.keys(savedSessions);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    // Ctrl+S to open save modal
    {
      shortcut: { key: 's', ctrl: true },
      callback: () => {
        if (!showSaveModal && !showLoadModal) {
          setShowSaveModal(true);
          toast.info('Save session shortcut: Ctrl+S');
        }
      }
    },
    // Escape to close modals
    {
      shortcut: { key: 'Escape' },
      callback: () => {
        if (showSaveModal) setShowSaveModal(false);
        if (showLoadModal) setShowLoadModal(false);
      },
      enabled: showSaveModal || showLoadModal
    },
    // Ctrl+E to export JSON
    {
      shortcut: { key: 'e', ctrl: true },
      callback: () => {
        if (!showSaveModal && !showLoadModal) {
          handleExportJSON();
          toast.info('Export session shortcut: Ctrl+E');
        }
      }
    }
  ]);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Export & Session Management
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CSV Export */}
        <button
          onClick={handleExportCSV}
          disabled={ledger.length === 0}
          className="btn-secondary flex items-center justify-center"
          title="Export ledger entries to CSV file"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>

        {/* JSON Export */}
        <button
          onClick={handleExportJSON}
          className="btn-secondary flex items-center justify-center"
          title="Export complete session as JSON"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-5H8z" />
          </svg>
          Export JSON
        </button>

        {/* PDF Export */}
        <button
          onClick={handleExportPDF}
          disabled={!demandCalculation || demandCalculation.breakdowns.length === 0}
          className="btn-secondary flex items-center justify-center"
          title="Export demand calculation as PDF"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Export PDF
        </button>

        {/* Save Session */}
        <button
          onClick={() => setShowSaveModal(true)}
          className="btn-primary flex items-center justify-center"
          title="Save current session"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Save Session
        </button>
      </div>

      {/* Load Session Button */}
      {sessionKeys.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowLoadModal(true)}
            className="btn-secondary flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Load Session ({sessionKeys.length} saved)
          </button>
        </div>
      )}

      {/* Save Session Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowSaveModal(false)} />
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Save Session</h3>
                <button onClick={() => setShowSaveModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Name *
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full"
                    placeholder="e.g., Smith case - initial calculation"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={sessionDescription}
                    onChange={(e) => setSessionDescription(e.target.value)}
                    className="w-full"
                    rows={3}
                    placeholder="Additional notes about this session..."
                    maxLength={500}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button onClick={() => setShowSaveModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleSaveSession} className="btn-primary">
                    Save Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load Session Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowLoadModal(false)} />
            
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Load Session</h3>
                <button onClick={() => setShowLoadModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessionKeys.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No saved sessions found.</p>
                ) : (
                  sessionKeys.map((sessionKey) => {
                    const session = savedSessions[sessionKey];
                    return (
                      <div key={sessionKey} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {session.metadata?.name || sessionKey}
                            </h4>
                            {session.metadata?.savedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Saved: {new Date(session.metadata.savedAt).toLocaleString()}
                              </p>
                            )}
                            <p className="text-xs text-gray-600 mt-1">
                              AWW: ${session.aww} | DOI: {session.date_of_injury} |
                              {session.ledger?.length || 0} entries
                            </p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleLoadSession(sessionKey)}
                              className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this session?')) {
                                  deleteSession(sessionKey);
                                  setShowLoadModal(false);
                                }
                              }}
                              className="text-sm px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={() => setShowLoadModal(false)} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}