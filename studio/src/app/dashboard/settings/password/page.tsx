
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Send } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTranslation } from "@/hooks/use-translation";

export default function ChangePasswordPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetEmail = async () => {
    if (!user?.email) {
        toast({
            variant: "destructive",
            title: t('genericError'),
            description: t('noEmailFoundError'),
        });
        return;
    }
    setIsLoading(true);
    try {
        await sendPasswordResetEmail(auth, user.email);
        toast({
            title: t('passwordResetEmailSent'),
            description: t('passwordResetEmailSentDescription', { email: user.email }),
        });
        setEmailSent(true);
    } catch (error) {
        console.error("Password reset error:", error);
        toast({
            variant: "destructive",
            title: t('genericError'),
            description: t('passwordResetEmailError'),
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
          <CardTitle>{t('changePassword')}</CardTitle>
          <CardDescription>
            {t('changePasswordCardDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
            {emailSent ? (
                <div className="text-center p-8 bg-muted rounded-lg">
                    <p className="font-semibold">{t('resetLinkSent')}</p>
                    <p className="text-sm text-muted-foreground">{t('checkEmailToContinue')}</p>
                </div>
            ) : (
                 <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium">{t('yourRegisteredEmail')}</p>
                    <p className="text-lg font-semibold text-primary">{user?.email}</p>
                </div>
            )}
        </CardContent>
        <CardFooter>
            <Button onClick={handleSendResetEmail} disabled={isLoading || emailSent}>
                <Send className="mr-2 h-4 w-4" />
                {emailSent ? t('resetLinkSentButton') : isLoading ? t('sendingButton') : t('sendPasswordResetLink')}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    