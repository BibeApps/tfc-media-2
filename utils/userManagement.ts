import { supabase } from '../supabaseClient';

/**
 * Generate a random secure password
 * @param length - Length of password (default: 12)
 * @returns Random password string
 */
export const generateRandomPassword = (length: number = 12): string => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = lowercase + uppercase + numbers + symbols;

    // Helper to get a cryptographically secure random index
    const secureRandomIndex = (max: number): number => {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] % max;
    };

    let password = '';

    // Ensure at least one of each type
    password += lowercase[secureRandomIndex(lowercase.length)];
    password += uppercase[secureRandomIndex(uppercase.length)];
    password += numbers[secureRandomIndex(numbers.length)];
    password += symbols[secureRandomIndex(symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[secureRandomIndex(allChars.length)];
    }

    // Fisher-Yates shuffle using crypto.getRandomValues
    const chars = password.split('');
    for (let i = chars.length - 1; i > 0; i--) {
        const j = secureRandomIndex(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
};

/**
 * Create a new user with Supabase Auth and profile
 * @param userData - User data including email, name, role, etc.
 * @returns Created user data or error
 */
export const createUser = async (userData: {
    email: string;
    name: string;
    role: 'admin' | 'client';
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
}) => {
    try {
        console.log('Creating user with data:', { ...userData, password: '[REDACTED]' });

        // Generate temporary password
        const tempPassword = generateRandomPassword();
        console.log('Generated temporary password');

        // Call the Edge Function to create user with full profile data
        // This ensures all fields (phone, company, city, state, etc.) are inserted
        const { data, error } = await supabase.functions.invoke('create-admin-user', {
            body: {
                email: userData.email,
                password: tempPassword,
                name: userData.name,
                role: userData.role,
                phone: userData.phone || null,
                company: userData.company || null,
                address: userData.address || null,
                city: userData.city || null,
                state: userData.state || null,
                zip: userData.zip || null,
                country: userData.country || 'USA'
            }
        });

        if (error) {
            console.error('Edge function error:', error);
            throw new Error(`Failed to create user: ${error.message}`);
        }

        if (!data.success) {
            console.error('User creation failed:', data.error);
            throw new Error(data.error || 'Failed to create user');
        }

        console.log('User created successfully:', data.user.id);

        // Send activation email with temporary password
        console.log('Sending activation email...');
        await sendUserActivationEmail(userData.email, userData.name, tempPassword);

        return {
            success: true,
            user: data.user,
            tempPassword
        };
    } catch (error) {
        console.error('Error creating user:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};

/**
 * Send user activation email with temporary password
 * Note: This logs the email content for now. In production, integrate with
 * Supabase email templates or a custom email service (SendGrid, Mailgun, etc.)
 */
export const sendUserActivationEmail = async (
    email: string,
    name: string,
    tempPassword: string
) => {
    try {
        console.log('Calling Resend Edge Function to send password email...');

        // Call Edge Function to send email via Resend
        const { data, error } = await supabase.functions.invoke('send-password-email', {
            body: {
                email,
                name,
                tempPassword
            }
        });

        if (error) {
            console.error('Failed to send password email:', error);
            console.warn('Email sending failed, but user was created successfully');
            return { success: false, error: error.message };
        }

        console.log('✅ Password email sent successfully to:', email);
        return { success: true, messageId: data?.messageId };
    } catch (error) {
        console.error('Error in sendUserActivationEmail:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
};

