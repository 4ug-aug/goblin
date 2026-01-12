import { format, formatDistanceToNow, isThisYear, isToday, isYesterday } from "date-fns";
import { enUS } from "date-fns/locale";

/**
 * Format amount from cents/øre to currency string
 * @param amount Amount in cents (e.g., 12550 = 125.50)
 * @param showCurrency Whether to append currency suffix
 */
export function formatAmount(amount: number, showCurrency = true): string {
  const units = amount / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(units);

  return showCurrency ? `${formatted} kr` : formatted;
}

/**
 * Format currency amount (alias for formatAmount for cleaner imports)
 */
export function formatCurrency(amount: number, showCurrency = true): string {
  return formatAmount(amount, showCurrency);
}

/**
 * Format amount with sign prefix for display
 * Positive amounts get "+" prefix, negative are shown as-is
 */
export function formatAmountWithSign(amount: number, showCurrency = true): string {
  const formatted = formatAmount(Math.abs(amount), showCurrency);
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Determine if amount is income (positive) or expense (negative)
 */
export function isIncome(amount: number): boolean {
  return amount > 0;
}

/**
 * Format ISO date string to human-readable format
 * Shows "Today", "Yesterday", or date like "12 Jan" / "12 Jan 2024"
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);

  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  if (isThisYear(date)) {
    return format(date, "d MMM", { locale: enUS });
  }
  return format(date, "d MMM yyyy", { locale: enUS });
}

/**
 * Format date for table display - compact format
 */
export function formatDateCompact(isoDate: string): string {
  const date = new Date(isoDate);
  return format(date, "d MMM", { locale: enUS });
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startFormat = isThisYear(start) ? "d MMM" : "d MMM yyyy";
  const endFormat = isThisYear(end) ? "d MMM" : "d MMM yyyy";

  return `${format(start, startFormat, { locale: enUS })} – ${format(end, endFormat, { locale: enUS })}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: enUS });
}

/**
 * Get current month's date range in ISO format
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

/**
 * Get last N days date range in ISO format
 */
export function getLastNDaysRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

/**
 * Format category path (e.g., "Food & drink > Supermarket")
 */
export function formatCategoryPath(
  categoryName: string | null | undefined,
  parentCategoryName: string | null | undefined
): string {
  if (!categoryName) return "Uncategorized";
  if (parentCategoryName) {
    return `${parentCategoryName} › ${categoryName}`;
  }
  return categoryName;
}
