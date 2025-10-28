import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType } from 'docx';
import type { LedgerEntry, DemandCalculation, AppState } from '../types';
import type { BenefitsRemainingData } from '../types/settlement';
import { formatCurrency } from './money';
import { loadImageAsBase64, getLogoDisplayDimensions } from './logoUtils';

interface SettlementStatementData {
  proposedAmount: number;
  liabilityType: 'accepted' | 'unaccepted';
  standardFee: number;
  actualFee: number;
  feeReduction: number;
  expenses: Array<{ description: string; amount: number }> | number; // Can be itemized (MVA/GL) or single number (WC)
  liens?: Array<{ description: string; originalAmount: number; reducedAmount: number }>; // Optional for MVA/GL
  deductions?: Array<{ description: string; amount: number }>; // Optional for WC
  totalDeductions: number;
  netToEmployee: number;
  caseType?: 'mva' | 'gl' | 'wc'; // Optional, for display purposes
}

/**
 * Export ledger data to CSV format
 */
export function exportLedgerToCSV(ledger: LedgerEntry[]): string {
  const headers = [
    'ID',
    'Type',
    'Start Date',
    'End Date',
    'AWW Used',
    'EC Used',
    'Weeks',
    'Raw Weekly',
    'Final Weekly',
    'Dollars Paid',
    'Notes'
  ];
  
  const csvRows = [headers.join(',')];
  
  ledger.forEach(entry => {
    const row = [
      `"${entry.id}"`,
      `"${entry.type}"`,
      `"${entry.start}"`,
      `"${entry.end || 'Present'}"`,
      entry.aww_used ? entry.aww_used.toString() : '',
      entry.ec_used ? entry.ec_used.toString() : '',
      entry.weeks.toString(),
      entry.raw_weekly.toString(),
      entry.final_weekly.toString(),
      entry.dollars_paid.toString(),
      `"${entry.notes || ''}"`
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

/**
 * Export complete session data to JSON
 */
export function exportSessionToJSON(data: AppState, metadata: { name: string; description?: string }): string {
  const sessionData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    data,
    metadata
  };
  
  return JSON.stringify(sessionData, null, 2);
}

/**
 * Generate PDF demand summary
 */
export function generateDemandPDF(
  demand: DemandCalculation,
  appState: AppState,
  clientInfo?: { name?: string; caseNumber?: string }
): string {
  const doc = new jsPDF();
  let yPosition = 20;
  
  // Header
  doc.setFontSize(18);
  doc.text('Massachusetts Workers\' Compensation Demand Calculation', 20, yPosition);
  yPosition += 10;
  
  // Client info if provided
  if (clientInfo?.name || clientInfo?.caseNumber) {
    doc.setFontSize(12);
    if (clientInfo.name) {
      doc.text(`Client: ${clientInfo.name}`, 20, yPosition);
      yPosition += 7;
    }
    if (clientInfo.caseNumber) {
      doc.text(`Case: ${clientInfo.caseNumber}`, 20, yPosition);
      yPosition += 7;
    }
    yPosition += 5;
  }
  
  // Basic information
  doc.setFontSize(12);
  doc.text(`Average Weekly Wage: ${formatCurrency(appState.aww)}`, 20, yPosition);
  yPosition += 7;
  doc.text(`Date of Injury: ${appState.date_of_injury}`, 20, yPosition);
  yPosition += 7;
  doc.text(`Earning Capacity: ${formatCurrency(appState.earning_capacity_default)}`, 20, yPosition);
  yPosition += 15;
  
  // Demand breakdown
  doc.setFontSize(14);
  doc.text('Demand Breakdown:', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(11);
  demand.breakdowns.forEach(breakdown => {
    const benefitName = getBenefitDisplayName(breakdown.type);
    doc.text(`${benefitName}:`, 20, yPosition);
    yPosition += 6;
    doc.text(`  ${breakdown.requestedYears} years (${breakdown.requestedWeeks} weeks) × ${formatCurrency(breakdown.weeklyRate)}/week`, 25, yPosition);
    yPosition += 6;
    doc.text(`  Total: ${formatCurrency(breakdown.totalAmount)}`, 25, yPosition);
    yPosition += 8;
    
    if (breakdown.exceedsStatutory || breakdown.exceedsRemaining) {
      doc.setTextColor(255, 0, 0); // Red for warnings
      if (breakdown.exceedsStatutory) {
        doc.text(`  ⚠ Exceeds statutory maximum`, 25, yPosition);
        yPosition += 6;
      }
      if (breakdown.exceedsRemaining) {
        doc.text(`  ⚠ Exceeds remaining entitlement`, 25, yPosition);
        yPosition += 6;
      }
      doc.setTextColor(0, 0, 0); // Back to black
      yPosition += 3;
    }
  });
  
  // Totals
  yPosition += 5;
  doc.text(`Subtotal: ${formatCurrency(demand.subtotal)}`, 20, yPosition);
  yPosition += 7;
  
  if (demand.section36Amount > 0) {
    doc.text(`Section 36 (Scarring/Disfigurement): ${formatCurrency(demand.section36Amount)}`, 20, yPosition);
    yPosition += 7;
  }
  
  if (demand.section28Applied) {
    doc.text(`Section 28 Penalty Applied (${demand.section28Multiplier}x multiplier)`, 20, yPosition);
    yPosition += 7;
  }
  
  doc.setFontSize(14);
  doc.text(`TOTAL DEMAND: ${formatCurrency(demand.grandTotal)}`, 20, yPosition);
  
  // Footer
  yPosition = 280;
  doc.setFontSize(8);
  doc.text(`Generated by MA WC Benefits Calculator - ${new Date().toLocaleDateString()}`, 20, yPosition);
  
  return doc.output('datauristring');
}

/**
 * Create downloadable blob from string content
 */
export function createDownloadBlob(content: string, mimeType: string): Blob {
  return new Blob([content], { type: mimeType });
}

/**
 * Trigger download of a blob with specified filename
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate settlement statement PDF matching professional template
 */
export async function generateSettlementStatementPDF(
  settlementData: SettlementStatementData,
  clientInfo?: { name?: string; clientName?: string; attorney?: string; attorneyName?: string; dateOfInjury?: string; date?: string; address?: string; city?: string; state?: string; zipCode?: string }
): Promise<string> {
  const doc = new jsPDF();
  const pageHeight = 280; // Safe page height to avoid overflow
  const leftMargin = 20;
  let yPosition = 20;
  let currentPage = 1;

  // Helper function to check if we need a new page
  const checkPageBreak = (neededSpace: number) => {
    if (yPosition + neededSpace > pageHeight) {
      // Add page footer before creating new page
      doc.setFontSize(8);
      doc.text(`Page ${currentPage} of 2`, 105, 285, { align: 'center' });

      doc.addPage();
      currentPage++;
      yPosition = 20;
    }
  };

  const clientName = clientInfo?.clientName || clientInfo?.name || 'CLIENT NAME';

  // Add logo if available
  try {
    const logoBase64 = await loadImageAsBase64('/JGIL Logo.jpg');
    const logoDimensions = await getLogoDisplayDimensions('/JGIL Logo.jpg', 50, 30);
    doc.addImage(logoBase64, 'JPEG', leftMargin, yPosition, logoDimensions.width, logoDimensions.height);
    yPosition += logoDimensions.height + 10;
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    yPosition += 10;
  }

  // Date (top right)
  doc.setFontSize(11);
  doc.text(`October 28, 2025`, 150, 30);
  yPosition = 50;

  // Client name and address section
  doc.setFontSize(11);
  doc.text(clientName, leftMargin, yPosition);
  yPosition += 6;

  const address = clientInfo?.address || 'ADDRESS';
  doc.text(address, leftMargin, yPosition);
  yPosition += 6;

  const city = clientInfo?.city || 'CITY';
  const state = clientInfo?.state || 'STATE';
  const zipCode = clientInfo?.zipCode || 'ZIP';
  doc.text(`${city}, ${state} ${zipCode}`, leftMargin, yPosition);
  yPosition += 15;

  // Re: line
  doc.setFont('helvetica', 'bold');
  const injuryDate = clientInfo?.dateOfInjury || '2025-01-05';
  doc.text(`Re: Your Personal Injury Case of ${injuryDate}`, leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  yPosition += 15;

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('"DISTRIBUTION OF SETTLEMENT PROCEEDS"', 105, yPosition, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  yPosition += 12;

  // Total Settlement (bold)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Settlement', leftMargin, yPosition);
  doc.text(formatCurrency(settlementData.proposedAmount), 170, yPosition, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  yPosition += 10;

  // Expenses section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Expenses', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  yPosition += 6;

  // Handle both itemized expenses (array) and single expense (number)
  let totalExpenses = 0;
  if (Array.isArray(settlementData.expenses)) {
    // Itemized expenses (MVA/GL format)
    totalExpenses = settlementData.expenses.reduce((sum, exp) => sum + exp.amount, 0);

    settlementData.expenses.forEach(expense => {
      if (expense.amount > 0) {
        checkPageBreak(10); // Increase space check for potential wrapped lines
        const desc = expense.description.trim() || 'Expense';
        const expenseText = `    ${desc}`;

        // Split text to max width of 110mm to prevent overlap with amount column at 170mm
        const wrappedLines = doc.splitTextToSize(expenseText, 110);
        doc.text(wrappedLines, 30, yPosition);

        // Amount aligns with the first line of wrapped text
        doc.text(formatCurrency(expense.amount), 170, yPosition, { align: 'right' });

        // Advance yPosition by number of lines (each line ~5mm)
        yPosition += (wrappedLines.length * 5);
      }
    });

    if (settlementData.expenses.length > 0) {
      checkPageBreak(6);
      doc.setFont('helvetica', 'bold');
      doc.text('    Total Expenses:', 30, yPosition);
      doc.text(formatCurrency(totalExpenses), 170, yPosition, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      yPosition += 8;
    }
  } else {
    // Single expense amount (WC format)
    totalExpenses = settlementData.expenses;
    if (totalExpenses > 0) {
      checkPageBreak(6);
      doc.text(`    Attorney Expenses`, 30, yPosition);
      doc.text(formatCurrency(totalExpenses), 170, yPosition, { align: 'right' });
      yPosition += 8;
    }
  }

  // Liens section (MVA/GL format)
  if (settlementData.liens && settlementData.liens.length > 0) {
    checkPageBreak(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Liens', leftMargin, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 6;

    // List each lien with reduction info
    settlementData.liens.forEach(lien => {
      if (lien.reducedAmount > 0) {
        checkPageBreak(10); // Increase space check for potential wrapped lines
        const desc = lien.description.trim() || 'Lien';
        let lienText = `    ${desc}`;
        if (lien.originalAmount > lien.reducedAmount) {
          lienText += ` (reduced from ${formatCurrency(lien.originalAmount)})`;
        }

        // Split text to max width of 110mm to prevent overlap with amount column at 170mm
        const wrappedLines = doc.splitTextToSize(lienText, 110);
        doc.text(wrappedLines, 30, yPosition);

        // Amount aligns with the first line of wrapped text
        doc.text(formatCurrency(lien.reducedAmount), 170, yPosition, { align: 'right' });

        // Advance yPosition by number of lines (each line ~5mm)
        yPosition += (wrappedLines.length * 5);
      }
    });

    // Total Liens
    const totalLiens = settlementData.liens.reduce((sum, lien) => sum + lien.reducedAmount, 0);
    if (totalLiens > 0) {
      checkPageBreak(6);
      doc.setFont('helvetica', 'bold');
      doc.text('    Total Liens:', 30, yPosition);
      doc.text(formatCurrency(totalLiens), 170, yPosition, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      yPosition += 8;
    }
  }

  // Deductions section (WC format)
  if (settlementData.deductions && settlementData.deductions.length > 0) {
    checkPageBreak(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Deductions', leftMargin, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 6;

    settlementData.deductions.forEach(deduction => {
      if (deduction.amount > 0) {
        checkPageBreak(10); // Increase space check for potential wrapped lines
        const desc = deduction.description.trim() || 'Deduction';
        const deductionText = `    ${desc}`;

        // Split text to max width of 110mm to prevent overlap with amount column at 170mm
        const wrappedLines = doc.splitTextToSize(deductionText, 110);
        doc.text(wrappedLines, 30, yPosition);

        // Amount aligns with the first line of wrapped text
        doc.text(formatCurrency(deduction.amount), 170, yPosition, { align: 'right' });

        // Advance yPosition by number of lines (each line ~5mm)
        yPosition += (wrappedLines.length * 5);
      }
    });

    const totalDeductions = settlementData.deductions.reduce((sum, d) => sum + d.amount, 0);
    if (totalDeductions > 0) {
      checkPageBreak(6);
      doc.setFont('helvetica', 'bold');
      doc.text('    Total Deductions:', 30, yPosition);
      doc.text(formatCurrency(totalDeductions), 170, yPosition, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      yPosition += 8;
    }
  }

  // Legal Fee
  checkPageBreak(8);
  doc.setFont('helvetica', 'bold');
  const feePercent = ((settlementData.actualFee / settlementData.proposedAmount) * 100).toFixed(6);
  doc.text(`Legal Fee ${feePercent}%`, leftMargin, yPosition);
  doc.text(formatCurrency(settlementData.actualFee), 170, yPosition, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  yPosition += 12;

  // TOTAL DUE CLIENT (boxed)
  checkPageBreak(15);
  doc.setDrawColor(0);
  doc.setLineWidth(1);
  doc.rect(15, yPosition - 8, 180, 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DUE CLIENT:', leftMargin, yPosition);
  doc.text(formatCurrency(settlementData.netToEmployee), 170, yPosition, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  yPosition += 20;

  // Add Page 1 footer
  doc.setFontSize(8);
  doc.text('Page 1 of 2', 105, 285, { align: 'center' });

  // ========== PAGE 2 START ==========
  doc.addPage();
  currentPage = 2;
  yPosition = 20;

  // Complete authorization language with client name substitution
  doc.setFontSize(10);
  const authorizationText = `I, ${clientName}, hereby authorize Jeffrey S. Glassman to distribute my settlement proceeds as noted above.  This includes the authorization to sign my name to any and all documents including checks and releases, which require my endorsement.  I am also aware that I am responsible for any outstanding medical bills and liens and that my settlement may included all or a portion of my outstanding medical bills whereby the medical provider or lien holder could potentially pursue a claim against me for any outstanding amount owed.  In addition I understand that if I have health insurance, the health insurance company may have at right to recover from me the amount they have paid.  Notwithstanding the above, I hereby direct the Law Offices of Jeffrey S. Glassman, LLC to issue all net settlement proceeds to me.  I understand that once I sign the release and the funds are disbursed, that this concludes my case and that the firm will be closing the case and the contents will be destroyed within 7 years.

I also have been informed that any settlement proceeds are subjected to Department of Revenue attachment for any outstanding child support (pursuant to M.G.L. c. 175 § 186 (24D)), Medicare benefits or taxes owed.  These settlement proceeds are also subject to attachment for any benefits received through Mass Health / The Department of Transitional Assistance and I further understand that these liens will be paid on my behalf by the Law Offices of Jeffrey S. Glassman in accordance with Massachusetts General Law.`;

  // Split text to fit within margins (170mm width)
  const splitText = doc.splitTextToSize(authorizationText, 170);
  doc.text(splitText, leftMargin, yPosition);
  yPosition += 10;

  // Certification statement
  doc.text('I certify that I have read the foregoing and agree with its contents.', leftMargin, yPosition);
  yPosition += 15;

  // Signature line
  doc.text('Signed this _____ day of ____________________, 20____', leftMargin, yPosition);
  yPosition += 15;

  doc.line(leftMargin, yPosition, 150, yPosition);
  yPosition += 5;
  doc.text('CLIENT NAME', leftMargin, yPosition);
  yPosition += 15;

  // Checkboxes
  doc.setFont('helvetica', 'bold');
  doc.text('PLEASE CHECK ONE:', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  yPosition += 7;

  doc.rect(leftMargin, yPosition - 3, 3, 3); // checkbox
  doc.text('I HAVE RECEIVED MEDICARE BENEFITS.', 28, yPosition);
  yPosition += 6;

  doc.rect(leftMargin, yPosition - 3, 3, 3); // checkbox
  doc.text('I HAVE NOT RECEIVED MEDICARE BENEFITS.', 28, yPosition);
  yPosition += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('PLEASE CHECK ONE:', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  yPosition += 7;

  doc.rect(leftMargin, yPosition - 3, 3, 3); // checkbox
  doc.text('I WOULD LIKE TO PICK UP MY SETTLEMENT CHECK FROM ATTORNEY', 28, yPosition);
  yPosition += 6;
  doc.text('GLASSMAN', 28, yPosition);
  yPosition += 6;

  doc.rect(leftMargin, yPosition - 3, 3, 3); // checkbox
  doc.text('I WOULD LIKE MY CHECK MAILED TO ME AT THE FOLLOWING ADDRESS:', 28, yPosition);
  yPosition += 8;

  // Address lines
  doc.line(35, yPosition, 160, yPosition);
  yPosition += 8;
  doc.line(35, yPosition, 160, yPosition);
  yPosition += 8;
  doc.line(35, yPosition, 160, yPosition);

  // Page 2 footer
  doc.setFontSize(8);
  doc.text('Page 2 of 2', 105, 285, { align: 'center' });

  return doc.output('datauristring');
}

/**
 * Generate settlement statement as Excel file
 */
export function generateSettlementStatementExcel(
  settlementData: SettlementStatementData,
  clientInfo?: { name?: string; clientName?: string; attorney?: string; attorneyName?: string; dateOfInjury?: string; date?: string; address?: string; city?: string; state?: string; zipCode?: string }
): Blob {
  const wb = XLSX.utils.book_new();

  const clientName = clientInfo?.clientName || clientInfo?.name || 'CLIENT NAME';
  const attorneyName = clientInfo?.attorneyName || clientInfo?.attorney || '';
  const address = clientInfo?.address || 'ADDRESS';
  const city = clientInfo?.city || 'CITY';
  const state = clientInfo?.state || 'STATE';
  const zipCode = clientInfo?.zipCode || 'ZIP';

  // Create settlement distribution data
  const wsData = [
    ['Settlement Distribution Statement'],
    [''],
    ['Attorney:', attorneyName],
    ['Client:', clientName],
    ['Address:', address],
    ['City, State ZIP:', `${city}, ${state} ${zipCode}`],
    ['Date of Injury:', clientInfo?.dateOfInjury || ''],
    ['Date:', clientInfo?.date || new Date().toLocaleDateString()],
    [''],
    ['DISTRIBUTION OF SETTLEMENT PROCEEDS'],
    ['Total Settlement:', formatCurrency(settlementData.proposedAmount)],
    [''],
    ['EXPENSES'],
  ];

  // Add expenses (handle both formats)
  let totalExpenses = 0;
  if (Array.isArray(settlementData.expenses)) {
    totalExpenses = settlementData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    settlementData.expenses.forEach(expense => {
      if (expense.amount > 0) {
        wsData.push([`  ${expense.description}`, formatCurrency(expense.amount)]);
      }
    });
    if (settlementData.expenses.length > 0) {
      wsData.push(['  Total Expenses:', formatCurrency(totalExpenses)]);
      wsData.push(['']);
    }
  } else {
    totalExpenses = settlementData.expenses;
    if (totalExpenses > 0) {
      wsData.push(['  Attorney Expenses', formatCurrency(totalExpenses)]);
      wsData.push(['']);
    }
  }

  // Add liens (MVA/GL format)
  if (settlementData.liens && settlementData.liens.length > 0) {
    wsData.push(['LIENS']);
    const totalLiens = settlementData.liens.reduce((sum, lien) => sum + lien.reducedAmount, 0);
    settlementData.liens.forEach(lien => {
      if (lien.reducedAmount > 0) {
        let lienDesc = `  ${lien.description}`;
        if (lien.originalAmount > lien.reducedAmount) {
          lienDesc += ` (reduced from ${formatCurrency(lien.originalAmount)})`;
        }
        wsData.push([lienDesc, formatCurrency(lien.reducedAmount)]);
      }
    });
    if (totalLiens > 0) {
      wsData.push(['  Total Liens:', formatCurrency(totalLiens)]);
      wsData.push(['']);
    }
  }

  // Add deductions (WC format)
  if (settlementData.deductions && settlementData.deductions.length > 0) {
    wsData.push(['ADDITIONAL DEDUCTIONS']);
    const totalDeductions = settlementData.deductions.reduce((sum, d) => sum + d.amount, 0);
    settlementData.deductions.forEach(deduction => {
      if (deduction.amount > 0) {
        wsData.push([`  ${deduction.description}`, formatCurrency(deduction.amount)]);
      }
    });
    if (totalDeductions > 0) {
      wsData.push(['  Total Deductions:', formatCurrency(totalDeductions)]);
      wsData.push(['']);
    }
  }

  // Legal Fee
  const feePercent = ((settlementData.actualFee / settlementData.proposedAmount) * 100).toFixed(6);
  wsData.push([`Legal Fee ${feePercent}%:`, formatCurrency(settlementData.actualFee)]);
  wsData.push(['']);

  wsData.push(
    ['TOTAL DUE CLIENT:', formatCurrency(settlementData.netToEmployee)],
    [''],
    ['This statement reflects the distribution of settlement funds as calculated.'],
    ['Please review carefully and contact your attorney with any questions.']
  );

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Style the header
  if (ws['A1']) ws['A1'].s = { font: { bold: true, size: 16 } };
  if (ws['A8']) ws['A8'].s = { font: { bold: true } };
  if (ws[`A${wsData.length - 5}`]) ws[`A${wsData.length - 5}`].s = { font: { bold: true, size: 14 } };

  XLSX.utils.book_append_sheet(wb, ws, 'Settlement Distribution');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generate settlement statement as Word document
 */
export async function generateSettlementStatementWord(
  settlementData: SettlementStatementData,
  clientInfo?: { name?: string; clientName?: string; attorney?: string; attorneyName?: string; dateOfInjury?: string; date?: string; address?: string; city?: string; state?: string; zipCode?: string }
): Promise<Blob> {
  const children: any[] = [
    new Paragraph({
      children: [new TextRun({ text: 'Settlement Distribution Statement', bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  ];

  const clientName = clientInfo?.clientName || clientInfo?.name || 'CLIENT NAME';
  const attorneyName = clientInfo?.attorneyName || clientInfo?.attorney || '';
  const address = clientInfo?.address || 'ADDRESS';
  const city = clientInfo?.city || 'CITY';
  const state = clientInfo?.state || 'STATE';
  const zipCode = clientInfo?.zipCode || 'ZIP';

  // Client info
  const infoRows = [
    [`Attorney: ${attorneyName}`],
    [`Client: ${clientName}`],
    [`Address: ${address}`],
    [`City, State ZIP: ${city}, ${state} ${zipCode}`],
    [`Date of Injury: ${clientInfo?.dateOfInjury || ''}`],
    [`Date: ${clientInfo?.date || new Date().toLocaleDateString()}`]
  ];

  children.push(
    ...infoRows.map(row => new Paragraph({
      children: [new TextRun({ text: row[0] })],
      spacing: { after: 100 }
    })),
    new Paragraph({
      children: [new TextRun({ text: 'DISTRIBUTION OF SETTLEMENT PROCEEDS', bold: true })],
      spacing: { before: 200, after: 200 }
    })
  );

  // Settlement breakdown table
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total Settlement:', bold: true })] })] }),
        new TableCell({ children: [new Paragraph(formatCurrency(settlementData.proposedAmount))] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'EXPENSES', bold: true })] })] }),
        new TableCell({ children: [new Paragraph('')] })
      ]
    })
  ];

  // Add expenses (handle both formats)
  let totalExpenses = 0;
  if (Array.isArray(settlementData.expenses)) {
    totalExpenses = settlementData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    settlementData.expenses.forEach(expense => {
      if (expense.amount > 0) {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(`  ${expense.description}`)] }),
              new TableCell({ children: [new Paragraph(formatCurrency(expense.amount))] })
            ]
          })
        );
      }
    });

    if (settlementData.expenses.length > 0) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '  Total Expenses:', bold: true })] })] }),
            new TableCell({ children: [new Paragraph(formatCurrency(totalExpenses))] })
          ]
        })
      );
    }
  } else {
    totalExpenses = settlementData.expenses;
    if (totalExpenses > 0) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('  Attorney Expenses')] }),
            new TableCell({ children: [new Paragraph(formatCurrency(totalExpenses))] })
          ]
        })
      );
    }
  }

  // Add liens (MVA/GL format)
  if (settlementData.liens && settlementData.liens.length > 0) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'LIENS', bold: true })] })] }),
          new TableCell({ children: [new Paragraph('')] })
        ]
      })
    );

    const totalLiens = settlementData.liens.reduce((sum, lien) => sum + lien.reducedAmount, 0);
    settlementData.liens.forEach(lien => {
      if (lien.reducedAmount > 0) {
        let lienDesc = `  ${lien.description}`;
        if (lien.originalAmount > lien.reducedAmount) {
          lienDesc += ` (reduced from ${formatCurrency(lien.originalAmount)})`;
        }
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(lienDesc)] }),
              new TableCell({ children: [new Paragraph(formatCurrency(lien.reducedAmount))] })
            ]
          })
        );
      }
    });

    if (totalLiens > 0) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '  Total Liens:', bold: true })] })] }),
            new TableCell({ children: [new Paragraph(formatCurrency(totalLiens))] })
          ]
        })
      );
    }
  }

  // Add deductions (WC format)
  if (settlementData.deductions && settlementData.deductions.length > 0) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ADDITIONAL DEDUCTIONS', bold: true })] })] }),
          new TableCell({ children: [new Paragraph('')] })
        ]
      })
    );

    const totalDeductions = settlementData.deductions.reduce((sum, d) => sum + d.amount, 0);
    settlementData.deductions.forEach(deduction => {
      if (deduction.amount > 0) {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(`  ${deduction.description}`)] }),
              new TableCell({ children: [new Paragraph(formatCurrency(deduction.amount))] })
            ]
          })
        );
      }
    });

    if (totalDeductions > 0) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '  Total Deductions:', bold: true })] })] }),
            new TableCell({ children: [new Paragraph(formatCurrency(totalDeductions))] })
          ]
        })
      );
    }
  }

  // Legal Fee
  const feePercent = ((settlementData.actualFee / settlementData.proposedAmount) * 100).toFixed(6);
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Legal Fee ${feePercent}%`, bold: true })] })] }),
        new TableCell({ children: [new Paragraph(formatCurrency(settlementData.actualFee))] })
      ]
    })
  )

  tableRows.push(
    new TableRow({
      children: [
        new TableCell({ 
          children: [new Paragraph({ 
            children: [new TextRun({ text: 'NET AMOUNT TO CLIENT:', bold: true })]
          })] 
        }),
        new TableCell({ 
          children: [new Paragraph({ 
            children: [new TextRun({ text: formatCurrency(settlementData.netToEmployee), bold: true })]
          })] 
        })
      ]
    })
  );

  children.push(
    new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'This statement reflects the distribution of settlement funds as calculated.' })],
      spacing: { before: 400, after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Please review carefully and contact your attorney with any questions.' })],
      spacing: { after: 100 }
    })
  );

  const doc = new Document({
    sections: [{ children }]
  });

  return await Packer.toBlob(doc);
}

/**
 * Get display name for benefit types
 */
function getBenefitDisplayName(type: string): string {
  switch (type) {
    case '34':
      return 'Section 34 (Temporary Total Disability)';
    case '35':
      return 'Section 35 (Temporary Partial Disability)';
    case '35ec':
      return 'Section 35 with Earning Capacity';
    case '34A':
      return 'Section 34A (Permanent & Total)';
    case '31':
      return 'Section 31 (Widow/Dependent)';
    default:
      return type;
  }
}

/**
 * Get short display name for benefit types
 */
function getBenefitShortName(type: string): string {
  switch (type) {
    case '34':
      return 'Section 34 (TTD)';
    case '35':
      return 'Section 35 (TPD)';
    case '35ec':
      return 'Section 35 EC';
    case '34A':
      return 'Section 34A (P&T)';
    case '31':
      return 'Section 31';
    default:
      return type;
  }
}

/**
 * Generate Benefits Remaining PDF for client presentation
 */
export async function generateBenefitsRemainingPDF(
  data: BenefitsRemainingData
): Promise<string> {
  const doc = new jsPDF();
  let yPosition = 20;

  // Add logo if available
  try {
    const logoBase64 = await loadImageAsBase64('/JGIL Logo.jpg');
    const logoDimensions = await getLogoDisplayDimensions('/JGIL Logo.jpg', 50, 30);
    doc.addImage(logoBase64, 'JPEG', 20, yPosition - 5, logoDimensions.width, logoDimensions.height);
    yPosition += logoDimensions.height + 5;
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
  }

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Workers\' Compensation Benefits Summary', 105, yPosition, { align: 'center' });
  yPosition += 15;

  // Client info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  if (data.clientInfo.clientName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Client:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientInfo.clientName, 50, yPosition);
    yPosition += 7;
  }

  if (data.clientInfo.attorneyName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Attorney:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientInfo.attorneyName, 50, yPosition);
    yPosition += 7;
  }

  if (data.clientInfo.dateOfInjury) {
    doc.setFont('helvetica', 'bold');
    doc.text('Date of Injury:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientInfo.dateOfInjury, 50, yPosition);
    yPosition += 7;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Report Date:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  const displayDate = data.clientInfo.date ? new Date(data.clientInfo.date).toLocaleDateString() : new Date().toLocaleDateString();
  doc.text(displayDate, 50, yPosition);
  yPosition += 15;

  // Draw a separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 10;

  // Individual Benefits Section
  if (data.options.includeIndividualBenefits) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204); // Blue color
    doc.text('Your Benefits Breakdown', 20, yPosition);
    doc.setTextColor(0, 0, 0); // Reset to black
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Filter benefits based on selectedBenefitTypes if specified
    const benefitsToShow = data.remainingEntitlements.filter(entitlement => {
      if (data.options.selectedBenefitTypes && data.options.selectedBenefitTypes.length > 0) {
        return data.options.selectedBenefitTypes.includes(entitlement.type);
      }
      return true;
    });

    for (const entitlement of benefitsToShow) {
      const benefit = data.benefitCalculations.find(b => b.type === entitlement.type);
      if (!benefit) continue;

      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Benefit type header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(getBenefitShortName(entitlement.type), 20, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Weekly rate
      doc.text(`Weekly Rate: ${formatCurrency(benefit.finalWeekly)}`, 25, yPosition);
      yPosition += 6;

      if (entitlement.isLifeBenefit) {
        // Life benefit
        doc.text(`Weeks Used: ${entitlement.weeksUsed.toFixed(2)}`, 25, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 128, 0); // Green
        doc.text('Status: Life Benefit (No Statutory Limit)', 25, yPosition);
        doc.setTextColor(0, 0, 0); // Reset
        doc.setFont('helvetica', 'normal');
        yPosition += 8;
      } else {
        // Finite benefit
        doc.text(`Maximum Weeks: ${entitlement.statutoryMaxWeeks}`, 25, yPosition);
        yPosition += 6;
        doc.text(`Weeks Used: ${entitlement.weeksUsed.toFixed(2)}`, 25, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 128, 0); // Green
        doc.text(`Weeks Remaining: ${entitlement.weeksRemaining?.toFixed(2) || '0.00'}`, 25, yPosition);
        doc.setTextColor(0, 0, 0); // Reset
        doc.setFont('helvetica', 'normal');
        yPosition += 6;

        if (entitlement.dollarsRemaining !== null) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(0, 102, 0); // Dark green
          doc.text(`Dollar Value Remaining: ${formatCurrency(entitlement.dollarsRemaining)}`, 25, yPosition);
          doc.setTextColor(0, 0, 0); // Reset
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          yPosition += 8;
        }

        // Progress bar
        if (data.options.includeProgressBars && entitlement.statutoryMaxWeeks) {
          const progressPercent = (entitlement.weeksUsed / entitlement.statutoryMaxWeeks) * 100;
          const barWidth = 150;
          const barHeight = 8;
          const barX = 25;
          const barY = yPosition;

          // Background (gray)
          doc.setFillColor(220, 220, 220);
          doc.rect(barX, barY, barWidth, barHeight, 'F');

          // Progress fill (color based on usage)
          const fillWidth = (barWidth * progressPercent) / 100;
          if (progressPercent >= 90) {
            doc.setFillColor(220, 38, 38); // Red
          } else if (progressPercent >= 70) {
            doc.setFillColor(234, 179, 8); // Yellow
          } else {
            doc.setFillColor(34, 197, 94); // Green
          }
          doc.rect(barX, barY, fillWidth, barHeight, 'F');

          // Progress text
          doc.setFontSize(9);
          doc.text(`${progressPercent.toFixed(1)}% Used`, barX + barWidth + 5, barY + 6);
          yPosition += 12;
        }
      }

      yPosition += 5;
    }
  }

  // Combined Limits Section
  if (data.options.includeCombinedLimits) {
    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Draw separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204); // Blue color
    doc.text('Combined Benefit Limits', 20, yPosition);
    doc.setTextColor(0, 0, 0); // Reset
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Combined 34 + 35 (7-year cap)
    doc.setFont('helvetica', 'bold');
    doc.text('Combined Sections 34 + 35 (7-Year Cap)', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 7;

    doc.text(`Maximum: ${data.combinedUsage.maxWeeks} weeks`, 25, yPosition);
    yPosition += 6;
    doc.text(`Used: ${data.combinedUsage.weeksUsed.toFixed(2)} weeks`, 25, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 128, 0);
    doc.text(`Remaining: ${data.combinedUsage.weeksRemaining.toFixed(2)} weeks`, 25, yPosition);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    yPosition += 8;

    // Progress bar for combined 34+35
    if (data.options.includeProgressBars) {
      const combinedProgress = (data.combinedUsage.weeksUsed / data.combinedUsage.maxWeeks) * 100;
      const barWidth = 150;
      const barHeight = 8;
      const barX = 25;
      const barY = yPosition;

      doc.setFillColor(220, 220, 220);
      doc.rect(barX, barY, barWidth, barHeight, 'F');

      const fillWidth = (barWidth * combinedProgress) / 100;
      if (combinedProgress >= 90) {
        doc.setFillColor(220, 38, 38);
      } else if (combinedProgress >= 70) {
        doc.setFillColor(234, 179, 8);
      } else {
        doc.setFillColor(34, 197, 94);
      }
      doc.rect(barX, barY, fillWidth, barHeight, 'F');

      doc.setFontSize(9);
      doc.text(`${combinedProgress.toFixed(1)}% Used`, barX + barWidth + 5, barY + 6);
      yPosition += 12;
    }

    yPosition += 5;

    // Combined 35 + 35EC (4-year cap) if applicable
    if (data.combined35Usage.weeksUsed > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Combined Sections 35 + 35EC (4-Year Cap)', 20, yPosition);
      doc.setFont('helvetica', 'normal');
      yPosition += 7;

      doc.text(`Maximum: ${data.combined35Usage.maxWeeks} weeks`, 25, yPosition);
      yPosition += 6;
      doc.text(`Used: ${data.combined35Usage.weeksUsed.toFixed(2)} weeks`, 25, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 128, 0);
      doc.text(`Remaining: ${data.combined35Usage.weeksRemaining.toFixed(2)} weeks`, 25, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPosition += 8;

      // Progress bar for combined 35+35EC
      if (data.options.includeProgressBars) {
        const combined35Progress = (data.combined35Usage.weeksUsed / data.combined35Usage.maxWeeks) * 100;
        const barWidth = 150;
        const barHeight = 8;
        const barX = 25;
        const barY = yPosition;

        doc.setFillColor(220, 220, 220);
        doc.rect(barX, barY, barWidth, barHeight, 'F');

        const fillWidth = (barWidth * combined35Progress) / 100;
        if (combined35Progress >= 90) {
          doc.setFillColor(220, 38, 38);
        } else if (combined35Progress >= 70) {
          doc.setFillColor(234, 179, 8);
        } else {
          doc.setFillColor(34, 197, 94);
        }
        doc.rect(barX, barY, fillWidth, barHeight, 'F');

        doc.setFontSize(9);
        doc.text(`${combined35Progress.toFixed(1)}% Used`, barX + barWidth + 5, barY + 6);
        yPosition += 12;
      }
    }
  }

  // Total Paid Section
  if (data.options.includeTotalPaid) {
    // Check if we need a new page
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    // Draw separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204);
    doc.text('Total Benefits Paid', 20, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Dollars Paid to Date: ${formatCurrency(data.totalDollarsPaid)}`, 20, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 15;
  }

  // Settlement Offer Section
  if (data.options.includeSettlementOffer && data.options.settlementAmount && data.options.settlementAmount > 0) {
    // Check if we need a new page
    if (yPosition > 180) {
      doc.addPage();
      yPosition = 20;
    }

    // Draw separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204);
    doc.text('Proposed Settlement Analysis', 20, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Settlement Amount: ${formatCurrency(data.options.settlementAmount)}`, 20, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 10;

    // Settlement allocations table
    if (data.options.settlementAllocations && data.options.settlementAllocations.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Allocation Breakdown:', 20, yPosition);
      yPosition += 8;

      // Table headers
      const colX = {
        benefit: 20,
        weekly: 65,
        amount: 100,
        weeks: 135,
        years: 165
      };

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Benefit Type', colX.benefit, yPosition);
      doc.text('Weekly Rate', colX.weekly, yPosition);
      doc.text('Allocated', colX.amount, yPosition);
      doc.text('Weeks', colX.weeks, yPosition);
      doc.text('Years', colX.years, yPosition);
      yPosition += 5;

      // Draw header line
      doc.setDrawColor(150, 150, 150);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      let totalAllocated = 0;

      for (const allocation of data.options.settlementAllocations) {
        // Check if we need a new page
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        const benefit = data.benefitCalculations.find(b => b.type === allocation.type);
        const benefitName = getBenefitShortName(allocation.type);

        doc.text(benefitName, colX.benefit, yPosition);
        doc.text(formatCurrency(benefit?.finalWeekly || 0), colX.weekly, yPosition);
        doc.text(formatCurrency(allocation.amountAllocated), colX.amount, yPosition);
        doc.text(allocation.weeksCovered.toFixed(2), colX.weeks, yPosition);
        doc.text(allocation.yearsCovered.toFixed(2), colX.years, yPosition);

        totalAllocated += allocation.amountAllocated;
        yPosition += 6;
      }

      // Section 36 (Scarring/Disfigurement)
      if (data.options.section36Amount && data.options.section36Amount > 0) {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text('Section 36 (Scarring)', colX.benefit, yPosition);
        doc.text('N/A', colX.weekly, yPosition);
        doc.text(formatCurrency(data.options.section36Amount), colX.amount, yPosition);
        doc.text('N/A', colX.weeks, yPosition);
        doc.text('N/A', colX.years, yPosition);

        totalAllocated += data.options.section36Amount;
        yPosition += 6;
      }

      // Draw bottom line
      yPosition += 2;
      doc.setDrawColor(150, 150, 150);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 6;

      // Total row
      doc.setFont('helvetica', 'bold');
      doc.text('Total Allocated:', colX.benefit, yPosition);
      doc.text(formatCurrency(totalAllocated), colX.amount, yPosition);
      yPosition += 10;

      // Settlement analysis
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // Calculate what percentage of remaining benefits this represents
      // Filter entitlements by selectedBenefitTypes to match what's shown in the benefits breakdown
      const entitlementsToCount = data.remainingEntitlements.filter(entitlement => {
        if (data.options.selectedBenefitTypes && data.options.selectedBenefitTypes.length > 0) {
          return data.options.selectedBenefitTypes.includes(entitlement.type);
        }
        return true;
      });

      // Use a Set to track benefit types we've already counted to avoid double-counting shared limits
      const countedSharedLimits = new Set<string>();
      const totalRemainingValue = entitlementsToCount.reduce((sum, ent) => {
        if (!ent.isLifeBenefit && ent.dollarsRemaining) {
          // If this benefit shares a limit with others, only count it once
          if (ent.sharesLimitWith && ent.sharesLimitWith.length > 0) {
            // Create a sorted key for this shared limit group (e.g., "35,35ec")
            const sharedKey = [ent.type, ...ent.sharesLimitWith].sort().join(',');

            // Only add if we haven't counted this shared group yet
            if (!countedSharedLimits.has(sharedKey)) {
              countedSharedLimits.add(sharedKey);
              return sum + ent.dollarsRemaining;
            }
            // Skip if already counted
            return sum;
          }
          // Non-shared benefits are always counted
          return sum + ent.dollarsRemaining;
        }
        return sum;
      }, 0);

      if (totalRemainingValue > 0) {
        const percentageOfRemaining = (totalAllocated / totalRemainingValue) * 100;
        doc.text(
          `This settlement represents ${percentageOfRemaining.toFixed(1)}% of your remaining finite benefits (${formatCurrency(totalRemainingValue)})`,
          20,
          yPosition
        );
        yPosition += 6;
      }

      yPosition += 5;
    }
  }

  // Custom Notes Section
  if (data.options.customNotes && data.options.customNotes.trim()) {
    // Check if we need a new page
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 20;
    }

    // Draw separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204);
    doc.text('Attorney Notes', 20, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Split long text into multiple lines
    const maxWidth = 170;
    const lines = doc.splitTextToSize(data.options.customNotes, maxWidth);

    for (const line of lines) {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 20, yPosition);
      yPosition += 6;
    }
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1; // Subtract 1 because first element is null
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated by MA WC Benefits Calculator - ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
  }

  return doc.output('datauristring');
}

/**
 * Generate Benefits Remaining Excel file
 */
export function generateBenefitsRemainingExcel(
  data: BenefitsRemainingData
): Blob {
  const wb = XLSX.utils.book_new();

  const wsData = [
    ['Workers\' Compensation Benefits Summary'],
    [''],
    ['Client:', data.clientInfo.clientName || ''],
    ['Attorney:', data.clientInfo.attorneyName || ''],
    ['Date of Injury:', data.clientInfo.dateOfInjury || ''],
    ['Report Date:', data.clientInfo.date || new Date().toLocaleDateString()],
    [''],
  ];

  // Individual benefits
  if (data.options.includeIndividualBenefits) {
    wsData.push(['YOUR BENEFITS BREAKDOWN']);
    wsData.push(['']);

    const benefitsToShow = data.remainingEntitlements.filter(entitlement => {
      if (data.options.selectedBenefitTypes && data.options.selectedBenefitTypes.length > 0) {
        return data.options.selectedBenefitTypes.includes(entitlement.type);
      }
      return true;
    });

    for (const entitlement of benefitsToShow) {
      const benefit = data.benefitCalculations.find(b => b.type === entitlement.type);
      if (!benefit) continue;

      wsData.push([getBenefitShortName(entitlement.type)]);
      wsData.push(['Weekly Rate:', formatCurrency(benefit.finalWeekly)]);

      if (entitlement.isLifeBenefit) {
        wsData.push(['Weeks Used:', entitlement.weeksUsed.toFixed(2)]);
        wsData.push(['Status:', 'Life Benefit (No Statutory Limit)']);
      } else {
        wsData.push(['Maximum Weeks:', entitlement.statutoryMaxWeeks?.toString() || 'N/A']);
        wsData.push(['Weeks Used:', entitlement.weeksUsed.toFixed(2)]);
        wsData.push(['Weeks Remaining:', entitlement.weeksRemaining?.toFixed(2) || '0.00']);
        if (entitlement.dollarsRemaining !== null) {
          wsData.push(['Dollar Value Remaining:', formatCurrency(entitlement.dollarsRemaining)]);
        }
        const progressPercent = entitlement.statutoryMaxWeeks
          ? ((entitlement.weeksUsed / entitlement.statutoryMaxWeeks) * 100).toFixed(1)
          : '0';
        wsData.push(['Usage:', `${progressPercent}%`]);
      }
      wsData.push(['']);
    }
  }

  // Combined limits
  if (data.options.includeCombinedLimits) {
    wsData.push(['COMBINED BENEFIT LIMITS']);
    wsData.push(['']);
    wsData.push(['Combined Sections 34 + 35 (7-Year Cap)']);
    wsData.push(['Maximum:', `${data.combinedUsage.maxWeeks} weeks`]);
    wsData.push(['Used:', `${data.combinedUsage.weeksUsed.toFixed(2)} weeks`]);
    wsData.push(['Remaining:', `${data.combinedUsage.weeksRemaining.toFixed(2)} weeks`]);
    wsData.push(['']);

    if (data.combined35Usage.weeksUsed > 0) {
      wsData.push(['Combined Sections 35 + 35EC (4-Year Cap)']);
      wsData.push(['Maximum:', `${data.combined35Usage.maxWeeks} weeks`]);
      wsData.push(['Used:', `${data.combined35Usage.weeksUsed.toFixed(2)} weeks`]);
      wsData.push(['Remaining:', `${data.combined35Usage.weeksRemaining.toFixed(2)} weeks`]);
      wsData.push(['']);
    }
  }

  // Total paid
  if (data.options.includeTotalPaid) {
    wsData.push(['TOTAL BENEFITS PAID']);
    wsData.push(['Total Dollars Paid to Date:', formatCurrency(data.totalDollarsPaid)]);
    wsData.push(['']);
  }

  // Settlement offer
  if (data.options.includeSettlementOffer && data.options.settlementAmount && data.options.settlementAmount > 0) {
    wsData.push(['PROPOSED SETTLEMENT ANALYSIS']);
    wsData.push(['Settlement Amount:', formatCurrency(data.options.settlementAmount)]);
    wsData.push(['']);

    if (data.options.settlementAllocations && data.options.settlementAllocations.length > 0) {
      wsData.push(['Allocation Breakdown:']);
      wsData.push(['Benefit Type', 'Weekly Rate', 'Amount Allocated', 'Weeks Covered', 'Years Covered']);

      let totalAllocated = 0;
      for (const allocation of data.options.settlementAllocations) {
        const benefit = data.benefitCalculations.find(b => b.type === allocation.type);
        wsData.push([
          getBenefitShortName(allocation.type),
          formatCurrency(benefit?.finalWeekly || 0),
          formatCurrency(allocation.amountAllocated),
          allocation.weeksCovered.toFixed(2),
          allocation.yearsCovered.toFixed(2)
        ]);
        totalAllocated += allocation.amountAllocated;
      }

      // Section 36
      if (data.options.section36Amount && data.options.section36Amount > 0) {
        wsData.push([
          'Section 36 (Scarring)',
          'N/A',
          formatCurrency(data.options.section36Amount),
          'N/A',
          'N/A'
        ]);
        totalAllocated += data.options.section36Amount;
      }

      wsData.push(['Total Allocated:', '', formatCurrency(totalAllocated), '', '']);
      wsData.push(['']);

      // Settlement analysis
      // Filter entitlements by selectedBenefitTypes to match what's shown in the benefits breakdown
      const entitlementsToCount = data.remainingEntitlements.filter(entitlement => {
        if (data.options.selectedBenefitTypes && data.options.selectedBenefitTypes.length > 0) {
          return data.options.selectedBenefitTypes.includes(entitlement.type);
        }
        return true;
      });

      // Use a Set to track benefit types we've already counted to avoid double-counting shared limits
      const countedSharedLimits = new Set<string>();
      const totalRemainingValue = entitlementsToCount.reduce((sum, ent) => {
        if (!ent.isLifeBenefit && ent.dollarsRemaining) {
          // If this benefit shares a limit with others, only count it once
          if (ent.sharesLimitWith && ent.sharesLimitWith.length > 0) {
            // Create a sorted key for this shared limit group (e.g., "35,35ec")
            const sharedKey = [ent.type, ...ent.sharesLimitWith].sort().join(',');

            // Only add if we haven't counted this shared group yet
            if (!countedSharedLimits.has(sharedKey)) {
              countedSharedLimits.add(sharedKey);
              return sum + ent.dollarsRemaining;
            }
            // Skip if already counted
            return sum;
          }
          // Non-shared benefits are always counted
          return sum + ent.dollarsRemaining;
        }
        return sum;
      }, 0);

      if (totalRemainingValue > 0) {
        const percentageOfRemaining = (totalAllocated / totalRemainingValue) * 100;
        wsData.push([`This settlement represents ${percentageOfRemaining.toFixed(1)}% of remaining finite benefits (${formatCurrency(totalRemainingValue)})`]);
      }
      wsData.push(['']);
    }
  }

  // Custom notes
  if (data.options.customNotes && data.options.customNotes.trim()) {
    wsData.push(['ATTORNEY NOTES']);
    wsData.push([data.options.customNotes]);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Benefits Summary');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generate Benefits Remaining Word document
 */
export async function generateBenefitsRemainingWord(
  data: BenefitsRemainingData
): Promise<Blob> {
  const children: any[] = [
    new Paragraph({
      children: [new TextRun({ text: 'Workers\' Compensation Benefits Summary', bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  ];

  // Client info
  const infoRows = [
    [`Client: ${data.clientInfo.clientName || ''}`],
    [`Attorney: ${data.clientInfo.attorneyName || ''}`],
    [`Date of Injury: ${data.clientInfo.dateOfInjury || ''}`],
    [`Report Date: ${data.clientInfo.date || new Date().toLocaleDateString()}`]
  ];

  children.push(
    ...infoRows.map(row => new Paragraph({
      children: [new TextRun({ text: row[0] })],
      spacing: { after: 100 }
    })),
    new Paragraph({
      children: [new TextRun({ text: '', size: 20 })],
      spacing: { before: 200, after: 200 }
    })
  );

  // Individual benefits
  if (data.options.includeIndividualBenefits) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Your Benefits Breakdown', bold: true, size: 28 })],
        spacing: { before: 200, after: 200 }
      })
    );

    const benefitsToShow = data.remainingEntitlements.filter(entitlement => {
      if (data.options.selectedBenefitTypes && data.options.selectedBenefitTypes.length > 0) {
        return data.options.selectedBenefitTypes.includes(entitlement.type);
      }
      return true;
    });

    for (const entitlement of benefitsToShow) {
      const benefit = data.benefitCalculations.find(b => b.type === entitlement.type);
      if (!benefit) continue;

      children.push(
        new Paragraph({
          children: [new TextRun({ text: getBenefitShortName(entitlement.type), bold: true, size: 24 })],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Weekly Rate: ${formatCurrency(benefit.finalWeekly)}` })],
          spacing: { after: 50 }
        })
      );

      if (entitlement.isLifeBenefit) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Weeks Used: ${entitlement.weeksUsed.toFixed(2)}` })],
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Status: Life Benefit (No Statutory Limit)', bold: true })],
            spacing: { after: 100 }
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Maximum Weeks: ${entitlement.statutoryMaxWeeks}` })],
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `Weeks Used: ${entitlement.weeksUsed.toFixed(2)}` })],
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `Weeks Remaining: ${entitlement.weeksRemaining?.toFixed(2) || '0.00'}`, bold: true })],
            spacing: { after: 50 }
          })
        );

        if (entitlement.dollarsRemaining !== null) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `Dollar Value Remaining: ${formatCurrency(entitlement.dollarsRemaining)}`, bold: true })],
              spacing: { after: 100 }
            })
          );
        }
      }
    }
  }

  // Combined limits
  if (data.options.includeCombinedLimits) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Combined Benefit Limits', bold: true, size: 28 })],
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Combined Sections 34 + 35 (7-Year Cap)', bold: true })],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Maximum: ${data.combinedUsage.maxWeeks} weeks` })],
        spacing: { after: 50 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Used: ${data.combinedUsage.weeksUsed.toFixed(2)} weeks` })],
        spacing: { after: 50 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Remaining: ${data.combinedUsage.weeksRemaining.toFixed(2)} weeks`, bold: true })],
        spacing: { after: 200 }
      })
    );

    if (data.combined35Usage.weeksUsed > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Combined Sections 35 + 35EC (4-Year Cap)', bold: true })],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Maximum: ${data.combined35Usage.maxWeeks} weeks` })],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Used: ${data.combined35Usage.weeksUsed.toFixed(2)} weeks` })],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Remaining: ${data.combined35Usage.weeksRemaining.toFixed(2)} weeks`, bold: true })],
          spacing: { after: 200 }
        })
      );
    }
  }

  // Total paid
  if (data.options.includeTotalPaid) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Total Benefits Paid', bold: true, size: 28 })],
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Total Dollars Paid to Date: ${formatCurrency(data.totalDollarsPaid)}`, bold: true })],
        spacing: { after: 200 }
      })
    );
  }

  // Settlement offer
  if (data.options.includeSettlementOffer && data.options.settlementAmount && data.options.settlementAmount > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Proposed Settlement Analysis', bold: true, size: 28 })],
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Settlement Amount: ${formatCurrency(data.options.settlementAmount)}`, bold: true })],
        spacing: { after: 200 }
      })
    );

    if (data.options.settlementAllocations && data.options.settlementAllocations.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Allocation Breakdown:', bold: true })],
          spacing: { before: 100, after: 100 }
        })
      );

      // Create table rows for allocations
      const tableRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Benefit Type', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Weekly Rate', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Amount Allocated', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Weeks', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Years', bold: true })] })] })
          ]
        })
      ];

      let totalAllocated = 0;
      for (const allocation of data.options.settlementAllocations) {
        const benefit = data.benefitCalculations.find(b => b.type === allocation.type);
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(getBenefitShortName(allocation.type))] }),
              new TableCell({ children: [new Paragraph(formatCurrency(benefit?.finalWeekly || 0))] }),
              new TableCell({ children: [new Paragraph(formatCurrency(allocation.amountAllocated))] }),
              new TableCell({ children: [new Paragraph(allocation.weeksCovered.toFixed(2))] }),
              new TableCell({ children: [new Paragraph(allocation.yearsCovered.toFixed(2))] })
            ]
          })
        );
        totalAllocated += allocation.amountAllocated;
      }

      // Section 36 (Scarring/Disfigurement)
      if (data.options.section36Amount && data.options.section36Amount > 0) {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Section 36 (Scarring)')] }),
              new TableCell({ children: [new Paragraph('N/A')] }),
              new TableCell({ children: [new Paragraph(formatCurrency(data.options.section36Amount))] }),
              new TableCell({ children: [new Paragraph('N/A')] }),
              new TableCell({ children: [new Paragraph('N/A')] })
            ]
          })
        );
        totalAllocated += data.options.section36Amount;
      }

      // Total row
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total Allocated:', bold: true })] })] }),
            new TableCell({ children: [new Paragraph('')] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(totalAllocated), bold: true })] })] }),
            new TableCell({ children: [new Paragraph('')] }),
            new TableCell({ children: [new Paragraph('')] })
          ]
        })
      );

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        })
      );

      // Settlement analysis
      // Filter entitlements by selectedBenefitTypes to match what's shown in the benefits breakdown
      const entitlementsToCount = data.remainingEntitlements.filter(entitlement => {
        if (data.options.selectedBenefitTypes && data.options.selectedBenefitTypes.length > 0) {
          return data.options.selectedBenefitTypes.includes(entitlement.type);
        }
        return true;
      });

      // Use a Set to track benefit types we've already counted to avoid double-counting shared limits
      const countedSharedLimits = new Set<string>();
      const totalRemainingValue = entitlementsToCount.reduce((sum, ent) => {
        if (!ent.isLifeBenefit && ent.dollarsRemaining) {
          // If this benefit shares a limit with others, only count it once
          if (ent.sharesLimitWith && ent.sharesLimitWith.length > 0) {
            // Create a sorted key for this shared limit group (e.g., "35,35ec")
            const sharedKey = [ent.type, ...ent.sharesLimitWith].sort().join(',');

            // Only add if we haven't counted this shared group yet
            if (!countedSharedLimits.has(sharedKey)) {
              countedSharedLimits.add(sharedKey);
              return sum + ent.dollarsRemaining;
            }
            // Skip if already counted
            return sum;
          }
          // Non-shared benefits are always counted
          return sum + ent.dollarsRemaining;
        }
        return sum;
      }, 0);

      if (totalRemainingValue > 0) {
        const percentageOfRemaining = (totalAllocated / totalRemainingValue) * 100;
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `This settlement represents ${percentageOfRemaining.toFixed(1)}% of your remaining finite benefits (${formatCurrency(totalRemainingValue)})` })],
            spacing: { before: 100, after: 200 }
          })
        );
      }
    }
  }

  // Custom notes
  if (data.options.customNotes && data.options.customNotes.trim()) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Attorney Notes', bold: true, size: 28 })],
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: data.options.customNotes })],
        spacing: { after: 200 }
      })
    );
  }

  const doc = new Document({
    sections: [{ children }]
  });

  return await Packer.toBlob(doc);
}