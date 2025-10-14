import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, BarChart3, Mail, Users } from "lucide-react";
import logoPath from "@assets/logo2_1760052846978.webp";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      
      <div className="relative">
        <header className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoPath} alt="Fritidscenter" className="h-24 w-auto" />
          </div>
          <Button 
            asChild 
            data-testid="button-login"
          >
            <a href="/api/login">Logga in</a>
          </Button>
        </header>

        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight">
                Uppföljning av intresseanmälningar
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Automatiserad leadhantering från Bytbil och Blocket med intelligent fördelning och komplett CRM-workflow
              </p>
            </div>

            <div className="flex justify-center gap-4">
              <Button 
                size="lg" 
                asChild
                data-testid="button-get-started"
              >
                <a href="/register">Kom igång</a>
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-16">
              <Card className="text-left">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>Automatisk E-postinläsning</CardTitle>
                  </div>
                  <CardDescription>
                    Importerar leads automatiskt från Bytbil och Blocket via IMAP med intelligent parsning
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="text-left">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>Round-Robin Fördelning</CardTitle>
                  </div>
                  <CardDescription>
                    Rättvis automatisk fördelning per anläggning (Falkenberg, Göteborg, Trollhättan) eller med aktivering via manager
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="text-left">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>CRM Workflow</CardTitle>
                  </div>
                  <CardDescription>
                    Komplett statushantering från ny intresseanmälan till vunnen/förlorad med kommentarer och uppgifter
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="text-left">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>Analytics Dashboard</CardTitle>
                  </div>
                  <CardDescription>
                    Visualisering av win-rate, genomsnittlig kontakttid och leadfördelning per anläggning
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </main>

        <footer className="container mx-auto px-4 py-8 mt-16 border-t text-center text-sm text-muted-foreground">
          <p>© 2025 Fritidscenter. Alla rättigheter förbehållna.</p>
        </footer>
      </div>
    </div>
  );
}
