export function formatScore(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toFixed(1);
}

export function formatBlendedCost(value: number | null, isFree: boolean): string {
  if (isFree) return 'Free';
  if (value == null) return '—';
  if (value === 0) return '$0';
  if (value < 0.01) return `<$0.01`;
  return `$${value.toFixed(2)}`;
}

export function formatPricePerM(value: number | null): string {
  if (value == null) return '—';
  if (value === 0) return '$0';
  if (value < 0.01) return `<$0.01`;
  return `$${value.toFixed(2)}`;
}

export function formatTps(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toFixed(value < 100 ? 1 : 0);
}

export function formatTtft(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toFixed(2)}s`;
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null) return '—';
  return `${value.toFixed(digits)}%`;
}

export function formatMatch(value: number): string {
  return value.toFixed(0);
}
