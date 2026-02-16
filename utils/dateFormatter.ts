/**
 * Format a date string to a readable format: "Dec 26, 2025"
 * @param dateString - Date string in YYYY-MM-DD or ISO format
 * @returns Formatted date string like "Dec 26, 2025"
 */
export const formatDate = (dateString: string | Date): string => {
    if (!dateString) return '';

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    // Check if date is valid
    if (isNaN(date.getTime())) return '';

    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    };

    return date.toLocaleDateString('en-US', options);
};

/**
 * Format a date string to a readable format with full month: "December 26, 2025"
 * @param dateString - Date string in YYYY-MM-DD or ISO format
 * @returns Formatted date string like "December 26, 2025"
 */
export const formatDateLong = (dateString: string | Date): string => {
    if (!dateString) return '';

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    // Check if date is valid
    if (isNaN(date.getTime())) return '';

    const options: Intl.DateTimeFormatOptions = {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    };

    return date.toLocaleDateString('en-US', options);
};
