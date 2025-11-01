import { ImapFlow } from "imapflow";
import { EmailParser } from "./emailParsers";
import { roundRobinService } from "./roundRobin";
import { storage } from "./storage";
import * as fs from "fs";
import * as path from "path";

export interface ImapConfig {
  name: string;
  anlaggning: "Falkenberg" | "Göteborg" | "Trollhättan";
  host: string;
  port: number;
  user: string;
  password: string;
}

export class ImapWorker {
  private client: ImapFlow | null = null;
  private isRunning: boolean = false;
  private processedMessageIds: Set<string> = new Set();
  private config: ImapConfig;

  constructor(config: ImapConfig) {
    this.config = config;
  }

  async connect() {
    if (!this.config.host || !this.config.user || !this.config.password) {
      console.log(`[${this.config.name}] IMAP credentials not configured, skipping email polling`);
      return false;
    }

    try {
      console.log(`[${this.config.name}] Attempting to connect to ${this.config.host}:${this.config.port}...`);
      
      this.client = new ImapFlow({
        host: this.config.host,
        port: this.config.port,
        secure: true,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
        logger: this.config.name === "Göteborg" ? {
          debug: (...args: any[]) => console.log(`[${this.config.name} DEBUG]`, ...args),
          info: (...args: any[]) => console.log(`[${this.config.name} INFO]`, ...args),
          warn: (...args: any[]) => console.warn(`[${this.config.name} WARN]`, ...args),
          error: (...args: any[]) => console.error(`[${this.config.name} ERROR]`, ...args),
        } : false,
      });

      // Add error handler to prevent unhandled error events from crashing the server
      this.client.on('error', (err) => {
        console.error(`[${this.config.name}] IMAP client error:`, err.message || err);
        // Mark client as unusable but don't crash
        this.client = null;
      });

      const connectPromise = this.client.connect();
      // Use longer timeout for Göteborg
      const timeoutDuration = this.config.name === "Göteborg" ? 30000 : 15000;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Connection timeout after ${timeoutDuration/1000} seconds`)), timeoutDuration)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      console.log(`[${this.config.name}] ✅ Connected to IMAP server successfully`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${this.config.name}] ❌ Failed to connect to IMAP server: ${errorMessage}`);
      
      // Just null out the client without attempting any cleanup
      // This prevents crashes when the connection failed
      this.client = null;
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.logout();
      } catch (error) {
        console.error(`[${this.config.name}] Error during disconnect:`, error);
      }
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
        const messageId = message.envelope?.messageId || message.uid.toString();

        if (this.processedMessageIds.has(messageId)) {
          continue;
        }

        try {
          await this.processMessage(message);
          this.processedMessageIds.add(messageId);
          
          await this.client.messageFlagsAdd({ uid: message.uid }, ["\\Seen"]);
        } catch (error) {
          console.error(`[${this.config.name}] Error processing message ${messageId}:`, error);
        }
      }
    } finally {
      lock.release();
    }
  }

  private async processMessage(message: any) {
    const from = message.envelope.from?.[0]?.address || "";
    const senderName = message.envelope.from?.[0]?.name || "";
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

    const parsed = EmailParser.parseEmail(htmlContent, subject, from, senderName);

    if (!parsed) {
      console.log(`[${this.config.name}] Could not parse email from ${from} with subject: ${subject}`);
      
      // Save failed email to file for debugging
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `failed-email-${this.config.name}-${timestamp}.html`;
      const filepath = path.join('/tmp', filename);
      
      const debugInfo = `
==============================================
FROM: ${from}
SUBJECT: ${subject}
TIME: ${new Date().toISOString()}
FACILITY: ${this.config.name}
==============================================

${htmlContent}
`;
      
      try {
        fs.writeFileSync(filepath, debugInfo);
        console.log(`[${this.config.name}] ⚠️  Email saved to ${filepath} for debugging`);
      } catch (err) {
        console.error(`[${this.config.name}] Failed to save email to file:`, err);
      }
      
      return;
    }

    const source = from.toLowerCase().includes("bytbil") ? "BYTBIL" : "BLOCKET";
    
    const existingLead = parsed.listingId
      ? await storage.getLeads({ listingId: parsed.listingId })
      : null;

    if (existingLead && existingLead.length > 0) {
      console.log(`[${this.config.name}] Lead already exists for listing ${parsed.listingId}, skipping`);
      return;
    }

    const leadData = EmailParser.toInsertLead(parsed, source);
    
    if (!leadData.anlaggning) {
      leadData.anlaggning = this.config.anlaggning;
    }

    if (leadData.anlaggning) {
      const lead = await roundRobinService.createLeadWithAssignment(leadData);
      console.log(`[${this.config.name}] Created and assigned lead ${lead.id} to ${lead.assignedToId} for ${leadData.anlaggning}`);
    } else {
      const lead = await storage.createLead(leadData);
      console.log(`[${this.config.name}] Created unassigned lead ${lead.id}`);
    }
  }

  async start() {
    if (this.isRunning) {
      console.log(`[${this.config.name}] IMAP worker already running`);
      return;
    }

    const connected = await this.connect();
    if (!connected) {
      return;
    }

    this.isRunning = true;
    console.log(`[${this.config.name}] Starting email polling (60s interval)`);

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        await this.processInbox();
      } catch (error) {
        console.error(`[${this.config.name}] Error polling IMAP:`, error);
        try {
          await this.disconnect();
          await this.connect();
        } catch (reconnectError) {
          console.error(`[${this.config.name}] Error reconnecting to IMAP:`, reconnectError);
        }
      }

      if (this.isRunning) {
        setTimeout(poll, 60000);
      }
    };

    poll();
  }

  async stop() {
    console.log(`[${this.config.name}] Stopping IMAP worker`);
    this.isRunning = false;
    await this.disconnect();
  }
}

export function createImapWorkers(): ImapWorker[] {
  const workers: ImapWorker[] = [];
  
  const host = "imap.one.com";

  const configs: ImapConfig[] = [
    {
      name: "Trollhättan",
      anlaggning: "Trollhättan",
      host,
      port: 993,
      user: process.env.IMAP_TROLLHATTAN_USER || "",
      password: process.env.IMAP_TROLLHATTAN_PASSWORD || "",
    },
    {
      name: "Göteborg",
      anlaggning: "Göteborg",
      host,
      port: 993,
      user: process.env.IMAP_GOTEBORG_USER || "",
      password: process.env.IMAP_GOTEBORG_PASSWORD || "",
    },
    {
      name: "Falkenberg",
      anlaggning: "Falkenberg",
      host,
      port: 993,
      user: process.env.IMAP_FALKENBERG_USER || "",
      password: process.env.IMAP_FALKENBERG_PASSWORD || "",
    },
  ];

  for (const config of configs) {
    if (config.user && config.password) {
      workers.push(new ImapWorker(config));
    } else {
      console.log(`[${config.name}] Missing credentials, skipping`);
    }
  }

  return workers;
}
