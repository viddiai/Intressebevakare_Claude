import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Users, Clock, AlertTriangle, Power } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { SellerPool } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Overview() {
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER";
  const [, setLocation] = useLocation();

  // Fetch user's seller pools
  const { data: allSellerPools = [] } = useQuery<SellerPool[]>({
    queryKey: ["/api/seller-pools"],
    enabled: isManager,
  });

  // Filter pools for current user and check if any are inactive
  const userPools = allSellerPools.filter(pool => pool.userId === user?.id);
  const hasInactivePools = userPools.some(pool => !pool.isEnabled);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Översikt</h1>
        <p className="text-muted-foreground mt-1">Välkommen till lead-hanteringssystemet</p>
      </div>

      {hasInactivePools && (
        <Alert className="border-yellow-600 bg-yellow-50 dark:bg-yellow-950/30" data-testid="alert-inactive-status">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-yellow-800 dark:text-yellow-200">
              Du är för närvarande inaktiv på en eller flera anläggningar. Du får inga nya leads.
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              className="shrink-0"
              onClick={() => setLocation("/settings")}
              data-testid="button-go-to-settings"
            >
              <Power className="w-4 h-4 mr-2" />
              Gå till inställningar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className={`grid grid-cols-1 gap-6 ${isManager ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <Link href="/leads">
          <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer" data-testid="card-nya-leads-idag">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nya leads idag</p>
                <p className="text-3xl font-bold text-foreground mt-2" data-testid="value-nya-leads-idag">8</p>
                <p className="text-sm text-muted-foreground mt-1">+2 från igår</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/leads">
          <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer" data-testid="card-vantande-tilldelning">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Väntande tilldelning</p>
                <p className="text-3xl font-bold text-foreground mt-2" data-testid="value-vantande-tilldelning">12</p>
                <p className="text-sm text-muted-foreground mt-1">Kräver åtgärd</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </Card>
        </Link>

        {isManager && (
          <Link href="/seller-pools">
            <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer" data-testid="card-aktiva-saljare">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aktiva säljare</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="value-aktiva-saljare">8</p>
                  <p className="text-sm text-muted-foreground mt-1">3 anläggningar</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
          </Link>
        )}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Snabbåtkomst</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button variant="outline" className="justify-between h-auto py-4" asChild>
            <Link href="/leads">
              <div className="text-left">
                <p className="font-medium">Mina Leads</p>
                <p className="text-sm text-muted-foreground">Se alla tilldelade leads</p>
              </div>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <Button variant="outline" className="justify-between h-auto py-4" asChild>
            <Link href="/dashboard">
              <div className="text-left">
                <p className="font-medium">Dashboard</p>
                <p className="text-sm text-muted-foreground">KPI och statistik</p>
              </div>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Senaste aktivitet</h2>
        <div className="space-y-4">
          {[
            { action: "Ny lead från Bytbil", time: "2 min sedan", user: "System" },
            { action: "Lead tilldelad till Lisa Karlsson", time: "15 min sedan", user: "Manager" },
            { action: "Status ändrad till 'Vunnen'", time: "1 timme sedan", user: "Per Johansson" },
            { action: "Ny kommentar tillagd", time: "2 timmar sedan", user: "Anna Berg" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.action}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.user} · {item.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
