/**
 * Advanced timezone utilities for handling different timezone selections
 * This complements the basic timeUtils with more sophisticated timezone handling
 */

/**
 * Create a date in a specific timezone at start of day (00:00:00)
 * @param dateString - Date string (YYYY-MM-DD format)
 * @param timezone - Target timezone (e.g., 'America/New_York', 'Asia/Shanghai')
 * @returns Date object representing start of day in the specified timezone
 */
export function createDateInTimezone(dateString: string, timezone: string): Date {
  // Create a temporary date to get the right date components
  const tempDate = new Date(`${dateString}T12:00:00`); // Use noon to avoid DST issues
  
  // Get the date components
  const year = tempDate.getFullYear();
  const month = tempDate.getMonth();
  const day = tempDate.getDate();
  
  // Create date at start of day in local timezone first
  const localStartOfDay = new Date(year, month, day, 0, 0, 0, 0);
  
  if (timezone === Intl.DateTimeFormat().resolvedOptions().timeZone) {
    // If the target timezone is the same as local, return as-is
    return localStartOfDay;
  }
  
  // For different timezones, we need to calculate the offset
  // This is a simplified approach - for full timezone support, consider using date-fns-tz or similar
  try {
    // Create a date string that will be interpreted in the target timezone
    const isoString = `${dateString}T00:00:00`;
    
    // Get the time zone offset for the target timezone at this date
    const targetDate = new Date(isoString);
    const localOffset = targetDate.getTimezoneOffset();
    
    // Create formatter for the target timezone
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
    
    // Format a known date in the target timezone to understand the offset
    const testDate = new Date('2025-01-01T12:00:00Z');
    const formattedInTarget = formatter.format(testDate);
    const parsedTarget = new Date(formattedInTarget.replace(/(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3T$4:$5:$6'));
    
    const targetOffset = (testDate.getTime() - parsedTarget.getTime()) / (1000 * 60);
    const offsetDiff = targetOffset - localOffset;
    
    // Adjust the local date by the offset difference
    return new Date(localStartOfDay.getTime() + offsetDiff * 60 * 1000);
  } catch (error) {
    console.warn('Timezone conversion failed, falling back to local timezone:', error);
    return localStartOfDay;
  }
}

/**
 * Get start and end of day boundaries in a specific timezone, converted to UTC
 * @param dateString - Date string (YYYY-MM-DD format)
 * @param timezone - Target timezone
 * @returns Object with UTC start and end times
 */
export function getDayBoundariesInTimezone(dateString: string, timezone: string): {
  startUTC: string;
  endUTC: string;
} {
  try {
    if (timezone === Intl.DateTimeFormat().resolvedOptions().timeZone) {
      // If same as local timezone, use simple local date creation
      const startOfDay = new Date(`${dateString}T00:00:00`);
      const endOfDay = new Date(`${dateString}T23:59:59.999`);
      
      return {
        startUTC: startOfDay.toISOString(),
        endUTC: endOfDay.toISOString()
      };
    }
    
    // For different timezones, create dates that represent the boundaries in that timezone
    const startOfDay = createDateInTimezone(dateString, timezone);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    
    return {
      startUTC: startOfDay.toISOString(),
      endUTC: endOfDay.toISOString()
    };
  } catch (error) {
    console.error('Error creating timezone boundaries:', error);
    
    // Fallback to local timezone
    const startOfDay = new Date(`${dateString}T00:00:00`);
    const endOfDay = new Date(`${dateString}T23:59:59.999`);
    
    return {
      startUTC: startOfDay.toISOString(),
      endUTC: endOfDay.toISOString()
    };
  }
}

/**
 * Get a human-readable description of the timezone offset
 * @param timezone - Target timezone
 * @returns String describing the current offset (e.g., "UTC+8", "UTC-5")
 */
export function getTimezoneOffsetDescription(timezone: string): string {
  try {
    const now = new Date();
    const utcTime = new Date(now.toISOString());
    
    // Format the current time in the target timezone
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
    
    const formattedInTarget = formatter.format(now);
    const targetTime = new Date(formattedInTarget.replace(/(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3T$4:$5:$6'));
    
    // Calculate offset in minutes
    const offsetMinutes = (targetTime.getTime() - utcTime.getTime()) / (1000 * 60);
    const offsetHours = offsetMinutes / 60;
    
    if (offsetHours === 0) return 'UTC';
    
    const sign = offsetHours > 0 ? '+' : '-';
    const absHours = Math.abs(offsetHours);
    const hours = Math.floor(absHours);
    const minutes = Math.round((absHours - hours) * 60);
    
    if (minutes === 0) {
      return `UTC${sign}${hours}`;
    } else {
      return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
    }
  } catch (error) {
    console.warn('Could not calculate timezone offset:', error);
    return timezone;
  }
}

/**
 * Check if a given timezone string is valid
 * @param timezone - Timezone string to validate
 * @returns True if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the user's current local timezone
 * @returns Local timezone string
 */
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}