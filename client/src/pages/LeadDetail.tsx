import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, ExternalLink, Loader2, Plus, CheckCircle2, Circle, UserCog, Edit2, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { Lead, LeadNote, LeadTask, AuditLog, User } from "@shared/schema";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { formatInTimeZone, toDate } from "date-fns-tz";
import StatusBadge from "@/components/StatusBadge";
import AcceptanceBanner from "@/components/AcceptanceBanner";

const SWEDISH_TZ = "Europe/Stockholm";

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [noteContent, setNoteContent] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("09:00");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newStatus, setNewStatus] = useState("");
  
  const [editingVehicleInfo, setEditingVehicleInfo] = useState(false);
  const [editRegistrationNumber, setEditRegistrationNumber] = useState("");
  const [editAnlaggning, setEditAnlaggning] = useState("");
  const [editVerendusId, setEditVerendusId] = useState("");

  const { data: lead, isLoading: leadLoading } = useQuery<Lead>({
    queryKey: [`/api/leads/${id}`],
  });

  const { data: notes = [] } = useQuery<LeadNote[]>({
    queryKey: [`/api/leads/${id}/notes`],
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery<LeadTask[]>({
    queryKey: [`/api/leads/${id}/tasks`],
    enabled: !!id,
  });

  const { data: activity = [] } = useQuery<AuditLog[]>({
    queryKey: [`/api/leads/${id}/activity`],
    enabled: !!id,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: currentUser?.role === "MANAGER",
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/leads/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}/activity`] });
      toast({
        title: "Status uppdaterad",
        description: "Leadens status har ändrats",
      });
      setNewStatus("");
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera status",
        variant: "destructive",
      });
    },
  });

  const reassignLeadMutation = useMutation({
    mutationFn: async (assignedToId: string) => {
      return await apiRequest("PATCH", `/api/leads/${id}/assign`, { assignedToId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}/activity`] });
      toast({
        title: "Lead omtilldelad",
        description: "Leaden har tilldelats en ny säljare",
      });
      setSelectedUserId("");
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte tilldela lead",
        variant: "destructive",
      });
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/leads/${id}/notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}/notes`] });
      setNoteContent("");
      toast({
        title: "Anteckning skapad",
        description: "Din anteckning har sparats",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte skapa anteckning",
        variant: "destructive",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { description: string; dueDate?: string }) => {
      return await apiRequest("POST", `/api/leads/${id}/tasks`, {
        description: data.description,
        dueDate: data.dueDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}/tasks`] });
      setTaskDescription("");
      setTaskDueDate("");
      setTaskDueTime("09:00");
      toast({
        title: "Uppgift skapad",
        description: "Uppgiften har lagts till",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte skapa uppgift",
        variant: "destructive",
      });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}/tasks`] });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera uppgift",
        variant: "destructive",
      });
    },
  });

  const updateVehicleInfoMutation = useMutation({
    mutationFn: async (data: { registrationNumber?: string; anlaggning?: string; verendusId?: string }) => {
      return await apiRequest("PATCH", `/api/leads/${id}/vehicle-info`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}`] });
      setEditingVehicleInfo(false);
      toast({
        title: "Fordonsinformation uppdaterad",
        description: "Ändringarna har sparats",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte uppdatera fordonsinformation",
        variant: "destructive",
      });
    },
  });

  const acceptLeadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/leads/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead accepterat",
        description: "Du har accepterat detta lead",
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
    mutationFn: async () => {
      return await apiRequest("POST", `/api/leads/${id}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead nekat",
        description: "Leadet har tilldelats nästa säljare",
      });
      setLocation("/leads");
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte neka lead",
        variant: "destructive",
      });
    },
  });

  const handleEditVehicleInfo = () => {
    setEditRegistrationNumber(lead?.registrationNumber || "");
    setEditAnlaggning(lead?.anlaggning || "");
    setEditVerendusId(lead?.verendusId || "");
    setEditingVehicleInfo(true);
  };

  const handleSaveVehicleInfo = () => {
    if (editRegistrationNumber && !/^[A-Z]{3}\d{2}[A-Z0-9]$/i.test(editRegistrationNumber)) {
      toast({
        title: "Ogiltigt format",
        description: "Regnummer måste vara i formatet ABC123 eller ABC12D",
        variant: "destructive",
      });
      return;
    }
    
    updateVehicleInfoMutation.mutate({
      registrationNumber: editRegistrationNumber || undefined,
      anlaggning: editAnlaggning || undefined,
      verendusId: editVerendusId || undefined,
    });
  };

  const handleCancelEditVehicleInfo = () => {
    setEditingVehicleInfo(false);
    setEditRegistrationNumber("");
    setEditAnlaggning("");
    setEditVerendusId("");
  };

  const handleCreateNote = () => {
    if (!noteContent.trim()) return;
    createNoteMutation.mutate(noteContent);
  };

  const handleCreateTask = () => {
    if (!taskDescription.trim()) return;
    let dueDateTimeString: string | undefined = undefined;
    if (taskDueDate) {
      const localDateTimeString = `${taskDueDate}T${taskDueTime || "09:00"}:00`;
      const utcDate = toDate(localDateTimeString, { timeZone: SWEDISH_TZ });
      dueDateTimeString = utcDate.toISOString();
    }
    createTaskMutation.mutate({
      description: taskDescription,
      dueDate: dueDateTimeString,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      NY_INTRESSEANMALAN: { label: "Ny", variant: "default" },
      KUND_KONTAKTAD: { label: "Kontaktad", variant: "secondary" },
      OFFERT_SKICKAD: { label: "Offert skickad", variant: "secondary" },
      VUNNEN: { label: "Vunnen", variant: "default" },
      FORLORAD: { label: "Förlorad", variant: "outline" },
    };
    const config = variants[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  if (leadLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" data-testid="loader-lead-detail" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground" data-testid="text-lead-not-found">Lead hittades inte</p>
      </div>
    );
  }

  const isPendingAcceptance = lead.status === "VANTAR_PA_ACCEPT" && 
    (lead.acceptStatus === "pending" || !lead.acceptStatus) &&
    lead.assignedToId === currentUser?.id;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/leads")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-lead-title">{lead.vehicleTitle}</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-lead-source">
            {lead.source} • {lead.anlaggning || "Ingen anläggning"}
          </p>
        </div>
        <Button
          onClick={() => setLocation("/leads/create")}
          data-testid="button-create-new-lead"
        >
          Skapa nytt lead
        </Button>
      </div>

      {isPendingAcceptance && (
        <AcceptanceBanner
          leadId={lead.id}
          assignedAt={lead.assignedAt}
          onAccept={() => acceptLeadMutation.mutate()}
          onDecline={() => declineLeadMutation.mutate()}
          isAccepting={acceptLeadMutation.isPending}
          isDeclining={declineLeadMutation.isPending}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-contact-info">
          <CardHeader>
            <CardTitle>Kontaktinformation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-2">
                <StatusBadge status={lead.status as any} />
              </div>
              <div className="flex gap-2 mt-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="flex-1" data-testid="select-status">
                    <SelectValue placeholder="Ändra status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NY_INTRESSEANMALAN">Ny intresseanmälan</SelectItem>
                    <SelectItem value="KUND_KONTAKTAD">Kund kontaktad</SelectItem>
                    <SelectItem value="OFFERT_SKICKAD">Offert skickad</SelectItem>
                    <SelectItem value="VUNNEN">Vunnen / Affär</SelectItem>
                    <SelectItem value="FORLORAD">Förlorad / Inte affär</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (newStatus && newStatus !== lead.status) {
                      updateStatusMutation.mutate(newStatus);
                    }
                  }}
                  disabled={!newStatus || newStatus === lead.status || updateStatusMutation.isPending}
                  size="sm"
                  data-testid="button-update-status"
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Uppdatera"
                  )}
                </Button>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Registreringstid</p>
              <p className="text-base" data-testid="text-registration-time">
                {formatInTimeZone(new Date(lead.createdAt), SWEDISH_TZ, "yyyy-MM-dd HH:mm")}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Namn</p>
              <p className="text-base" data-testid="text-contact-name">{lead.contactName}</p>
            </div>
            {lead.contactEmail && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">E-post</p>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${lead.contactEmail}`} className="text-base hover:underline" data-testid="link-email">
                    {lead.contactEmail}
                  </a>
                </div>
              </div>
            )}
            {lead.contactPhone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Telefon</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${lead.contactPhone}`} className="text-base hover:underline" data-testid="link-phone">
                    {lead.contactPhone}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-vehicle-info">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Fordonsinformation</CardTitle>
            {!editingVehicleInfo && (currentUser?.role === "MANAGER" || lead.assignedToId === currentUser?.id) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditVehicleInfo}
                data-testid="button-edit-vehicle-info"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fordon</p>
              <p className="text-base" data-testid="text-vehicle-title">{lead.vehicleTitle}</p>
            </div>
            
            {editingVehicleInfo ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Reg.Nr</p>
                  <Input
                    value={editRegistrationNumber}
                    onChange={(e) => setEditRegistrationNumber(e.target.value)}
                    placeholder="ABC123"
                    data-testid="input-edit-registration-number"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Anläggning</p>
                  <Select value={editAnlaggning} onValueChange={setEditAnlaggning}>
                    <SelectTrigger data-testid="select-edit-anlaggning">
                      <SelectValue placeholder="Välj anläggning" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Falkenberg">Falkenberg</SelectItem>
                      <SelectItem value="Göteborg">Göteborg</SelectItem>
                      <SelectItem value="Trollhättan">Trollhättan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Verendus-ID</p>
                  <Input
                    value={editVerendusId}
                    onChange={(e) => setEditVerendusId(e.target.value)}
                    placeholder="ID"
                    data-testid="input-edit-verendus-id"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSaveVehicleInfo}
                    disabled={updateVehicleInfoMutation.isPending}
                    size="sm"
                    data-testid="button-save-vehicle-info"
                  >
                    {updateVehicleInfoMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Spara
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEditVehicleInfo}
                    disabled={updateVehicleInfoMutation.isPending}
                    size="sm"
                    data-testid="button-cancel-edit-vehicle-info"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Avbryt
                  </Button>
                </div>
              </>
            ) : (
              <>
                {(lead.registrationNumber || editingVehicleInfo) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reg.Nr</p>
                    <p className="text-base" data-testid="text-registration-number">
                      {lead.registrationNumber || "-"}
                    </p>
                  </div>
                )}
                {lead.anlaggning && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Anläggning</p>
                    <p className="text-base" data-testid="text-anlaggning">{lead.anlaggning}</p>
                  </div>
                )}
                {(lead.verendusId || editingVehicleInfo) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Verendus-ID</p>
                    <p className="text-base" data-testid="text-verendus-id">
                      {lead.verendusId || "-"}
                    </p>
                  </div>
                )}
              </>
            )}
            
            {lead.vehicleLink && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Länk</p>
                <a
                  href={lead.vehicleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-base text-primary hover:underline"
                  data-testid="link-vehicle"
                >
                  Visa annons <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
            {lead.message && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meddelande</p>
                <p className="text-base whitespace-pre-wrap" data-testid="text-message">{lead.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {currentUser?.role === "MANAGER" && (
        <Card data-testid="card-reassign">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Tilldela om lead (endast Manager)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Endast managers kan tilldela eller omtilldela leads till säljare
              </p>
              <div className="flex gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1" data-testid="select-user">
                    <SelectValue placeholder="Välj säljare..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((user) => user.role === "SALJARE" && user.isActive)
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id} data-testid={`select-user-${user.id}`}>
                          {user.firstName} {user.lastName} ({user.anlaggning})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (selectedUserId) {
                      reassignLeadMutation.mutate(selectedUserId);
                    }
                  }}
                  disabled={!selectedUserId || reassignLeadMutation.isPending}
                  data-testid="button-reassign"
                >
                  {reassignLeadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Tilldela"
                  )}
                </Button>
              </div>
            </div>
            {lead.assignedToId && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Nuvarande tilldelning: <span className="font-medium text-foreground" data-testid="text-current-assignee">
                    {users.find((u) => u.id === lead.assignedToId)
                      ? `${users.find((u) => u.id === lead.assignedToId)?.firstName} ${users.find((u) => u.id === lead.assignedToId)?.lastName}`
                      : "Okänd"}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-notes">
          <CardHeader>
            <CardTitle>Anteckningar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Skriv en anteckning..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-note"
              />
              <Button
                onClick={handleCreateNote}
                disabled={!noteContent.trim() || createNoteMutation.isPending}
                size="sm"
                data-testid="button-add-note"
              >
                {createNoteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till
                  </>
                )}
              </Button>
            </div>
            <Separator />
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-notes">Inga anteckningar ännu</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="space-y-1 p-3 bg-muted rounded-md" data-testid={`note-${note.id}`}>
                    <p className="text-sm" data-testid={`text-note-content-${note.id}`}>{note.content}</p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-note-date-${note.id}`}>
                      {formatInTimeZone(new Date(note.createdAt), SWEDISH_TZ, "PPp", { locale: sv })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-tasks">
          <CardHeader>
            <CardTitle>Uppgifter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Uppgiftsbeskrivning..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                data-testid="input-task-description"
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="flex-1"
                  data-testid="input-task-date"
                />
                <Input
                  type="time"
                  value={taskDueTime}
                  onChange={(e) => setTaskDueTime(e.target.value)}
                  className="w-32"
                  data-testid="input-task-time"
                />
              </div>
              <Button
                onClick={handleCreateTask}
                disabled={!taskDescription.trim() || createTaskMutation.isPending}
                size="sm"
                data-testid="button-add-task"
              >
                {createTaskMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till
                  </>
                )}
              </Button>
            </div>
            <Separator />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-tasks">Inga uppgifter ännu</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-muted rounded-md"
                    data-testid={`task-${task.id}`}
                  >
                    <button
                      onClick={() => toggleTaskMutation.mutate(task.id)}
                      className="mt-0.5 hover-elevate active-elevate-2 rounded-sm"
                      data-testid={`button-toggle-task-${task.id}`}
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1">
                      {task.dueDate ? (
                        <p className={`text-sm ${task.isCompleted ? "line-through text-muted-foreground" : ""}`} data-testid={`text-task-description-${task.id}`}>
                          <span className="text-xs text-muted-foreground">
                            {formatInTimeZone(new Date(task.dueDate), SWEDISH_TZ, "yyyy-MM-dd HH:mm")}
                          </span>
                          {" - "}
                          {task.description}
                        </p>
                      ) : (
                        <p className={`text-sm ${task.isCompleted ? "line-through text-muted-foreground" : ""}`} data-testid={`text-task-description-${task.id}`}>
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-activity">
        <CardHeader>
          <CardTitle>Aktivitetshistorik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-activity">Ingen aktivitet ännu</p>
            ) : (
              activity.map((log) => (
                <div key={log.id} className="flex gap-3 p-3 bg-muted rounded-md" data-testid={`activity-${log.id}`}>
                  <div className="flex-1">
                    <p className="text-sm font-medium" data-testid={`text-activity-action-${log.id}`}>{log.action}</p>
                    {log.fromValue && log.toValue && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-activity-change-${log.id}`}>
                        {log.fromValue} → {log.toValue}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`text-activity-date-${log.id}`}>
                      {formatInTimeZone(new Date(log.createdAt), SWEDISH_TZ, "d MMM yyyy HH:mm", { locale: sv })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
