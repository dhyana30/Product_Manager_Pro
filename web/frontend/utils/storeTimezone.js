import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStoreTimezone as fetchStoreTimezone } from './timezone';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

// ---------- Context ----------
const StoreTimezoneContext = createContext('UTC');

export const StoreTimezoneProvider = ({ children }) => {
  const [timeZone, setTimeZone] = useState('UTC');
  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    fetchStoreTimezone(authenticatedFetch).then(tz => setTimeZone(tz));
  }, [authenticatedFetch]);

  return React.createElement(
    StoreTimezoneContext.Provider,
    { value: timeZone },
    children,
  );
};

// ---------- Hook ----------
export const useStoreTimezone = () => {
  return useContext(StoreTimezoneContext);
};

// ---------- Formatter ----------
export const formatInStoreTimezone = (dateString, timeZone, options = {}) => {
  if (!dateString) return '—';
  // Re‑use the safe‑string handling from the original utils
  let safe = dateString;
  if (typeof safe === 'string') {
    if (safe.includes(' ') && !safe.includes('T')) safe = safe.replace(' ', 'T');
    if (!safe.includes('Z') && !safe.match(/[+-]\d{2}:\d{2}$/)) safe += 'Z';
  }
  const date = new Date(safe);
  if (isNaN(date.getTime())) return dateString;
  try {
    const fmtOpts = {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      timeZone: timeZone || 'UTC',
      ...options,
    };
    return new Intl.DateTimeFormat(undefined, fmtOpts).format(date);
  } catch (e) {
    return date.toLocaleString();
  }
};

// ---------- Store‑offset helper (for filters) ----------
let offsetCache = {};
export const getStoreOffsetMs = (timeZone) => {
  if (offsetCache[timeZone] !== undefined) return offsetCache[timeZone];
  const now = new Date();
  // Convert the same instant to the store timezone string, then parse it as a date in the *local* environment.
  const tzString = now.toLocaleString('en-US', { timeZone, hour12: false });
  const localString = now.toLocaleString('en-US', { hour12: false });
  const tzDate = new Date(tzString);
  const localDate = new Date(localString);
  const offset = tzDate - localDate; // positive if store is ahead of local time
  offsetCache[timeZone] = offset;
  return offset;
};
