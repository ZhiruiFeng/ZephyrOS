/**
 * Time utilities for ZFlow frontend - handles local timezone display
 * All dates from zmemory API are in UTC and need to be converted for user display
 */

/**
 * Convert UTC datetime from API to local datetime for display
 * @param utcDateTime - UTC ISO string from API
 * @param options - Display options
 * @returns Formatted local datetime string
 */
export function toLocal(utcDateTime: string, options: {
  format?: 'short' | 'medium' | 'long' | 'full' | 'datetime-local' | 'date-only' | 'time-only';
  locale?: string;
  showTimezone?: boolean;
} = {}): string {
  if (!utcDateTime) return '';
  
  const date = new Date(utcDateTime);
  const { format = 'medium', locale = 'en-US', showTimezone = false } = options;
  
  switch (format) {
    case 'short':
      return date.toLocaleDateString(locale, { 
        month: 'short', 
        day: 'numeric',
        ...(showTimezone && { timeZoneName: 'short' })
      });
    case 'medium':
      return date.toLocaleDateString(locale, { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        ...(showTimezone && { timeZoneName: 'short' })
      });
    case 'long':
      return date.toLocaleDateString(locale, { 
        weekday: 'short',
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        ...(showTimezone && { timeZoneName: 'short' })
      });
    case 'full':
      return date.toLocaleString(locale, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(showTimezone && { timeZoneName: 'short' })
      });
    case 'datetime-local':
      // For HTML datetime-local inputs: YYYY-MM-DDTHH:MM
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    case 'date-only':
      return date.toLocaleDateString(locale, { 
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    case 'time-only':
      return date.toLocaleTimeString(locale, { 
        hour: '2-digit',
        minute: '2-digit',
        ...(showTimezone && { timeZoneName: 'short' })
      });
    default:
      return date.toLocaleDateString(locale, { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric'
      });
  }
}

/**
 * Convert local datetime to UTC for API calls
 * @param localDateTime - Local datetime string
 * @returns UTC ISO string for API
 */
export function toUTC(localDateTime: string): string {
  if (!localDateTime) return localDateTime;
  
  // If already includes timezone info, parse directly
  if (localDateTime.includes('T') && (localDateTime.includes('+') || localDateTime.includes('Z') || localDateTime.endsWith('-'))) {
    return new Date(localDateTime).toISOString();
  }
  
  // Assume local timezone and convert to UTC
  return new Date(localDateTime).toISOString();
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param utcDateTime - UTC datetime string from API
 * @param locale - Locale for formatting
 * @returns Relative time string
 */
export function formatRelative(utcDateTime: string, locale: string = 'en-US'): string {
  if (!utcDateTime) return '';
  
  const date = new Date(utcDateTime);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Future dates (negative diff means future)
  if (diffMs < 0) {
    const absDiffMinutes = Math.abs(diffMinutes);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);
    
    if (absDiffMinutes < 1) return 'in a moment';
    if (absDiffMinutes < 60) return `in ${absDiffMinutes}m`;
    if (absDiffHours < 24) return `in ${absDiffHours}h`;
    if (absDiffDays < 7) return `in ${absDiffDays}d`;
    return toLocal(utcDateTime, { format: 'medium' });
  }
  
  // Past dates
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // For dates older than a week, show formatted date
  return toLocal(utcDateTime, { format: 'medium' });
}

/**
 * Check if a UTC date is overdue (past current time)
 * @param utcDateTime - UTC datetime string
 * @returns True if overdue
 */
export function isOverdue(utcDateTime?: string): boolean {
  if (!utcDateTime) return false;
  const dueDate = new Date(utcDateTime);
  const now = new Date();
  return dueDate.getTime() < now.getTime();
}

/**
 * Check if a UTC date is today in local timezone
 * @param utcDateTime - UTC datetime string
 * @returns True if today in local timezone
 */
export function isToday(utcDateTime: string): boolean {
  if (!utcDateTime) return false;
  
  const date = new Date(utcDateTime);
  const today = new Date();
  
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
}

/**
 * Check if a UTC date is this week in local timezone
 * @param utcDateTime - UTC datetime string
 * @returns True if this week in local timezone
 */
export function isThisWeek(utcDateTime: string): boolean {
  if (!utcDateTime) return false;
  
  const date = new Date(utcDateTime);
  const today = new Date();
  
  // Get start of this week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Get end of this week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return date >= startOfWeek && date <= endOfWeek;
}

/**
 * Get current datetime in local timezone formatted for datetime-local input
 * @returns Local datetime string for HTML input
 */
export function nowLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format duration in minutes to human-readable string
 * @param minutes - Duration in minutes
 * @returns Human-readable duration (e.g., "2h 30m")
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
 * Get user's timezone name for display
 * @returns Timezone name (e.g., "America/New_York")
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get timezone abbreviation (e.g., "PST", "EST")
 * @param date - Date to get timezone for (defaults to now)
 * @returns Timezone abbreviation
 */
export function getTimezoneAbbr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { 
    timeZoneName: 'short' 
  }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value || '';
}

/**
 * Smart date formatter that chooses appropriate format based on date proximity
 * @param utcDateTime - UTC datetime string from API
 * @param options - Formatting options
 * @returns Appropriately formatted date string
 */
export function smartFormatDate(utcDateTime: string, options: {
  showTime?: boolean;
  showRelative?: boolean;
  locale?: string;
} = {}): string {
  if (!utcDateTime) return '';
  
  const { showTime = false, showRelative = true, locale = 'en-US' } = options;
  
  // For dates within the last day, show relative time
  if (showRelative) {
    const date = new Date(utcDateTime);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (Math.abs(diffHours) < 24) {
      return formatRelative(utcDateTime, locale);
    }
  }
  
  // For dates this week, show day name
  if (isThisWeek(utcDateTime)) {
    return toLocal(utcDateTime, { 
      format: showTime ? 'full' : 'long',
      locale 
    });
  }
  
  // For other dates, show standard format
  return toLocal(utcDateTime, { 
    format: showTime ? 'full' : 'medium',
    locale 
  });
}