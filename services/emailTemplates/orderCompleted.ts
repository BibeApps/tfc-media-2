interface OrderCompletedData {
    orderNumber: string;
    customerName: string;
    downloadUrl: string;
}

export const orderCompletedTemplate = (data: OrderCompletedData): string => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Your Order is Ready!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Your Order is Ready!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${data.customerName},</p>
                    <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">Great news! Your order <strong>#${data.orderNumber}</strong> has been completed and is ready for download.</p>
                    
                    <a href="${data.downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #0EA5E9 0%, #A855F7 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0;">
                      Download Your Files
                    </a>
                    
                    <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">You can also access your downloads anytime from your client portal.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">Thank you for choosing TFC Media!</p>
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
