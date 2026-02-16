interface OrderPlacedData {
    orderNumber: string;
    total: number;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    customerName: string;
}

export const orderPlacedTemplate = (data: OrderPlacedData): string => {
    const itemsHtml = data.items
        .map(
            (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
        </tr>
      `
        )
        .join('');

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0EA5E9 0%, #A855F7 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Order Confirmed!</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${data.customerName},</p>
                    <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Thank you for your order! We've received your order and will begin processing it right away.</p>
                    
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                      <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">Order Number</p>
                      <p style="margin: 0; font-size: 24px; font-weight: bold; color: #0EA5E9;">#${data.orderNumber}</p>
                    </div>
                    
                    <h2 style="margin: 30px 0 20px; font-size: 20px; color: #111827;">Order Details</h2>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      <thead>
                        <tr style="background-color: #f9fafb;">
                          <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #374151;">Item</th>
                          <th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 600; color: #374151;">Qty</th>
                          <th style="padding: 12px; text-align: right; font-size: 14px; font-weight: 600; color: #374151;">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                        <tr style="background-color: #f9fafb;">
                          <td colspan="2" style="padding: 16px; font-weight: 600; color: #111827;">Total</td>
                          <td style="padding: 16px; text-align: right; font-weight: 700; font-size: 18px; color: #0EA5E9;">$${data.total.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">We'll send you another email when your order is ready for download.</p>
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
