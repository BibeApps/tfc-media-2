interface BookingConfirmedData {
    bookingId: string;
    serviceType: string;
    confirmedDate: string;
    confirmedTime: string;
    customerName: string;
}

export const bookingConfirmedTemplate = (data: BookingConfirmedData): string => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmed</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Booking Confirmed!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${data.customerName},</p>
                    <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">Great news! Your booking has been confirmed.</p>
                    
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin: 30px 0;">
                      <h2 style="margin: 0 0 20px; font-size: 20px; color: #111827;">Booking Details</h2>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0;"><strong style="color: #111827;">Service:</strong></td>
                          <td style="padding: 8px 0; text-align: right; color: #374151;">${data.serviceType}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;"><strong style="color: #111827;">Date:</strong></td>
                          <td style="padding: 8px 0; text-align: right; color: #374151;">${data.confirmedDate}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;"><strong style="color: #111827;">Time:</strong></td>
                          <td style="padding: 8px 0; text-align: right; color: #374151;">${data.confirmedTime}</td>
                        </tr>
                      </table>
                    </div>
                    
                    <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">We look forward to seeing you! If you need to make any changes, please contact us as soon as possible.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">Questions? Contact us anytime.</p>
                    <p style="margin: 0; font-size: 14px; color: #10B981; font-weight: 600;">TFC Media</p>
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
