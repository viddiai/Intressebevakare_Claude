import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Users, Clock } from "lucide-react";

export default function Overview() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Översikt</h1>
        <p className="text-muted-foreground mt-1">Välkommen till lead-hanteringssystemet</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 hover-elevate">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nya leads idag</p>
              <p className="text-3xl font-bold text-foreground mt-2">8</p>
              <p className="text-sm text-muted-foreground mt-1">+2 från igår</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-elevate">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Väntande tilldelning</p>
              <p className="text-3xl font-bold text-foreground mt-2">12</p>
              <p className="text-sm text-muted-foreground mt-1">Kräver åtgärd</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-elevate">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aktiva säljare</p>
              <p className="text-3xl font-bold text-foreground mt-2">8</p>
              <p className="text-sm text-muted-foreground mt-1">3 anläggningar</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Snabbåtkomst</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button variant="outline" className="justify-between h-auto py-4" asChild>
            <a href="/leads">
              <div className="text-left">
                <p className="font-medium">Mina Leads</p>
                <p className="text-sm text-muted-foreground">Se alla tilldelade leads</p>
              </div>
              <ArrowRight className="w-5 h-5" />
            </a>
          </Button>
          <Button variant="outline" className="justify-between h-auto py-4" asChild>
            <a href="/dashboard">
              <div className="text-left">
                <p className="font-medium">Dashboard</p>
                <p className="text-sm text-muted-foreground">KPI och statistik</p>
              </div>
              <ArrowRight className="w-5 h-5" />
            </a>
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
