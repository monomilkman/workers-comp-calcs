import { useState } from 'react';
import type { AppState } from '../types';

/**
 * Custom hook for localStorage with JSON serialization
 * Provides state synchronization with localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state with value from localStorage or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Custom hook to save/load complete sessions
 */
export function useSessionStorage() {
  const saveSession = (sessionData: AppState, sessionName: string) => {
    try {
      const sessions = getStoredSessions();
      const sessionKey = `session_${Date.now()}_${sessionName.replace(/\s+/g, '_')}`;
      sessions[sessionKey] = {
        ...sessionData,
        metadata: {
          name: sessionName,
          savedAt: new Date().toISOString()
        }
      };
      localStorage.setItem('ma_wc_sessions', JSON.stringify(sessions));
      return sessionKey;
    } catch (error) {
      console.error('Error saving session:', error);
      throw new Error('Failed to save session');
    }
  };

  const loadSession = (sessionKey: string) => {
    try {
      const sessions = getStoredSessions();
      return sessions[sessionKey] || null;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  };

  const deleteSession = (sessionKey: string) => {
    try {
      const sessions = getStoredSessions();
      delete sessions[sessionKey];
      localStorage.setItem('ma_wc_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const getAllSessions = () => {
    try {
      return getStoredSessions();
    } catch (error) {
      console.error('Error getting sessions:', error);
      return {};
    }
  };

  return {
    saveSession,
    loadSession,
    deleteSession,
    getAllSessions
  };
}

function getStoredSessions(): Record<string, AppState & { metadata?: { name: string; savedAt: string } }> {
  try {
    const stored = localStorage.getItem('ma_wc_sessions');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error parsing stored sessions:', error);
    return {};
  }
}