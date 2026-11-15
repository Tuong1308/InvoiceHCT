/**
 * Utility for unaccented, case-insensitive Vietnamese search
 */

export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function matchesVietnameseSearch(target: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  const normalizedTarget = removeVietnameseTones(target);
  const normalizedQuery = removeVietnameseTones(query);
  return normalizedTarget.includes(normalizedQuery);
}

