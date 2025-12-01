/**
 * Parse a time string (e.g., "1h", "30m", "2d") into milliseconds
 */
export function parseTimeString(timeString: string): number {
  const match = timeString.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid time string format: ${timeString}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
  };

  return value * multipliers[unit];
}

/**
 * Get expiry date from a time string
 */
export function getExpiryDate(timeString: string): Date {
  const milliseconds = parseTimeString(timeString);
  return new Date(Date.now() + milliseconds);
}

