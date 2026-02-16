interface InvoiceCreatedData {
  invoiceNumber: string;
  clientName: string;
  title: string;
  totalAmount: number;
  amountDue: number;
  paymentType: 'full' | 'partial';
  dueDate?: string;
  paymentLink: string;
  notes?: string;
}

export const invoiceCreatedTemplate = (data: InvoiceCreatedData): string => {
  // Robust date formatting function
  const formatDueDate = (dateStr: string | undefined): string | null => {
    if (!dateStr || dateStr === 'null' || dateStr === 'undefined') {
      console.log('No due date provided');
      return null;
    }

    try {
      console.log('Formatting due date:', dateStr);
      // Try parsing with T00:00:00 appended if not already present
      const dateToFormat = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
      const date = new Date(dateToFormat);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date after parsing:', dateStr);
        return null;
      }

      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      console.log('Formatted due date:', formatted);
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', dateStr, error);
      return null;
    }
  };

  const formattedDueDate = formatDueDate(data.dueDate);
  const dueDateHtml = formattedDueDate
    ? `
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Due Date:</strong> ${formattedDueDate}
          </p>
        </div>
      `
    : '';

  const notesHtml = data.notes
    ? `
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #374151;">Notes:</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">${data.notes}</p>
        </div>
      `
    : '';

  const paymentTypeText = data.paymentType === 'full'
    ? 'Full payment is required'
    : `Initial payment of $${data.amountDue.toFixed(2)} is required`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice from TFC Media</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0EA5E9 0%, #A855F7 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">New Invoice</h1>
                    <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">${data.invoiceNumber}</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${data.clientName},</p>
                    <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">You've received a new invoice from TFC Media. ${paymentTypeText}.</p>
                    
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                      <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">Invoice For</p>
                      <p style="margin: 0; font-size: 20px; font-weight: bold; color: #111827;">${data.title}</p>
                    </div>
                    
                    ${dueDateHtml}
                    
                    <h2 style="margin: 30px 0 20px; font-size: 20px; color: #111827;">Invoice Details</h2>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      <tbody>
                        <tr>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">Total Amount</td>
                          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 16px; font-weight: 600; color: #111827;">$${data.totalAmount.toFixed(2)}</td>
                        </tr>
                        <tr style="background-color: #fef3c7;">
                          <td style="padding: 16px; font-size: 14px; font-weight: 600; color: #92400e;">Amount Due Now</td>
                          <td style="padding: 16px; text-align: right; font-weight: 700; font-size: 20px; color: #f59e0b;">$${data.amountDue.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    ${notesHtml}
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="${data.paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #0EA5E9 0%, #A855F7 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(14, 165, 233, 0.3);">
                        View & Pay Invoice
                      </a>
                    </div>
                    
                    <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                      Or copy this link: <br>
                      <a href="${data.paymentLink}" style="color: #0EA5E9; word-break: break-all;">${data.paymentLink}</a>
                    </p>
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
