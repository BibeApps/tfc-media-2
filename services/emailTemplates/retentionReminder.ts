export const retentionReminderTemplate = (
    clientName: string,
    daysRemaining: number,
    itemCount: number,
    downloadsUrl: string
) => {
    const urgency = daysRemaining <= 7 ? 'urgent' : daysRemaining <= 30 ? 'warning' : 'info';
    const urgencyColor = urgency === 'urgent' ? '#dc3545' : urgency === 'warning' ? '#ffc107' : '#17a2b8';
    const urgencyBg = urgency === 'urgent' ? '#f8d7da' : urgency === 'warning' ? '#fff3cd' : '#d1ecf1';

    return {
        subject: `${daysRemaining} days remaining to download your media`,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: ${urgencyColor}; 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .content { 
            padding: 40px 30px;
          }
          .button { 
            display: inline-block; 
            padding: 16px 32px; 
            background: #667eea; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600;
            font-size: 16px;
            transition: background 0.3s;
          }
          .button:hover {
            background: #5568d3;
          }
          .countdown { 
            font-size: 64px; 
            font-weight: 700; 
            text-align: center; 
            margin: 30px 0; 
            color: ${urgencyColor};
            line-height: 1;
          }
          .countdown-label {
            font-size: 18px;
            text-align: center;
            color: #666;
            margin-top: 10px;
          }
          .info-box { 
            background: ${urgencyBg}; 
            border-left: 4px solid ${urgencyColor}; 
            padding: 20px; 
            margin: 24px 0;
            border-radius: 4px;
          }
          .footer { 
            text-align: center; 
            padding: 30px; 
            color: #666; 
            font-size: 14px;
            background: #f8f9fa;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          ul {
            margin: 16px 0;
            padding-left: 24px;
          }
          li {
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Download Reminder</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Hi ${clientName},</p>
            
            <p style="font-size: 16px;">This is a ${urgency === 'urgent' ? 'final' : 'friendly'} reminder that your media will be archived soon.</p>
            
            <div class="countdown">${daysRemaining}</div>
            <div class="countdown-label">day${daysRemaining === 1 ? '' : 's'} remaining</div>
            
            <div class="info-box">
              <p style="margin: 0; font-size: 18px; font-weight: 600; text-align: center;">
                You have <strong>${itemCount} ${itemCount === 1 ? 'item' : 'items'}</strong> available for download
              </p>
            </div>
            
            <div class="button-container">
              <a href="${downloadsUrl}" class="button">Download Now</a>
            </div>
            
            <p style="font-size: 16px; font-weight: 600; margin-top: 30px;">What happens after ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}?</p>
            <ul style="font-size: 16px;">
              <li>Your media will be moved to cold storage</li>
              <li>Thumbnails and watermarked versions will remain visible</li>
              <li>High-resolution originals will be archived</li>
              <li>You can request restoration for a fee</li>
            </ul>
            
            <p style="font-size: 16px; margin-top: 30px;">
              ${urgency === 'urgent'
                ? "⚠️ <strong>Don't lose access to your memories – download them today!</strong>"
                : "Don't miss out – download your media before it's archived."}
            </p>
            
            <p style="font-size: 16px; margin-top: 30px;">Best regards,<br><strong>TFC Media Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} TFC Media. All rights reserved.</p>
            <p style="margin-top: 10px; font-size: 12px;">You're receiving this reminder based on our 6-month retention policy.</p>
          </div>
        </div>
      </body>
      </html>
    `,
        text: `
Hi ${clientName},

This is a ${urgency === 'urgent' ? 'final' : 'friendly'} reminder that your media will be archived soon.

${daysRemaining} DAY${daysRemaining === 1 ? '' : 'S'} REMAINING

You have ${itemCount} ${itemCount === 1 ? 'item' : 'items'} available for download.

Download now: ${downloadsUrl}

What happens after ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}?
- Your media will be moved to cold storage
- Thumbnails and watermarked versions will remain visible
- High-resolution originals will be archived
- You can request restoration for a fee

${urgency === 'urgent'
                ? "Don't lose access to your memories – download them today!"
                : "Don't miss out – download your media before it's archived."}

Best regards,
TFC Media Team
    `.trim(),
    };
};
