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

    let password = '';

    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
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

        // Create user using standard signup with email confirmation
        // Email confirmation must be enabled in Supabase for this to work
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: tempPassword,
            options: {
                emailRedirectTo: `${window.location.origin}/#/login`,
                data: {
                    name: userData.name,
                    role: userData.role,
                    temp_password: tempPassword  // Include password in metadata for email template
                }
            }
        });

        if (authError) {
            console.error('Auth signup error:', authError);
            throw new Error(`Auth error: ${authError.message}`);
        }

        if (!authData.user) {
            console.error('No user data returned from signup');
            throw new Error('No user data returned from Supabase');
        }

        console.log('Auth user created successfully:', authData.user.id);

        // Send activation email with temporary password
        console.log('Sending activation email...');
        await sendUserActivationEmail(userData.email, userData.name, tempPassword);

        return {
            success: true,
            user: authData.user,
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

