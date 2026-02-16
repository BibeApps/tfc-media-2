/**
 * Invoice System - Download Permission Utility
 * 
 * This utility checks if a user can download items from a gallery session
 * based on the session's payment status and linked invoice.
 */

import { Session, DownloadPermission } from '../types';

/**
 * Check download permission for a gallery session
 * 
 * @param session - The gallery session to check
 * @returns DownloadPermission object with permission details
 */
export function checkDownloadPermission(session: Session): DownloadPermission {
    const paymentStatus = session.payment_status || 'not_paid';

    switch (paymentStatus) {
        case 'invoice_fully_paid':
            // Invoice is fully paid - allow free downloads
            return {
                canDownload: true,
                requiresPayment: false,
                message: 'Your invoice has been paid in full. Enjoy your downloads!',
                showPrices: false,
                useCartFlow: false,
            };

        case 'invoice_partially_paid':
            // Invoice exists but not fully paid - block downloads
            return {
                canDownload: false,
                requiresPayment: true,
                message: 'Downloads will be available once your invoice is paid in full.',
                showPrices: false,
                useCartFlow: false,
                invoiceLink: session.invoice_id ? `/invoices/${session.invoice_id}` : undefined,
            };

        case 'not_paid':
        default:
            // No invoice - use standard cart/checkout flow
            return {
                canDownload: false,
                requiresPayment: true,
                message: 'Add items to cart to purchase',
                showPrices: true,
                useCartFlow: true,
            };
    }
}

/**
 * Get user-friendly payment status label
 * 
 * @param status - Payment status from session
 * @returns Human-readable status label
 */
export function getPaymentStatusLabel(
    status: Session['payment_status']
): string {
    switch (status) {
        case 'invoice_fully_paid':
            return 'Paid - Downloads Available';
        case 'invoice_partially_paid':
            return 'Partial Payment - Downloads Pending';
        case 'not_paid':
        default:
            return 'Pay Per Item';
    }
}

/**
 * Get payment status badge color
 * 
 * @param status - Payment status from session
 * @returns Tailwind color class for badge
 */
export function getPaymentStatusColor(
    status: Session['payment_status']
): string {
    switch (status) {
        case 'invoice_fully_paid':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'invoice_partially_paid':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'not_paid':
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
}

/**
 * Check if session requires invoice payment
 * 
 * @param session - The gallery session to check
 * @returns True if session has an invoice
 */
export function hasInvoice(session: Session): boolean {
    return !!session.invoice_id;
}

/**
 * Check if downloads are blocked
 * 
 * @param session - The gallery session to check
 * @returns True if downloads are blocked
 */
export function areDownloadsBlocked(session: Session): boolean {
    return session.payment_status === 'invoice_partially_paid';
}

/**
 * Check if downloads are free (no payment required)
 * 
 * @param session - The gallery session to check
 * @returns True if downloads are free
 */
export function areDownloadsFree(session: Session): boolean {
    return session.payment_status === 'invoice_fully_paid';
}

/**
 * Get the appropriate image URL based on payment status
 * 
 * @param session - The gallery session
 * @param originalUrl - Original (non-watermarked) image URL
 * @param watermarkedUrl - Watermarked preview image URL
 * @returns The appropriate URL to display
 */
export function getImageUrl(
    session: Session,
    originalUrl: string,
    watermarkedUrl: string
): string {
    // If invoice is fully paid, show original
    if (session.payment_status === 'invoice_fully_paid') {
        return originalUrl;
    }

    // Otherwise, show watermarked version
    return watermarkedUrl;
}

/**
 * Get download button text based on payment status
 * 
 * @param session - The gallery session
 * @returns Button text
 */
export function getDownloadButtonText(session: Session): string {
    switch (session.payment_status) {
        case 'invoice_fully_paid':
            return 'Download';
        case 'invoice_partially_paid':
            return 'Payment Required';
        case 'not_paid':
        default:
            return 'Add to Cart';
    }
}

/**
 * Check if item prices should be shown
 * 
 * @param session - The gallery session
 * @returns True if prices should be displayed
 */
export function shouldShowPrices(session: Session): boolean {
    // Hide prices if there's an invoice (fully or partially paid)
    return !hasInvoice(session);
}

/**
 * Get banner message for session
 * 
 * @param session - The gallery session
 * @returns Banner message or null if no banner needed
 */
export function getBannerMessage(session: Session): {
    type: 'success' | 'warning' | 'info';
    message: string;
} | null {
    switch (session.payment_status) {
        case 'invoice_fully_paid':
            return {
                type: 'success',
                message: '✓ Your invoice has been paid in full. All downloads are available!',
            };
        case 'invoice_partially_paid':
            return {
                type: 'warning',
                message: '🔒 Downloads are restricted until your invoice is paid in full.',
            };
        default:
            return null;
    }
}
