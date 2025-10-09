import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import LeadCard from "@/components/LeadCard";
import FilterBar from "@/components/FilterBar";
import StatusTabs from "@/components/StatusTabs";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Lead } from "@shared/schema";

export default function LeadsList() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
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

  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    return leads.filter((lead) => {
      const matchesTab = activeTab === "all" || 
        (activeTab === "new" && lead.status === "NY_INTRESSEANMALAN") ||
        (activeTab === "contacted" && lead.status === "KUND_KONTAKTAD") ||
        (activeTab === "won" && lead.status === "VUNNEN") ||
        (activeTab === "lost" && lead.status === "FORLORAD");

      const matchesSearch = !search || 
        lead.contactName?.toLowerCase().includes(search.toLowerCase()) ||
        lead.vehicleTitle?.toLowerCase().includes(search.toLowerCase());

      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
      const matchesLocation = locationFilter === "all" || lead.anlaggning === locationFilter;

      return matchesTab && matchesSearch && matchesSource && matchesLocation;
    });
  }, [leads, activeTab, search, sourceFilter, locationFilter]);

  const counts = useMemo(() => {
    if (!leads) return { all: 0, new: 0, contacted: 0, won: 0, lost: 0 };

    return {
      all: leads.length,
      new: leads.filter(l => l.status === "NY_INTRESSEANMALAN").length,
      contacted: leads.filter(l => l.status === "KUND_KONTAKTAD").length,
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
          <h1 className="text-3xl font-bold text-foreground">Mina Leads</h1>
          <p className="text-muted-foreground mt-1">Hantera dina tilldelade leads</p>
        </div>
        <Button className="gap-2" data-testid="button-create-lead">
          <Plus className="w-4 h-4" />
          Skapa lead
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
      />

      <div className="space-y-4">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Inga leads hittades</p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
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
                createdAt={lead.createdAt.toString().split('T')[0]}
                vehicleLink={lead.vehicleLink || undefined}
                onViewDetails={() => {
                  setLocation(`/leads/${lead.id}`);
                }}
                onAssign={() => {
                  assignLeadMutation.mutate(lead.id);
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
