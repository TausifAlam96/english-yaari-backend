/**
 * Builds a half-open [start, end) range covering the calendar day of the
 * supplied timestamp. The timestamp may be in milliseconds or seconds.
 * Day boundaries are computed in the server's local timezone.
 */
export function getDayRange(timestamp: number): { start: Date; end: Date } {
  const milliseconds = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  const date = new Date(milliseconds);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}
