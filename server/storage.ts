import { db } from "./db";
import { users, leads, leadNotes, leadTasks, auditLogs, sellerPools } from "@shared/schema";
import type {
  User,
  InsertUser,
  UpsertUser,
  Lead,
  InsertLead,
  LeadNote,
  InsertLeadNote,
  LeadTask,
  InsertLeadTask,
  AuditLog,
  InsertAuditLog,
  SellerPool,
  InsertSellerPool,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getLeads(filters?: {
    assignedToId?: string;
    status?: string;
    source?: string;
    anlaggning?: string;
    listingId?: string;
  }): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadById(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, data: Partial<InsertLead>): Promise<Lead | undefined>;
  updateLeadStatus(id: string, status: string, userId: string): Promise<Lead>;
  assignLead(id: string, assignedToId: string): Promise<Lead>;
  deleteLead(id: string): Promise<void>;
  
  getLeadNotes(leadId: string): Promise<LeadNote[]>;
  createLeadNote(note: InsertLeadNote): Promise<LeadNote>;
  
  getLeadTasks(leadId: string): Promise<LeadTask[]>;
  createLeadTask(task: InsertLeadTask): Promise<LeadTask>;
  updateLeadTask(id: string, data: Partial<InsertLeadTask>): Promise<LeadTask | undefined>;
  completeLeadTask(id: string): Promise<LeadTask>;
  
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(leadId: string): Promise<AuditLog[]>;
  
  getSellerPools(anlaggning?: string): Promise<SellerPool[]>;
  createSellerPool(pool: InsertSellerPool): Promise<SellerPool>;
  updateSellerPool(id: string, data: Partial<InsertSellerPool>): Promise<SellerPool | undefined>;
  
  getDashboardStats(userId?: string): Promise<{
    totalLeads: number;
    newLeads: number;
    contacted: number;
    won: number;
    lost: number;
    winRate: number;
    avgTimeToFirstContact: number;
    avgTimeToClose: number;
    leadsBySource: Array<{ source: string; count: number }>;
    leadsByAnlaggning: Array<{ anlaggning: string; count: number }>;
  }>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.anlaggning, users.lastName);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getLeads(filters?: {
    assignedToId?: string;
    status?: string;
    source?: string;
    anlaggning?: string;
    listingId?: string;
  }): Promise<Lead[]> {
    let query = db.select().from(leads).where(eq(leads.isDeleted, false));
    
    const conditions = [eq(leads.isDeleted, false)];
    
    if (filters?.assignedToId) {
      conditions.push(eq(leads.assignedToId, filters.assignedToId));
    }
    if (filters?.status) {
      conditions.push(eq(leads.status, filters.status as any));
    }
    if (filters?.source) {
      conditions.push(eq(leads.source, filters.source as any));
    }
    if (filters?.anlaggning) {
      conditions.push(eq(leads.anlaggning, filters.anlaggning as any));
    }
    if (filters?.listingId) {
      conditions.push(eq(leads.listingId, filters.listingId));
    }
    
    return db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    return this.getLeadById(id);
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.isDeleted, false)));
    return lead;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, data: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set(data)
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async updateLeadStatus(id: string, status: string, userId: string): Promise<Lead> {
    const lead = await this.getLead(id);
    if (!lead) {
      throw new Error("Lead not found");
    }

    const updateData: Partial<Lead> = { status: status as any };
    
    if (status === "KUND_KONTAKTAD" && !lead.firstContactAt) {
      updateData.firstContactAt = new Date();
    }
    
    if (status === "VUNNEN" || status === "FORLORAD") {
      updateData.closedAt = new Date();
    }

    const [updatedLead] = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, id))
      .returning();

    await this.createAuditLog({
      leadId: id,
      userId,
      action: "STATUS_CHANGE",
      fromValue: lead.status,
      toValue: status,
    });

    return updatedLead;
  }

  async assignLead(id: string, assignedToId: string): Promise<Lead> {
    const [lead] = await db
      .update(leads)
      .set({ 
        assignedToId, 
        assignedAt: new Date() 
      })
      .where(eq(leads.id, id))
      .returning();

    if (!lead) {
      throw new Error("Lead not found");
    }

    return lead;
  }

  async deleteLead(id: string): Promise<void> {
    await db
      .update(leads)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(leads.id, id));
  }

  async getLeadNotes(leadId: string): Promise<LeadNote[]> {
    return db
      .select()
      .from(leadNotes)
      .where(eq(leadNotes.leadId, leadId))
      .orderBy(desc(leadNotes.createdAt));
  }

  async createLeadNote(note: InsertLeadNote): Promise<LeadNote> {
    const [leadNote] = await db.insert(leadNotes).values(note).returning();
    return leadNote;
  }

  async getLeadTasks(leadId: string): Promise<LeadTask[]> {
    return db
      .select()
      .from(leadTasks)
      .where(eq(leadTasks.leadId, leadId))
      .orderBy(leadTasks.dueDate);
  }

  async createLeadTask(task: InsertLeadTask): Promise<LeadTask> {
    const [leadTask] = await db.insert(leadTasks).values(task).returning();
    return leadTask;
  }

  async updateLeadTask(id: string, data: Partial<InsertLeadTask>): Promise<LeadTask | undefined> {
    const [task] = await db
      .update(leadTasks)
      .set(data)
      .where(eq(leadTasks.id, id))
      .returning();
    return task;
  }

  async completeLeadTask(id: string): Promise<LeadTask> {
    const [task] = await db
      .update(leadTasks)
      .set({ 
        isCompleted: true, 
        completedAt: new Date() 
      })
      .where(eq(leadTasks.id, id))
      .returning();
    return task;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(leadId: string): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.leadId, leadId))
      .orderBy(desc(auditLogs.createdAt));
  }

  async getSellerPools(anlaggning?: string): Promise<SellerPool[]> {
    if (anlaggning) {
      return db
        .select()
        .from(sellerPools)
        .where(eq(sellerPools.anlaggning, anlaggning as any))
        .orderBy(sellerPools.sortOrder);
    }
    return db.select().from(sellerPools).orderBy(sellerPools.sortOrder);
  }

  async createSellerPool(pool: InsertSellerPool): Promise<SellerPool> {
    const [sellerPool] = await db.insert(sellerPools).values(pool).returning();
    return sellerPool;
  }

  async updateSellerPool(id: string, data: Partial<InsertSellerPool>): Promise<SellerPool | undefined> {
    const [pool] = await db
      .update(sellerPools)
      .set(data)
      .where(eq(sellerPools.id, id))
      .returning();
    return pool;
  }

  async getDashboardStats(userId?: string) {
    const filters = userId ? { assignedToId: userId } : {};
    const allLeads = await this.getLeads(filters);

    const totalLeads = allLeads.length;
    const newLeads = allLeads.filter(l => l.status === "NY_INTRESSEANMALAN").length;
    const contacted = allLeads.filter(l => l.status === "KUND_KONTAKTAD").length;
    const won = allLeads.filter(l => l.status === "VUNNEN").length;
    const lost = allLeads.filter(l => l.status === "FORLORAD").length;
    
    const closedLeads = won + lost;
    const winRate = closedLeads > 0 ? (won / closedLeads) * 100 : 0;

    const leadsWithFirstContact = allLeads.filter(l => l.firstContactAt && l.createdAt);
    const avgTimeToFirstContact = leadsWithFirstContact.length > 0
      ? leadsWithFirstContact.reduce((sum, lead) => {
          const diff = lead.firstContactAt!.getTime() - lead.createdAt.getTime();
          return sum + (diff / (1000 * 60 * 60));
        }, 0) / leadsWithFirstContact.length
      : 0;

    const leadsWithClosedAt = allLeads.filter(l => l.closedAt && l.createdAt);
    const avgTimeToClose = leadsWithClosedAt.length > 0
      ? leadsWithClosedAt.reduce((sum, lead) => {
          const diff = lead.closedAt!.getTime() - lead.createdAt.getTime();
          return sum + (diff / (1000 * 60 * 60 * 24));
        }, 0) / leadsWithClosedAt.length
      : 0;

    const leadsBySource = Object.entries(
      allLeads.reduce((acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([source, count]) => ({ source, count }));

    const leadsByAnlaggning = Object.entries(
      allLeads.reduce((acc, lead) => {
        if (lead.anlaggning) {
          acc[lead.anlaggning] = (acc[lead.anlaggning] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    ).map(([anlaggning, count]) => ({ anlaggning, count }));

    return {
      totalLeads,
      newLeads,
      contacted,
      won,
      lost,
      winRate,
      avgTimeToFirstContact,
      avgTimeToClose,
      leadsBySource,
      leadsByAnlaggning,
    };
  }
}

export const storage = new DbStorage();
