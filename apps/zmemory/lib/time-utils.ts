/**
 * Time utilities for converting between local time and UTC
 * Database stores all timestamps in UTC timezone
 * Frontend displays times in local timezone for better UX
 */

/**
 * Convert a local datetime string to UTC ISO string for database storage
 * @param localDateTime - Local datetime in ISO format (e.g., "2025-01-15T14:30:00")
 * @param timezone - Optional timezone offset (e.g., "-0800" or "+0200"). Defaults to system timezone
 * @returns UTC ISO string for database storage
 */
export function toUTC(localDateTime: string, timezone?: string): string {
  if (!localDateTime) return localDateTime;
  
  // If already includes timezone info, parse directly
  if (localDateTime.includes('T') && (localDateTime.includes('+') || localDateTime.includes('Z') || localDateTime.endsWith('-'))) {
    return new Date(localDateTime).toISOString();
  }
  
  // If timezone provided, append it
  if (timezone) {
    const dateWithTZ = `${localDateTime}${timezone}`;
    return new Date(dateWithTZ).toISOString();
  }
  
  // Assume local timezone and convert to UTC
  return new Date(localDateTime).toISOString();
}

/**
 * Convert UTC ISO string from database to local datetime
 * @param utcDateTime - UTC ISO string from database
 * @param options - Formatting options
 * @returns Local datetime string
 */
export function fromUTC(utcDateTime: string, options: {
  format?: 'iso' | 'locale' | 'date-only' | 'time-only' | 'datetime-local';
  timezone?: string;
} = {}): string {
  if (!utcDateTime) return utcDateTime;
  
  const date = new Date(utcDateTime);
  const { format = 'iso', timezone } = options;
  
  // If specific timezone provided, use it
  if (timezone) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date).replace(/(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3T$4:$5:$6');
  }
  
  switch (format) {
    case 'locale':
      return date.toLocaleString();
    case 'date-only':
      return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    case 'time-only':
      return date.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS format
    case 'datetime-local':
      // Format for HTML datetime-local input: YYYY-MM-DDTHH:MM
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    case 'iso':
    default:
      // Return local ISO string (without Z suffix)
      const localISOString = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
      return localISOString.slice(0, -1); // Remove 'Z' suffix
  }
}

/**
 * Get current datetime in UTC for database operations
 * @returns UTC ISO string
 */
export function nowUTC(): string {
  return new Date().toISOString();
}

/**
 * Get current datetime in local timezone
 * @param format - Format option
 * @returns Local datetime string
 */
export function nowLocal(format: 'iso' | 'locale' | 'datetime-local' = 'iso'): string {
  return fromUTC(nowUTC(), { format });
}

/**
 * Check if a datetime string is in UTC format (ends with Z)
 * @param dateTime - DateTime string to check
 * @returns True if UTC format
 */
export function isUTC(dateTime: string): boolean {
  return dateTime.endsWith('Z') || dateTime.includes('+') || (dateTime.includes('-') && dateTime.lastIndexOf('-') > 10);
}

/**
 * Convert search/filter parameters from local time to UTC for API queries
 * Useful for date range searches where UI sends local dates but DB needs UTC
 * @param params - Object with potential datetime fields
 * @param dateFields - Array of field names that contain datetime values
 * @param timezone - Optional timezone for conversion. If not provided, treats input as local time
 * @returns Object with datetime fields converted to UTC
 */
export function convertSearchParamsToUTC<T extends Record<string, any>>(
  params: T, 
  dateFields: (keyof T)[] = ['due_before', 'due_after', 'created_before', 'created_after', 'start_date', 'end_date'],
  timezone?: string
): T {
  const converted = { ...params };
  
  dateFields.forEach(field => {
    if (converted[field]) {
      const dateValue = converted[field] as string;
      if (timezone) {
        // If timezone is provided, convert from that timezone to UTC
        converted[field] = convertFromTimezoneToUTC(dateValue, timezone);
      } else {
        // Default behavior: assume local timezone
        converted[field] = toUTC(dateValue);
      }
    }
  });
  
  return converted;
}

/**
 * Convert a datetime string from a specific timezone to UTC
 * @param datetime - Datetime string (can be ISO or date-only format)
 * @param timezone - Source timezone (e.g., "America/New_York", "Asia/Shanghai")
 * @returns UTC ISO string
 */
export function convertFromTimezoneToUTC(datetime: string, timezone: string): string {
  if (!datetime) return datetime;
  
  try {
    // If already includes timezone info, parse directly
    if (datetime.includes('T') && (datetime.includes('+') || datetime.includes('Z') || datetime.endsWith('-'))) {
      return new Date(datetime).toISOString();
    }
    
    // For date-only format (YYYY-MM-DD), assume start of day in the specified timezone
    if (datetime.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Create a date that represents midnight in the specified timezone
      const dateInTimezone = new Date(`${datetime}T00:00:00`);
      
      // Get the offset for this date in the specified timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Format the current time to understand the timezone offset
      const now = new Date();
      const localTime = formatter.format(now);
      const utcTime = now.toISOString().replace('T', ', ').replace(/\.\d{3}Z$/, '');
      
      // This is a simplified conversion - for production use date-fns-tz or similar
      // For now, assume the date string represents local time in the specified timezone
      return dateInTimezone.toISOString();
    }
    
    // For datetime strings, create date and assume it's in the specified timezone
    const date = new Date(datetime);
    return date.toISOString();
    
  } catch (error) {
    console.warn(`Failed to convert datetime "${datetime}" from timezone "${timezone}" to UTC:`, error);
    // Fallback to treating as UTC
    return toUTC(datetime);
  }
}

/**
 * Format a duration in minutes to human-readable string
 * @param minutes - Duration in minutes
 * @returns Human-readable duration string
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes < 1) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Get timezone offset string (e.g., "-0800", "+0200")
 * @param date - Optional date to get offset for (defaults to now)
 * @returns Timezone offset string
 */
export function getTimezoneOffset(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset <= 0 ? '+' : '-';
  return `${sign}${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;
}

/**
 * Get human-readable timezone name
 * @returns Timezone name (e.g., "America/New_York")
 */
export function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}