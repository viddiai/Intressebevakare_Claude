import { useQuery } from "@tanstack/react-query";
import KpiCard from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  contacted: number;
  won: number;
  lost: number;
  winRate: number;
  avgTimeToFirstContact: number;
  avgTimeToClose: number;
  leadsBySource: Array<{ source: string; count: number }>;
  leadsByAnlaggning: Array<{ anlaggning: string; count: number }>;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Kunde inte hämta statistik</p>
      </div>
    );
  }

  const kpiData = [
    { title: "Totala leads", value: stats.totalLeads.toString(), subtitle: "Alla leads", trend: 0 },
    { title: "Konverteringsgrad", value: `${stats.winRate.toFixed(1)}%`, subtitle: "Win rate", trend: 0 },
    { title: "Genomsnittlig svarstid", value: `${stats.avgTimeToFirstContact.toFixed(1)}h`, subtitle: "Tid till första kontakt", trend: 0 },
    { title: "Genomsnittlig säljtid", value: `${stats.avgTimeToClose.toFixed(1)} dagar`, subtitle: "Tid till avslut", trend: 0 },
  ];

  const statusDistribution = [
    { status: "Ny intresseanmälan", count: stats.newLeads },
    { status: "Kund kontaktad", count: stats.contacted },
    { status: "Vunnen", count: stats.won },
    { status: "Förlorad", count: stats.lost },
  ].filter(item => item.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">KPI & Statistik</p>
        </div>
        <Button variant="outline" className="gap-2" data-testid="button-date-filter">
          <Calendar className="w-4 h-4" />
          Alla leads
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, idx) => (
          <KpiCard key={idx} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Lead-källor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.leadsBySource}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
              <XAxis 
                dataKey="source" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Anläggningsfördelning</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.leadsByAnlaggning}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
              <XAxis 
                dataKey="anlaggning" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Statusfördelning</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
              <XAxis 
                dataKey="status" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 flex flex-col justify-center">
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-primary">{stats.totalLeads}</div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Totalt antal leads</p>
              <p className="text-xs text-muted-foreground mt-1">I systemet</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
