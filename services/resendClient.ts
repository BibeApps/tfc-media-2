import { Resend } from 'resend';

// Initialize Resend client
// API key should be set in environment variables as VITE_RESEND_API_KEY
const apiKey = import.meta.env.VITE_RESEND_API_KEY;

if (!apiKey) {
    console.warn('VITE_RESEND_API_KEY not found in environment variables. Email notifications will not work.');
}

export const resend = apiKey ? new Resend(apiKey) : null;

// Helper to check if Resend is configured
export const isResendConfigured = (): boolean => {
    return resend !== null;
};
