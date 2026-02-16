export const downloadPackageReadyTemplate = (
    clientName: string,
    eventName: string,
    itemCount: number,
    fileSize: number,
    downloadUrl: string,
    expiresAt: Date
) => {
    const fileSizeGB = (fileSize / 1024 / 1024 / 1024).toFixed(2);
    const expiryDate = expiresAt.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tfcmedia.com';

    return {
        subject: `Your Download Package is Ready! 📦`,
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
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
          .info-box { 
            background: #f8f9fa; 
            border-left: 4px solid #667eea; 
            padding: 20px; 
            margin: 24px 0;
            border-radius: 4px;
          }
          .info-box p {
            margin: 8px 0;
          }
          .warning { 
            background: #fff3cd; 
            border-left-color: #ffc107;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Your Download Package is Ready!</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Hi ${clientName},</p>
            
            <p style="font-size: 16px;">Great news! Your download package for <strong>"${eventName}"</strong> is ready to download.</p>
            
            <div class="info-box">
              <p><strong>📦 Package Contains:</strong> ${itemCount} high-resolution ${itemCount === 1 ? 'item' : 'items'}</p>
              <p><strong>💾 Total Size:</strong> ${fileSizeGB} GB</p>
              <p><strong>⏰ Link Expires:</strong> ${expiryDate}</p>
            </div>
            
            <div class="button-container">
              <a href="${downloadUrl}" class="button">Download Package (${fileSizeGB} GB)</a>
            </div>
            
            <div class="info-box warning">
              <p><strong>⚠️ Important:</strong> This download link expires in 48 hours. Your individual downloads remain available for 6 months in your Downloads page.</p>
            </div>
            
            <p style="font-size: 16px;">You can also download individual items anytime from your <a href="${appUrl}/downloads" style="color: #667eea; text-decoration: none; font-weight: 600;">Downloads page</a>.</p>
            
            <p style="font-size: 16px; margin-top: 30px;">Questions? Just reply to this email.</p>
            
            <p style="font-size: 16px; margin-top: 20px;">Best regards,<br><strong>TFC Media Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} TFC Media. All rights reserved.</p>
            <p style="margin-top: 10px; font-size: 12px;">You're receiving this email because you requested a download package.</p>
          </div>
        </div>
      </body>
      </html>
    `,
        text: `
Hi ${clientName},

Your download package for "${eventName}" is ready!

Package Contains: ${itemCount} high-resolution ${itemCount === 1 ? 'item' : 'items'}
Total Size: ${fileSizeGB} GB
Link Expires: ${expiryDate}

Download here: ${downloadUrl}

Important: This link expires in 48 hours. Your individual downloads remain available for 6 months.

You can also download items from: ${appUrl}/downloads

Questions? Reply to this email.

Best regards,
TFC Media Team
    `.trim(),
    };
};
