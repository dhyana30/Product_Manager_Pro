let cachedTimezone = null;
let fetchPromise = null;

export async function getStoreTimezone(fetch) {
  if (cachedTimezone) return cachedTimezone;
  if (!fetchPromise) {
    fetchPromise = fetch('/api/shop-settings')
      .then(res => res.json())
      .then(data => {
        cachedTimezone = data.ianaTimezone || 'UTC';
        return cachedTimezone;
      })
      .catch(() => 'UTC');
  }
  return fetchPromise;
}

export function formatDateTime(dateString, timeZone) {
  if (!dateString) return "—";
  
  let safeDateString = dateString;
  if (typeof safeDateString === 'string') {
    // If it's a typical Laravel datetime string "YYYY-MM-DD HH:MM:SS", convert space to T and append Z
    if (safeDateString.includes(' ') && !safeDateString.includes('T')) {
      safeDateString = safeDateString.replace(' ', 'T');
    }
    // If it has no timezone indicator (Z, +, or -), append Z to treat it as UTC
    if (!safeDateString.includes('Z') && !safeDateString.match(/[+-]\d{2}:\d{2}$/)) {
      safeDateString += 'Z';
    }
  }
  
  const date = new Date(safeDateString);
  if (isNaN(date.getTime())) return dateString;
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timeZone || 'UTC'
    }).format(date);
  } catch(e) {
    return date.toLocaleString();
  }
}
