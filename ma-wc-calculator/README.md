# MA Workers' Compensation Benefits Calculator

A production-ready React + TypeScript application for calculating Massachusetts Workers' Compensation benefits. Built specifically for law firms representing injured workers.

## Features

### Core Functionality
- **Benefit Calculations**: Accurate calculations for all MA WC benefit types:
  - Section 34 (Temporary Total Disability, TTD)
  - Section 35 (Temporary Partial Disability, TPD)
  - Section 35 EC (with Earning Capacity)
  - Section 34A (Permanent & Total, P&T)
  - Section 31 (Widow/Dependent benefits)

- **State Min/Max Enforcement**: Automatic application of Massachusetts state minimum and maximum rates based on Date of Injury (DOI)

- **Payment Ledger**: Complete CRUD system for tracking historical payments with:
  - Overlap detection and warnings
  - Proration modes (days vs calendar weeks)
  - Automatic calculations

- **Entitlement Tracking**: Real-time calculation of remaining benefits including:
  - Individual benefit remaining weeks and dollars
  - Combined 34+35 seven-year cap tracking
  - Progress bars and warnings

- **Settlement Calculator**: Convert proposed settlement amounts into weeks/years of coverage

- **Demand Builder**: Professional demand calculation with:
  - Section 36 scarring/disfigurement awards
  - Section 28 penalty doubling
  - Statutory limit validation

- **Export Capabilities**: 
  - CSV ledger exports
  - JSON session save/load
  - PDF demand summaries

- **Automated State Rates**: 
  - Web scraping from Mass.gov official compensation rates
  - Enhanced settings interface with "Update Rates" button
  - Backup and restore functionality
  - Real-time rate validation and parsing
  - **GitHub Actions Automation**: Monthly automated rate updates via workflow

## Technical Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **Build Tool**: Vite with code splitting & lazy loading
- **Testing**: Jest + React Testing Library (104 tests, comprehensive coverage)
- **Date Handling**: date-fns
- **PDF/Document Generation**: jsPDF + docx
- **Excel Export**: xlsx (SheetJS)
- **Web Scraping**: Cheerio for HTML parsing
- **State Management**: Context API + useReducer + localStorage
- **UI Components**: Lucide React icons, Sonner toast notifications
- **Accessibility**: ARIA labels, focus management, keyboard shortcuts

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm

### Installation
```bash
# Clone or extract the project
cd ma-wc-calculator

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Updating State Rates
```bash
# Fetch latest compensation rates from Mass.gov
npm run update:rates

# This will:
# - Scrape the official MA DIA website
# - Parse all historical compensation rate data  
# - Update the application's rate table
# - Create a backup of existing rates
```

### Building for Production
```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Business Rules & Formulas

### Weekly Rate Calculations

The application implements exact Massachusetts formulas:

#### Section 34 (TTD)
- **Formula**: `AWW × 0.60`
- **Maximum Duration**: 156 weeks (3 years)

#### Section 35 (TPD)
- **Formula**: `(AWW × 0.60) × 0.75 = AWW × 0.45`
- **Maximum Duration**: 208 weeks (4 years)

#### Section 35 EC (with Earning Capacity)
- **Formula**: `(AWW - EC) × 0.60`
- **Special Rule**: If `EC >= AWW`, benefit = $0
- **Maximum Duration**: 208 weeks (4 years)

#### Section 34A & 31 (Life Benefits)
- **Formula**: `AWW × 0.666666666` (66⅔%)
- **Duration**: Life benefit (no statutory limit)

### State Min/Max Adjustment Rules

The application enforces Massachusetts state minimum and maximum rates:

1. **If `raw_weekly > state_max`**: `final_weekly = state_max`
2. **Else if `raw_weekly < state_min`**:
   - If `AWW >= state_min`: `final_weekly = state_min`
   - If `AWW < state_min`: `final_weekly = AWW` (pay true AWW)
