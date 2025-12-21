// Generate time slots in 30-minute increments from 6 AM to 11 PM
export const generateTimeSlots = (): string[] => {
    const slots: string[] = [];

    for (let hour = 6; hour <= 23; hour++) {
        for (let min of [0, 30]) {
            // Skip 11:30 PM, end at 11:00 PM
            if (hour === 23 && min === 30) continue;

            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            const period = hour >= 12 ? 'PM' : 'AM';
            const minutes = min.toString().padStart(2, '0');
            const hourStr = displayHour.toString().padStart(2, '0');

            slots.push(`${hourStr}:${minutes} ${period}`);
        }
    }

    return slots;
};

// Convert 12-hour time to minutes since midnight for comparison
export const timeToMinutes = (time: string): number => {
    const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
};

// Calculate duration between two times
export const calculateDuration = (startTime: string, endTime: string): string => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) return '';

    const diffMinutes = endMinutes - startMinutes;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) return `${minutes} minutes`;
    if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
};
