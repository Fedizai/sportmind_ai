
"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from "@/components/ui/form";
import { Settings, User, Bell, Camera, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";

const settingsFormSchema = z.object({
  displayName: z.string().min(2, "Required"),
  teamName: z.string().optional(),
  bio: z.string().optional(),
  newPlayerJoined: z.boolean(),
  sessionReminders: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function CoachSettingsPage() {
  const { t } = useTranslation();
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: { displayName: "", teamName: "", bio: "", newPlayerJoined: true, sessionReminders: true },
  });

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      const data = docSnap.data();
      form.reset({
        displayName: data?.displayName || user.displayName || "",
        teamName: data?.teamName || "",
        bio: data?.bio || "",
        newPlayerJoined: data?.coachNotifications?.newPlayerJoined ?? true,
        sessionReminders: data?.coachNotifications?.sessionReminders ?? true,
      });
    });
    return () => unsubscribe();
  }, [user?.uid, form]);

  const { isSubmitting, isDirty } = form.formState;

  const onSubmit = async (values: SettingsFormValues) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: values.displayName,
        teamName: values.teamName || "",
        bio: values.bio || "",
        coachNotifications: {
          newPlayerJoined: values.newPlayerJoined,
          sessionReminders: values.sessionReminders,
        },
      });
      if (auth.currentUser && auth.currentUser.displayName !== values.displayName) {
        await updateProfile(auth.currentUser, { displayName: values.displayName });
      }
      toast({ title: t("genericSuccess"), description: t("settingsSavedDescription") });
      form.reset(values);
    } catch (err) {
      console.error("Error saving coach settings:", err);
      toast({ variant: "destructive", title: t("genericError"), description: t("settingsSaveError") });
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: t("genericError"), description: t("invalidImageFile") });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const storagePath = `profilePictures/${user.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", user.uid), { photoUrl: downloadURL });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL });
      }

      toast({ title: t("genericSuccess"), description: t("photoUpdated") });
    } catch (err: any) {
      toast({ variant: "destructive", title: t("genericError"), description: err.message || t("photoUpdateError") });
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          {t("coachSettings")}
        </h1>
        <p className="text-muted-foreground">{t("coachSettingsDescription")}</p>
      </div>

      {isUserLoading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> {t("profileAndTeamConfig")}
                </CardTitle>
                <CardDescription>{t("profileAndTeamConfigDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <FormLabel>{t("profilePicture")}</FormLabel>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user?.photoUrl || undefined} alt={user?.displayName || "Coach"} />
                      <AvatarFallback className="text-xl">{user?.displayName?.charAt(0).toUpperCase() || "C"}</AvatarFallback>
                    </Avatar>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                    <Button type="button" variant="outline" size="sm" disabled={isUploadingPhoto} onClick={() => photoInputRef.current?.click()}>
                      {isUploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                      {t("changePhoto")}
                    </Button>
                  </div>
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fullName")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("teamName")}</FormLabel>
                      <FormDescription>{t("teamNameDescription")}</FormDescription>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("bio")}</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder={t("bioPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="space-y-2">
                  <FormLabel>{t("email")}</FormLabel>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" /> {t("coachNotificationsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPlayerJoined"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/[0.09] bg-white/[0.02] p-4">
                      <div className="space-y-0.5">
                        <FormLabel>{t("newPlayerJoinedLabel")}</FormLabel>
                        <FormDescription className="text-xs">{t("newPlayerJoinedDescription")}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sessionReminders"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/[0.09] bg-white/[0.02] p-4">
                      <div className="space-y-0.5">
                        <FormLabel>{t("sessionRemindersLabel")}</FormLabel>
                        <FormDescription className="text-xs">{t("sessionRemindersDescription")}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("saveAllChanges")}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