3. **Else**: `final_weekly = raw_weekly` (no adjustment)

### Statutory Duration Limits

- **Section 34**: Maximum 156 weeks (3 years)
- **Section 35 & 35 EC**: Maximum 208 weeks (4 years) each
- **Combined 34 + 35 Cap**: Maximum 364 weeks (7 years total)
- **Section 34A & 31**: Life benefits (no limit)

### Date-to-Weeks Calculations

- **Default Mode (Days)**: `weeks = days ÷ 7` with 4-decimal precision
- **Calendar Mode**: Count Monday-Sunday week boundaries
- **Dollar Calculation**: `dollars_paid = final_weekly × weeks_decimal`

## Key Assumptions

1. **Rate Governing Period**: Date of Injury determines which state min/max rates apply for entire claim
2. **Proration Default**: Days-based proration (divide by 7) is the default
3. **Years to Weeks**: 1 year = 52 weeks for all calculations
4. **Rounding**: 
   - Currency displayed to 2 decimal places
   - Weeks calculated to 4 decimal places internally
   - High precision maintained during calculations

## Sample Calculations

### Example 1: High AWW Case
- **AWW**: $1,000
- **DOI**: 2024-11-01 
- **State Rates**: Min $365.83, Max $1,500

**Results**:
- Section 34: $600/week (no adjustment)
- Section 35: $450/week (no adjustment)  
- Section 35 EC (EC=$600): $240/week (no adjustment)
- Section 34A: $666.67/week (no adjustment)

### Example 2: State Minimum Application
- **AWW**: $500
- **DOI**: 2025-01-02
- **Raw Section 34**: $300/week

**Logic**: AWW ($500) ≥ state_min ($365.83), but raw ($300) < state_min
**Result**: Final weekly = $365.83 (raised to minimum)

### Example 3: Below State Minimum
- **AWW**: $300  
- **DOI**: 2025-01-02
- **Raw Section 34**: $180/week

