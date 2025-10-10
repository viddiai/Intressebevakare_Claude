import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [role, setRole] = useState(user?.role || "SALJARE");
  const [anlaggning, setAnlaggning] = useState(user?.anlaggning || "");

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { role: string; anlaggning?: string | null }) => {
      return apiRequest("PATCH", `/api/users/${user?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profil uppdaterad",
        description: "Dina inställningar har sparats. Uppdatera sidan för att se ändringarna.",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera profilen. Försök igen.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate({
      role,
      anlaggning: anlaggning || null,
    });
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inställningar</h1>
        <p className="text-muted-foreground mt-1">Hantera dina kontoinställningar</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profilinformation</CardTitle>
          <CardDescription>Din information från Replit Auth</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roll och Anläggning</CardTitle>
          <CardDescription>Välj din roll och anläggning i systemet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Roll</Label>
            <Select value={role} onValueChange={(val) => setRole(val as "MANAGER" | "SALJARE")}>
              <SelectTrigger id="role" data-testid="select-role">
                <SelectValue placeholder="Välj roll" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALJARE">Säljare</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Managers kan se alla leads och hantera säljarpoolen
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anlaggning">Anläggning (valfritt)</Label>
            <Select value={anlaggning || "NONE"} onValueChange={(val) => setAnlaggning(val === "NONE" ? "" : val)}>
              <SelectTrigger id="anlaggning" data-testid="select-anlaggning">
                <SelectValue placeholder="Välj anläggning" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Ingen anläggning</SelectItem>
                <SelectItem value="Falkenberg">Falkenberg</SelectItem>
                <SelectItem value="Göteborg">Göteborg</SelectItem>
                <SelectItem value="Trollhättan">Trollhättan</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Säljare ser bara leads från sin anläggning
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
            data-testid="button-save-profile"
          >
            {updateProfileMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Spara ändringar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
