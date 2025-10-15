import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, CheckCircle } from "lucide-react";
import logoPath from "@assets/logo2_1760052846978.webp";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Lösenord måste vara minst 6 tecken"),
  confirmPassword: z.string().min(1, "Bekräfta ditt lösenord"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Lösenorden matchar inte",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    setToken(tokenParam);
  }, []);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      if (!token) {
        throw new Error("Ingen återställningstoken hittades");
      }
      
      const response = await apiRequest("POST", "/api/reset-password", {
        token,
        newPassword: data.newPassword,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Ett fel uppstod");
      }
      return result;
    },
    onSuccess: () => {
      setResetSuccess(true);
      toast({
        title: "Lösenord återställt",
        description: "Ditt lösenord har uppdaterats",
      });
      
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Ett fel uppstod",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    setIsLoading(true);
    resetPasswordMutation.mutate(data);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <img src={logoPath} alt="Fritidscenter" className="h-16" />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Ogiltig länk</CardTitle>
              <CardDescription className="text-center">
                Återställningslänken är ogiltig eller saknas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/forgot-password">
                <Button variant="outline" className="w-full" data-testid="button-request-new">
                  Begär ny återställningslänk
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <img src={logoPath} alt="Fritidscenter" className="h-16" />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-6 h-6 text-primary" />
                Lösenord återställt
              </CardTitle>
              <CardDescription className="text-center">
                Ditt lösenord har uppdaterats. Du omdirigeras till inloggning...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full" data-testid="button-go-to-login">
                  Gå till inloggning
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <img src={logoPath} alt="Fritidscenter" className="h-16" />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Återställ lösenord</CardTitle>
            <CardDescription className="text-center">
              Ange ditt nya lösenord nedan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nytt lösenord</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="password"
                            placeholder="Minst 6 tecken"
                            className="pl-9"
                            data-testid="input-new-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bekräfta lösenord</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="password"
                            placeholder="Ange lösenordet igen"
                            className="pl-9"
                            data-testid="input-confirm-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-reset-password"
                >
                  {isLoading ? "Återställer..." : "Återställ lösenord"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline" data-testid="link-back-to-login">
                Tillbaka till inloggning
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
