import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const resetUrl = `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000'}/reset-password?token=${resetToken}`;

  console.log(`📧 Attempting to send email to: ${to}`);
  console.log(`🔑 API Key exists: ${!!process.env.RESEND_API_KEY}`);
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Leadhantering <noreply@intressefritidscenter.se>',
      to: [to],
      subject: 'Återställ ditt lösenord',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background-color: hsl(0, 72%, 51%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">Återställ ditt lösenord</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.5;">
                  Hej!
                </p>
                <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.5;">
                  Du har begärt att återställa ditt lösenord för ditt konto i Leadhanteringssystemet.
                </p>
                <p style="margin: 0 0 30px 0; color: #333; font-size: 16px; line-height: 1.5;">
                  Klicka på knappen nedan för att skapa ett nytt lösenord:
                </p>
                
                <!-- Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background-color: hsl(0, 72%, 51%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                    Återställ lösenord
                  </a>
                </div>
                
                <p style="margin: 30px 0 20px 0; color: #666; font-size: 14px; line-height: 1.5;">
                  Denna länk är giltig i 1 timme och kan endast användas en gång.
                </p>
                
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; line-height: 1.5;">
                  Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:
                </p>
                <p style="margin: 0; color: #0066cc; font-size: 14px; word-break: break-all;">
                  ${resetUrl}
                </p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.5;">
                  Om du inte begärde denna återställning kan du ignorera detta meddelande. Ditt lösenord förblir oförändrat.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0; color: #999; font-size: 12px;">
                  © ${new Date().getFullYear()} Leadhanteringssystem. Alla rättigheter förbehållna.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error('Failed to send email');
    }

    console.log('Password reset email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}
