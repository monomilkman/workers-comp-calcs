# Changelog

All notable changes to the Massachusetts Workers' Compensation Benefits Calculator will be documented in this file.

## [1.3.0] - 2025-09-10 (Deployment & Automation Release)

### Added
- **GitHub Actions Workflow**: Automated monthly state rates updates
  - Scheduled execution on 1st of each month at 6:00 AM UTC
  - Manual trigger capability via workflow_dispatch
  - Smart change detection - only commits when rates actually change
  - Automatic backup creation before updates
  - Bot commits to prevent infinite workflow loops
  - Error recovery and cleanup procedures
- **Vercel Deployment Configuration**: Production-ready deployment setup
  - Optimized `vercel.json` with Vite framework settings
  - SPA routing support with catch-all rewrites
  - Asset caching headers for improved performance
  - Security headers (X-Frame-Options, Content-Security-Policy, etc.)
  - Fast deployment with `npm ci` installation
- **Repository Structure**: Complete GitHub integration
  - MIT License with legal disclaimer
  - Comprehensive README with deployment instructions
  - GitHub Actions workflow documentation
  - Professional repository presentation

### Fixed
- **TypeScript Build Errors**: Resolved compilation issues for production deployment
  - Fixed unused `useState` import in BenefitCard.tsx
  - Converted `ReactNode` imports to type-only imports in Tooltip.tsx and ThemeContext.tsx
  - All builds now pass TypeScript strict checks
- **HTML Page Title**: Updated from default Vite template to proper application title
- **Development Environment**: Cleaned up multiple conflicting dev server processes
  - Terminated background processes consuming system resources
  - Resolved port conflicts on 5173-5177
  - Freed up ~4GB+ memory from duplicate processes

### Changed
- **Build Process**: Verified and optimized for production deployment
  - Build time: ~5.66s with optimized asset bundling
  - Output directory: `dist/` with proper asset structure
  - Bundle size warnings addressed for better performance
- **Documentation**: Enhanced README with automation section
  - Added GitHub Actions automation details
  - Updated feature list to include workflow automation
  - Improved deployment and testing instructions

### Technical Infrastructure  
- **Continuous Integration**: GitHub Actions workflow for state rates maintenance
- **Production Deployment**: Live application at https://workers-comp-calcs.vercel.app/
- **Automated Maintenance**: Monthly rate updates with zero manual intervention
- **Repository Management**: Clean Git history with proper commit conventions

## [1.2.0] - 2025-09-10

### Added
- Comprehensive attorney fee calculator in Settlement tab
- Support for accepted liability (20%) vs unaccepted liability (15%) fee structures
- Attorney fee override capability for custom arrangements
- Expense reimbursement tracking for attorney costs
- Dynamic deductions system (child support, tax liens, medical liens, etc.)
- Settlement statement PDF generation with detailed breakdown
- Real-time net amount calculations for client distribution
- Professional settlement statement formatting with attorney and client information

### Fixed
- Critical JSX syntax errors in SettlementCalculator component
- Unterminated JSX contents causing component rendering failures
- Component structure and state management improvements

### Changed
- Removed settlement warning about partially funded benefits (Massachusetts settlements waive future benefit rights)
- Enhanced settlement calculator with comprehensive fee and deduction management
- Improved PDF export functionality for settlement statements

## [1.1.0] - 2025-09-09

### Added
- Modern UI design with TailwindCSS v3 styling
- Dark mode toggle with persistent theme preferences
- Responsive design for mobile, tablet, and desktop
- Navigation with header and tab system (Calculator, Payment Ledger, Settlement, Settings)
- Visual enhancements with Lucide React icons
- Progress bars and visual feedback for benefit usage
- Tooltip system for benefit descriptions
- Modern card-based layout for benefit summaries
- Recent Payments preview in main dashboard
- Combined Section 35 + 35EC usage tracking (shared 4-year limit)
- Enhanced Settlement Calculator and Demand Builder components
- State rate management in Settings tab

### Changed
- **BREAKING:** Section 35 and Section 35 EC now share a combined 4-year (208 week) limit instead of separate limits
- Redesigned BenefitCard component with improved layout and overflow handling
- Enhanced Entitlement Summary with better spacing and readability
- Improved RemainingSummary component with dedicated combined benefit tracking
- Updated payment ledger integration with real-time updates

### Fixed
- CSS compilation error with invalid `border-border` utility class
- Text overflow issues in benefit cards, especially yearly amount display
- Recent Payments not updating when ledger entries are added
- TypeError on undefined properties in payment calculations
- Cramped layout in Entitlement Summary numbers
- Property name mismatches between components and data types
- Responsive layout issues on mobile devices

### Technical
- Downgraded from TailwindCSS v4 to v3 for better compatibility
- Implemented ThemeProvider context for dark mode management
- Enhanced useCalculations hook with combined benefit limit logic
- Improved TypeScript interfaces and error handling
- Added proper null checks and fallback values throughout

## [1.0.0] - Initial Release
- Basic Massachusetts Workers' Compensation Benefits Calculator
- Support for Sections 34, 35, 35EC, 34A, and 31 calculations
- Payment ledger functionality
- State rate table management
- JSON export/import capabilities