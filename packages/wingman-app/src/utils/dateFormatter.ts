/**
 * Utility functions for formatting dates and times in human-readable formats
 */

/**
 * Convert a date to a relative time string (e.g., "2 hours ago", "5 minutes ago")
 * @param date The date to format (can be a Date object or ISO string)
 * @returns A human-readable relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  // Handle future dates
  if (diffMs < 0) {
    return 'in the future';
  }

  // Less than a minute
  if (diffSec < 60) {
    if (diffSec < 5) {
      return 'just now';
    }
    return `${diffSec} second${diffSec === 1 ? '' : 's'} ago`;
  }

  // Less than an hour
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  }

  // Less than a day
  if (diffHour < 24) {
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  }

  // Less than a week
  if (diffDay < 7) {
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  }

  // Less than a month
  if (diffWeek < 4) {
    return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
  }

  // Less than a year
  if (diffMonth < 12) {
    return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
  }

  // Years
  return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
}