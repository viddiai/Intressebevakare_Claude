import type { InsertLead } from "@shared/schema";
import * as cheerio from "cheerio";
import * as quotedPrintable from "quoted-printable";

export interface ParsedEmail {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  vehicleTitle: string;
  vehicleLink?: string;
  listingId?: string;
  message?: string;
  inquiryDateTime?: string;
  anlaggning?: "Falkenberg" | "Göteborg" | "Trollhättan";
  rawPayload: any;
}

export class EmailParser {
  private static decodeQuotedPrintable(text: string): string {
    if (!text) return text;
    try {
      return quotedPrintable.decode(text);
    } catch (error) {
      return text;
    }
  }

  private static decodeHtmlQuotedPrintable(html: string): string {
    if (!html) return html;
    try {
      let decoded = html
        .replace(/=\r?\n/g, '')
        .replace(/=3D/g, '=')
        .replace(/=22/g, '"')
        .replace(/=27/g, "'")
        .replace(/=C3=A5/g, 'å')
        .replace(/=C3=A4/g, 'ä')
        .replace(/=C3=B6/g, 'ö')
        .replace(/=C3=85/g, 'Å')
        .replace(/=C3=84/g, 'Ä')
        .replace(/=C3=96/g, 'Ö')
        .replace(/=C3=A9/g, 'é')
        .replace(/=C3=BC/g, 'ü');
      
      return decoded;
    } catch (error) {
      return html;
    }
  }

  static parseBytbilEmail(htmlContent: string, subject: string): ParsedEmail | null {
    const $ = cheerio.load(htmlContent);
    
    const contactName = $('td:contains("Namn:")').next().text().trim() ||
                        $('strong:contains("Namn:")').parent().text().replace('Namn:', '').trim() ||
                        $('p:contains("Namn:")').text().replace('Namn:', '').trim();
    
    const contactEmail = $('td:contains("E-post:")').next().text().trim() ||
                         $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '') ||
                         $('p:contains("E-post:")').text().replace('E-post:', '').trim();
    
    const contactPhone = $('td:contains("Telefon:")').next().text().trim() ||
                         $('p:contains("Telefon:")').text().replace('Telefon:', '').trim() ||
                         $('p:contains("Mobil:")').text().replace('Mobil:', '').trim();
    
    const vehicleTitle = subject.replace('Intresseanmälan:', '').replace('från Bytbil', '').trim() ||
                        $('h1, h2, h3').first().text().trim() ||
                        $('td:contains("Fordon:")').next().text().trim();
    
    const vehicleLink = $('a:contains("Visa annons")').attr('href') ||
                       $('a:contains("Se annons")').attr('href') ||
                       $('a[href*="bytbil.com"]').attr('href');
    
    const message = $('td:contains("Meddelande:")').next().text().trim() ||
                    $('p:contains("Meddelande:")').parent().text().replace('Meddelande:', '').trim();
    
    const anlaggning = this.extractAnlaggningFromContent(htmlContent + ' ' + subject);
    
    if (!contactName || !vehicleTitle) {
      return null;
    }

    return {
      contactName,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      vehicleTitle,
      vehicleLink: vehicleLink || undefined,
      listingId: vehicleLink ? this.extractListingId(vehicleLink) : undefined,
      message: message || undefined,
      anlaggning,
      rawPayload: { htmlContent, subject },
    };
  }

  static parseBlocketEmail(htmlContent: string, subject: string, senderName?: string): ParsedEmail | null {
    const decodedHtml = this.decodeHtmlQuotedPrintable(htmlContent);
    const $ = cheerio.load(decodedHtml);
    
    const emailAddress = $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '').trim() ||
                         $('p:contains("E-post:")').text().replace(/E-post:\s*/i, '').trim();
    
    let contactName = senderName || '';
    if (!contactName && emailAddress) {
      contactName = emailAddress.split('@')[0].replace(/[._-]/g, ' ');
    }
    
    const vehicleTitle = subject.replace(/^Ang\.\s*/i, '').trim();
    
    let vehicleLink = $('a[href*="blocket.se/annons"]').first().attr('href') ||
                      $('a:contains("Annons:")').attr('href') || '';
    
    const inquiryDateTime = $('p:contains("Datum:")').text().replace(/Datum:\s*/i, '').trim();
    
    const rawMessage = $('em').first().text().trim() ||
                       $('p:contains("Meddelande:")').next().find('em').text().trim();
    
    let message = '';
    if (vehicleLink) {
      message = vehicleLink + '\n\n';
    }
    if (rawMessage) {
      message += rawMessage;
    }
    
    const anlaggning = this.extractAnlaggningFromContent(htmlContent + ' ' + subject);
    
    if (!contactName || !vehicleTitle) {
      return null;
    }

    return {
      contactName,
      contactEmail: emailAddress || undefined,
      contactPhone: undefined,
      vehicleTitle,
      vehicleLink: vehicleLink || undefined,
      listingId: vehicleLink ? this.extractListingId(vehicleLink) : undefined,
      message: message || undefined,
      inquiryDateTime: inquiryDateTime || undefined,
      anlaggning,
      rawPayload: { htmlContent, subject },
    };
  }

  private static extractAnlaggningFromContent(content: string): "Falkenberg" | "Göteborg" | "Trollhättan" | undefined {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('falkenberg')) {
      return 'Falkenberg';
    }
    if (lowerContent.includes('göteborg') || lowerContent.includes('goteborg')) {
      return 'Göteborg';
    }
    if (lowerContent.includes('trollhättan') || lowerContent.includes('trollhattan')) {
      return 'Trollhättan';
    }
    
    return undefined;
  }

  private static extractListingId(url: string): string | undefined {
    const match = url.match(/\/(\d+)\/?$/);
    return match ? match[1] : undefined;
  }

  static parseEmail(htmlContent: string, subject: string, from: string, senderName?: string): ParsedEmail | null {
    if (from.toLowerCase().includes('bytbil')) {
      return this.parseBytbilEmail(htmlContent, subject);
    }
    
    if (from.toLowerCase().includes('blocket')) {
      return this.parseBlocketEmail(htmlContent, subject, senderName);
    }
    
    return null;
  }

  static toInsertLead(parsed: ParsedEmail, source: "BYTBIL" | "BLOCKET"): InsertLead {
    return {
      source,
      anlaggning: parsed.anlaggning || null,
      contactName: parsed.contactName,
      contactEmail: parsed.contactEmail || null,
      contactPhone: parsed.contactPhone || null,
      vehicleTitle: parsed.vehicleTitle,
      vehicleLink: parsed.vehicleLink || null,
      listingId: parsed.listingId || null,
      message: parsed.message || null,
      inquiryDateTime: parsed.inquiryDateTime || null,
      rawPayload: parsed.rawPayload,
      status: "NY_INTRESSEANMALAN",
      assignedToId: null,
      isDeleted: false,
    };
  }
}
