import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcut, useKeyboardShortcuts } from '../hooks/useKeyboardShortcut';

describe('useKeyboardShortcut', () => {
  let callback: jest.Mock;

  beforeEach(() => {
    callback = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call callback when shortcut is pressed', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 's', ctrl: true }, callback)
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call callback when different key is pressed', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 's', ctrl: true }, callback)
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should not call callback when modifier is missing', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 's', ctrl: true }, callback)
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: false,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should respect enabled flag', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useKeyboardShortcut({ key: 's', ctrl: true }, callback, enabled),
      { initialProps: { enabled: false } }
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(callback).not.toHaveBeenCalled();

    // Enable the shortcut
    rerender({ enabled: true });

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle Shift modifier', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'S', shift: true }, callback)
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'S',
        shiftKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle Alt modifier', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'a', alt: true }, callback)
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        altKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should cleanup event listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useKeyboardShortcut({ key: 's', ctrl: true }, callback)
    );

    unmount();

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('useKeyboardShortcuts', () => {
  let callback1: jest.Mock;
  let callback2: jest.Mock;

  beforeEach(() => {
    callback1 = jest.fn();
    callback2 = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle multiple shortcuts', () => {
    renderHook(() =>
      useKeyboardShortcuts([
        { shortcut: { key: 's', ctrl: true }, callback: callback1 },
        { shortcut: { key: 'e', ctrl: true }, callback: callback2 },
      ])
    );

    act(() => {
      const event1 = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event1);
    });

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    jest.clearAllMocks();

    act(() => {
      const event2 = new KeyboardEvent('keydown', {
        key: 'e',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event2);
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('should respect individual enabled flags', () => {
    renderHook(() =>
      useKeyboardShortcuts([
        { shortcut: { key: 's', ctrl: true }, callback: callback1, enabled: true },
        { shortcut: { key: 'e', ctrl: true }, callback: callback2, enabled: false },
      ])
    );

    act(() => {
      const event1 = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event1);
    });

    expect(callback1).toHaveBeenCalledTimes(1);

    act(() => {
      const event2 = new KeyboardEvent('keydown', {
        key: 'e',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event2);
    });

    expect(callback2).not.toHaveBeenCalled();
  });

  it('should prevent default behavior', () => {
    renderHook(() =>
      useKeyboardShortcuts([
        { shortcut: { key: 's', ctrl: true }, callback: callback1 },
      ])
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  it('should handle case insensitive keys', () => {
    renderHook(() =>
      useKeyboardShortcuts([
        { shortcut: { key: 'S', ctrl: true }, callback: callback1 },
      ])
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(callback1).toHaveBeenCalledTimes(1);
  });
});
