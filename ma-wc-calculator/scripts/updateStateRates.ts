/**
 * Massachusetts Workers' Compensation State Rates Updater
 * 
 * This script fetches the latest compensation rates from Mass.gov
 * and updates the application's state rates table.
 */

import { writeFile, copyFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface StateRateRow {
  effective_from: string;
  effective_to: string;
  state_min: number;
  state_max: number;
  source_url: string;
}

interface ParsedRate {
  year: number;
  minimum: number;
  maximum: number;
}

// Configuration
const MASS_GOV_URL = 'https://www.mass.gov/info-details/minimum-and-maximum-compensation-rates';
const OUTPUT_FILE = resolve(__dirname, '../public/state_rates.json');
const BACKUP_FILE = resolve(__dirname, '../public/state_rates.backup.json');

// Logging utility
function log(message: string, ...args: any[]) {
  console.log(`[${new Date().toISOString()}] ${message}`, ...args);
}

function error(message: string, ...args: any[]) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`, ...args);
}

/**
 * Fetch HTML content from Mass.gov rates page
 */
async function fetchMassGovPage(): Promise<string> {
  log('Fetching compensation rates from Mass.gov...');
  
  try {
    const response = await fetch(MASS_GOV_URL, {
      headers: {
        'User-Agent': 'MA-WC-Calculator/1.0 (State Rate Updater)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    log('Successfully fetched HTML content');
    return html;
  } catch (err) {
    throw new Error(`Failed to fetch Mass.gov page: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parse the HTML content to extract compensation rates
 */
function parseCompensationRates(html: string): ParsedRate[] {
  log('Parsing compensation rates from HTML...');
  
  const $ = cheerio.load(html);
  const rates: ParsedRate[] = [];
  
  // Look for the specific table with rate data
  // The table has headers: "Date Of Change", "Maximum Rate", "Minimum Rate"
  $('table').each((_, table) => {
    const $table = $(table);
    const headers = $table.find('thead tr th, tr:first-child th');
    
    // Check if this is the compensation rates table
    const headerTexts = headers.map((_, el) => $(el).text().toLowerCase().trim()).get();
    const hasDateColumn = headerTexts.some(h => h.includes('date') && h.includes('change'));
    const hasMaxRate = headerTexts.some(h => h.includes('maximum') && h.includes('rate'));
    const hasMinRate = headerTexts.some(h => h.includes('minimum') && h.includes('rate'));
    
    if (!hasDateColumn || !hasMaxRate || !hasMinRate) return;
    
    log('Found compensation rates table with correct headers');
    
    // Parse table body rows
    $table.find('tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length < 3) return;
      
      // Expected format: Date Of Change | Maximum Rate | Minimum Rate
      const dateText = $(cells[0]).text().trim();
      const maxText = $(cells[1]).text().trim();
      const minText = $(cells[2]).text().trim();
      
      // Parse date - format should be [10/1/YY] or similar
      const dateMatch = dateText.match(/\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]?/);
      if (!dateMatch) {
        log(`Could not parse date: ${dateText}`);
        return;
      }
      
      let year = parseInt(dateMatch[3]);
      // Handle 2-digit years (assume 20xx for years 00-49, 19xx for years 50-99)
      if (year < 100) {
        if (year <= 49) {
          year += 2000;
        } else {
          year += 1900;
        }
      }
      
      // Only process reasonable years (1990-2050)
      if (year < 1990 || year > 2050) {
        return;
      }
      
      // Only process October 1st dates (compensation rate effective dates)
      const month = parseInt(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      if (month !== 10 || day !== 1) {
        return;
      }
      
      // Parse rates - handle special case where decimal point is missing/incorrect
      let maxClean = maxText.replace(/[$\s]/g, '');
      let minClean = minText.replace(/[$\s]/g, '');
      
      // Fix common formatting issues
      // Handle case where there's a comma instead of decimal point (e.g., "1,256,47" should be "1256.47")
      if (maxClean.includes(',')) {
        const parts = maxClean.split(',');
        if (parts.length === 3 && parts[2].length === 2) {
          // Format: "1,256,47" -> "1256.47"
          maxClean = parts[0] + parts[1] + '.' + parts[2];
        } else {
          // Normal comma thousands separator: "1,256.47" -> "1256.47"
          maxClean = maxClean.replace(/,/g, '');
        }
      }
      
      if (minClean.includes(',')) {
        const parts = minClean.split(',');
        if (parts.length === 3 && parts[2].length === 2) {
          minClean = parts[0] + parts[1] + '.' + parts[2];
        } else {
          minClean = minClean.replace(/,/g, '');
        }
      }
      
      const maximum = parseFloat(maxClean);
      const minimum = parseFloat(minClean);
      
      if (isNaN(maximum) || isNaN(minimum) || maximum <= 0 || minimum <= 0) {
        log(`Could not parse rates: Max=${maxText}, Min=${minText}`);
        return;
      }
      
      // Sanity check: maximum should be higher than minimum
      if (maximum <= minimum) {
        log(`Invalid rates - maximum (${maximum}) not greater than minimum (${minimum})`);
        return;
      }
      
      rates.push({ year, maximum, minimum });
      log(`Parsed rate for ${year}: Min $${minimum}, Max $${maximum}`);
    });
  });
  
  if (rates.length === 0) {
    throw new Error('No valid compensation rate data found in HTML');
  }
  
  // Sort by year (newest first)
  rates.sort((a, b) => b.year - a.year);
  
  log(`Successfully parsed ${rates.length} rate periods`);
  return rates;
}

