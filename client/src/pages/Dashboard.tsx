import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import KpiCard from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Filter, Users, TrendingUp, Clock, Target, Eye } from "lucide-react";
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
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [anlaggningFilter, setAnlaggningFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", { 
      sellerId: sellerFilter || undefined, 
      anlaggning: anlaggningFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sellerFilter && sellerFilter !== 'all') params.append('sellerId', sellerFilter);
      if (anlaggningFilter && anlaggningFilter !== 'all') params.append('anlaggning', anlaggningFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return response.json();
    }
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
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
    { 
      title: "Totala Leads", 
      value: stats.totalLeads.toString(), 
      subtitle: "Alla leads i systemet", 
      icon: Eye
    },
    { 
      title: "Konverteringsgrad", 
      value: `${stats.winRate.toFixed(1)}%`, 
      subtitle: "Win rate", 
      icon: TrendingUp
    },
    { 
      title: "Svarstid", 
      value: `${stats.avgTimeToFirstContact.toFixed(1)}h`, 
      subtitle: "Genomsnittlig tid", 
      icon: Clock
    },
    { 
      title: "Säljtid", 
      value: `${stats.avgTimeToClose.toFixed(1)} dagar`, 
      subtitle: "Genomsnittlig tid till avslut", 
      icon: Target
    },
  ];

  const statusDistribution = [
    { status: "Ny intresseanmälan", count: stats.newLeads },
    { status: "Kund kontaktad", count: stats.contacted },
    { status: "Vunnen", count: stats.won },
    { status: "Förlorad", count: stats.lost },
  ].filter(item => item.count > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Översikt & Statistik</p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2" 
          onClick={() => setShowFilters(!showFilters)}
          data-testid="button-toggle-filters"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? "Dölj filter" : "Visa filter"}
        </Button>
      </div>

      {showFilters && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Filtrera statistik</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seller-filter">Säljare</Label>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger id="seller-filter" data-testid="select-seller-filter">
                  <SelectValue placeholder="Alla säljare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla säljare</SelectItem>
                  {users
                    .filter((u) => u.role === "SALJARE")
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anlaggning-filter">Anläggning</Label>
              <Select value={anlaggningFilter} onValueChange={setAnlaggningFilter}>
                <SelectTrigger id="anlaggning-filter" data-testid="select-anlaggning-filter">
                  <SelectValue placeholder="Alla anläggningar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla anläggningar</SelectItem>
                  <SelectItem value="Falkenberg">Falkenberg</SelectItem>
                  <SelectItem value="Göteborg">Göteborg</SelectItem>
                  <SelectItem value="Trollhättan">Trollhättan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-from">Från datum</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-to">Till datum</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, idx) => (
          <KpiCard key={idx} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Lead-källor</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.leadsBySource}>
              <defs>
                <linearGradient id="sourceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
              </defs>
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
              <Bar dataKey="count" fill="url(#sourceGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Anläggningsfördelning</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.leadsByAnlaggning}>
              <defs>
                <linearGradient id="anlaggningGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
              </defs>
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
              <Bar dataKey="count" fill="url(#anlaggningGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Statusfördelning</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusDistribution}>
              <defs>
                <linearGradient id="statusGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
              </defs>
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
              <Bar dataKey="count" fill="url(#statusGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 flex flex-col justify-center">
          <div className="text-center space-y-4">
            <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit">
              <Users className="w-12 h-12 text-primary" />
            </div>
            <div className="text-5xl font-bold text-primary">{stats.totalLeads}</div>
            <div>
              <p className="text-sm font-medium text-foreground">Totalt antal leads</p>
              <p className="text-xs text-muted-foreground mt-1">I hela systemet</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
