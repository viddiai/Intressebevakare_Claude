import { storage } from "./storage";
import type { Lead, InsertLead } from "@shared/schema";

export class RoundRobinService {
  async assignLeadToNextSeller(anlaggning: string): Promise<string | null> {
    const sellerPools = await storage.getSellerPools(anlaggning);
    const enabledSellers = sellerPools.filter(pool => pool.isEnabled);
    
    if (enabledSellers.length === 0) {
      return null;
    }

    enabledSellers.sort((a, b) => a.sortOrder - b.sortOrder);
    
    const recentLeads = await storage.getLeads({ anlaggning });
    
    if (recentLeads.length === 0) {
      return enabledSellers[0].userId;
    }

    const lastAssignedLead = recentLeads.find(lead => lead.assignedToId !== null);
    
    if (!lastAssignedLead || !lastAssignedLead.assignedToId) {
      return enabledSellers[0].userId;
    }

    const lastSellerIndex = enabledSellers.findIndex(
      pool => pool.userId === lastAssignedLead.assignedToId
    );

    if (lastSellerIndex === -1) {
      return enabledSellers[0].userId;
    }

    const nextIndex = (lastSellerIndex + 1) % enabledSellers.length;
    return enabledSellers[nextIndex].userId;
  }

  async createLeadWithAssignment(leadData: InsertLead): Promise<Lead> {
    if (!leadData.anlaggning) {
      throw new Error("Anläggning is required for auto-assignment");
    }

    const lead = await storage.createLead(leadData);

    const assignedToId = await this.assignLeadToNextSeller(leadData.anlaggning);
    
    if (assignedToId) {
      return await storage.assignLead(lead.id, assignedToId);
    }

    return lead;
  }
}

export const roundRobinService = new RoundRobinService();
