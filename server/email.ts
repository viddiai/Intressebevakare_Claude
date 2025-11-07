import { Resend } from 'resend';
import type { Lead, User } from '@shared/schema';

const resend = new Resend(process.env.RESEND_API_KEY);

function getBaseUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    return `https://${domains[0]}`;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  } else {
    return 'http://localhost:5000';
  }
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  console.log(`📧 Attempting to send email to: ${to}`);
  console.log(`🔗 Reset URL: ${resetUrl}`);
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

export async function sendLeadAssignmentEmail(user: User, lead: Lead) {
  const baseUrl = getBaseUrl();
  const leadUrl = `${baseUrl}/leads/${lead.id}`;
  const settingsUrl = `${baseUrl}/settings`;
  
  const firstName = user.firstName || 'där';
  const subject = `Nytt lead tilldelat: ${lead.vehicleTitle}`;
  
  const sourceMap: Record<string, string> = {
    'BYTBIL': 'Bytbil',
    'BLOCKET': 'Blocket',
    'HEMSIDA': 'Hemsida',
    'EGET': 'Eget'
  };
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  console.log(`📧 Attempting to send lead assignment email to: ${user.email}`);
  console.log(`📋 Lead: ${lead.vehicleTitle} (ID: ${lead.id})`);
  console.log(`🔑 API Key exists: ${!!process.env.RESEND_API_KEY}`);
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Leadhantering <noreply@intressefritidscenter.se>',
      to: [user.email],
      subject: subject,
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
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">Nytt Lead Tilldelat</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.5;">
                  Hej ${firstName},
                </p>
                <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.5;">
                  Du har tilldelats ett nytt lead:
                </p>
                
                <!-- Lead Details -->
                <div style="background-color: #f9f9f9; border-left: 4px solid hsl(0, 72%, 51%); padding: 20px; margin: 20px 0;">
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #666; font-size: 14px;">Fordon:</strong>
                    <p style="margin: 4px 0 0 0; color: #333; font-size: 15px;">${lead.vehicleTitle}</p>
                  </div>
                  
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #666; font-size: 14px;">Kund:</strong>
                    <p style="margin: 4px 0 0 0; color: #333; font-size: 15px;">${lead.contactName}</p>
                  </div>
                  
                  ${lead.contactEmail ? `
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #666; font-size: 14px;">E-post:</strong>
                    <p style="margin: 4px 0 0 0; color: #333; font-size: 15px;">${lead.contactEmail}</p>
                  </div>
                  ` : ''}
                  
                  ${lead.contactPhone ? `
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #666; font-size: 14px;">Telefon:</strong>
                    <p style="margin: 4px 0 0 0; color: #333; font-size: 15px;">${lead.contactPhone}</p>
                  </div>
                  ` : ''}
                  
                  ${lead.anlaggning ? `
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #666; font-size: 14px;">Anläggning:</strong>
                    <p style="margin: 4px 0 0 0; color: #333; font-size: 15px;">${lead.anlaggning}</p>
                  </div>
                  ` : ''}
                  
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #666; font-size: 14px;">Källa:</strong>
                    <p style="margin: 4px 0 0 0; color: #333; font-size: 15px;">${sourceMap[lead.source] || lead.source}</p>
                  </div>
                  
                  <div style="margin-bottom: 0;">
                    <strong style="color: #666; font-size: 14px;">Datum:</strong>
                    <p style="margin: 4px 0 0 0; color: #333; font-size: 15px;">${formatDate(lead.createdAt)}</p>
                  </div>
                </div>
                
                <!-- Action Buttons -->
                <div style="text-align: center; margin: 30px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                    <tr>
                      <td style="padding: 0 8px;">
                        <a href="${baseUrl}/api/leads/${lead.id}/email-accept" style="display: inline-block; background-color: hsl(142, 71%, 45%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                          ✓ Acceptera Lead
                        </a>
                      </td>
                      <td style="padding: 0 8px;">
                        <a href="${baseUrl}/api/leads/${lead.id}/email-decline" style="display: inline-block; background-color: hsl(0, 0%, 60%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                          ✗ Avvisa Lead
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <p style="margin: 20px 0 10px 0; text-align: center; color: #999; font-size: 13px;">
                  eller
                </p>
                
                <div style="text-align: center; margin: 10px 0 30px 0;">
                  <a href="${leadUrl}" style="display: inline-block; background-color: transparent; color: hsl(0, 72%, 51%); text-decoration: none; padding: 12px 30px; border: 2px solid hsl(0, 72%, 51%); border-radius: 6px; font-size: 14px; font-weight: 600;">
                    Visa Lead i systemet
                  </a>
                </div>
                
                ${lead.message ? `
                <div style="margin: 20px 0;">
                  <strong style="color: #666; font-size: 14px;">Meddelande från kund:</strong>
                  <p style="margin: 8px 0 0 0; color: #333; font-size: 15px; line-height: 1.6; background-color: #f9f9f9; padding: 15px; border-radius: 6px;">
                    ${lead.message}
                  </p>
                </div>
                ` : ''}
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="margin: 0 0 10px 0; color: #999; font-size: 13px; line-height: 1.5;">
                  Detta är en automatisk notifikation från Fritidscenter Lead-system.
                </p>
                <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.5;">
                  <a href="${settingsUrl}" style="color: hsl(0, 72%, 51%); text-decoration: none;">Hantera notifikationsinställningar</a>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0; color: #999; font-size: 12px;">
                  © ${new Date().getFullYear()} Fritidscenter Lead-system. Alla rättigheter förbehållna.
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

    console.log('Lead assignment email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending lead assignment email:', error);
    throw error;
  }
}

