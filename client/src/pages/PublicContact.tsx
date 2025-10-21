import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { publicContactSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";
import logoPath from "@assets/logo2_1760052846978.webp";

type PublicContactFormData = z.infer<typeof publicContactSchema>;

export default function PublicContact() {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<PublicContactFormData>({
    resolver: zodResolver(publicContactSchema),
    defaultValues: {
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      vehicleTitle: "",
      message: "",
      anlaggning: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PublicContactFormData) => {
      return apiRequest("POST", "/api/public/contact", data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Intresseanmälan skickad!",
        description: "Vi kommer att kontakta dig inom kort.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Ett fel uppstod",
        description: error.message || "Försök igen senare",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PublicContactFormData) => {
    mutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Tack för din intresseanmälan!</CardTitle>
            <CardDescription>
              Vi har tagit emot din förfrågan och kommer att kontakta dig inom kort.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => setIsSubmitted(false)}
              variant="outline"
              className="w-full"
              data-testid="button-new-inquiry"
            >
              Skicka en till intresseanmälan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            variant="outline"
            data-testid="button-home"
          >
            <a href="/">Tillbaka</a>
          </Button>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-3">
                Intresseanmälan
              </h1>
              <p className="text-lg text-muted-foreground">
                Fyll i formuläret nedan så kontaktar vi dig inom kort
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Kontaktuppgifter</CardTitle>
                <CardDescription>
                  Fyll i dina uppgifter så återkommer vi till dig
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Namn *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ditt namn"
                              data-testid="input-contact-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-postadress</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="din@email.se"
                              value={field.value || ""}
                              data-testid="input-contact-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefonnummer *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="070-123 45 67"
                              data-testid="input-contact-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fordon *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="T.ex. Kabe Royal 560"
                              data-testid="input-vehicle-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="anlaggning"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Välj anläggning *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-anlaggning">
                                <SelectValue placeholder="Välj anläggning" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Falkenberg" data-testid="option-falkenberg">
                                Falkenberg
                              </SelectItem>
                              <SelectItem value="Göteborg" data-testid="option-goteborg">
                                Göteborg
                              </SelectItem>
                              <SelectItem value="Trollhättan" data-testid="option-trollhattan">
                                Trollhättan
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meddelande</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Berätta mer om ditt intresse..."
                              rows={4}
                              value={field.value || ""}
                              data-testid="input-message"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={mutation.isPending}
                      data-testid="button-submit"
                    >
                      {mutation.isPending ? "Skickar..." : "Skicka intresseanmälan"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </main>

        <footer className="container mx-auto px-4 py-8 mt-16 border-t text-center text-sm text-muted-foreground">
          <p>© 2025 Fritidscenter. Alla rättigheter förbehållna.</p>
        </footer>
      </div>
    </div>
  );
}
