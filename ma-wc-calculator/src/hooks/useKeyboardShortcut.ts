import { useEffect, useCallback } from 'react';

type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

/**
 * Custom hook for keyboard shortcuts
 *
 * @example
 * useKeyboardShortcut({ key: 's', ctrl: true }, () => {
 *   console.log('Ctrl+S pressed');
 * });
 */
export function useKeyboardShortcut(
  shortcut: KeyboardShortcut,
  callback: () => void,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const matchesCtrl = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl;
      const matchesShift = shortcut.shift === undefined || event.shiftKey === shortcut.shift;
      const matchesAlt = shortcut.alt === undefined || event.altKey === shortcut.alt;
      const matchesMeta = shortcut.meta === undefined || event.metaKey === shortcut.meta;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
        event.preventDefault();
        callback();
      }
    },
    [shortcut, callback, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for multiple keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts([
 *   { shortcut: { key: 's', ctrl: true }, callback: handleSave },
 *   { shortcut: { key: 'Escape' }, callback: handleClose }
 * ]);
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{ shortcut: KeyboardShortcut; callback: () => void; enabled?: boolean }>
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const { shortcut, callback, enabled = true } of shortcuts) {
        if (!enabled) continue;

        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl;
        const matchesShift = shortcut.shift === undefined || event.shiftKey === shortcut.shift;
        const matchesAlt = shortcut.alt === undefined || event.altKey === shortcut.alt;
        const matchesMeta = shortcut.meta === undefined || event.metaKey === shortcut.meta;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
          event.preventDefault();
          callback();
          break; // Only trigger first matching shortcut
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
