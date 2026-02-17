/**
 * Format a date string for email templates
 * Converts "2026-01-09" to "Jan 9, 2026"
 */
export const formatEmailDate = (dateString: string): string => {
    try {
        // Parse YYYY-MM-DD manually to avoid timezone shift
        // new Date("2026-03-15") parses as UTC midnight, which shifts back
        // a day in US timezones when formatted with toLocaleDateString
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }
        }

        // Fallback for other date formats
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
};
