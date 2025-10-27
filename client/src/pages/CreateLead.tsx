import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { insertLeadSchema } from "@shared/schema";

const createLeadFormSchema = insertLeadSchema.extend({
  contactEmail: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().email("Ogiltig e-postadress").optional()
  ),
  contactPhone: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  vehicleLink: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().url("Ogiltig URL").optional()
  ),
  message: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
});

type CreateLeadFormData = z.infer<typeof createLeadFormSchema>;

export default function CreateLead() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<CreateLeadFormData>({
    resolver: zodResolver(createLeadFormSchema),
    defaultValues: {
      source: "HEMSIDA",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      vehicleTitle: "",
      vehicleLink: "",
      listingId: "",
      message: "",
      anlaggning: undefined,
      status: "NY_INTRESSEANMALAN",
      assignedToId: undefined,
      isDeleted: false,
      rawPayload: null,
      inquiryDateTime: undefined,
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: CreateLeadFormData) => {
      const response = await apiRequest("POST", "/api/leads", data);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Kunde inte skapa lead");
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead skapad",
        description: "Leaden har skapats framgångsrikt",
      });
      setLocation(`/leads/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte skapa lead",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateLeadFormData) => {
    createLeadMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/leads")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-create-lead-title">Skapa ny lead</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-create-lead-subtitle">Fyll i formuläret för att skapa en ny lead</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-card-title">Lead-information</CardTitle>
          <CardDescription data-testid="text-card-description">Ange detaljerna för den nya leaden</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Källa</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-source">
                            <SelectValue placeholder="Välj källa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HEMSIDA">Hemsida</SelectItem>
                          <SelectItem value="BYTBIL">Bytbil</SelectItem>
                          <SelectItem value="BLOCKET">Blocket</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="anlaggning"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anläggning</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-anlaggning">
                            <SelectValue placeholder="Välj anläggning" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Falkenberg">Falkenberg</SelectItem>
                          <SelectItem value="Göteborg">Göteborg</SelectItem>
                          <SelectItem value="Trollhättan">Trollhättan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground" data-testid="text-section-contact">Kontaktinformation</h3>
                
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kontaktnamn *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Namn på kontaktperson"
                          {...field}
                          data-testid="input-contact-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-post</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="exempel@email.com"
                            {...field}
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
                        <FormLabel>Telefonnummer</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="070-123 45 67"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-contact-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground" data-testid="text-section-vehicle">Fordonsinformation</h3>
                
                <FormField
                  control={form.control}
                  name="vehicleTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fordonstitel *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="T.ex. BMW X5 2024"
                          {...field}
                          data-testid="input-vehicle-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="vehicleLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fordonslänk</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://..."
                            {...field}
                            value={field.value || ""}
                            data-testid="input-vehicle-link"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="listingId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annons-ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ID från Bytbil/Blocket"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-listing-id"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meddelande</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ytterligare information om förfrågan..."
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/leads")}
                  data-testid="button-cancel"
                >
                  Avbryt
                </Button>
                <Button
                  type="submit"
                  disabled={createLeadMutation.isPending}
                  className="gap-2"
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4" />
                  {createLeadMutation.isPending ? "Sparar..." : "Skapa lead"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
