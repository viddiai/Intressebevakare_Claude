import { db } from "./db";
import { users, leads, leadNotes, leadTasks, auditLogs, sellerPools, passwordResetTokens, statusChangeHistory, emailNotificationLogs } from "@shared/schema";
import type {
  User,
  InsertUser,
  UpsertUser,
  Lead,
  LeadWithAssignedTo,
  InsertLead,
  LeadNote,
  InsertLeadNote,
  LeadTask,
  InsertLeadTask,
  AuditLog,
  InsertAuditLog,
  SellerPool,
  InsertSellerPool,
  StatusChangeHistory,
  StatusChangeHistoryWithUser,
  InsertStatusChangeHistory,
  EmailNotificationLog,
  InsertEmailNotificationLog,
} from "@shared/schema";
import { eq, and, desc, asc, sql, lt, inArray, gte } from "drizzle-orm";
import { formatInTimeZone, toDate } from "date-fns-tz";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  
  getLeads(filters?: {
    assignedToId?: string;
    status?: string;
    source?: string;
    anlaggning?: string;
    listingId?: string;
  }): Promise<LeadWithAssignedTo[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadById(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, data: Partial<InsertLead>): Promise<Lead | undefined>;
  updateLeadStatus(id: string, status: string, userId: string): Promise<Lead>;
  assignLead(id: string, assignedToId: string): Promise<Lead>;
  deleteLead(id: string): Promise<void>;
  acceptLead(id: string, userId: string): Promise<Lead>;
  declineLead(id: string, userId: string, reason?: string): Promise<Lead>;
  getLeadsPendingAcceptance(assignedToId?: string): Promise<LeadWithAssignedTo[]>;
  getManagerForFacility(anlaggning: string): Promise<User | undefined>;
  
  getLeadNotes(leadId: string): Promise<LeadNote[]>;
  createLeadNote(note: InsertLeadNote): Promise<LeadNote>;
  
  getLeadTasks(leadId: string): Promise<LeadTask[]>;
  createLeadTask(task: InsertLeadTask): Promise<LeadTask>;
  updateLeadTask(id: string, data: Partial<InsertLeadTask>): Promise<LeadTask | undefined>;
  completeLeadTask(id: string): Promise<LeadTask>;
  
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(leadId: string): Promise<AuditLog[]>;
  
  getSellerPools(anlaggning?: string): Promise<SellerPool[]>;
  getSellerPoolsByUserId(userId: string): Promise<SellerPool[]>;
  createSellerPool(pool: InsertSellerPool): Promise<SellerPool>;
  updateSellerPool(id: string, data: Partial<InsertSellerPool>): Promise<SellerPool | undefined>;
  deleteSellerPool(id: string): Promise<void>;
  syncUserFacilities(userId: string, anlaggningar: string[]): Promise<void>;
  
  createStatusChangeHistory(history: InsertStatusChangeHistory): Promise<StatusChangeHistory>;
  getStatusChangeHistoryBySellerPool(sellerPoolId: string): Promise<StatusChangeHistoryWithUser[]>;
  getLatestStatusChangeBySellerPool(sellerPoolId: string): Promise<StatusChangeHistoryWithUser | undefined>;
  
  getDashboardStats(filters?: {
    userId?: string;
    anlaggning?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
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
  
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ id: string; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
  
  logEmailNotification(log: InsertEmailNotificationLog): Promise<EmailNotificationLog>;
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

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
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

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async incrementUserTimedOutCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ leadsTimedOutCount: sql`${users.leadsTimedOutCount} + 1` })
      .where(eq(users.id, userId));
  }

  async getLeads(filters?: {
    assignedToId?: string;
    status?: string;
    source?: string;
    anlaggning?: string;
    listingId?: string;
  }): Promise<LeadWithAssignedTo[]> {
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
    
    const result = await db
      .select({
        lead: leads,
        assignedToFirstName: users.firstName,
        assignedToLastName: users.lastName,
      })
      .from(leads)
      .leftJoin(users, eq(leads.assignedToId, users.id))
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt));
    
    const leadIds = result.map(row => row.lead.id);
    
    const todayStr = formatInTimeZone(new Date(), "Europe/Stockholm", "yyyy-MM-dd");
    const todayStartSweden = toDate(`${todayStr}T00:00:00`, { timeZone: "Europe/Stockholm" });
    
    const nextTasks = leadIds.length > 0 ? await db
      .select({
        leadId: leadTasks.leadId,
        id: leadTasks.id,
        description: leadTasks.description,
        dueDate: leadTasks.dueDate,
      })
      .from(leadTasks)
      .where(
        and(
          inArray(leadTasks.leadId, leadIds),
          eq(leadTasks.isCompleted, false),
          sql`${leadTasks.dueDate} IS NOT NULL`,
          gte(leadTasks.dueDate, todayStartSweden)
        )
      )
      .orderBy(asc(leadTasks.dueDate)) : [];
    
    const nextTasksByLead = new Map<string, { id: string; description: string; dueDate: Date }>();
    for (const task of nextTasks) {
      if (!nextTasksByLead.has(task.leadId)) {
        nextTasksByLead.set(task.leadId, {
          id: task.id,
          description: task.description,
          dueDate: task.dueDate!,
        });
      }
    }
    
    return result.map(row => ({
      ...row.lead,
      assignedToName: row.assignedToFirstName && row.assignedToLastName
        ? `${row.assignedToFirstName} ${row.assignedToLastName}`
        : null,
      nextTask: nextTasksByLead.get(row.lead.id) || null
    }));
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

  async acceptLead(id: string, userId: string): Promise<Lead> {
    const [lead] = await db
      .update(leads)
      .set({
        acceptStatus: "accepted",
        acceptedAt: new Date(),
        status: "NY_INTRESSEANMALAN",
        reminderSentAt6h: null,
        reminderSentAt11h: null,
        timeoutNotifiedAt: null
      })
      .where(eq(leads.id, id))
      .returning();

    if (!lead) {
      throw new Error("Lead not found");
    }

    await db
      .update(users)
      .set({ leadsAcceptedCount: sql`${users.leadsAcceptedCount} + 1` })
      .where(eq(users.id, userId));

    await this.createAuditLog({
      leadId: id,
      userId,
      action: "Lead accepted",
      fromValue: null,
      toValue: null
    });

    return lead;
  }

  async declineLead(id: string, userId: string, reason?: string): Promise<Lead> {
    const [lead] = await db
      .update(leads)
      .set({
        acceptStatus: "declined",
        declinedAt: new Date(),
        declineReason: reason || `Declined by user ${userId}`,
        reminderSentAt6h: null,
        reminderSentAt11h: null,
        timeoutNotifiedAt: null
      })
      .where(eq(leads.id, id))
      .returning();

    if (!lead) {
      throw new Error("Lead not found");
    }

    await db
      .update(users)
      .set({ leadsDeclinedCount: sql`${users.leadsDeclinedCount} + 1` })
      .where(eq(users.id, userId));

    await this.createAuditLog({
      leadId: id,
      userId,
      action: "Lead declined",
      fromValue: null,
      toValue: null
    });

    return lead;
  }

  async getLeadsPendingAcceptance(assignedToId?: string): Promise<LeadWithAssignedTo[]> {
    const conditions = [
      eq(leads.isDeleted, false),
      eq(leads.status, "VANTAR_PA_ACCEPT" as any),
      sql`${leads.acceptStatus} = 'pending' OR ${leads.acceptStatus} IS NULL`
    ];

    if (assignedToId) {
      conditions.push(eq(leads.assignedToId, assignedToId));
    }

    const result = await db
      .select({
        lead: leads,
        assignedToFirstName: users.firstName,
        assignedToLastName: users.lastName,
      })
      .from(leads)
      .leftJoin(users, eq(leads.assignedToId, users.id))
      .where(and(...conditions))
      .orderBy(asc(leads.assignedAt));

    return result.map(row => ({
      ...row.lead,
      assignedToName: row.assignedToFirstName && row.assignedToLastName
        ? `${row.assignedToFirstName} ${row.assignedToLastName}`
        : null,
      nextTask: null
    }));
  }

  async getManagerForFacility(anlaggning: string): Promise<User | undefined> {
    const [manager] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.anlaggning, anlaggning as any),
          eq(users.role, "MANAGER"),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    return manager;
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
      .orderBy(
        sql`CASE WHEN ${leadTasks.dueDate} IS NULL THEN 1 ELSE 0 END`,
        asc(leadTasks.dueDate)
      );
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

  async getSellerPoolsByUserId(userId: string): Promise<SellerPool[]> {
    return db
      .select()
      .from(sellerPools)
      .where(eq(sellerPools.userId, userId))
      .orderBy(sellerPools.anlaggning);
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

  async deleteSellerPool(id: string): Promise<void> {
    await db.delete(sellerPools).where(eq(sellerPools.id, id));
  }

  async syncUserFacilities(userId: string, anlaggningar: string[]): Promise<void> {
    // Get existing pools for this user
    const existingPools = await this.getSellerPoolsByUserId(userId);
    const existingFacilities = existingPools.map(p => p.anlaggning as string);
    
    // Find facilities to add and remove
    const facilitiesToAdd = anlaggningar.filter(f => !existingFacilities.includes(f));
    const facilitiesToRemove = existingPools.filter(p => !anlaggningar.includes(p.anlaggning));
    
    // Get the highest sort order across all facilities for this user
    let maxSortOrder = 0;
    if (existingPools.length > 0) {
      maxSortOrder = Math.max(...existingPools.map(p => p.sortOrder));
    }
    
    // Add new facility associations
    for (const facility of facilitiesToAdd) {
      maxSortOrder++;
      await this.createSellerPool({
        userId,
        anlaggning: facility as any,
        isEnabled: true,
        sortOrder: maxSortOrder,
      });
    }
    
    // Remove old facility associations
    for (const pool of facilitiesToRemove) {
      await this.deleteSellerPool(pool.id);
    }
  }

  async createStatusChangeHistory(history: InsertStatusChangeHistory): Promise<StatusChangeHistory> {
    const [statusChange] = await db.insert(statusChangeHistory).values(history).returning();
    return statusChange;
  }

  async getStatusChangeHistoryBySellerPool(sellerPoolId: string): Promise<StatusChangeHistoryWithUser[]> {
    const result = await db
      .select({
        history: statusChangeHistory,
        changedByFirstName: users.firstName,
        changedByLastName: users.lastName,
      })
      .from(statusChangeHistory)
      .leftJoin(users, eq(statusChangeHistory.changedById, users.id))
      .where(eq(statusChangeHistory.sellerPoolId, sellerPoolId))
      .orderBy(desc(statusChangeHistory.createdAt));

    return result.map(row => ({
      ...row.history,
      changedByName: row.changedByFirstName && row.changedByLastName
        ? `${row.changedByFirstName} ${row.changedByLastName}`
        : null,
    }));
  }

  async getLatestStatusChangeBySellerPool(sellerPoolId: string): Promise<StatusChangeHistoryWithUser | undefined> {
    const result = await db
      .select({
        history: statusChangeHistory,
        changedByFirstName: users.firstName,
        changedByLastName: users.lastName,
      })
      .from(statusChangeHistory)
      .leftJoin(users, eq(statusChangeHistory.changedById, users.id))
      .where(eq(statusChangeHistory.sellerPoolId, sellerPoolId))
      .orderBy(desc(statusChangeHistory.createdAt))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      ...row.history,
      changedByName: row.changedByFirstName && row.changedByLastName
        ? `${row.changedByFirstName} ${row.changedByLastName}`
        : null,
    };
  }

  async getDashboardStats(filters?: {
    userId?: string;
    anlaggning?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const leadFilters: any = {};
    
    if (filters?.userId) {
      leadFilters.assignedToId = filters.userId;
    }
    
    if (filters?.anlaggning) {
      leadFilters.anlaggning = filters.anlaggning;
    }
    
    let allLeads = await this.getLeads(leadFilters);
    
    // Apply date filtering if provided
    if (filters?.dateFrom) {
      allLeads = allLeads.filter(lead => lead.createdAt >= filters.dateFrom!);
    }
    
    if (filters?.dateTo) {
      allLeads = allLeads.filter(lead => lead.createdAt <= filters.dateTo!);
    }

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

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });
  }

  async getPasswordResetToken(token: string): Promise<{ id: string; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));
  }

  async logEmailNotification(log: InsertEmailNotificationLog): Promise<EmailNotificationLog> {
    const [notificationLog] = await db
      .insert(emailNotificationLogs)
      .values(log)
      .returning();
    return notificationLog;
  }
}

export const storage = new DbStorage();
