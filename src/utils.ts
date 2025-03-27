export function parseIntOption(value: string, defaultValue?: number): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Invalid number: ${value}`);
  }
  return parsed;
}

export function parseFloatOption(value: string, defaultValue?: number): number {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Invalid number: ${value}`);
  }
  return parsed;
}

export function formatElapsedTime(startTime: Date, endTime: Date): string {
  const elapsed = endTime.getTime() - startTime.getTime();
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}