**Logic**: AWW ($300) < state_min ($365.83)
**Result**: Final weekly = $300 (pay true AWW, don't raise to minimum)

## File Structure

```
src/
├── components/           # React components
│   ├── Layout/          # Layout components
│   │   └── Sidebar.tsx  # Navigation sidebar with tabs
│   ├── UI/              # Reusable UI components
│   │   ├── Card.tsx     # Card container component
│   │   └── Spinner.tsx  # Loading spinner
│   ├── AwwInput.tsx     # Input form for AWW, DOI, EC
│   ├── BenefitCard.tsx  # Individual benefit display
│   ├── Ledger.tsx       # Payment ledger table
│   ├── LedgerEditor.tsx # Add/edit ledger entries
│   ├── RemainingSummary.tsx   # Entitlement tracking
│   ├── SettlementCalculator.tsx # Settlement analysis
│   ├── DemandBuilder.tsx # Demand calculation
│   ├── ExportButtons.tsx # Export functionality
│   ├── SettingsStateRates.tsx # State rates management
│   ├── MVASettlementCalculator.tsx # Motor vehicle calculator (lazy)
│   ├── GLSettlementCalculator.tsx # General liability calculator (lazy)
│   └── ErrorBoundary.tsx # Error handling boundary
├── contexts/            # React Context providers
│   ├── ThemeContext.tsx # Dark/light mode management
│   └── CalculatorContext.tsx # Calculator state management
├── hooks/               # Custom React hooks
│   ├── useLocalStorage.ts # localStorage persistence
│   ├── useCalculations.ts # Benefit calculations
│   └── useKeyboardShortcut.ts # Keyboard navigation
├── utils/               # Utility functions
│   ├── rates.ts         # Rate calculations
│   ├── dates.ts         # Date/week utilities
│   ├── money.ts         # Currency formatting
│   ├── validation.ts    # Input validation
│   ├── export.ts        # Export functionality
│   └── benefitFormatters.ts # Benefit text formatting
├── constants/           # Application constants
│   └── benefits.ts      # Benefit type definitions
├── types/               # TypeScript interfaces
│   └── index.ts         # All type definitions
├── __tests__/           # Test files (104 tests)
│   ├── rates.test.ts    # Rate calculation tests
│   ├── dates.test.ts    # Date utility tests
│   ├── money.test.ts    # Currency tests
│   ├── scraperUtils.test.ts # Scraper function tests
│   ├── benefitFormatters.test.ts # Formatter tests
│   ├── useKeyboardShortcut.test.ts # Keyboard hook tests
│   └── integration.test.ts # End-to-end tests
└── scripts/             # Node.js utility scripts
    └── updateStateRates.ts # State rates scraper
```

## Data Storage

- **Local Storage**: All data persists in browser localStorage
- **Session Management**: Save/load named calculation sessions
- **State Rates**: Automatically loaded from `/public/state_rates.json`
- **Rate Data Source**: Fetched from official Mass.gov compensation rates page
- **Backup System**: Automatic backup before rate updates
- **Sample Data**: Pre-built scenarios in `/public/seed/sample_sessions.json`

## Testing Coverage

The application includes comprehensive tests covering:

- **Unit Tests**: All utility functions with edge cases
- **Integration Tests**: Complete workflow scenarios  
- **Business Logic**: MA-specific calculation rules
- **Scraper Functions**: Rate parsing, validation, and error handling
- **Edge Cases**: Leap years, overlaps, boundary conditions, malformed data

Run `npm run test:coverage` to see detailed coverage reports.

## State Rates Update System

The application includes a sophisticated system for automatically fetching and updating Massachusetts state compensation rates.

### How It Works

1. **Data Source**: Scrapes the official [Mass.gov Compensation Rates page](https://www.mass.gov/info-details/minimum-and-maximum-compensation-rates)
2. **Parsing Engine**: Uses Cheerio to parse HTML tables and extract rate data
3. **Smart Validation**: Handles various data formatting issues including:
   - Two-digit year conversion (99 → 1999, 00 → 2000)
   - Decimal point parsing errors (1,256,47 → 1256.47)
   - Date format validation (October 1st dates only)
   - Rate sanity checks (minimum < maximum)

### Frontend Integration

- **Settings Interface**: Enhanced state rates section in the app
- **Update Button**: Triggers rate refresh with user feedback
- **Rate History**: Expandable table showing all historical rates
- **Last Updated**: Displays when rates were last refreshed
- **Error Handling**: User-friendly error messages and fallback

### GitHub Actions Automation

The repository includes a GitHub Actions workflow that automatically updates Massachusetts state compensation rates:

- **Schedule**: Runs monthly on the 1st of each month at 6:00 AM UTC
- **Manual Trigger**: Can be manually triggered via GitHub's "Run workflow" button
- **Smart Updates**: Only commits changes if new rates are detected
- **Automatic Backup**: Creates backup of existing rates before updating
- **Bot Commits**: Uses dedicated bot user to avoid triggering infinite loops
- **Error Handling**: Includes failure recovery and cleanup procedures

**Workflow Location**: `.github/workflows/update-state-rates.yml`

**Manual Trigger**: Go to Actions → "Update Massachusetts State Compensation Rates" → "Run workflow"

### Data Quality Assurance

- **Backup System**: Automatic backup before updates
- **Validation Suite**: Comprehensive tests for parsing logic
- **Error Recovery**: Restore from backup if update fails
- **Format Standardization**: Converts all rates to consistent JSON format

### Manual Update Process

For development or troubleshooting:

```bash
npm run update:rates
```

This command will:
- Fetch the latest HTML from Mass.gov
- Parse and validate all rate data
- Create a timestamped backup
- Update the application's rate table
- Report any parsing issues or errors

## Development Improvements (Phases 1-8)

This application has undergone eight phases of professional enhancements to ensure production-ready quality:

### Phase 1: Foundation & Infrastructure
- **Constants Management**: Centralized benefit type definitions and configuration
- **Toast Notifications**: Integrated Sonner for user feedback across all operations
- **Error Boundaries**: React error boundaries for graceful failure handling
- **Type Safety**: Complete TypeScript coverage with strict mode enabled

### Phase 2: Component Architecture
- **Reusable Components**: Created UI component library (Card, Spinner, etc.)
- **Component Extraction**: Separated Layout components (Sidebar) from business logic
- **Code Organization**: Established clear separation of concerns
- **Maintainability**: Reduced code duplication across components

### Phase 3: Performance Optimization
- **Code Splitting**: Implemented lazy loading for settlement calculators
- **Bundle Optimization**: Reduced initial bundle size by 81%
- **Dynamic Imports**: Lazy-loaded MVA and GL calculators
- **Build Performance**: Optimized chunk splitting strategy
- **Load Time**: Significantly improved initial page load

### Phase 4: User Experience
- **Keyboard Shortcuts**: Added comprehensive keyboard navigation
  - `Ctrl+S`: Quick save session
  - `Ctrl+E`: Export JSON
  - `Escape`: Close modals
  - Tab navigation throughout
- **Mobile Optimization**: Responsive design improvements
- **Touch Targets**: Enhanced mobile button sizes
- **Navigation**: Improved tab switching and focus management

### Phase 5: Accessibility (WCAG 2.1)
- **ARIA Labels**: Complete ARIA labeling for screen readers
- **Focus Management**: Logical focus order and visible focus indicators
- **Keyboard Navigation**: Full keyboard accessibility
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **Color Contrast**: WCAG AA compliant color schemes

### Phase 5.5: Modern Navigation
- **Sidebar Navigation**: Professional collapsible sidebar
- **Tab Management**: Persistent tab state with icons
- **Dark Mode Toggle**: Integrated theme switcher in sidebar
- **Visual Feedback**: Active state indicators and hover effects

### Phase 6: Testing & Quality Assurance
- **Test Suite**: 104 comprehensive tests across 7 test files
- **Unit Tests**: All utility functions with edge cases
- **Integration Tests**: Complete user workflows
- **Coverage**: High test coverage for business logic
- **CI/CD Ready**: Jest configuration for automated testing

### Phase 7: State Management
- **Context API**: Centralized calculator state management
- **useReducer**: Predictable state updates with actions
- **Type Safety**: Fully typed actions and state
- **Performance**: Optimized re-renders with context splitting
- **Persistence**: Automatic localStorage sync

### Phase 8: Final Polish & Documentation
- **TypeScript Cleanup**: Removed all `any` types for complete type safety
- **Code Quality**: Fixed unused imports and linting issues
- **Build Verification**: Production build tested and optimized
- **Documentation**: Comprehensive README with all features
- **Version Control**: Clean git history with semantic commits

### Key Metrics After Phase 1-8
- **Bundle Size Reduction**: 81% smaller initial bundle
- **Test Coverage**: 104 passing tests
- **TypeScript Safety**: 100% typed, zero `any` types
- **Performance Score**: Optimized lazy loading and code splitting
- **Accessibility**: WCAG 2.1 Level AA compliant
- **Dark Mode**: Full theme support with system preference detection

## Browser Compatibility

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Modern browsers with ES2020 support

## Legal Disclaimer

This tool provides calculations based on Massachusetts Workers' Compensation statutes as understood at the time of development. Always verify calculations against current regulations and consult with qualified legal professionals. The developers assume no responsibility for the accuracy or completeness of calculations.

## Support & Contributing

This is a specialized tool built for Massachusetts Workers' Compensation law practice. For support or feature requests, please contact the development team.

## License

Copyright © 2025 - Professional Legal Software Tool

---

**Built with ⚖️ for Massachusetts Workers' Compensation attorneys**
