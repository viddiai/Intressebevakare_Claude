import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import LeadCard from "@/components/LeadCard";
import FilterBar from "@/components/FilterBar";
import StatusTabs from "@/components/StatusTabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatInTimeZone } from "date-fns-tz";
import { isToday } from "date-fns";
import type { LeadWithAssignedTo, User } from "@shared/schema";

const SWEDISH_TZ = "Europe/Stockholm";

export default function LeadsList() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [showOnlyTasksToday, setShowOnlyTasksToday] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageRecipientId, setMessageRecipientId] = useState<string | null>(null);
  const [messageLeadId, setMessageLeadId] = useState<string | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignLeadId, setReassignLeadId] = useState<string | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: leads, isLoading } = useQuery<LeadWithAssignedTo[]>({
    queryKey: ["/api/leads"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users/sellers"],
  });

  const assignLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return await apiRequest("POST", `/api/leads/${leadId}/assign`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead tilldelad",
        description: "Leaden har tilldelats dig via round-robin",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte tilldela lead",
        variant: "destructive",
      });
    },
  });

  const acceptLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return await apiRequest("POST", `/api/leads/${leadId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead accepterat",
        description: "Du har accepterat leadet",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte acceptera lead",
        variant: "destructive",
      });
    },
  });

  const declineLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return await apiRequest("POST", `/api/leads/${leadId}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead avvisat",
        description: "Leadet har omfördelats till nästa säljare",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte avvisa lead",
        variant: "destructive",
      });
    },
  });

  const reassignLeadMutation = useMutation({
    mutationFn: async ({ leadId, newSellerId }: { leadId: string; newSellerId: string }) => {
      return await apiRequest("POST", `/api/leads/${leadId}/reassign-to-seller`, { newSellerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setReassignDialogOpen(false);
      setReassignLeadId(null);
      setSelectedSellerId("");
      toast({
        title: "Lead omtilldelat",
        description: "Leadet har tilldelats den valda säljaren",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte omtilldela lead",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; content: string; leadId?: string }) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      if (messageRecipientId) {
        queryClient.invalidateQueries({ queryKey: [`/api/messages/${messageRecipientId}`] });
      }
      setMessageDialogOpen(false);
      setMessageContent("");
      setMessageRecipientId(null);
      setMessageLeadId(null);
      toast({
        title: "Meddelande skickat",
        description: "Ditt meddelande har skickats",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte skicka meddelandet",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageContent.trim() || !messageRecipientId) return;

    sendMessageMutation.mutate({
      receiverId: messageRecipientId,
      content: messageContent,
      leadId: messageLeadId || undefined,
    });
  };

  const handleReassign = () => {
    if (!reassignLeadId || !selectedSellerId) return;

    reassignLeadMutation.mutate({
      leadId: reassignLeadId,
      newSellerId: selectedSellerId,
    });
  };

  const activeSellers = useMemo(() => {
    if (!users || !currentUser) return [];
    return users.filter((user) => 
      user.role === "SALJARE" && 
      user.isActive && 
      user.id !== currentUser.id
    );
  }, [users, currentUser]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    const filtered = leads.filter((lead) => {
      const matchesTab = activeTab === "all" || 
        (activeTab === "new" && lead.status === "NY_INTRESSEANMALAN") ||
        (activeTab === "contacted" && lead.status === "KUND_KONTAKTAD") ||
        (activeTab === "quote" && lead.status === "OFFERT_SKICKAD") ||
        (activeTab === "won" && lead.status === "VUNNEN") ||
        (activeTab === "lost" && lead.status === "FORLORAD");

      const matchesSearch = !search || 
        lead.contactName?.toLowerCase().includes(search.toLowerCase()) ||
        lead.vehicleTitle?.toLowerCase().includes(search.toLowerCase());

      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
      const matchesLocation = locationFilter === "all" || lead.anlaggning === locationFilter;
      
      const matchesSeller = 
        sellerFilter === "all" || 
        (sellerFilter === "unassigned" && !lead.assignedToId) ||
        (sellerFilter !== "unassigned" && lead.assignedToId === sellerFilter);

      const matchesTaskToday = !showOnlyTasksToday || 
        (lead.nextTask && isToday(new Date(lead.nextTask.dueDate)));

      return matchesTab && matchesSearch && matchesSource && matchesLocation && matchesSeller && matchesTaskToday;
    });

    return filtered.sort((a, b) => {
      const aIsPending = a.status === "VANTAR_PA_ACCEPT";
      const bIsPending = b.status === "VANTAR_PA_ACCEPT";
      
      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;
      
      if (aIsPending && bIsPending && a.assignedAt && b.assignedAt) {
        return new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime();
      }
      
      if (a.nextTask && !b.nextTask) return -1;
      if (!a.nextTask && b.nextTask) return 1;
      if (a.nextTask && b.nextTask) {
        return new Date(a.nextTask.dueDate).getTime() - new Date(b.nextTask.dueDate).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leads, activeTab, search, sourceFilter, locationFilter, sellerFilter, showOnlyTasksToday]);

  const counts = useMemo(() => {
    if (!leads) return { all: 0, new: 0, contacted: 0, quote: 0, won: 0, lost: 0 };

    return {
      all: leads.length,
      new: leads.filter(l => l.status === "NY_INTRESSEANMALAN").length,
      contacted: leads.filter(l => l.status === "KUND_KONTAKTAD").length,
      quote: leads.filter(l => l.status === "OFFERT_SKICKAD").length,
      won: leads.filter(l => l.status === "VUNNEN").length,
      lost: leads.filter(l => l.status === "FORLORAD").length,
    };
  }, [leads]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leadslista</h1>
          <p className="text-muted-foreground mt-1">Hantera dina tilldelade leads</p>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setLocation("/leads/create")}
          data-testid="button-create-lead"
        >
          <Plus className="w-4 h-4" />
          Skapa nytt lead
        </Button>
      </div>

      <StatusTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        locationFilter={locationFilter}
        onLocationChange={setLocationFilter}
        sellerFilter={sellerFilter}
        onSellerChange={setSellerFilter}
        sellers={users || []}
        showOnlyTasksToday={showOnlyTasksToday}
        onShowOnlyTasksTodayChange={setShowOnlyTasksToday}
      />

      <div className="space-y-4">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Inga leads hittades</p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isAssignedToMe = currentUser && lead.assignedToId === currentUser.id;
            return (
              <LeadCard
                key={lead.id}
                id={lead.id}
                vehicleTitle={lead.vehicleTitle}
                contactName={lead.contactName}
                contactEmail={lead.contactEmail || ""}
                contactPhone={lead.contactPhone || ""}
                source={lead.source}
                location={lead.anlaggning || ""}
                status={lead.status}
                createdAt={formatInTimeZone(new Date(lead.createdAt), SWEDISH_TZ, "yyyy-MM-dd HH:mm")}
                assignedTo={lead.assignedToName || (lead.assignedToId ? "Tilldelad" : undefined)}
                assignedToId={lead.assignedToId || undefined}
                assignedAt={lead.assignedAt}
                acceptStatus={lead.acceptStatus}
                vehicleLink={lead.vehicleLink || undefined}
                nextTask={lead.nextTask}
                onViewDetails={() => {
                  setLocation(`/leads/${lead.id}`);
                }}
                onAssign={() => {
                  assignLeadMutation.mutate(lead.id);
                }}
                onAccept={isAssignedToMe ? () => {
                  acceptLeadMutation.mutate(lead.id);
                } : undefined}
                onDecline={isAssignedToMe ? () => {
                  declineLeadMutation.mutate(lead.id);
                } : undefined}
                onReassign={isAssignedToMe ? () => {
                  setReassignLeadId(lead.id);
                  setReassignDialogOpen(true);
                } : undefined}
                onSendMessage={lead.assignedToId ? () => {
                  setMessageRecipientId(lead.assignedToId!);
                  setMessageLeadId(lead.id);
                  const leadInfo = `Angående lead: ${lead.vehicleTitle} (${lead.contactName})\n\n`;
                  setMessageContent(leadInfo);
                  setMessageDialogOpen(true);
                } : undefined}
              />
            );
          })
        )}
      </div>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent data-testid="dialog-reassign-lead">
          <DialogHeader>
            <DialogTitle>Tilldela till annan säljare</DialogTitle>
            <DialogDescription>
              Välj en säljare att tilldela detta lead till. Leadet kommer att markeras som "avvisat" i din statistik.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Välj säljare:</p>
              <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                <SelectTrigger data-testid="select-seller-reassign">
                  <SelectValue placeholder="Välj en säljare" />
                </SelectTrigger>
                <SelectContent>
                  {activeSellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.firstName && seller.lastName
                        ? `${seller.firstName} ${seller.lastName}`
                        : seller.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReassignDialogOpen(false);
                setReassignLeadId(null);
                setSelectedSellerId("");
              }}
              data-testid="button-cancel-reassign"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleReassign}
              disabled={!selectedSellerId || reassignLeadMutation.isPending}
              data-testid="button-confirm-reassign"
            >
              {reassignLeadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Tilldela"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent data-testid="dialog-send-message-from-list">
          <DialogHeader>
            <DialogTitle>Skicka meddelande</DialogTitle>
            <DialogDescription>
              Skicka ett meddelande till den tilldelade säljaren om detta lead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Mottagare:</p>
              <p className="text-sm text-muted-foreground">
                {messageRecipientId
                  ? users?.find((u) => u.id === messageRecipientId)
                    ? `${users.find((u) => u.id === messageRecipientId)?.firstName} ${users.find((u) => u.id === messageRecipientId)?.lastName}`
                    : "Okänd användare"
                  : "Välj mottagare"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Meddelande:</p>
              <Textarea
                placeholder="Skriv ditt meddelande här..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={8}
                data-testid="input-message-content-from-list"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMessageDialogOpen(false);
                setMessageContent("");
                setMessageRecipientId(null);
                setMessageLeadId(null);
              }}
              data-testid="button-cancel-message-from-list"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || sendMessageMutation.isPending}
              data-testid="button-confirm-send-message-from-list"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Skicka"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
