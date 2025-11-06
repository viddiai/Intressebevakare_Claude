import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, jsonb, boolean, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["MANAGER", "SALJARE"]);
export const sourceEnum = pgEnum("source", ["BYTBIL", "BLOCKET", "HEMSIDA", "EGET"]);
export const statusEnum = pgEnum("status", [
  "VANTAR_PA_ACCEPT",
  "NY_INTRESSEANMALAN",
  "KUND_KONTAKTAD",
  "OFFERT_SKICKAD",
  "VUNNEN",
  "FORLORAD"
]);
export const acceptStatusEnum = pgEnum("accept_status", ["pending", "accepted", "declined"]);
export const anlaggningEnum = pgEnum("anlaggning", ["Falkenberg", "Göteborg", "Trollhättan"]);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: text("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: roleEnum("role").notNull().default("SALJARE"),
  anlaggning: anlaggningEnum("anlaggning"),
  isActive: boolean("is_active").notNull().default(true),
  emailOnLeadAssignment: boolean("email_on_lead_assignment").notNull().default(true),
  leadsAcceptedCount: integer("leads_accepted_count").notNull().default(0),
  leadsDeclinedCount: integer("leads_declined_count").notNull().default(0),
  leadsTimedOutCount: integer("leads_timed_out_count").notNull().default(0),
  leadsReassignedCount: integer("leads_reassigned_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  source: sourceEnum("source").notNull(),
  anlaggning: anlaggningEnum("anlaggning"),
  
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  
  vehicleTitle: text("vehicle_title").notNull(),
  vehicleLink: text("vehicle_link"),
  listingId: text("listing_id"),
  registrationNumber: text("registration_number"),
  verendusId: text("verendus_id"),
  
  message: text("message"),
  inquiryDateTime: text("inquiry_date_time"),
  rawPayload: jsonb("raw_payload"),
  
  status: statusEnum("status").notNull().default("VANTAR_PA_ACCEPT"),
  assignedToId: varchar("assigned_to_id", { length: 255 }).references(() => users.id),
  
  acceptStatus: acceptStatusEnum("accept_status"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  declineReason: text("decline_reason"),
  reminderSentAt6h: timestamp("reminder_sent_at_6h"),
  reminderSentAt11h: timestamp("reminder_sent_at_11h"),
  timeoutNotifiedAt: timestamp("timeout_notified_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  assignedAt: timestamp("assigned_at"),
  firstContactAt: timestamp("first_contact_at"),
  closedAt: timestamp("closed_at"),
  
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

export const leadNotes = pgTable("lead_notes", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id", { length: 255 }).notNull().references(() => leads.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leadTasks = pgTable("lead_tasks", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id", { length: 255 }).notNull().references(() => leads.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  dueDate: timestamp("due_date"),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id", { length: 255 }).notNull().references(() => leads.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  action: text("action").notNull(),
  fromValue: text("from_value"),
  toValue: text("to_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sellerPools = pgTable("seller_pools", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  anlaggning: anlaggningEnum("anlaggning").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usedAt: timestamp("used_at"),
});

export const statusChangeHistory = pgTable("status_change_history", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  sellerPoolId: varchar("seller_pool_id", { length: 255 }).notNull().references(() => sellerPools.id, { onDelete: "cascade" }),
  changedById: varchar("changed_by_id", { length: 255 }).notNull().references(() => users.id),
  newStatus: boolean("new_status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailNotificationLogs = pgTable("email_notification_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  leadId: varchar("lead_id", { length: 255 }).notNull().references(() => leads.id, { onDelete: "cascade" }),
  emailTo: varchar("email_to").notNull(),
  subject: text("subject").notNull(),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id", { length: 255 }).notNull().references(() => users.id),
  receiverId: varchar("receiver_id", { length: 255 }).notNull().references(() => users.id),
  content: text("content").notNull(),
  leadId: varchar("lead_id", { length: 255 }).references(() => leads.id, { onDelete: "set null" }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const registerUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    firstName: true,
    lastName: true,
  })
  .extend({
    password: z.string().min(6, "Lösenordet måste vara minst 6 tecken"),
  });

export const loginUserSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  password: z.string().min(1, "Lösenord krävs"),
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "Förnamn krävs").optional(),
  lastName: z.string().min(1, "Efternamn krävs").optional(),
  profileImageUrl: z.string().url("Ogiltig bild-URL").optional().nullable(),
});

export const updateNotificationPreferencesSchema = z.object({
  emailOnLeadAssignment: z.boolean(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Nuvarande lösenord krävs"),
  newPassword: z.string().min(6, "Nytt lösenord måste vara minst 6 tecken"),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  assignedAt: true,
  firstContactAt: true,
  closedAt: true,
  deletedAt: true,
  acceptedAt: true,
  declinedAt: true,
});

export const publicContactSchema = z.object({
  contactName: z.string().min(1, "Namn krävs"),
  contactEmail: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().email("Ogiltig e-postadress").optional()
  ),
  contactPhone: z.string().min(1, "Telefonnummer krävs"),
  vehicleTitle: z.string().min(1, "Fordonstitel krävs"),
  message: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  anlaggning: z.enum(["Falkenberg", "Göteborg", "Trollhättan"], {
    errorMap: () => ({ message: "Välj en anläggning" }),
  }),
});

export const insertLeadNoteSchema = createInsertSchema(leadNotes).omit({
  id: true,
  createdAt: true,
});

export const insertLeadTaskSchema = createInsertSchema(leadTasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
}).extend({
  dueDate: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (val instanceof Date) return val;
      if (typeof val === 'string') return new Date(val);
      return val;
    },
    z.date().nullable().optional()
  ),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSellerPoolSchema = createInsertSchema(sellerPools).omit({
  id: true,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token krävs"),
  newPassword: z.string().min(6, "Lösenord måste vara minst 6 tecken"),
});

export const bytbilWebhookSchema = z.object({
  contactName: z.string().min(1, "Namn krävs"),
  contactEmail: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().email("Ogiltig e-postadress").optional()
  ),
  contactPhone: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  vehicleTitle: z.string().min(1, "Fordonstitel krävs"),
  vehicleLink: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().url("Ogiltig fordonslänk").optional()
  ),
  listingId: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  message: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  anlaggning: z.enum(["Falkenberg", "Göteborg", "Trollhättan"]).optional().nullable(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type LeadWithAssignedTo = Lead & { 
  assignedToName: string | null;
  nextTask?: {
    id: string;
    description: string;
    dueDate: Date;
  } | null;
};

export type InsertLeadNote = z.infer<typeof insertLeadNoteSchema>;
export type LeadNote = typeof leadNotes.$inferSelect;

export type InsertLeadTask = z.infer<typeof insertLeadTaskSchema>;
export type LeadTask = typeof leadTasks.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertSellerPool = z.infer<typeof insertSellerPoolSchema>;
export type SellerPool = typeof sellerPools.$inferSelect;

export const insertStatusChangeHistorySchema = createInsertSchema(statusChangeHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertStatusChangeHistory = z.infer<typeof insertStatusChangeHistorySchema>;
export type StatusChangeHistory = typeof statusChangeHistory.$inferSelect;
export type StatusChangeHistoryWithUser = StatusChangeHistory & {
  changedByName: string | null;
};

export const insertEmailNotificationLogSchema = createInsertSchema(emailNotificationLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertEmailNotificationLog = z.infer<typeof insertEmailNotificationLogSchema>;
export type EmailNotificationLog = typeof emailNotificationLogs.$inferSelect;

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type MessageWithUsers = Message & {
  senderName: string;
  senderProfileImageUrl: string | null;
  receiverName: string;
  receiverProfileImageUrl: string | null;
  leadTitle?: string | null;
};
