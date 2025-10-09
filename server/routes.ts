import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLeadSchema, insertLeadNoteSchema, insertLeadTaskSchema, insertSellerPoolSchema } from "@shared/schema";
import { z } from "zod";
import { roundRobinService } from "./roundRobin";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can view all users" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { status, anlaggning, assignedToId } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (anlaggning) filters.anlaggning = anlaggning;
      
      if (user.role === "MANAGER") {
        if (assignedToId) {
          filters.assignedToId = assignedToId;
        }
      } else {
        filters.assignedToId = userId;
      }

      const leads = await storage.getLeads(filters);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can create leads manually" });
      }

      const validatedData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validatedData);
      res.status(201).json(lead);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.patch('/api/leads/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const statusSchema = z.object({
        status: z.enum(["NY_INTRESSEANMALAN", "KUND_KONTAKTAD", "VUNNEN", "FORLORAD"]),
      });

      const validatedData = statusSchema.parse(req.body);
      const updatedLead = await storage.updateLeadStatus(req.params.id, validatedData.status, userId);
      res.json(updatedLead);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error.message === "Lead not found") {
        return res.status(404).json({ message: "Lead not found" });
      }
      console.error("Error updating lead status:", error);
      res.status(500).json({ message: "Failed to update lead status" });
    }
  });

  app.post('/api/leads/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (!lead.anlaggning) {
        return res.status(400).json({ message: "Lead must have a facility assigned" });
      }

      const nextSellerId = await roundRobinService.assignLeadToNextSeller(lead.anlaggning);
      if (!nextSellerId) {
        return res.status(400).json({ message: "No available sellers for this facility" });
      }

      const updatedLead = await storage.assignLead(req.params.id, nextSellerId);
      res.json(updatedLead);
    } catch (error: any) {
      if (error.message === "Lead not found") {
        return res.status(404).json({ message: "Lead not found" });
      }
      console.error("Error assigning lead via round-robin:", error);
      res.status(500).json({ message: "Failed to assign lead" });
    }
  });

  app.patch('/api/leads/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can reassign leads" });
      }

      const assignSchema = z.object({
        assignedToId: z.string().min(1),
      });

      const validatedData = assignSchema.parse(req.body);
      
      const targetUser = await storage.getUser(validatedData.assignedToId);
      if (!targetUser) {
        return res.status(400).json({ message: "Target user does not exist" });
      }

      const updatedLead = await storage.assignLead(req.params.id, validatedData.assignedToId);
      res.json(updatedLead);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error.message === "Lead not found") {
        return res.status(404).json({ message: "Lead not found" });
      }
      console.error("Error assigning lead:", error);
      res.status(500).json({ message: "Failed to assign lead" });
    }
  });

  app.get('/api/leads/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const notes = await storage.getLeadNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching lead notes:", error);
      res.status(500).json({ message: "Failed to fetch lead notes" });
    }
  });

  app.post('/api/leads/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertLeadNoteSchema.parse({
        ...req.body,
        leadId: req.params.id,
        userId,
      });

      const note = await storage.createLeadNote(validatedData);
      res.status(201).json(note);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating lead note:", error);
      res.status(500).json({ message: "Failed to create lead note" });
    }
  });

  app.get('/api/leads/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const tasks = await storage.getLeadTasks(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching lead tasks:", error);
      res.status(500).json({ message: "Failed to fetch lead tasks" });
    }
  });

  app.post('/api/leads/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertLeadTaskSchema.parse({
        ...req.body,
        leadId: req.params.id,
      });

      const task = await storage.createLeadTask(validatedData);
      res.status(201).json(task);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating lead task:", error);
      res.status(500).json({ message: "Failed to create lead task" });
    }
  });

  app.patch('/api/tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const task = await storage.completeLeadTask(req.params.id);
      res.json(task);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.get('/api/seller-pools', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can view seller pools" });
      }

      const { anlaggning } = req.query;
      const pools = await storage.getSellerPools(anlaggning as string);
      res.json(pools);
    } catch (error) {
      console.error("Error fetching seller pools:", error);
      res.status(500).json({ message: "Failed to fetch seller pools" });
    }
  });

  app.post('/api/seller-pools', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can create seller pools" });
      }

      const validatedData = insertSellerPoolSchema.parse(req.body);
      const pool = await storage.createSellerPool(validatedData);
      res.status(201).json(pool);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating seller pool:", error);
      res.status(500).json({ message: "Failed to create seller pool" });
    }
  });

  app.patch('/api/seller-pools/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can update seller pools" });
      }

      const updateSchema = z.object({
        isEnabled: z.boolean().optional(),
        sortOrder: z.number().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      const pool = await storage.updateSellerPool(req.params.id, validatedData);
      
      if (!pool) {
        return res.status(404).json({ message: "Seller pool not found" });
      }

      res.json(pool);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating seller pool:", error);
      res.status(500).json({ message: "Failed to update seller pool" });
    }
  });

  app.get('/api/leads/:id/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const auditLogs = await storage.getAuditLogs(req.params.id);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stats = await storage.getDashboardStats(
        user.role === "MANAGER" ? undefined : userId
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
