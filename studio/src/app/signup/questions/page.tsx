
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Shield, Trophy, X as CloseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { useTheme } from "next-themes";
import { Languages, Sun, Moon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter, type NextRouter } from 'next/navigation';
import { Slider } from "@/components/ui/slider";
import { useUser, UserProvider } from "@/hooks/use-user";
import Link from 'next/link';

const SPORTS = [
  { id: "tennis", labelKey: "tennis", icon: Trophy },
  { id: "football", labelKey: "football", icon: Shield },
  { id: "gym", labelKey: "gym", icon: Dumbbell },
] as const;

type Sport = (typeof SPORTS)[number]["id"];

type Answers = {
  sports: { selected: Sport[] };
  tennis?: {
    level?: string;
    coach?: boolean;
    sessionsPerWeek?: number;
    bestQuality?: string;
    goal?: string;
  };
  football?: {
    position?: string;
    inTeam?: boolean;
    trainingsPerWeek?: number;
    bestQuality?: string;
    goal?: string;
  };
  gym?: { 
    age?: number; 
    height_cm?: number; 
    weight_kg?: number; 
    sessionsPerWeek?: number;
    goal?: string; 
  };
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div className="mt-1 text-xs text-destructive" aria-live="polite">{msg}</div>;
}

// Moved the main logic to a child component to properly receive the router instance
function OnboardingForm({ router }: { router: NextRouter }) {
  const { t, language, setLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';

  const [answers, setAnswers] = useState<Answers>({ sports: { selected: [] } });
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tempId, setTempId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem('onboardingTempId');
    if (!id) {
      id = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('onboardingTempId', id);
    }
    setTempId(id);

    const draft = localStorage.getItem(`onboardingDraft_${id}`);
    if (draft) {
      setAnswers(JSON.parse(draft));
    }
  }, []);

  const steps = useMemo(() => {
    const base = [{ id: "select", titleKey: "selectSports" }];
    if (answers.sports.selected.includes("tennis")) base.push({ id: "tennis", titleKey: "tennisProfile" });
    if (answers.sports.selected.includes("football")) base.push({ id: "football", titleKey: "footballProfile" });
    if (answers.sports.selected.includes("gym")) base.push({ id: "gym", titleKey: "gymProfile" });
    base.push({ id: "summary", titleKey: "summary" });
    return base;
  }, [answers.sports.selected]);

  const progress = Math.round(((index + 1) / (steps.length + 1)) * 100);

  const setAnswer = (path: string, value: any) => {
    setAnswers((prev) => {
      const clone: any = structuredClone(prev);
      const keys = path.split(".");
      let cur = clone;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        cur[k] = cur[k] ?? {};
        cur = cur[k];
      }
      cur[keys[keys.length - 1]] = value;
      
      if (tempId) {
        localStorage.setItem(`onboardingDraft_${tempId}`, JSON.stringify(clone));
      }

      return clone;
    });
  };

  const validateStep = (stepId: string): boolean => {
    if (isAdmin) return true;

    const errs: Record<string, string> = {};
    if (stepId === "select") {
      if (answers.sports.selected.length === 0) errs["sports.selected"] = t('errorSelectSport');
    }
    if (stepId === "tennis") {
      const tData = answers.tennis ?? {};
      if (!tData.level) errs.level = t('errorLevelRequired');
      if (tData.coach === undefined) errs.coach = t('errorSelectCoaching');
      if (tData.sessionsPerWeek === undefined) errs.sessionsPerWeek = t('errorSessionsPerWeek');
      if (!tData.bestQuality) errs.bestQuality = t('errorBestQuality');
      if (!tData.goal) errs.goal = t('errorSetGoal');
    }
    if (stepId === "football") {
        const fData = answers.football ?? {};
        if (!fData.position) errs.position = t('errorPositionRequired');
        if (fData.inTeam === undefined) errs.inTeam = t('errorSelectTeam');
        if (fData.trainingsPerWeek === undefined) errs.trainingsPerWeek = t('errorTrainingsPerWeek');
        if (!fData.bestQuality) errs.bestQuality = t('errorBestQuality');
        if (!fData.goal) errs.goal = t('errorSetGoal');
    }
    if (stepId === "gym") {
        const gData = answers.gym ?? {};
        if (!gData.age || gData.age < 13 || gData.age > 80) errs.age = t('errorAge');
        if (!gData.height_cm || gData.height_cm < 120 || gData.height_cm > 230) errs.height_cm = "Please enter a height between 120 and 230 cm.";
        if (!gData.weight_kg || gData.weight_kg < 30 || gData.weight_kg > 200) errs.weight_kg = "Please enter a weight between 30 and 200 kg.";
        if (gData.sessionsPerWeek === undefined) errs.sessionsPerWeek = t('errorSessionsPerWeek');
        if (!gData.goal) errs.goal = t('errorSetGoal');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(steps[index].id)) {
      setIndex(i => Math.min(i + 1, steps.length - 1));
    }
  };

  const handleBack = () => setIndex(i => Math.max(i - 1, 0));

  const saveData = async () => {
    if (tempId) {
      await setDoc(doc(db, "onboardingResponses", tempId), answers, { merge: true });
      if (!isAdmin) { 
        localStorage.removeItem(`onboardingDraft_${tempId}`);
        localStorage.removeItem('onboardingTempId');
      }
      console.log("Onboarding data saved:", answers);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allStepsValid = isAdmin || steps.every(step => step.id === 'summary' || validateStep(step.id));

    if (allStepsValid) {
        await saveData();
        router.push('/dashboard');
    } else {
        const firstInvalidStep = steps.find(step => !validateStep(step.id));
        if (firstInvalidStep) {
            setIndex(steps.indexOf(firstInvalidStep));
        }
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="text-foreground hover:bg-accent"><Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" /><Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" /></Button>
        <Button variant="ghost" size="icon" onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')} className="text-foreground hover:bg-accent"><Languages className="h-5 w-5" /></Button>
        {isAdmin && <Button variant="ghost" size="icon" asChild><Link href="/dashboard"><CloseIcon className="h-5 w-5" /></Link></Button>}
      </div>
      <Card className="w-full max-w-3xl bg-card border-border overflow-hidden">
        <CardHeader className="p-4 border-b">
          <Progress value={progress} className="h-2 bg-secondary [&>div]:bg-primary" />
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <h2 className="text-2xl font-bold font-headline mb-6">{t(steps[index].titleKey as any)}</h2>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="min-h-[350px]"
            >
              {steps[index].id === "select" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {SPORTS.map((sport) => {
                        const isSelected = answers.sports.selected.includes(sport.id);
                        return (
                        <div key={sport.id} onClick={() => {
                            const current = answers.sports.selected;
                            const newSelection = isSelected ? current.filter(s => s !== sport.id) : [...current, sport.id];
                            setAnswer("sports.selected", newSelection);
                        }} className={cn("p-4 rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2", isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50")}>
                           <sport.icon className="h-8 w-8" />
                            <span className="font-medium">{t(sport.labelKey as any)}</span>
                        </div>
                        );
                    })}
                    </div>
                    <FieldError msg={errors["sports.selected"]} />
                </div>
              )}
              {steps[index].id === "tennis" && (
                <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="level">{t('tennisLevel')}</Label>
                            <Select onValueChange={(v) => setAnswer("tennis.level", v)} defaultValue={answers.tennis?.level}>
                                <SelectTrigger id="level" className="bg-background border-border"><SelectValue placeholder={t('select')} /></SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground"><SelectItem value="Beginner">Beginner</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Advanced">Advanced</SelectItem><SelectItem value="Competitive">{t('competitive')}</SelectItem></SelectContent>
                            </Select>
                            <FieldError msg={errors.level} />
                        </div>
                         <div>
                            <Label>{t('hasCoach')}</Label>
                            <RadioGroup onValueChange={(v) => setAnswer("tennis.coach", v === "true")} defaultValue={String(answers.tennis?.coach)} className="flex items-center space-x-4 pt-2">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="t-coach-yes" /><Label htmlFor="t-coach-yes">{t('yes')}</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="t-coach-no" /><Label htmlFor="t-coach-no">{t('no')}</Label></div>
                            </RadioGroup>
                            <FieldError msg={errors.coach} />
                        </div>
                        <div>
                            <Label htmlFor="sessionsPerWeek">{t('sessionsPerWeek')}</Label>
                            <div className="flex items-center gap-4 mt-2">
                                <Slider id="sessionsPerWeek" min={0} max={7} step={1} value={[answers.tennis?.sessionsPerWeek ?? 0]} onValueChange={v => setAnswer("tennis.sessionsPerWeek", v[0])} />
                                <span className="text-sm font-semibold bg-muted text-muted-foreground rounded-md px-3 py-1 w-12 text-center">{answers.tennis?.sessionsPerWeek ?? 0}</span>
                            </div>
                            <FieldError msg={errors.sessionsPerWeek}/>
                        </div>
                        <div>
                            <Label htmlFor="bestQuality">{t('bestQuality')}</Label>
                             <Select onValueChange={(v) => setAnswer("tennis.bestQuality", v)} defaultValue={answers.tennis?.bestQuality}>
                                <SelectTrigger id="bestQuality" className="bg-background border-border"><SelectValue placeholder={t('select')} /></SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground"><SelectItem value="Consistency">{t('consistency')}</SelectItem><SelectItem value="Power">{t('power')}</SelectItem><SelectItem value="Serve">{t('serve')}</SelectItem><SelectItem value="Footwork">{t('footwork')}</SelectItem><SelectItem value="Mental">{t('mental')}</SelectItem><SelectItem value="Other">{t('other')}</SelectItem></SelectContent>
                            </Select>
                            <FieldError msg={errors.bestQuality} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="tennisGoal">{t('tennisGoal')}</Label>
                        <Textarea id="tennisGoal" placeholder={t('tennisGoalPlaceholder')} value={answers.tennis?.goal ?? ""} onChange={(e) => setAnswer("tennis.goal", e.target.value)} className="bg-background border-border"/>
                        <FieldError msg={errors.goal}/>
                    </div>
                </div>
              )}
               {steps[index].id === "football" && (
                <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="position">{t('footballPosition')}</Label>
                            <Select onValueChange={(v) => setAnswer("football.position", v)} defaultValue={answers.football?.position}>
                                <SelectTrigger id="position" className="bg-background border-border"><SelectValue placeholder={t('select')} /></SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground"><SelectItem value="Goalkeeper">Goalkeeper</SelectItem><SelectItem value="Defender">Defender</SelectItem><SelectItem value="Midfielder">Midfielder</SelectItem><SelectItem value="Forward">Forward</SelectItem><SelectItem value="Other">{t('other')}</SelectItem></SelectContent>
                            </Select>
                            <FieldError msg={errors.position} />
                        </div>
                         <div>
                            <Label>{t('inTeam')}</Label>
                            <RadioGroup onValueChange={(v) => setAnswer("football.inTeam", v === "true")} defaultValue={String(answers.football?.inTeam)} className="flex items-center space-x-4 pt-2">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="f-team-yes" /><Label htmlFor="f-team-yes">{t('yes')}</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="f-team-no" /><Label htmlFor="f-team-no">{t('no')}</Label></div>
                            </RadioGroup>
                            <FieldError msg={errors.inTeam} />
                        </div>
                        <div>
                            <Label htmlFor="trainingsPerWeek">{t('trainingsPerWeek')}</Label>
                                <div className="flex items-center gap-4 mt-2">
                                <Slider id="trainingsPerWeek" min={0} max={7} step={1} value={[answers.football?.trainingsPerWeek ?? 0]} onValueChange={v => setAnswer("football.trainingsPerWeek", v[0])} />
                                <span className="text-sm font-semibold bg-muted text-muted-foreground rounded-md px-3 py-1 w-12 text-center">{answers.football?.trainingsPerWeek ?? 0}</span>
                            </div>
                            <FieldError msg={errors.trainingsPerWeek}/>
                        </div>
                        <div>
                            <Label htmlFor="footballBestQuality">{t('bestQuality')}</Label>
                             <Select onValueChange={(v) => setAnswer("football.bestQuality", v)} defaultValue={answers.football?.bestQuality}>
                                <SelectTrigger id="footballBestQuality" className="bg-background border-border"><SelectValue placeholder={t('select')} /></SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground"><SelectItem value="Pace">{t('pace')}</SelectItem><SelectItem value="Passing">{t('passing')}</SelectItem><SelectItem value="Shooting">{t('shooting')}</SelectItem><SelectItem value="Defense">{t('tackling')}</SelectItem><SelectItem value="Vision">{t('vision')}</SelectItem><SelectItem value="Other">{t('other')}</SelectItem></SelectContent>
                            </Select>
                            <FieldError msg={errors.bestQuality} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="footballGoal">{t('footballGoal')}</Label>
                        <Textarea id="footballGoal" placeholder={t('footballGoalPlaceholder')} value={answers.football?.goal ?? ""} onChange={(e) => setAnswer("football.goal", e.target.value)} className="bg-background border-border"/>
                        <FieldError msg={errors.goal}/>
                    </div>
                </div>
               )}
                {steps[index].id === "gym" && (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <div><Label htmlFor="age">Age</Label><Input id="age" type="number" min={13} max={80} value={answers.gym?.age ?? ""} onChange={(e) => setAnswer("gym.age", Number(e.target.value))} className="bg-background border-border"/><FieldError msg={errors.age}/></div>
                            <div><Label htmlFor="height">{t('heightCm')}</Label><Input id="height" type="number" min={120} max={230} value={answers.gym?.height_cm ?? ""} onChange={(e) => setAnswer("gym.height_cm", Number(e.target.value))} className="bg-background border-border"/><FieldError msg={errors.height_cm}/></div>
                            <div><Label htmlFor="weight">{t('weightKg')}</Label><Input id="weight" type="number" min={30} max={200} value={answers.gym?.weight_kg ?? ""} onChange={(e) => setAnswer("gym.weight_kg", Number(e.target.value))} className="bg-background border-border"/><FieldError msg={errors.weight_kg}/></div>
                        </div>
                        <div>
                            <Label htmlFor="gymSessionsPerWeek">{t('sessionsPerWeek')}</Label>
                            <div className="flex items-center gap-4 mt-2">
                                <Slider id="gymSessionsPerWeek" min={0} max={7} step={1} value={[answers.gym?.sessionsPerWeek ?? 0]} onValueChange={v => setAnswer("gym.sessionsPerWeek", v[0])} />
                                <span className="text-sm font-semibold bg-muted text-muted-foreground rounded-md px-3 py-1 w-12 text-center">{answers.gym?.sessionsPerWeek ?? 0}</span>
                            </div>
                            <FieldError msg={errors.sessionsPerWeek}/>
                        </div>
                        <div>
                          <Label htmlFor="gymGoal">{t('gymGoal')}</Label>
                          <Textarea id="gymGoal" placeholder={t('gymGoalPlaceholder')} value={answers.gym?.goal ?? ""} onChange={(e) => setAnswer("gym.goal", e.target.value)} className="bg-background border-border"/>
                          <FieldError msg={errors.goal}/>
                        </div>
                    </div>
                )}
                {steps[index].id === "summary" && (
                    <div className="space-y-4">
                        <p className="text-muted-foreground">{t('summaryDescriptionOnboarding')}</p>
                        <div className="grid gap-4 md:grid-cols-2">
                        {answers.sports.selected.map(sportId => {
                            const sportData = answers[sportId as Sport];
                            if (!sportData) return null;
                            const sportInfo = SPORTS.find(s => s.id === sportId);
                            return (
                            <Card key={sportId} className="bg-background border-border">
                                <CardHeader><CardTitle className="flex justify-between items-center">{t(sportInfo!.labelKey as any)} <Button type="button" variant="link" className="p-0 h-auto text-primary" onClick={() => setIndex(steps.findIndex(p => p.id === sportId))}>{t('edit')}</Button></CardTitle></CardHeader>
                                <CardContent className="text-sm space-y-1 text-muted-foreground">
                                    {Object.entries(sportData).map(([key, value]) => <p key={key}><b>{key.replace(/_/g, ' ')}:</b> {String(value)}</p>)}
                                </CardContent>
                            </Card>
                            )
                        })}
                        </div>
                    </div>
                )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
        <CardFooter className="flex justify-between p-6 bg-card border-t">
          <Button type="button" variant="ghost" onClick={handleBack} disabled={index === 0} className="text-foreground hover:bg-accent">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
          </Button>
          {index < steps.length - 1 ? (
            <Button type="button" onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {t('next')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
             <Button type="button" onClick={handleSubmit} className="bg-green-500 hover:bg-green-600 text-white">
                <Check className="mr-2 h-4 w-4" /> {t('submit')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

function OnboardingPageComponentWrapper() {
    const router = useRouter();
    return <OnboardingForm router={router} />;
}

export default function OnboardingPage() {
    return (
        <UserProvider>
            <OnboardingPageComponentWrapper />
        </UserProvider>
    )
}
