

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bell, Palette, Database, CreditCard, Mail, Loader2, Shield, Camera, Upload, Download } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { updateAccountSettings, updateNotifications, updatePreferences, updatePrivacy, exportUserData, importUserData, deleteUserAccount } from './actions';
import { useTheme } from "next-themes";
import { useTranslation } from "@/hooks/use-translation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";

const settingsSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    theme: z.enum(["light", "dark", "system"]),
    units: z.enum(["metric", "imperial"]),
    emailNotifications: z.boolean(),
    trainingReminders: z.boolean(),
    shareDataWithCoach: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, isLoading: isUserLoading } = useUser();
    const { setTheme } = useTheme();
    const { t } = useTranslation();

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            fullName: "",
            theme: "dark",
            units: "metric",
            emailNotifications: true,
            trainingReminders: true,
            shareDataWithCoach: true,
        },
    });

    useEffect(() => {
        if (user) {
            form.reset({
                fullName: user.displayName || "",
                theme: user.preferences?.theme || "dark",
                units: user.preferences?.units || "metric",
                emailNotifications: user.notifications?.emailNotifications ?? true,
                trainingReminders: user.notifications?.trainingReminders ?? true,
                shareDataWithCoach: user.privacy?.shareDataWithCoach ?? true,
            });
        }
    }, [user, form]);
    
    const { isSubmitting, isDirty } = form.formState;

    const onSubmit = async (data: SettingsFormValues) => {
        if (!user) return;

        toast({ title: t('saving'), description: t('savingSettingsDescription') });

        try {
            await Promise.all([
                updateAccountSettings(user.uid, { fullName: data.fullName }),
                updatePreferences(user.uid, { theme: data.theme, units: data.units }),
                updateNotifications(user.uid, { emailNotifications: data.emailNotifications, trainingReminders: data.trainingReminders }),
                updatePrivacy(user.uid, { shareDataWithCoach: data.shareDataWithCoach }),
            ]);

            setTheme(data.theme);

            toast({
                title: t('settingsSaved'),
                description: t('settingsSavedDescription'),
            });
             form.reset(data); // Resets the dirty state
        } catch (error) {
            toast({
                title: t('genericError'),
                description: t('settingsSaveError'),
                variant: "destructive",
            });
        }
    };

    const handleActionClick = async (action: () => Promise<any>) => {
        try {
            const result = await action();
            toast({
                title: t('genericSuccess'),
                description: result.message,
            });
        } catch (error: any) {
             toast({
                title: t('genericError'),
                description: error.message || t('unexpectedError'),
                variant: "destructive",
            });
        }
    };

    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith('image/')) {
            toast({ variant: 'destructive', title: t('genericError'), description: t('invalidImageFile') });
            return;
        }

        setIsUploadingPhoto(true);
        try {
            const storagePath = `profilePictures/${user.uid}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            await updateDoc(doc(db, 'users', user.uid), { photoUrl: downloadURL });
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: downloadURL });
            }

            toast({ title: t('genericSuccess'), description: t('photoUpdated') });
        } catch (error: any) {
            toast({ variant: 'destructive', title: t('genericError'), description: error.message || t('photoUpdateError') });
        } finally {
            setIsUploadingPhoto(false);
            if (photoInputRef.current) photoInputRef.current.value = '';
        }
    };

    const handleExportData = async () => {
        if (!user) return;
        try {
            const result = await exportUserData(user.uid);
            if (result.success && result.data) {
                const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `sportmind-data-${user.uid}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            toast({
                title: result.success ? t('genericSuccess') : t('genericError'),
                description: result.message,
                variant: result.success ? "default" : "destructive",
            });
        } catch (error: any) {
            toast({ title: t('genericError'), description: error.message || t('unexpectedError'), variant: "destructive" });
        }
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsImporting(true);
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const result = await importUserData(user.uid, parsed);
            toast({
                title: result.success ? t('genericSuccess') : t('genericError'),
                description: result.message,
                variant: result.success ? "default" : "destructive",
            });
        } catch (error: any) {
            toast({ title: t('genericError'), description: error.message || t('unexpectedError'), variant: "destructive" });
        } finally {
            setIsImporting(false);
            if (importInputRef.current) importInputRef.current.value = '';
        }
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">{t('settings')}</h1>
                    <p className="text-muted-foreground">{t('settingsDescription')}</p>
                </div>
                
                {isUserLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : (
                <div className="space-y-8">
                    {/* Account Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> {t('accountSettings')}</CardTitle>
                            <CardDescription>{t('accountSettingsDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>{t('profilePicture')}</Label>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={user?.photoUrl || undefined} alt={user?.displayName || 'User'} />
                                        <AvatarFallback className="text-xl">{user?.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                                    <Button type="button" variant="outline" size="sm" disabled={isUploadingPhoto} onClick={() => photoInputRef.current?.click()}>
                                        {isUploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                                        {t('changePhoto')}
                                    </Button>
                                </div>
                            </div>
                            <Separator />
                            <FormField control={form.control} name="fullName" render={({ field }) => (
                                <FormItem><FormLabel>{t('fullName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <Separator />
                            <div className="space-y-2">
                                <Label>{t('email')}</Label>
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                    <p className="text-muted-foreground text-sm">{user?.email}</p>
                                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => router.push('/dashboard/settings/email')}>{t('changeEmail')}</Button>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <Label>{t('password')}</Label>
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                    <p className="text-muted-foreground text-sm">**********</p>
                                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => router.push('/dashboard/settings/password')}>{t('changePassword')}</Button>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <Label>{t('twoFactorAuth')}</Label>
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                    <p className="text-muted-foreground text-sm">{t('twoFactorAuthDescription')}</p>
                                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => router.push('/dashboard/settings/security')}>{t('manageSecurity')}</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* App Preferences */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> {t('appPreferences')}</CardTitle>
                            <CardDescription>{t('appPreferencesDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="theme" render={({ field }) => (
                                    <FormItem><FormLabel>{t('theme')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="dark">{t('themeDark')}</SelectItem><SelectItem value="light">{t('themeLight')}</SelectItem><SelectItem value="system">{t('themeSystem')}</SelectItem></SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="units" render={({ field }) => (
                                    <FormItem><FormLabel>{t('measurementUnits')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="metric">{t('unitsMetric')}</SelectItem><SelectItem value="imperial">{t('unitsImperial')}</SelectItem></SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notification & Privacy Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> {t('notificationsPrivacy')}</CardTitle>
                            <CardDescription>{t('notificationsPrivacyDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="emailNotifications" render={({ field }) => (
                                <FormItem className="flex items-center justify-between"><div><FormLabel>{t('emailNotifications')}</FormLabel><FormDescription className="text-xs">{t('emailNotificationsDescription')}</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                            )}/>
                            <Separator />
                            <FormField control={form.control} name="trainingReminders" render={({ field }) => (
                                <FormItem className="flex items-center justify-between"><div><FormLabel>{t('trainingRemindersLabel')}</FormLabel><FormDescription className="text-xs">{t('trainingRemindersDescription')}</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                            )}/>
                             <Separator />
                             <FormField control={form.control} name="shareDataWithCoach" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/[0.09] bg-white/[0.02] p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel>{t('shareDataWithCoachLabel')}</FormLabel>
                                    <FormDescription className="text-xs">{t('shareDataWithCoachDescription')}</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}/>
                        </CardContent>
                    </Card>
                    
                    {/* Data Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> {t('dataManagement')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <Label>{t('exportAllData')}</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t('exportAllDataDescription')}</p>
                                </div>
                                <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={handleExportData}>
                                    <Download className="mr-2 h-4 w-4" />{t('exportJson')}
                                </Button>
                            </div>
                            <Separator />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <Label>{t('importAllData')}</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t('importAllDataDescription')}</p>
                                </div>
                                <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
                                <Button type="button" variant="secondary" size="sm" className="shrink-0" disabled={isImporting} onClick={() => importInputRef.current?.click()}>
                                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{t('importJson')}
                                </Button>
                            </div>
                            <Separator />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <Label className="text-destructive">{t('deleteAccountLabel')}</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t('deleteAccountDescription')}</p>
                                </div>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive" size="sm" className="shrink-0">{t('deleteAccountLabel')}</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                                            <AlertDialogDescription>{t('deleteAccountConfirm')}</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleActionClick(() => deleteUserAccount(user!.uid))}>
                                                {t('continueLabel')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Billing & Subscription */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> {t('billingSubscription')}</CardTitle>
                            <CardDescription>{t('billingSubscriptionDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col md:flex-row justify-between md:items-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                                <div>
                                    <p className="font-semibold">{t('currentPlanLabel')} <span className="text-primary capitalize">{user?.role}</span></p>
                                    <p className="text-xs text-muted-foreground">{t('billingManagedVia')}</p>
                                </div>
                                <Button type="button" variant="default" className="mt-2 md:mt-0" onClick={() => router.push('/dashboard/settings/subscription')}>{t('manageSubscription')}</Button>
                            </div>
                        </CardContent>
                    </Card>

                     <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('saveAllChanges')}
                        </Button>
                    </div>
                </div>
                )}
            </form>
        </FormProvider>
    );
}
