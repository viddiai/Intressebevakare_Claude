import type { InsertLead } from "@shared/schema";
import * as cheerio from "cheerio";

export interface ParsedEmail {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  vehicleTitle: string;
  vehicleLink?: string;
  listingId?: string;
  message?: string;
  anlaggning?: "Falkenberg" | "Göteborg" | "Trollhättan";
  rawPayload: any;
}

export class EmailParser {
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

  static parseBlocketEmail(htmlContent: string, subject: string): ParsedEmail | null {
    const $ = cheerio.load(htmlContent);
    
    const contactName = $('td:contains("Från:")').next().text().trim() ||
                        $('strong:contains("Från:")').parent().text().replace('Från:', '').trim() ||
                        $('p:contains("Namn:")').text().replace('Namn:', '').trim();
    
    const contactEmail = $('td:contains("E-postadress:")').next().text().trim() ||
                         $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '') ||
                         $('p:contains("E-post:")').text().replace('E-post:', '').trim();
    
    const contactPhone = $('td:contains("Telefonnummer:")').next().text().trim() ||
                         $('p:contains("Telefon:")').text().replace('Telefon:', '').trim();
    
    const vehicleTitle = subject.replace('Meddelande från Blocket:', '').trim() ||
                        $('h1, h2').first().text().trim() ||
                        $('td:contains("Annons:")').next().text().trim();
    
    const vehicleLink = $('a:contains("Svara")').attr('href') ||
                       $('a:contains("Visa annons")').attr('href') ||
                       $('a[href*="blocket.se"]').attr('href');
    
    const message = $('td:contains("Meddelande:")').next().text().trim() ||
                    $('p').filter((i, el) => {
                      const text = $(el).text();
                      return text.length > 20 && !text.includes('Från:') && !text.includes('E-post');
                    }).first().text().trim();
    
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

  static parseEmail(htmlContent: string, subject: string, from: string): ParsedEmail | null {
    if (from.toLowerCase().includes('bytbil')) {
      return this.parseBytbilEmail(htmlContent, subject);
    }
    
    if (from.toLowerCase().includes('blocket')) {
      return this.parseBlocketEmail(htmlContent, subject);
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
      rawPayload: parsed.rawPayload,
      status: "NY_INTRESSEANMALAN",
      assignedToId: null,
      isDeleted: false,
    };
  }
}
