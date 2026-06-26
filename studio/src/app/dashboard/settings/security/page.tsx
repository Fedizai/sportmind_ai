
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Phone, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/use-translation";

function AddPhoneNumberDialog({ open, onOpenChange, onPhoneNumberAdded }: { open: boolean, onOpenChange: (open: boolean) => void, onPhoneNumberAdded: (number: string) => void }) {
    const [step, setStep] = useState<'enterNumber' | 'enterCode'>('enterNumber');
    const [inputPhoneNumber, setInputPhoneNumber] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
    const { toast } = useToast();
    const { t } = useTranslation();

    useEffect(() => {
        if (open && step === 'enterNumber' && !recaptchaVerifierRef.current) {
            if (recaptchaContainerRef.current) {
                const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                    'size': 'invisible',
                    'callback': () => {
                        // reCAPTCHA solved, allow signInWithPhoneNumber.
                    },
                });
                recaptchaVerifierRef.current = verifier;
            }
        }
    }, [open, step]);


    const handleSendVerificationCode = async () => {
        if (!inputPhoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
            toast({
                variant: "destructive",
                title: t('invalidPhoneNumberTitle'),
                description: t('invalidPhoneNumberDescription')
            });
            return;
        }

        const appVerifier = recaptchaVerifierRef.current;
        if (!appVerifier) {
             toast({ variant: 'destructive', title: t('genericError'), description: t('recaptchaError') });
             return;
        }

        setIsLoading(true);

        try {
            const result = await signInWithPhoneNumber(auth, inputPhoneNumber, appVerifier);
            setConfirmationResult(result);
            setStep('enterCode');
            toast({ title: t('verificationCodeSent'), description: t('verificationCodeSentDescription', { number: inputPhoneNumber }) });
        } catch(error) {
            console.error("SMS Error:", error);
            recaptchaVerifierRef.current?.clear();
            toast({ variant: "destructive", title: t('smsErrorTitle'), description: t('smsErrorDescription') });
        } finally {
            setIsLoading(false);
        }
    }

    const handleConfirmVerificationCode = async () => {
        if (!confirmationResult || !verificationCode) return;
        setIsLoading(true);
        try {
            await confirmationResult.confirm(verificationCode);
            onPhoneNumberAdded(inputPhoneNumber);
            toast({ title: t('phoneVerifiedTitle'), description: t('phoneVerifiedDescription') });
            onOpenChange(false);
        } catch (error) {
            console.error("Confirmation Error:", error);
            toast({ variant: "destructive", title: t('invalidCodeTitle'), description: t('invalidCodeDescription') });
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          recaptchaVerifierRef.current?.clear();
          recaptchaVerifierRef.current = null;
        }
      }}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
            <AnimatePresence mode="wait">
            {step === 'enterNumber' ? (
                <motion.div
                    key="enterNumber"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                >
                    <DialogHeader>
                        <DialogTitle>{t('addPhoneNumberDialogTitle')}</DialogTitle>
                        <DialogDescription>{t('addPhoneNumberDialogDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Input
                            placeholder="+14155552671"
                            value={inputPhoneNumber}
                            onChange={(e) => setInputPhoneNumber(e.target.value)}
                        />
                         <div ref={recaptchaContainerRef}></div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSendVerificationCode} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            {t('sendCode')}
                        </Button>
                    </DialogFooter>
                </motion.div>
            ) : (
                <motion.div
                    key="enterCode"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                >
                    <DialogHeader>
                        <DialogTitle>{t('enterVerificationCodeTitle')}</DialogTitle>
                        <DialogDescription>{t('enterVerificationCodeDescription', { number: inputPhoneNumber })}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="123456"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="link" onClick={() => setStep('enterNumber')}>{t('back')}</Button>
                        <Button onClick={handleConfirmVerificationCode} disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            {t('verifyButton')}
                        </Button>
                    </DialogFooter>
                </motion.div>
            )}
            </AnimatePresence>
        </DialogContent>
      </Dialog>
    )
}


export default function SecurityPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handlePhoneNumberAdded = (number: string) => {
      setPhoneNumber(number);
      setIs2faEnabled(true);
      setIsDialogOpen(false);
  }

  const handle2faToggle = (enabled: boolean) => {
    if (enabled && !phoneNumber) {
        setIsDialogOpen(true);
        return;
    }
    setIs2faEnabled(enabled);
    toast({
        title: t('twoFactorAuth'),
        description: enabled ? t('twoFactorEnabled') : t('twoFactorDisabled')
    });
  }

  const handleRemoveNumber = () => {
    setIsRemoving(true);
    setTimeout(() => {
        setPhoneNumber(null);
        setIs2faEnabled(false);
        setIsRemoving(false);
        toast({ title: t('phoneNumberRemoved') });
    }, 1000);
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard/settings"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToSettings')}</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{t('securityTitle')}</CardTitle>
          <CardDescription>
            {t('securityDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <Label htmlFor="2fa" className="text-base">{t('twoFactorAuth')}</Label>
                    <p className="text-xs text-muted-foreground">{t('twoFactorAuthDescription')}</p>
                </div>
                <Switch id="2fa" checked={is2faEnabled} onCheckedChange={handle2faToggle}/>
            </div>

            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" /> {t('smsValidation')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {phoneNumber ? (
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">{t('verifiedNumber')} <span className="text-foreground">{phoneNumber}</span></p>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isRemoving}>
                                        {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        {t('removeLabel')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('removePhoneNumberTitle')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('removePhoneNumberDescription')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleRemoveNumber}>{t('confirmLabel')}</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <p className="text-sm text-muted-foreground">{t('addPhoneNumberPrompt')}</p>
                              <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>{t('addPhoneNumberButton')}</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </CardContent>
      </Card>
       <AddPhoneNumberDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onPhoneNumberAdded={handlePhoneNumberAdded} />
    </div>
  );
}
