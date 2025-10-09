import { ImapFlow } from "imapflow";
import { EmailParser } from "./emailParsers";
import { roundRobinService } from "./roundRobin";
import { storage } from "./storage";

export class ImapWorker {
  private client: ImapFlow | null = null;
  private isRunning: boolean = false;
  private processedMessageIds: Set<string> = new Set();

  async connect() {
    if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
      console.log("IMAP credentials not configured, skipping email polling");
      return false;
    }

    this.client = new ImapFlow({
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT || "993"),
      secure: true,
      auth: {
        user: process.env.IMAP_USER,
        pass: process.env.IMAP_PASSWORD,
      },
      logger: false,
    });

    await this.client.connect();
    console.log("Connected to IMAP server");
    return true;
  }

  async disconnect() {
    if (this.client) {
      await this.client.logout();
      this.client = null;
    }
  }

  async processInbox() {
    if (!this.client) {
      throw new Error("IMAP client not connected");
    }

    const lock = await this.client.getMailboxLock("INBOX");

    try {
      const messages = this.client.fetch({ seen: false }, {
        envelope: true,
        bodyStructure: true,
        source: true,
        uid: true,
      });

      for await (const message of messages) {
        const messageId = message.envelope.messageId || message.uid.toString();

        if (this.processedMessageIds.has(messageId)) {
          continue;
        }

        try {
          await this.processMessage(message);
          this.processedMessageIds.add(messageId);
          
          await this.client.messageFlagsAdd({ uid: message.uid }, ["\\Seen"]);
        } catch (error) {
          console.error(`Error processing message ${messageId}:`, error);
        }
      }
    } finally {
      lock.release();
    }
  }

  private async processMessage(message: any) {
    const from = message.envelope.from?.[0]?.address || "";
    const subject = message.envelope.subject || "";
    
    let htmlContent = "";
    
    if (message.source) {
      const sourceStr = message.source.toString();
      const htmlMatch = sourceStr.match(/<html[\s\S]*<\/html>/i);
      if (htmlMatch) {
        htmlContent = htmlMatch[0];
      } else {
        htmlContent = sourceStr;
      }
    }

    const parsed = EmailParser.parseEmail(htmlContent, subject, from);

    if (!parsed) {
      console.log(`Could not parse email from ${from} with subject: ${subject}`);
      return;
    }

    const source = from.toLowerCase().includes("bytbil") ? "BYTBIL" : "BLOCKET";
    
    const existingLead = parsed.listingId
      ? await storage.getLeads({ listingId: parsed.listingId })
      : null;

    if (existingLead && existingLead.length > 0) {
      console.log(`Lead already exists for listing ${parsed.listingId}, skipping`);
      return;
    }

    const leadData = EmailParser.toInsertLead(parsed, source);

    if (leadData.anlaggning) {
      const lead = await roundRobinService.createLeadWithAssignment(leadData);
      console.log(`Created and assigned lead ${lead.id} to ${lead.assignedToId}`);
    } else {
      const lead = await storage.createLead(leadData);
      console.log(`Created unassigned lead ${lead.id} (no anläggning detected)`);
    }
  }

  async start() {
    if (this.isRunning) {
      console.log("IMAP worker already running");
      return;
    }

    const connected = await this.connect();
    if (!connected) {
      return;
    }

    this.isRunning = true;

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        await this.processInbox();
      } catch (error) {
        console.error("Error polling IMAP:", error);
        try {
          await this.disconnect();
          await this.connect();
        } catch (reconnectError) {
          console.error("Error reconnecting to IMAP:", reconnectError);
        }
      }

      if (this.isRunning) {
        setTimeout(poll, 60000);
      }
    };

    poll();
  }

  async stop() {
    this.isRunning = false;
    await this.disconnect();
  }
}

export const imapWorker = new ImapWorker();
