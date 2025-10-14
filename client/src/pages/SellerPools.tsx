import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { SellerPool, User } from "@shared/schema";

interface SellerPoolWithUser extends SellerPool {
  user?: User;
}

export default function SellerPools() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: sellerPools = [], isLoading } = useQuery<SellerPoolWithUser[]>({
    queryKey: ["/api/seller-pools"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const togglePoolMutation = useMutation({
    mutationFn: async ({ poolId, isEnabled }: { poolId: string; isEnabled: boolean }) => {
      return await apiRequest("PATCH", `/api/seller-pools/${poolId}`, { isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller-pools"] });
      toast({
        title: "Uppdaterad",
        description: "Resurspoolens status har uppdaterats",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera resurspoolens status",
        variant: "destructive",
      });
    },
  });

  if (user?.role !== "MANAGER") {
    return (
      <div className="p-6">
        <p className="text-muted-foreground" data-testid="text-access-denied">
          Du har inte behörighet att se denna sida
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" data-testid="loader-seller-pools" />
      </div>
    );
  }

  const poolsByFacility = {
    Falkenberg: sellerPools.filter((pool) => pool.anlaggning === "Falkenberg"),
    Göteborg: sellerPools.filter((pool) => pool.anlaggning === "Göteborg"),
    Trollhättan: sellerPools.filter((pool) => pool.anlaggning === "Trollhättan"),
  };

  const getUserById = (userId: string) => {
    return users.find((u) => u.id === userId);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="heading-seller-pools">
          Resurspool-hantering
        </h1>
        <p className="text-muted-foreground mt-1">
          Aktivera eller inaktivera resurser (säljare och managers) per anläggning
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(poolsByFacility).map(([facility, pools]) => (
          <Card key={facility} data-testid={`card-facility-${facility}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {facility}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pools.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid={`text-no-sellers-${facility}`}>
                  Inga resurser i denna pool
                </p>
              ) : (
                pools
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((pool) => {
                    const resource = getUserById(pool.userId);
                    return (
                      <div
                        key={pool.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-md"
                        data-testid={`pool-item-${pool.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm" data-testid={`text-seller-name-${pool.id}`}>
                            {resource ? `${resource.firstName} ${resource.lastName}` : "Okänd resurs"}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-seller-email-${pool.id}`}>
                            {resource?.email || "Ingen e-post"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs" data-testid={`badge-role-${pool.id}`}>
                              {resource?.role === "MANAGER" ? "Manager" : "Säljare"}
                            </Badge>
                            <Badge variant="outline" className="text-xs" data-testid={`badge-sort-order-${pool.id}`}>
                              #{pool.sortOrder}
                            </Badge>
                            {pool.isEnabled ? (
                              <Badge variant="default" className="text-xs" data-testid={`badge-enabled-${pool.id}`}>
                                Aktiv
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-disabled-${pool.id}`}>
                                Inaktiv
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={pool.isEnabled}
                          onCheckedChange={(checked) => {
                            togglePoolMutation.mutate({
                              poolId: pool.id,
                              isEnabled: checked,
                            });
                          }}
                          disabled={togglePoolMutation.isPending}
                          data-testid={`switch-pool-${pool.id}`}
                        />
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="card-info">
        <CardHeader>
          <CardTitle>Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Aktiverade resurser deltar i round-robin-tilldelning för sin anläggning</p>
          <p>• Inaktiverade resurser får inga nya leads automatiskt</p>
          <p>• Sorteringsordningen bestämmer ordningen i round-robin-rotationen</p>
          <p>• Både säljare och managers kan läggas till i resurspolen</p>
        </CardContent>
      </Card>
    </div>
  );
}
