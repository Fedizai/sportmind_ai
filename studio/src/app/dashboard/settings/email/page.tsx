
"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { sendEmailVerification, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "@/hooks/use-translation";


export default function ChangeEmailPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const changeEmailSchema = z.object({
    newEmail: z.string().email({ message: t('invalidEmailError') }),
    password: z.string().min(1, { message: t('passwordRequiredError') }),
  });

  type ChangeEmailForm = z.infer<typeof changeEmailSchema>;

  const form = useForm<ChangeEmailForm>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: "", password: "" },
  });

  const handleUpdateEmail = async (values: ChangeEmailForm) => {
    if (!user || !user.email) {
        toast({
            variant: "destructive",
            title: t('genericError'),
            description: t('couldNotFindUserInfo'),
        });
        return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
        toast({
            variant: "destructive",
            title: t('authErrorTitle'),
            description: t('authErrorDescription'),
        });
        return;
    }

    setIsLoading(true);
    setNeedsVerification(false);

    try {
        const credential = EmailAuthProvider.credential(user.email, values.password);
        await reauthenticateWithCredential(currentUser, credential);

        await updateEmail(currentUser, values.newEmail);

        await sendEmailVerification(currentUser);

        toast({
            title: t('emailChangeInitiated'),
            description: t('emailChangeInitiatedDescription', { email: values.newEmail }),
        });
        setNeedsVerification(true);
        form.reset();

    } catch (error: any) {
        console.error("Email update error:", error);
        let description = t('unknownErrorOccurred');
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            description = t('incorrectPasswordError');
        } else if (error.code === 'auth/email-already-in-use') {
            description = t('emailInUseError');
        }
         toast({
            variant: "destructive",
            title: t('emailChangeFailed'),
            description: description,
        });
    } finally {
        setIsLoading(false);
    }
  }


  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard/settings"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToSettings')}</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{t('changeEmailAddressTitle')}</CardTitle>
          <CardDescription>
            {t('changeEmailAddressDescription')}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateEmail)}>
                <CardContent className="space-y-4">
                     {needsVerification && (
                        <Alert>
                            <AlertTitle>{t('verificationRequiredTitle')}</AlertTitle>
                            <AlertDescription>
                               {t('verificationRequiredDescription')}
                            </AlertDescription>
                        </Alert>
                     )}
                    <FormField
                        control={form.control}
                        name="newEmail"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('newEmailAddress')}</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="new.email@example.com" {...field} />
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
                                <FormLabel>{t('currentPassword')}</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Enter your current password" {...field} />
                                </FormControl>
                                <FormDescription>
                                    {t('confirmPasswordDescription')}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? t('updatingButton') : t('updateEmailAddressButton')}
                    </Button>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}
