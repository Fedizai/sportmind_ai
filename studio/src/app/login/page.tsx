

"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

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
import { Loader2, Languages, Sun, Moon } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguageStore } from "@/stores/language-store";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error.code, error.message);
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background">
       {/* Dark theme video */}
       <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden hidden dark:block">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/loginsd.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50" />
      </div>
      {/* Light theme video */}
      <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden block dark:hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-white/30" />
      </div>


       <header className="absolute top-0 left-0 right-0 z-10 flex justify-between p-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-10 w-auto" />
           <span className="font-bold text-lg whitespace-nowrap text-foreground">
            SportMind AI
          </span>
        </Link>
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
                 className="hover:bg-foreground/10 text-foreground"
            >
                <Languages className="h-5 w-5" />
                <span className="sr-only">Change language</span>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                 className="hover:bg-foreground/10 text-foreground"
            >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        </div>
      </header>

      <div className="w-full max-w-sm space-y-6 relative z-10 bg-card/60 dark:bg-card/70 backdrop-blur-2xl p-8 rounded-3xl border border-white/[0.12] dark:border-white/[0.08] shadow-float overflow-hidden">
        {/* top edge shine */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        {/* inner corner glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent rounded-3xl" />
        <div className="text-center">
            <h1 className="text-2xl font-headline">{t('welcomeBack')}</h1>
            <p className="text-muted-foreground">{t('signInPrompt')}</p>
        </div>
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('passwordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('loggingIn')}...
                </>
              ) : (
                t('login')
              )}
            </Button>
          </form>
        </Form>
        <div className="text-center text-sm">
          <Link href="/forgot-password" className="text-primary underline">
            {t('forgotPassword')}
          </Link>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          {t('noAccount')}{" "}
          <Link href="/#pricing" className="underline text-primary">
            {t('createAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
}
