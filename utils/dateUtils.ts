/**
 * Format a date string or Date object to a human-readable format
 * @param date - Date string or Date object
 * @param format - 'short' (Dec 26, 2025) or 'long' (December 26, 2025)
 * @returns Formatted date string
 */
export const formatDate = (date: string | Date, format: 'short' | 'long' = 'short'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: format === 'short' ? 'short' : 'long',
        day: 'numeric'
    };

    return dateObj.toLocaleDateString('en-US', options);
};

/**
 * Format a date to include time
 * @param date - Date string or Date object
 * @returns Formatted date and time string (e.g., "Dec 26, 2025 at 2:30 PM")
 */
export const formatDateTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const dateOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };

    const datePart = dateObj.toLocaleDateString('en-US', dateOptions);
    const timePart = dateObj.toLocaleTimeString('en-US', timeOptions);

    return `${datePart} at ${timePart}`;
};
