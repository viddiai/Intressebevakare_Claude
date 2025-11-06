import { storage } from "./storage";
import { sendAcceptanceReminderEmail, sendManagerTimeoutNotification } from "./email";
import { roundRobinService } from "./roundRobin";

export class AcceptanceWorker {
  private isRunning: boolean = false;
  private pollIntervalMs: number = 30 * 60 * 1000;

  async checkPendingLeads() {
    try {
      console.log('[AcceptanceWorker] Checking leads pending acceptance...');
      
      const pendingLeads = await storage.getLeadsPendingAcceptance();
      
      if (pendingLeads.length === 0) {
        console.log('[AcceptanceWorker] No leads pending acceptance');
        return;
      }

      console.log(`[AcceptanceWorker] Found ${pendingLeads.length} leads pending acceptance`);

      for (const lead of pendingLeads) {
        if (!lead.assignedToId || !lead.assignedAt) {
          continue;
        }

        const assignedUser = await storage.getUser(lead.assignedToId);
        if (!assignedUser) {
          console.log(`[AcceptanceWorker] Assigned user not found for lead ${lead.id}`);
          continue;
        }

        const now = new Date();
        const assignedTime = new Date(lead.assignedAt);
        const hoursSinceAssignment = (now.getTime() - assignedTime.getTime()) / (1000 * 60 * 60);

        console.log(`[AcceptanceWorker] Lead ${lead.id} (${lead.vehicleTitle}): ${hoursSinceAssignment.toFixed(2)} hours since assignment`);

        if (hoursSinceAssignment >= 12 && !lead.timeoutNotifiedAt) {
          console.log(`[AcceptanceWorker] Lead ${lead.id} has exceeded 12 hour timeout, reassigning and notifying manager`);
          
          try {
            const newAssigneeId = await roundRobinService.reassignLead(lead.id, lead.anlaggning, lead.assignedToId);
            
            await storage.incrementUserTimedOutCount(assignedUser.id);
            
            if (newAssigneeId) {
              console.log(`[AcceptanceWorker] Lead ${lead.id} reassigned to ${newAssigneeId}`);
              
              const newAssignee = await storage.getUser(newAssigneeId);
              await storage.createAuditLog({
                leadId: lead.id,
                userId: assignedUser.id,
                action: "Lead auto-declined due to timeout",
                fromValue: `${assignedUser.firstName} ${assignedUser.lastName}`,
                toValue: newAssignee ? `${newAssignee.firstName} ${newAssignee.lastName}` : newAssigneeId
              });
            } else {
              console.log(`[AcceptanceWorker] Could not reassign lead ${lead.id}, no other sellers available`);
              
              await storage.updateLead(lead.id, {
                status: "NY_INTRESSEANMALAN",
                assignedToId: null,
                acceptStatus: null,
                reminderSentAt6h: null,
                reminderSentAt11h: null,
                timeoutNotifiedAt: now
              });
            }
            
            if (lead.anlaggning) {
              const manager = await storage.getManagerForFacility(lead.anlaggning);
              
              if (manager) {
                await sendManagerTimeoutNotification(manager, assignedUser, lead);
                console.log(`[AcceptanceWorker] Manager notification sent for lead ${lead.id}`);
              } else {
                console.log(`[AcceptanceWorker] No manager found for facility ${lead.anlaggning}`);
              }
            }
          } catch (error) {
            console.error(`[AcceptanceWorker] Failed to handle timeout for lead ${lead.id}:`, error);
          }
        }
        else if (hoursSinceAssignment >= 11 && !lead.reminderSentAt11h) {
          console.log(`[AcceptanceWorker] Lead ${lead.id} is at 11 hours, sending final reminder`);
          
          try {
            await sendAcceptanceReminderEmail(assignedUser, lead, 1);
            await storage.updateLead(lead.id, {
              reminderSentAt11h: now
            });
            console.log(`[AcceptanceWorker] Final reminder sent for lead ${lead.id}`);
          } catch (error) {
            console.error(`[AcceptanceWorker] Failed to send final reminder for lead ${lead.id}:`, error);
          }
        }
        else if (hoursSinceAssignment >= 6 && !lead.reminderSentAt6h) {
          console.log(`[AcceptanceWorker] Lead ${lead.id} is at 6 hours, sending first reminder`);
          
          try {
            await sendAcceptanceReminderEmail(assignedUser, lead, 6);
            await storage.updateLead(lead.id, {
              reminderSentAt6h: now
            });
            console.log(`[AcceptanceWorker] First reminder sent for lead ${lead.id}`);
          } catch (error) {
            console.error(`[AcceptanceWorker] Failed to send first reminder for lead ${lead.id}:`, error);
          }
        }
      }
      
      console.log('[AcceptanceWorker] Finished checking pending leads');
    } catch (error) {
      console.error('[AcceptanceWorker] Error checking pending leads:', error);
    }
  }

  start() {
    if (this.isRunning) {
      console.log('[AcceptanceWorker] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[AcceptanceWorker] Starting acceptance monitoring (${this.pollIntervalMs / 60000} minute interval)`);

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        await this.checkPendingLeads();
      } catch (error) {
        console.error('[AcceptanceWorker] Error in poll cycle:', error);
      }

      if (this.isRunning) {
        setTimeout(poll, this.pollIntervalMs);
      }
    };

    poll();
  }

  stop() {
    console.log('[AcceptanceWorker] Stopping acceptance monitoring');
    this.isRunning = false;
  }
}

export const acceptanceWorker = new AcceptanceWorker();
