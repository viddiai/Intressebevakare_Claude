import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { SellerPool, User, StatusChangeHistoryWithUser } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

interface SellerPoolWithUser extends SellerPool {
  user?: User;
}

// Separate component for pool item to comply with hooks rules
function PoolItem({ 
  pool, 
  resource, 
  canMoveUp, 
  canMoveDown, 
  onMoveUp, 
  onMoveDown 
}: { 
  pool: SellerPool; 
  resource?: User;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { toast } = useToast();
  
  const { data: history = [] } = useQuery<StatusChangeHistoryWithUser[]>({
    queryKey: ["/api/seller-pools", pool.id, "status-history"],
  });
  const latestChange = history[0];
  
  const togglePoolMutation = useMutation({
    mutationFn: async ({ poolId, isEnabled }: { poolId: string; isEnabled: boolean }) => {
      return apiRequest("PATCH", `/api/seller-pools/${poolId}`, { isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller-pools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller-pools", pool.id, "status-history"] });
      toast({
        title: "Status uppdaterad",
        description: `${resource?.firstName || "Resursen"} har ${pool.isEnabled ? "aktiverats" : "inaktiverats"}.`,
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
    <div
      className="p-3 bg-muted rounded-md space-y-2"
      data-testid={`pool-item-${pool.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium text-sm" data-testid={`text-seller-name-${pool.id}`}>
            {resource ? `${resource.firstName} ${resource.lastName}` : "Okänd resurs"}
          </p>
          <p className="text-xs text-muted-foreground" data-testid={`text-seller-email-${pool.id}`}>
            {resource?.email || "Ingen e-post"}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {resource?.role === "MANAGER" ? (
              <Badge variant="default" className="text-xs bg-primary" data-testid={`badge-role-${pool.id}`}>
                Manager
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs" data-testid={`badge-role-${pool.id}`}>
                Säljare
              </Badge>
            )}
            <Badge variant="outline" className="text-xs" data-testid={`badge-sort-order-${pool.id}`}>
              #{pool.sortOrder}
            </Badge>
            {pool.isEnabled ? (
              <Badge variant="default" className="text-xs bg-green-600" data-testid={`badge-enabled-${pool.id}`}>
                Aktiv
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs" data-testid={`badge-disabled-${pool.id}`}>
                Inaktiv
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              data-testid={`button-move-up-${pool.id}`}
              className="h-6 w-6"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              data-testid={`button-move-down-${pool.id}`}
              className="h-6 w-6"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
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
      </div>
      
      {latestChange && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p>
              <span className="font-medium">Ändrad av:</span>{" "}
              {latestChange.changedByName || "Okänd"} -{" "}
              {formatDistanceToNow(new Date(latestChange.createdAt), { 
                addSuffix: true, 
                locale: sv 
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerPools() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: sellerPools = [], isLoading } = useQuery<SellerPoolWithUser[]>({
    queryKey: ["/api/seller-pools"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ updates }: { updates: Array<{ id: string; sortOrder: number }> }) => {
      return apiRequest("PATCH", "/api/seller-pools/reorder", { updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller-pools"] });
      toast({
        title: "Ordning uppdaterad",
        description: "Sorteringsordningen har sparats.",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera sorteringsordningen. Försök igen.",
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
    Falkenberg: sellerPools.filter((pool) => pool.anlaggning === "Falkenberg").sort((a, b) => a.sortOrder - b.sortOrder),
    Göteborg: sellerPools.filter((pool) => pool.anlaggning === "Göteborg").sort((a, b) => a.sortOrder - b.sortOrder),
    Trollhättan: sellerPools.filter((pool) => pool.anlaggning === "Trollhättan").sort((a, b) => a.sortOrder - b.sortOrder),
  };

  const getUserById = (userId: string) => {
    return users.find((u) => u.id === userId);
  };

  const handleMoveUp = (facility: string, currentIndex: number) => {
    const pools = poolsByFacility[facility as keyof typeof poolsByFacility];
    if (currentIndex <= 0 || currentIndex >= pools.length) return;

    const currentPool = pools[currentIndex];
    const previousPool = pools[currentIndex - 1];

    const updates = [
      { id: currentPool.id, sortOrder: previousPool.sortOrder },
      { id: previousPool.id, sortOrder: currentPool.sortOrder },
    ];

    reorderMutation.mutate({ updates });
  };

  const handleMoveDown = (facility: string, currentIndex: number) => {
    const pools = poolsByFacility[facility as keyof typeof poolsByFacility];
    if (currentIndex < 0 || currentIndex >= pools.length - 1) return;

    const currentPool = pools[currentIndex];
    const nextPool = pools[currentIndex + 1];

    const updates = [
      { id: currentPool.id, sortOrder: nextPool.sortOrder },
      { id: nextPool.id, sortOrder: currentPool.sortOrder },
    ];

    reorderMutation.mutate({ updates });
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
                pools.map((pool, index) => (
                  <PoolItem 
                    key={pool.id} 
                    pool={pool} 
                    resource={getUserById(pool.userId)}
                    canMoveUp={index > 0}
                    canMoveDown={index < pools.length - 1}
                    onMoveUp={() => handleMoveUp(facility, index)}
                    onMoveDown={() => handleMoveDown(facility, index)}
                  />
                ))
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
