/**
 * Format phone number to (XXX) XXX-XXXX
 * Handles international formats too
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '');
  
  // Don't format if empty
  if (!cleaned) return '';
  
  // Format based on length
  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  } else if (cleaned.length <= 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else {
    // For longer numbers (international), just format first 10 digits
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
};

/**
 * Strip formatting from phone number (for storage)
 * Returns only digits
 */
export const stripPhoneFormatting = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Validate phone number (US format)
 * Returns true if valid 10-digit number
 */
export const isValidPhoneNumber = (value: string): boolean => {
  const cleaned = stripPhoneFormatting(value);
  return cleaned.length === 10;
};
