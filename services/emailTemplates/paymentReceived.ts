interface PaymentReceivedData {
    invoiceNumber: string;
    clientName: string;
    title: string;
    paymentAmount: number;
    totalAmount: number;
    amountPaid: number;
    remainingBalance: number;
    paymentMethod: string;
    paymentDate: string;
    isFullyPaid: boolean;
}

export const paymentReceivedTemplate = (data: PaymentReceivedData): string => {
    const statusBadge = data.isFullyPaid
        ? `
        <div style="background-color: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #065f46;">
            ✓ Invoice Fully Paid
          </p>
        </div>
      `
        : `
        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #92400e;">Remaining Balance</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f59e0b;">$${data.remainingBalance.toFixed(2)}</p>
        </div>
      `;

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received - TFC Media</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <div style="width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 32px;">✓</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Payment Received!</h1>
                    <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Thank you for your payment</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${data.clientName},</p>
                    <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">We've received your payment of <strong>$${data.paymentAmount.toFixed(2)}</strong> for invoice ${data.invoiceNumber}.</p>
                    
                    ${statusBadge}
                    
                    <h2 style="margin: 30px 0 20px; font-size: 20px; color: #111827;">Payment Details</h2>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      <tbody>
                        <tr style="background-color: #f9fafb;">
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">Invoice Number</td>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; font-weight: 600; color: #111827;">${data.invoiceNumber}</td>
                        </tr>
                        <tr>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">Invoice For</td>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; font-weight: 600; color: #111827;">${data.title}</td>
                        </tr>
                        <tr style="background-color: #f9fafb;">
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">Payment Amount</td>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 16px; font-weight: 600; color: #10b981;">$${data.paymentAmount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">Payment Method</td>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; color: #111827;">${data.paymentMethod}</td>
                        </tr>
                        <tr style="background-color: #f9fafb;">
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">Payment Date</td>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; color: #111827;">${new Date(data.paymentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</td>
                        </tr>
                        <tr>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">Total Invoice Amount</td>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; color: #111827;">$${data.totalAmount.toFixed(2)}</td>
                        </tr>
                        <tr style="background-color: #f9fafb;">
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">Total Paid</td>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; font-weight: 600; color: #10b981;">$${data.amountPaid.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 16px; font-size: 14px; font-weight: 600; color: #111827;">Balance Remaining</td>
                          <td style="padding: 16px; text-align: right; font-weight: 700; font-size: 18px; color: ${data.isFullyPaid ? '#10b981' : '#f59e0b'};">$${data.remainingBalance.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    ${data.isFullyPaid
            ? `
                      <div style="background-color: #d1fae5; border-radius: 8px; padding: 20px; margin: 30px 0;">
                        <p style="margin: 0; font-size: 14px; color: #065f46; line-height: 1.6;">
                          <strong>Your invoice is now fully paid!</strong> ${data.title === 'gallery' ? 'You can now access and download all your photos and videos.' : 'Thank you for your business!'}
                        </p>
                      </div>
                    `
            : `
                      <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 30px 0;">
                        <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                          You have a remaining balance of <strong>$${data.remainingBalance.toFixed(2)}</strong>. Please make your next payment at your earliest convenience.
                        </p>
                      </div>
                    `
        }
                    
                    <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">This is your payment receipt. Please keep it for your records.</p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">Questions? Contact us anytime.</p>
                    <p style="margin: 0; font-size: 14px; color: #0EA5E9; font-weight: 600;">TFC Media</p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};
