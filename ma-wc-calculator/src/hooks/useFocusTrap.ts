import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Custom hook for trapping focus within a modal or dialog
 * Implements WCAG 2.1 focus management guidelines
 *
 * @param enabled - Whether the focus trap is active
 * @returns Ref to attach to the container element
 *
 * @example
 * function Modal({ isOpen }) {
 *   const trapRef = useFocusTrap(isOpen);
 *   return (
 *     <div ref={trapRef}>
 *       <button>Close</button>
 *     </div>
 *   );
 * }
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  enabled: boolean = true
): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store the element that was focused before the modal opened
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first focusable element
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // If only one focusable element, prevent default to stay on it
      if (focusableElements.length === 1) {
        e.preventDefault();
        return;
      }

      // Shift + Tab (backwards)
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      }
      // Tab (forwards)
      else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    // Cleanup: restore focus to previously focused element
    return () => {
      container.removeEventListener('keydown', handleTabKey);
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [enabled]);

  return containerRef;
}

/**
 * Hook to lock focus on a single element
 * Useful for loading states or confirmations
 *
 * @param elementRef - Ref to the element to keep focus on
 * @param enabled - Whether focus locking is active
 */
export function useFocusLock(
  elementRef: RefObject<HTMLElement>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const element = elementRef.current;

    const handleFocusOut = (e: FocusEvent) => {
      // If focus leaves the element, bring it back
      if (e.target !== element) {
        element.focus();
      }
    };

    // Focus the element
    element.focus();

    document.addEventListener('focusin', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusOut);
    };
  }, [elementRef, enabled]);
}

/**
 * Hook to manage focus restoration
 * Automatically restores focus to the trigger element when modal closes
 *
 * @param isOpen - Whether the modal/dialog is open
 * @param triggerRef - Optional ref to the element that opened the modal
 */
export function useFocusRestore(
  isOpen: boolean,
  triggerRef?: RefObject<HTMLElement>
) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store current focus when opening
      previousFocus.current = document.activeElement as HTMLElement;
    } else {
      // Restore focus when closing
      if (triggerRef?.current) {
        triggerRef.current.focus();
      } else if (previousFocus.current) {
        previousFocus.current.focus();
      }
    }
  }, [isOpen, triggerRef]);
}
