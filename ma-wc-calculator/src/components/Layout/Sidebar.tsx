import { useState, useEffect } from 'react';
import { Calculator, FileText, DollarSign, Settings, Menu, X, Car, Shield, Moon, Sun } from 'lucide-react';
import { clsx } from 'clsx';

export type NavigationTab = 'calculator' | 'ledger' | 'settlement' | 'mva' | 'gl' | 'settings';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

const navigationItems = [
  { id: 'calculator' as const, label: 'WC Benefits', icon: Calculator },
  { id: 'ledger' as const, label: 'Payment Ledger', icon: FileText },
  { id: 'settlement' as const, label: 'WC Settlement', icon: DollarSign },
  { id: 'mva' as const, label: 'MVA Settlement', icon: Car },
  { id: 'gl' as const, label: 'GL Settlement', icon: Shield },
  { id: 'settings' as const, label: 'State Rates', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange, theme, onThemeToggle }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavClick = (tab: NavigationTab) => {
    onTabChange(tab);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <>
      {/* Mobile hamburger button - fixed top-left */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-700 dark:text-gray-300" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" aria-hidden="true" />
          )}
        </button>
      )}

      {/* Mobile backdrop */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:sticky top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out z-40',
          // Mobile styles
          isMobile && (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'),
          // Desktop styles
          !isMobile && (isCollapsed ? 'w-16' : 'w-64'),
          // Mobile always full width when open
          isMobile && 'w-64'
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Header with logo and toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            {(!isCollapsed || isMobile) && (
              <div className="flex items-center space-x-2 overflow-hidden">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg flex-shrink-0">
                  <Calculator className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  MA WC Calculator
                </h1>
              </div>
            )}

            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className={clsx(
                  'p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                  isCollapsed && 'mx-auto'
                )}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Navigation items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavClick(item.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      title={isCollapsed && !isMobile ? item.label : undefined}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 dark:bg-blue-400 rounded-r" />
                      )}

                      <Icon
                        className={clsx(
                          'h-5 w-5 flex-shrink-0',
                          isCollapsed && !isMobile && 'mx-auto'
                        )}
                        aria-hidden="true"
                      />

                      {(!isCollapsed || isMobile) && (
                        <span className="text-sm font-medium">{item.label}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Theme toggle at bottom */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={onThemeToggle}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                isCollapsed && !isMobile && 'justify-center'
              )}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={isCollapsed && !isMobile ? (theme === 'light' ? 'Dark mode' : 'Light mode') : undefined}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              ) : (
                <Sun className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              )}

              {(!isCollapsed || isMobile) && (
                <span className="text-sm font-medium">
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
