import twilio from 'twilio';

// Initialize Twilio client
// Credentials should be set in environment variables
const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
    console.warn('Twilio credentials not found in environment variables. SMS notifications will not work.');
}

export const twilioClient = accountSid && authToken
    ? twilio(accountSid, authToken)
    : null;

// Helper to check if Twilio is configured
export const isTwilioConfigured = (): boolean => {
    return twilioClient !== null;
};