/**
 * Convert parsed rates to the application's expected format
 */
function formatStateRates(parsedRates: ParsedRate[]): StateRateRow[] {
  log('Converting rates to application format...');
  
  return parsedRates.map(rate => ({
    effective_from: `${rate.year}-10-01`,
    effective_to: `${rate.year + 1}-09-30`,
    state_min: rate.minimum,
    state_max: rate.maximum,
    source_url: MASS_GOV_URL
  }));
}

/**
 * Validate the formatted state rates
 */
function validateStateRates(rates: StateRateRow[]): void {
  log('Validating formatted state rates...');
  
  if (rates.length === 0) {
    throw new Error('No state rates to validate');
  }
  
  for (const rate of rates) {
    // Validate date format
    if (!/^\d{4}-10-01$/.test(rate.effective_from)) {
      throw new Error(`Invalid effective_from date: ${rate.effective_from}`);
    }
    
    if (!/^\d{4}-09-30$/.test(rate.effective_to)) {
      throw new Error(`Invalid effective_to date: ${rate.effective_to}`);
    }
    
    // Validate rates
    if (rate.state_min <= 0 || rate.state_max <= 0) {
      throw new Error(`Invalid rates: min ${rate.state_min}, max ${rate.state_max}`);
    }
    
    if (rate.state_max <= rate.state_min) {
      throw new Error(`Maximum rate (${rate.state_max}) must be greater than minimum (${rate.state_min})`);
    }
  }
  
  log('All state rates validated successfully');
}

/**
 * Create backup of existing state rates file
 */
async function createBackup(): Promise<void> {
  try {
    await copyFile(OUTPUT_FILE, BACKUP_FILE);
    log('Created backup of existing state rates');
  } catch (err) {
    // File might not exist yet, which is OK
    log('No existing state rates file to backup');
  }
}

/**
 * Write the formatted rates to the output file
 */
async function writeStateRates(rates: StateRateRow[]): Promise<void> {
  log(`Writing ${rates.length} state rates to ${OUTPUT_FILE}...`);
  
  const output = {
    last_updated: new Date().toISOString(),
    source_url: MASS_GOV_URL,
    rates
  };
  
  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  log('Successfully wrote state rates file');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    log('Starting Massachusetts state rates update...');
    
    // Create backup of existing file
    await createBackup();
    
    // Fetch and parse rates
    const html = await fetchMassGovPage();
    const parsedRates = parseCompensationRates(html);
    const formattedRates = formatStateRates(parsedRates);
    
    // Validate and write
    validateStateRates(formattedRates);
    await writeStateRates(formattedRates);
    
    log('State rates update completed successfully!');
    log(`Updated rates for years: ${formattedRates.map(r => r.effective_from.split('-')[0]).join(', ')}`);
    
  } catch (err) {
    error('State rates update failed:', err instanceof Error ? err.message : String(err));
    
    // Try to restore from backup if write failed
    try {
      await copyFile(BACKUP_FILE, OUTPUT_FILE);
      log('Restored from backup file');
    } catch (restoreErr) {
      error('Could not restore from backup');
    }
    
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    main();
  }
}