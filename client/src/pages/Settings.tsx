import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Upload, Lock, Power, AlertCircle, Clock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { SellerPool, StatusChangeHistoryWithUser } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { Building2 } from "lucide-react";

// Separate component for seller pool status to comply with hooks rules
function SellerPoolStatus({ pool, userId }: { pool: SellerPool; userId: string }) {
  const { toast } = useToast();
  
  const { data: history = [] } = useQuery<StatusChangeHistoryWithUser[]>({
    queryKey: ["/api/seller-pools", pool.id, "status-history"],
  });
  const latestChange = history[0];
  
  const updateSellerPoolStatusMutation = useMutation({
    mutationFn: async (data: { poolId: number; isEnabled: boolean }) => {
      return apiRequest("PATCH", `/api/my-seller-pools/${data.poolId}/status`, { 
        isEnabled: data.isEnabled 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-seller-pools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller-pools", pool.id, "status-history"] });
      toast({
        title: "Status uppdaterad",
        description: "Din tillgänglighetsstatus har ändrats.",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera status. Försök igen.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4 pb-4 border-b last:border-0 last:pb-0">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor={`pool-status-${pool.id}`} className="text-base font-medium">
              {pool.anlaggning}
            </Label>
            {pool.isEnabled ? (
              <Badge variant="default" className="bg-green-600" data-testid={`badge-status-active-${pool.id}`}>
                Aktiv
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600" data-testid={`badge-status-inactive-${pool.id}`}>
                Inaktiv
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {pool.isEnabled 
              ? "Du får nya leads via round-robin" 
              : "Du får inga nya leads automatiskt"}
          </p>
        </div>
        <Switch
          id={`pool-status-${pool.id}`}
          checked={pool.isEnabled}
          onCheckedChange={(checked) => {
            updateSellerPoolStatusMutation.mutate({
              poolId: pool.id as any,
              isEnabled: checked,
            });
          }}
          disabled={updateSellerPoolStatusMutation.isPending}
          data-testid={`switch-availability-${pool.id}`}
        />
      </div>

      {latestChange && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
          <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p>
              <span className="font-medium">Senast ändrad:</span>{" "}
              {formatDistanceToNow(new Date(latestChange.createdAt), { 
                addSuffix: true, 
                locale: sv 
              })}
            </p>
            {latestChange.changedByName && (
              <p className="mt-0.5">
                <span className="font-medium">Av:</span>{" "}
                {latestChange.changedById === userId 
                  ? "Dig själv" 
                  : latestChange.changedByName}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const profileSchema = z.object({
  firstName: z.string().min(1, "Förnamn krävs").optional(),
  lastName: z.string().min(1, "Efternamn krävs").optional(),
  profileImageUrl: z.string().trim().optional().nullable().refine(
    (val) => !val || val === "" || z.string().url().safeParse(val).success,
    { message: "Ogiltig URL" }
  ),
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1, "Nuvarande lösenord krävs"),
  newPassword: z.string().min(6, "Nytt lösenord måste vara minst 6 tecken"),
  confirmPassword: z.string().min(1, "Bekräfta lösenord"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Lösenorden matchar inte",
  path: ["confirmPassword"],
});

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [role, setRole] = useState(user?.role || "SALJARE");
  const [anlaggning, setAnlaggning] = useState(user?.anlaggning || "");

  // Fetch user's seller pools (available to all users)
  const { data: userPools = [] } = useQuery<SellerPool[]>({
    queryKey: ["/api/my-seller-pools"],
  });

  // State for managing user's facilities
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  // Update selected facilities when pools are loaded
  useEffect(() => {
    if (userPools.length > 0) {
      const facilities = userPools.map(pool => pool.anlaggning as string);
      setSelectedFacilities(facilities);
    }
  }, [userPools]);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      profileImageUrl: user?.profileImageUrl || "",
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

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

  const updateProfileInfoMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      return apiRequest("PATCH", `/api/users/${user?.id}/profile`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profil uppdaterad",
        description: "Din profilinformation har uppdaterats.",
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

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
      return apiRequest("PATCH", `/api/users/${user?.id}/password`, data);
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Lösenord uppdaterat",
        description: "Ditt lösenord har ändrats.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte ändra lösenord. Kontrollera att du angett rätt nuvarande lösenord.",
        variant: "destructive",
      });
    },
  });

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(user?.emailOnLeadAssignment ?? true);

  useEffect(() => {
    if (user?.emailOnLeadAssignment !== undefined) {
      setEmailNotificationsEnabled(user.emailOnLeadAssignment);
    }
  }, [user?.emailOnLeadAssignment]);

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: { emailOnLeadAssignment: boolean }) => {
      return apiRequest("PATCH", `/api/users/${user?.id}/notifications`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Inställningar uppdaterade",
        description: "Dina notifikationsinställningar har sparats.",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera notifikationsinställningar. Försök igen.",
        variant: "destructive",
      });
    },
  });

  const updateFacilitiesMutation = useMutation({
    mutationFn: async (anlaggningar: string[]) => {
      return apiRequest("POST", `/api/my-facilities`, { anlaggningar });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-seller-pools"] });
      toast({
        title: "Anläggningar uppdaterade",
        description: "Dina anläggningar har sparats.",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera anläggningar. Försök igen.",
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

  const handleFacilityToggle = (facility: string) => {
    setSelectedFacilities(prev => {
      if (prev.includes(facility)) {
        return prev.filter(f => f !== facility);
      } else {
        return [...prev, facility];
      }
    });
  };

  const handleSaveFacilities = () => {
    updateFacilitiesMutation.mutate(selectedFacilities);
  };

  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    // Convert empty string or undefined to null for profileImageUrl
    const cleanedData = {
      ...data,
      profileImageUrl: !data.profileImageUrl || data.profileImageUrl.trim() === "" ? null : data.profileImageUrl.trim(),
    };
    updateProfileInfoMutation.mutate(cleanedData);
  };

  const onPasswordSubmit = (data: z.infer<typeof passwordSchema>) => {
    changePasswordMutation.mutate({
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
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
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Profilinformation
          </CardTitle>
          <CardDescription>Uppdatera ditt namn och profilbild</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileForm.watch("profileImageUrl") || user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Förnamn</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ditt förnamn" data-testid="input-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Efternamn</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ditt efternamn" data-testid="input-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={profileForm.control}
                name="profileImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profilbild URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://exempel.se/bild.jpg" data-testid="input-profileimage" />
                    </FormControl>
                    <FormDescription>
                      Ange en URL till din profilbild
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateProfileInfoMutation.isPending}
                data-testid="button-save-profileinfo"
              >
                {updateProfileInfoMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Spara profilinformation
              </Button>
            </form>
          </Form>
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
            <Select 
              value={role} 
              onValueChange={(val) => setRole(val as "MANAGER" | "SALJARE")}
              disabled={user.role !== "MANAGER"}
            >
              <SelectTrigger id="role" data-testid="select-role">
                <SelectValue placeholder="Välj roll" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALJARE">Säljare</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
              </SelectContent>
            </Select>
            {user.role === "MANAGER" ? (
              <p className="text-xs text-muted-foreground">
                Managers kan se alla leads och hantera säljarpoolen
              </p>
            ) : (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Endast managers kan ändra roller. Kontakta en manager för att ändra din roll.
              </p>
            )}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Mina anläggningar
          </CardTitle>
          <CardDescription>Välj vilka anläggningar du vill vara aktiv på</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {["Falkenberg", "Göteborg", "Trollhättan"].map((facility) => (
              <div key={facility} className="flex items-center space-x-2">
                <Checkbox
                  id={`facility-${facility}`}
                  checked={selectedFacilities.includes(facility)}
                  onCheckedChange={() => handleFacilityToggle(facility)}
                  data-testid={`checkbox-facility-${facility}`}
                />
                <Label
                  htmlFor={`facility-${facility}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {facility}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Du kan lägga till dig själv på fler anläggningar genom att markera dem ovan. Du kommer att ingå i round-robin fördelningen för alla valda anläggningar.
            </p>
          </div>

          <Button
            onClick={handleSaveFacilities}
            disabled={updateFacilitiesMutation.isPending || selectedFacilities.length === 0}
            data-testid="button-save-facilities"
          >
            {updateFacilitiesMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Spara anläggningar
          </Button>
        </CardContent>
      </Card>

      {userPools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="w-5 h-5" />
              Min tillgänglighet
            </CardTitle>
            <CardDescription>Hantera din status för nya leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {userPools.map((pool) => (
              <SellerPoolStatus key={pool.id} pool={pool} userId={user?.id || ""} />
            ))}

            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                När du är inaktiv tilldelas inga nya leads till dig. Du kan när som helst aktivera eller inaktivera din status.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            E-postnotifikationer
          </CardTitle>
          <CardDescription>Hantera hur du får e-postmeddelanden</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email-notifications" className="text-base font-medium">
                E-posta mig när jag tilldelas nya leads
              </Label>
              <p className="text-sm text-muted-foreground">
                Få ett e-postmeddelande varje gång ett nytt lead tilldelas till dig
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotificationsEnabled}
              onCheckedChange={(checked) => {
                setEmailNotificationsEnabled(checked);
                updateNotificationsMutation.mutate({ emailOnLeadAssignment: checked });
              }}
              disabled={updateNotificationsMutation.isPending}
              data-testid="switch-email-notifications"
            />
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              E-postnotifikationer skickas till <strong>{user.email}</strong>. Du kan stänga av notifikationer när som helst.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Ändra lösenord
          </CardTitle>
          <CardDescription>Uppdatera ditt lösenord</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuvarande lösenord</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Ange nuvarande lösenord" data-testid="input-oldpassword" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nytt lösenord</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Ange nytt lösenord" data-testid="input-newpassword" />
                    </FormControl>
                    <FormDescription>
                      Lösenordet måste vara minst 6 tecken
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bekräfta nytt lösenord</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Bekräfta nytt lösenord" data-testid="input-confirmpassword" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Ändra lösenord
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
