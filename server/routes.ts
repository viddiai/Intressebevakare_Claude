import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, sanitizeUser } from "./localAuth";
import { insertLeadSchema, insertLeadNoteSchema, insertLeadTaskSchema, insertSellerPoolSchema, registerUserSchema, loginUserSchema, updateProfileSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, publicContactSchema } from "@shared/schema";
import { z } from "zod";
import { roundRobinService } from "./roundRobin";
import { hashPassword, verifyPassword } from "./auth";
import { sendPasswordResetEmail } from "./email";
import passport from "passport";
import crypto from "crypto";
import { ImapFlow } from "imapflow";

// Helper function to generate a secure random token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Register endpoint
  app.post('/api/register', async (req, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "En användare med denna e-postadress finns redan" });
      }

      // Hash password
      const passwordHash = await hashPassword(validatedData.password);

      // Create user
      const user = await storage.createUser({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        passwordHash,
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Registrering lyckades men inloggning misslyckades" });
        }
        res.json({ message: "Registrering lyckades", user: sanitizeUser(user) });
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error during registration:", error);
      res.status(500).json({ message: "Registrering misslyckades" });
    }
  });

  // Login endpoint
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Ett fel uppstod" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Felaktig e-postadress eller lösenord" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Inloggning misslyckades" });
        }
        res.json({ message: "Inloggning lyckades", user: sanitizeUser(user) });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Utloggning misslyckades" });
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          return res.status(500).json({ message: "Utloggning misslyckades" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Utloggning lyckades" });
      });
    });
  });

  // Debug route to check environment variables
  app.get('/api/debug-env', async (req, res) => {
    res.json({
      IMAP_HOST: process.env.IMAP_HOST || 'NOT SET',
      IMAP_HOST_length: process.env.IMAP_HOST?.length || 0,
      RESEND_API_KEY_exists: !!process.env.RESEND_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
    });
  });

  // Debug route to test email (remove in production)
  app.get('/api/test-email', async (req, res) => {
    try {
      const apiKeyExists = !!process.env.RESEND_API_KEY;
      const apiKeyPreview = process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 8)}...` : 'NOT SET';
      
      if (!apiKeyExists) {
        return res.json({
          status: 'error',
          message: 'RESEND_API_KEY is not set',
          apiKeyPreview
        });
      }

      const testResult = await sendPasswordResetEmail('test@example.com', 'test-token-123');
      res.json({
        status: 'success',
        message: 'Email sent successfully',
        apiKeyPreview,
        result: testResult
      });
    } catch (error: any) {
      res.json({
        status: 'error',
        message: error.message || 'Unknown error',
        statusCode: error.statusCode,
        name: error.name,
        details: error
      });
    }
  });

  // Debug route to test IMAP connection (remove in production)
  app.get('/api/test-imap', async (req, res) => {
    try {
      const host = "imap.one.com";
      const facilities = [
        { name: 'Trollhättan', user: process.env.IMAP_TROLLHATTAN_USER, password: process.env.IMAP_TROLLHATTAN_PASSWORD },
        { name: 'Göteborg', user: process.env.IMAP_GOTEBORG_USER, password: process.env.IMAP_GOTEBORG_PASSWORD },
        { name: 'Falkenberg', user: process.env.IMAP_FALKENBERG_USER, password: process.env.IMAP_FALKENBERG_PASSWORD }
      ];

      const results = [];

      for (const facility of facilities) {
        const result: any = {
          facility: facility.name,
          host: host,
          port: 993,
          userConfigured: !!facility.user,
          passwordConfigured: !!facility.password
        };

        if (!facility.user || !facility.password) {
          result.status = 'error';
          result.message = 'Missing configuration';
          results.push(result);
          continue;
        }

        try {
          const client = new ImapFlow({
            host,
            port: 993,
            secure: true,
            auth: {
              user: facility.user,
              pass: facility.password,
            },
            logger: {
              debug: (msg: any) => console.log(`[${facility.name} DEBUG]`, msg),
              info: (msg: any) => console.log(`[${facility.name} INFO]`, msg),
              warn: (msg: any) => console.log(`[${facility.name} WARN]`, msg),
              error: (msg: any) => console.log(`[${facility.name} ERROR]`, msg),
            },
          });

          const connectPromise = client.connect();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout after 20 seconds')), 20000)
          );

          await Promise.race([connectPromise, timeoutPromise]);
          
          result.status = 'success';
          result.message = 'Connected successfully';
          
          await client.logout();
        } catch (error: any) {
          result.status = 'error';
          result.message = error.message || 'Unknown error';
          result.errorName = error.name;
          result.errorCode = error.code;
          result.errorStack = error.stack?.split('\n').slice(0, 3).join('\n');
        }

        results.push(result);
      }

      res.json({
        timestamp: new Date().toISOString(),
        results
      });
    } catch (error: any) {
      console.error('Error in /api/test-imap:', error);
      res.status(500).json({
        timestamp: new Date().toISOString(),
        error: error.message || 'Internal server error',
        results: []
      });
    }
  });

  // Forgot password endpoint
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      
      // Don't reveal if email exists or not for security reasons
      if (!user) {
        return res.json({ message: "Om e-postadressen finns i systemet har ett återställningsmail skickats" });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to database
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);

      // Send password reset email
      try {
        const emailResult = await sendPasswordResetEmail(user.email, resetToken);
        console.log(`✅ Password reset email sent to ${user.email}`, emailResult);
      } catch (emailError: any) {
        console.error('❌ Failed to send password reset email:', emailError);
        console.error('Error details:', emailError.message, emailError.statusCode);
        // Don't reveal email sending failure to prevent user enumeration
      }
      
      res.json({ message: "Om e-postadressen finns i systemet har ett återställningsmail skickats" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error during forgot password:", error);
      res.status(500).json({ message: "Ett fel uppstod" });
    }
  });

  // Reset password endpoint
  app.post('/api/reset-password', async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      
      // Find reset token
      const resetToken = await storage.getPasswordResetToken(validatedData.token);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Ogiltig eller utgången återställningslänk" });
      }

      // Check if token is expired
      if (resetToken.expiresAt < new Date()) {
        return res.status(400).json({ message: "Återställningslänken har utgått" });
      }

      // Check if token has already been used
      if (resetToken.usedAt) {
        return res.status(400).json({ message: "Återställningslänken har redan använts" });
      }

      // Hash new password
      const passwordHash = await hashPassword(validatedData.newPassword);

      // Update user password
      await storage.updateUser(resetToken.userId, { passwordHash });

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(validatedData.token);

      // Clean up expired tokens
      await storage.deleteExpiredPasswordResetTokens();

      res.json({ message: "Lösenordet har återställts" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error during password reset:", error);
      res.status(500).json({ message: "Ett fel uppstod" });
    }
  });

  // Public contact form endpoint (no authentication required)
  app.post('/api/public/contact', async (req, res) => {
    try {
      const validatedData = publicContactSchema.parse(req.body);
      
      // Create lead with source HEMSIDA
      const leadData = {
        source: "HEMSIDA" as const,
        anlaggning: validatedData.anlaggning,
        contactName: validatedData.contactName,
        contactEmail: validatedData.contactEmail || null,
        contactPhone: validatedData.contactPhone,
        vehicleTitle: validatedData.vehicleTitle,
        message: validatedData.message || null,
        status: "NY_INTRESSEANMALAN" as const,
      };

      const lead = await storage.createLead(leadData);
      
      // Assign lead using round-robin
      try {
        const assignedToId = await roundRobinService.assignLeadToNextSeller(validatedData.anlaggning);
        if (assignedToId) {
          await storage.assignLead(lead.id, assignedToId);
          console.log(`✅ Public contact form lead ${lead.id} assigned to ${assignedToId} for ${validatedData.anlaggning}`);
        }
      } catch (error) {
        console.error(`❌ Failed to assign public contact form lead ${lead.id}:`, error);
      }
      
      res.status(201).json({ 
        message: "Tack för din intresseanmälan! Vi kommer att kontakta dig inom kort.",
        leadId: lead.id
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error creating public contact:", error);
      res.status(500).json({ message: "Ett fel uppstod. Försök igen senare." });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json(sanitizeUser(req.user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const targetUserId = req.params.id;

      if (userId !== targetUserId) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updateSchema = z.object({
        role: z.enum(["MANAGER", "SALJARE"]).optional(),
        anlaggning: z.enum(["Falkenberg", "Göteborg", "Trollhättan"]).optional().nullable(),
      });

      const validatedData = updateSchema.parse(req.body);
      const updatedUser = await storage.updateUser(userId, validatedData);

      res.json(updatedUser);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch('/api/users/:id/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const targetUserId = req.params.id;

      if (userId !== targetUserId) {
        return res.status(403).json({ message: "Du kan bara uppdatera din egen profil" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const validatedData = updateProfileSchema.parse(req.body);
      const updatedUser = await storage.updateUser(userId, validatedData);

      res.json(sanitizeUser(updatedUser));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Misslyckades att uppdatera profil" });
    }
  });

  app.patch('/api/users/:id/password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const targetUserId = req.params.id;

      if (userId !== targetUserId) {
        return res.status(403).json({ message: "Du kan bara ändra ditt eget lösenord" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const validatedData = changePasswordSchema.parse(req.body);

      // Verify old password
      if (!user.passwordHash) {
        return res.status(400).json({ message: "Användaren har inget lösenord inställt" });
      }

      const isValidPassword = await verifyPassword(user.passwordHash, validatedData.oldPassword);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Nuvarande lösenord är felaktigt" });
      }

      // Hash new password and update
      const newPasswordHash = await hashPassword(validatedData.newPassword);
      const updatedUser = await storage.updateUser(userId, { passwordHash: newPasswordHash });

      res.json({ message: "Lösenordet har uppdaterats" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Misslyckades att ändra lösenord" });
    }
  });

  app.get('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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

      // Get current lead state for audit log
      const currentLead = await storage.getLead(req.params.id);
      if (!currentLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const updatedLead = await storage.assignLead(req.params.id, validatedData.assignedToId);
      
      // Create audit log entry for reassignment
      await storage.createAuditLog({
        leadId: req.params.id,
        userId: userId,
        action: "REASSIGNED",
        fromValue: currentLead.assignedToId || null,
        toValue: validatedData.assignedToId,
      });

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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const filters: any = {};
      
      // If seller, always filter by their userId
      if (user.role !== "MANAGER") {
        filters.userId = userId;
      } else {
        // For managers, allow filtering by sellerId from query params (skip if "all")
        if (req.query.sellerId && req.query.sellerId !== 'all') {
          filters.userId = req.query.sellerId as string;
        }
      }
      
      // Apply anlaggning filter if provided (skip if "all")
      if (req.query.anlaggning && req.query.anlaggning !== 'all') {
        filters.anlaggning = req.query.anlaggning as string;
      }
      
      // Apply date range filters if provided
      if (req.query.dateFrom) {
        filters.dateFrom = new Date(req.query.dateFrom as string);
      }
      
      if (req.query.dateTo) {
        filters.dateTo = new Date(req.query.dateTo as string);
      }

      const stats = await storage.getDashboardStats(filters);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
