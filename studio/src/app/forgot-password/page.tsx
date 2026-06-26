"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordForm) {
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: "Password Reset Email Sent",
        description: "If an account with that email exists, a reset link has been sent.",
      });
      setEmailSent(true);
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Error Sending Email",
        description: "We could not send a password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_40%_at_50%_-10%,rgba(59,130,246,0.07)_0%,transparent_65%)]" />
      <header className="absolute top-0 left-0 right-0 p-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-10 w-auto" />
          <span className="font-bold text-lg whitespace-nowrap">SportMind AI</span>
        </Link>
      </header>
      <div className="w-full max-w-sm space-y-6 relative z-10 bg-card/60 dark:bg-card/70 backdrop-blur-2xl p-8 rounded-3xl border border-white/[0.12] dark:border-white/[0.08] shadow-float overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent rounded-3xl" />
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-headline">{t('forgotPasswordPageTitle')}</h1>
          <p className="text-muted-foreground">{t('forgotPasswordPageDescription')}</p>
        </div>
        <div>
          {emailSent ? (
            <div className="text-center p-4 bg-primary/10 rounded-xl border border-primary/20">
              <p>{t('checkEmailForReset')}</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('emailPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? t('sendingLink') : t('sendResetLink')}
                </Button>
              </form>
            </Form>
          )}
          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="underline text-primary">
              {t('backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