export async function sendAcceptanceReminderEmail(user: User, lead: Lead, hoursRemaining: number) {
  const baseUrl = getBaseUrl();
  const leadUrl = `${baseUrl}/leads/${lead.id}`;
  
  const firstName = user.firstName || 'där';
  const urgency = hoursRemaining <= 1 ? 'SISTA PÅMINNELSEN' : 'Påminnelse';
  const subject = `${urgency}: Bekräfta lead - ${lead.vehicleTitle}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Leadhantering <noreply@intressefritidscenter.se>',
      to: [user.email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="background-color: ${hoursRemaining <= 1 ? 'hsl(0, 72%, 51%)' : 'hsl(45, 93%, 47%)'}; padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">${urgency}</h1>
              </div>
              
              <div style="padding: 40px 30px;">
                <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.5;">
                  Hej ${firstName},
                </p>
                <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.5;">
                  Du har ${hoursRemaining} ${hoursRemaining === 1 ? 'timme' : 'timmar'} kvar att bekräfta följande lead:
                </p>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px; font-weight: 600;">
                    ${lead.vehicleTitle}
                  </h2>
                  <div style="margin: 10px 0;">
                    <strong style="color: #666; font-size: 14px;">Kund:</strong>
                    <span style="color: #333; font-size: 14px; margin-left: 8px;">${lead.contactName}</span>
                  </div>
                </div>
                
                <div style="background-color: ${hoursRemaining <= 1 ? '#fee' : '#fef3cd'}; border-left: 4px solid ${hoursRemaining <= 1 ? 'hsl(0, 72%, 51%)' : 'hsl(45, 93%, 47%)'}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #333; font-size: 15px;">
                    ⚠️ ${hoursRemaining <= 1 
                      ? 'Tiden håller på att ta slut! Om du inte bekräftar inom 1 timme kommer din manager att få en notifikation.' 
                      : 'Vänligen bekräfta eller neka detta lead så snart som möjligt.'}
                  </p>
                </div>
                
                <!-- Action Buttons -->
                <div style="text-align: center; margin: 30px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                    <tr>
                      <td style="padding: 0 8px;">
                        <a href="${baseUrl}/api/leads/${lead.id}/email-accept" style="display: inline-block; background-color: hsl(142, 71%, 45%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                          ✓ Acceptera Nu
                        </a>
                      </td>
                      <td style="padding: 0 8px;">
                        <a href="${baseUrl}/api/leads/${lead.id}/email-decline" style="display: inline-block; background-color: hsl(0, 0%, 60%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                          ✗ Avvisa
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <p style="margin: 20px 0 10px 0; text-align: center; color: #999; font-size: 13px;">
                  eller
                </p>
                
                <div style="text-align: center; margin: 10px 0 30px 0;">
                  <a href="${leadUrl}" style="display: inline-block; background-color: transparent; color: hsl(0, 72%, 51%); text-decoration: none; padding: 12px 30px; border: 2px solid hsl(0, 72%, 51%); border-radius: 6px; font-size: 14px; font-weight: 600;">
                    Visa Lead i systemet
                  </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.5;">
                  Detta är en automatisk påminnelse från Fritidscenter Lead-system.
                </p>
              </div>
              
              <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0; color: #999; font-size: 12px;">
                  © ${new Date().getFullYear()} Fritidscenter Lead-system. Alla rättigheter förbehållna.
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

    console.log('Acceptance reminder email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending acceptance reminder email:', error);
    throw error;
  }
}

export async function sendManagerTimeoutNotification(manager: User, seller: User, lead: Lead) {
  const baseUrl = getBaseUrl();
  const leadUrl = `${baseUrl}/leads/${lead.id}`;
  
  const managerFirstName = manager.firstName || 'där';
  const sellerName = seller.firstName && seller.lastName 
    ? `${seller.firstName} ${seller.lastName}` 
    : seller.email;
  const subject = `⚠️ Lead ej bekräftat: ${lead.vehicleTitle}`;
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Leadhantering <noreply@intressefritidscenter.se>',
      to: [manager.email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="background-color: hsl(0, 72%, 51%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">⚠️ Lead ej bekräftat</h1>
              </div>
              
              <div style="padding: 40px 30px;">
                <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.5;">
                  Hej ${managerFirstName},
                </p>
                <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.5;">
                  ${sellerName} har inte bekräftat följande lead inom 12 timmar:
                </p>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px; font-weight: 600;">
                    ${lead.vehicleTitle}
                  </h2>
                  <div style="margin: 10px 0;">
                    <strong style="color: #666; font-size: 14px;">Tilldelat:</strong>
                    <span style="color: #333; font-size: 14px; margin-left: 8px;">${lead.assignedAt ? formatDate(lead.assignedAt) : 'N/A'}</span>
                  </div>
                  <div style="margin: 10px 0;">
                    <strong style="color: #666; font-size: 14px;">Kund:</strong>
                    <span style="color: #333; font-size: 14px; margin-left: 8px;">${lead.contactName}</span>
                  </div>
                  ${lead.contactEmail ? `
                  <div style="margin: 10px 0;">
                    <strong style="color: #666; font-size: 14px;">E-post:</strong>
                    <span style="color: #333; font-size: 14px; margin-left: 8px;">${lead.contactEmail}</span>
                  </div>
                  ` : ''}
                  ${lead.contactPhone ? `
                  <div style="margin: 10px 0;">
                    <strong style="color: #666; font-size: 14px;">Telefon:</strong>
                    <span style="color: #333; font-size: 14px; margin-left: 8px;">${lead.contactPhone}</span>
                  </div>
                  ` : ''}
                </div>
                
                <div style="background-color: #fee; border-left: 4px solid hsl(0, 72%, 51%); padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #333; font-size: 15px;">
                    <strong>Åtgärd krävs:</strong> Vänligen följ upp med säljaren eller omfördela leadet manuellt.
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${leadUrl}" style="display: inline-block; background-color: hsl(0, 72%, 51%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                    Visa lead
                  </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.5;">
                  Detta är en automatisk notifikation från Fritidscenter Lead-system.
                </p>
              </div>
              
              <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0; color: #999; font-size: 12px;">
                  © ${new Date().getFullYear()} Fritidscenter Lead-system. Alla rättigheter förbehållna.
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

    console.log('Manager timeout notification sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending manager timeout notification:', error);
    throw error;
  }
}
