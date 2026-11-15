/**
 * Date and timezone utilities for Asia/Ho_Chi_Minh (UTC+7)
 */

export function getVietnamDate(date = new Date()): Date {
  // Use Intl or offset calculation for UTC+7
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 7);
}

/**
 * Returns YYYY-MM-DD representing Vietnam business date
 */
export function getVietnamBusinessDate(date = new Date()): string {
  const vnDate = getVietnamDate(date);
  const year = vnDate.getFullYear();
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const day = String(vnDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns DDMMYY string for bill code generation (e.g. 141126 for 14/11/2026)
 */
export function getVietnamBillPrefix(date = new Date()): string {
  const vnDate = getVietnamDate(date);
  const day = String(vnDate.getDate()).padStart(2, '0');
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const year = String(vnDate.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

/**
 * Format datetime for display: DD/MM/YYYY HH:mm
 */
export function formatVietnamDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const vnDate = getVietnamDate(date);
  
  const day = String(vnDate.getDate()).padStart(2, '0');
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const year = vnDate.getFullYear();
  const hours = String(vnDate.getHours()).padStart(2, '0');
  const minutes = String(vnDate.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format date for display: DD/MM/YYYY
 */
export function formatVietnamDate(dateStr: string): string {
  if (!dateStr) return '';
  // Can be YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Format time for display: HH:mm
 */
export function formatVietnamTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const vnDate = getVietnamDate(date);
  const hours = String(vnDate.getHours()).padStart(2, '0');
  const minutes = String(vnDate.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

