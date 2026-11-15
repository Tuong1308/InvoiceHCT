/**
 * Utility functions for VND currency formatting and calculation
 */

export function formatVND(amount: number | null | undefined, includeUnit = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeUnit ? '0đ' : '0';
  }
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return includeUnit ? `${formatted}đ` : formatted;
}

export function parseVND(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function calculateChange(total: number, cashReceived: number | null | undefined): {
  change: number;
  isEnough: boolean;
  difference: number;
} {
  if (cashReceived === null || cashReceived === undefined || cashReceived === 0) {
    return { change: 0, isEnough: true, difference: 0 };
  }
  const diff = cashReceived - total;
  return {
    change: Math.max(0, diff),
    isEnough: diff >= 0,
    difference: diff,
  };
}

