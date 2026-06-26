
"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Shield, Trophy } from "lucide-react";
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

const SPORTS = [
  { id: "tennis", label: "Tennis 🎾", icon: Trophy },
  { id: "football", label: "Football ⚽", icon: Shield },
  { id: "gym", label: "Gym 🏋️", icon: Dumbbell },
] as const;

type Sport = (typeof SPORTS)[number]["id"];

type Answers = {
  sports: { selected: Sport[] };
  tennis?: {
    level?: string;
    yearsPlaying?: number;
    sessionsPerWeek?: number;
    hasCoach?: boolean;
    improvementArea?: string;
    goal?: string;
  };
  football?: {
    position?: string;
    inTeam?: boolean;
    teamName?: string;
    trainingsPerWeek?: number;
    improvementArea?: string;
    recentInjury?: string;
    goal?: string;
  };
  gym?: { age?: number; height?: number; weight?: number; goal?: string };
};

function useParts(selected: Sport[]) {
  return useMemo(() => {
    const base = [{ id: "select", title: "Select Sports" }];
    if (selected.includes("tennis")) base.push({ id: "tennis", title: "Tennis Profile" });
    if (selected.includes("football")) base.push({ id: "football", title: "Football Profile" });
    if (selected.includes("gym")) base.push({ id: "gym", title: "Gym Profile" });
    base.push({ id: "summary", title: "Summary" });
    return base as { id: string; title: string }[];
  }, [selected]);
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div className="mt-1 text-xs text-destructive">{msg}</div>;
}

export default function OnboardingPage() {
  const [answers, setAnswers] = useState<Answers>({ sports: { selected: [] } });
  const [index, setIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const parts = useParts(answers.sports.selected);
  const isLast = index === parts.length - 1;
  const pct = Math.round(((index + 1) / parts.length) * 100);

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
      return clone;
    });
  };

  const validate = (pid: string): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (pid === "select") {
      if (!answers.sports?.selected?.length) errs["sports.selected"] = "Please select at least one sport.";
    }
    if (pid === "tennis") {
      const t = answers.tennis ?? {};
      if (!t.level) errs.level = "Level is required.";
      if (t.yearsPlaying === undefined || t.yearsPlaying < 0) errs.yearsPlaying = "Enter years playing (0 or more).";
      if (t.sessionsPerWeek === undefined || t.sessionsPerWeek < 0) errs.sessionsPerWeek = "Enter sessions per week (0 or more).";
      if (typeof t.hasCoach !== "boolean") errs.hasCoach = "Please select an option for coaching.";
      if (!t.improvementArea) errs.improvementArea = "Please select an area to improve.";
      if (!t.goal) errs.goal = "Please set a personal goal.";
    }
    if (pid === "football") {
      const f = answers.football ?? {};
      if (!f.position) errs.position = "Position is required.";
      if (typeof f.inTeam !== "boolean") errs.inTeam = "Please select if you are in a team.";
      if (f.inTeam && !f.teamName) errs.teamName = "Team name is required if you are in a team.";
      if (f.trainingsPerWeek === undefined || f.trainingsPerWeek < 0) errs.trainingsPerWeek = "Enter trainings per week (0 or more).";
      if (!f.improvementArea) errs.improvementArea = "Please select an area to improve.";
      if (!f.recentInjury && f.recentInjury !== "No") errs.recentInjury = "Please specify any recent injuries or type 'No'.";
      if (!f.goal) errs.goal = "Please set a personal goal.";
    }
    if (pid === "gym") {
      const g = answers.gym ?? {};
      if (g.age === undefined || g.age < 13 || g.age > 90) errs.age = "Please enter an age between 13 and 90.";
      if (g.height === undefined || g.height < 80 || g.height > 250) errs.height = "Please enter a height between 80 and 250 cm.";
      if (g.weight === undefined || g.weight < 25 || g.weight > 300) errs.weight = "Please enter a weight between 25 and 300 kg.";
      if (!g.goal) errs.goal = "Please set a personal goal.";
    }
    return errs;
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const next = () => {
    const pid = parts[index].id;
    const e = validate(pid);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setIndex((i) => Math.min(i + 1, parts.length - 1));
    }
  };
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  const submit = () => {
    const allGood = parts.every((p) => Object.keys(validate(p.id)).length === 0 || p.id === "summary");
    if (!allGood) {
      const badPart = parts.find((p) => p.id !== "summary" && Object.keys(validate(p.id)).length > 0);
      if (badPart) {
        setErrors(validate(badPart.id));
        setIndex(parts.findIndex((p) => p.id === badPart.id));
      }
      return;
    }
    setSubmitted(true);
  };

  const PartContainer = ({ children }: { children: React.ReactNode }) => (
     <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-[350px] space-y-6"
    >
        {children}
    </motion.div>
  )

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <Card className="overflow-hidden">
            <CardHeader className="p-4 border-b">
                <Progress value={pct} className="h-2" />
            </CardHeader>
            <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-bold font-headline mb-6">{parts[index].title}</h2>

                <AnimatePresence mode="wait">
                    <div key={index}>
                        {parts[index].id === "select" && (
                             <PartContainer>
                                <div className="space-y-3">
                                <Label className="text-base font-semibold">Which sports do you practice?</Label>
                                <div className="mt-2 flex flex-wrap gap-3">
                                    {SPORTS.map((s) => {
                                    const active = answers.sports.selected.includes(s.id);
                                    return (
                                        <div key={s.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={s.id}
                                                checked={active}
                                                onCheckedChange={(checked) => {
                                                    const setSel = new Set(answers.sports.selected);
                                                    checked ? setSel.add(s.id as Sport) : setSel.delete(s.id);
                                                    setAnswer("sports.selected", Array.from(setSel) as Sport[]);
                                                }}
                                            />
                                            <Label htmlFor={s.id} className="flex items-center gap-2 text-md font-medium">
                                                {s.label}
                                            </Label>
                                        </div>
                                    );
                                    })}
                                </div>
                                <FieldError msg={errors["sports.selected"]} />
                                </div>
                            </PartContainer>
                        )}
                        {parts[index].id === "tennis" && (
                            <PartContainer>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>What is your current level in tennis?</Label>
                                        <Select onValueChange={(v) => setAnswer("tennis.level", v)} defaultValue={answers.tennis?.level}>
                                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent><SelectItem value="Beginner">Beginner</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Advanced">Advanced</SelectItem><SelectItem value="Competitive">Competitive</SelectItem></SelectContent>
                                        </Select>
                                        <FieldError msg={errors.level} />
                                    </div>
                                    <div>
                                        <Label>Do you currently work with a coach?</Label>
                                        <RadioGroup onValueChange={(v) => setAnswer("tennis.hasCoach", v === "true")} defaultValue={String(answers.tennis?.hasCoach)} className="flex items-center space-x-4 pt-2">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="t-coach-yes" /><Label htmlFor="t-coach-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="t-coach-no" /><Label htmlFor="t-coach-no">No</Label></div>
                                        </RadioGroup>
                                        <FieldError msg={errors.hasCoach} />
                                    </div>
                                    <div><Label>Years playing</Label><Input type="number" min={0} value={answers.tennis?.yearsPlaying ?? ""} onChange={(e) => setAnswer("tennis.yearsPlaying", Number(e.target.value))}/><FieldError msg={errors.yearsPlaying}/></div>
                                    <div><Label>Sessions per week</Label><Input type="number" min={0} value={answers.tennis?.sessionsPerWeek ?? ""} onChange={(e) => setAnswer("tennis.sessionsPerWeek", Number(e.target.value))}/><FieldError msg={errors.sessionsPerWeek}/></div>
                                    <div className="md:col-span-2">
                                        <Label>Which area do you most want to improve?</Label>
                                        <Select onValueChange={(v) => setAnswer("tennis.improvementArea", v)} defaultValue={answers.tennis?.improvementArea}>
                                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent><SelectItem value="Backhand">Backhand</SelectItem><SelectItem value="Serve">Serve</SelectItem><SelectItem value="Endurance">Endurance</SelectItem><SelectItem value="Footwork">Footwork</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                                        </Select>
                                        <FieldError msg={errors.improvementArea} />
                                    </div>
                                    <div className="md:col-span-2"><Label>🎯 What is your personal goal in tennis?</Label><Input placeholder="e.g., Win local tournaments" value={answers.tennis?.goal ?? ""} onChange={(e) => setAnswer("tennis.goal", e.target.value)}/><FieldError msg={errors.goal}/></div>
                                </div>
                            </PartContainer>
                        )}
                        {parts[index].id === "football" && (
                            <PartContainer>
                                <div className="grid md:grid-cols-2 gap-6">
                                     <div>
                                        <Label>What position do you usually play?</Label>
                                        <Select onValueChange={(v) => setAnswer("football.position", v)} defaultValue={answers.football?.position}><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger><SelectContent><SelectItem value="Goalkeeper">Goalkeeper</SelectItem><SelectItem value="Defender">Defender</SelectItem><SelectItem value="Midfielder">Midfielder</SelectItem><SelectItem value="Forward">Forward</SelectItem></SelectContent></Select>
                                        <FieldError msg={errors.position} />
                                    </div>
                                    <div>
                                        <Label>Are you part of a team?</Label>
                                        <RadioGroup onValueChange={(v) => setAnswer("football.inTeam", v === "true")} defaultValue={String(answers.football?.inTeam)} className="flex items-center space-x-4 pt-2">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="f-team-yes" /><Label htmlFor="f-team-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="f-team-no" /><Label htmlFor="f-team-no">No</Label></div>
                                        </RadioGroup>
                                        <FieldError msg={errors.inTeam} />
                                    </div>
                                    {answers.football?.inTeam && (<div><Label>Team name</Label><Input value={answers.football?.teamName ?? ""} onChange={(e) => setAnswer("football.teamName", e.target.value)}/><FieldError msg={errors.teamName}/></div>)}
                                    <div><Label>Trainings per week</Label><Input type="number" min={0} value={answers.football?.trainingsPerWeek ?? ""} onChange={(e) => setAnswer("football.trainingsPerWeek", Number(e.target.value))}/><FieldError msg={errors.trainingsPerWeek}/></div>
                                    <div>
                                        <Label>Main area to improve</Label>
                                        <Select onValueChange={(v) => setAnswer("football.improvementArea", v)} defaultValue={answers.football?.improvementArea}><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger><SelectContent><SelectItem value="Speed">Speed</SelectItem><SelectItem value="Shooting">Shooting</SelectItem><SelectItem value="Stamina">Stamina</SelectItem><SelectItem value="Strength">Strength</SelectItem><SelectItem value="Positioning">Positioning</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
                                        <FieldError msg={errors.improvementArea} />
                                    </div>
                                    <div><Label>Any recent injuries?</Label><Input placeholder="Type 'No' if none" value={answers.football?.recentInjury ?? ""} onChange={(e) => setAnswer("football.recentInjury", e.target.value)}/><FieldError msg={errors.recentInjury}/></div>
                                    <div className="md:col-span-2"><Label>🎯 What is your personal goal in football?</Label><Input placeholder="e.g., Make the first team" value={answers.football?.goal ?? ""} onChange={(e) => setAnswer("football.goal", e.target.value)}/><FieldError msg={errors.goal}/></div>
                                </div>
                            </PartContainer>
                        )}
                        {parts[index].id === "gym" && (
                           <PartContainer>
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div><Label>Age</Label><Input type="number" min={13} value={answers.gym?.age ?? ""} onChange={(e) => setAnswer("gym.age", Number(e.target.value))}/><FieldError msg={errors.age}/></div>
                                    <div><Label>Height (cm)</Label><Input type="number" min={80} value={answers.gym?.height ?? ""} onChange={(e) => setAnswer("gym.height", Number(e.target.value))}/><FieldError msg={errors.height}/></div>
                                    <div><Label>Weight (kg)</Label><Input type="number" min={25} value={answers.gym?.weight ?? ""} onChange={(e) => setAnswer("gym.weight", Number(e.target.value))}/><FieldError msg={errors.weight}/></div>
                                </div>
                                <div><Label className="block mb-2">🎯 What is your personal goal in the gym?</Label><Textarea placeholder="e.g., Build muscle, lose 5kg of fat, run a 10k..." value={answers.gym?.goal ?? ""} onChange={(e) => setAnswer("gym.goal", e.target.value)}/><FieldError msg={errors.goal}/></div>
                            </PartContainer>
                        )}
                        {parts[index].id === "summary" && (
                            <PartContainer>
                                <p className="text-muted-foreground">Please review your answers. Use the "Edit" button to jump back and make changes.</p>
                                <div className="grid gap-6 md:grid-cols-2">
                                {answers.sports.selected.includes("tennis") && (
                                    <Card><CardHeader><CardTitle className="flex justify-between items-center">Tennis <Button variant="link" className="p-0 h-auto" onClick={() => setIndex(parts.findIndex(p => p.id === "tennis"))}>Edit</Button></CardTitle></CardHeader><CardContent className="text-sm space-y-1"><p><b>Level:</b> {answers.tennis?.level ?? "—"}</p><p><b>Coach:</b> {answers.tennis?.hasCoach ? "Yes" : "No"}</p><p><b>🎯 Goal:</b> {answers.tennis?.goal ?? "—"}</p></CardContent></Card>
                                )}
                                {answers.sports.selected.includes("football") && (
                                    <Card><CardHeader><CardTitle className="flex justify-between items-center">Football <Button variant="link" className="p-0 h-auto" onClick={() => setIndex(parts.findIndex(p => p.id === "football"))}>Edit</Button></CardTitle></CardHeader><CardContent className="text-sm space-y-1"><p><b>Position:</b> {answers.football?.position ?? "—"}</p><p><b>In team:</b> {answers.football?.inTeam ? "Yes" : "No"}</p><p><b>🎯 Goal:</b> {answers.football?.goal ?? "—"}</p></CardContent></Card>
                                )}
                                {answers.sports.selected.includes("gym") && (
                                    <Card><CardHeader><CardTitle className="flex justify-between items-center">Gym <Button variant="link" className="p-0 h-auto" onClick={() => setIndex(parts.findIndex(p => p.id === "gym"))}>Edit</Button></CardTitle></CardHeader><CardContent className="text-sm space-y-1"><p><b>Age:</b> {answers.gym?.age ?? "—"}</p><p><b>Height/Weight:</b> {answers.gym?.height ?? "—"} cm / {answers.gym?.weight ?? "—"} kg</p><p><b>🎯 Goal:</b> {answers.gym?.goal ?? "—"}</p></CardContent></Card>
                                )}
                                </div>
                            </PartContainer>
                        )}
                    </div>
                </AnimatePresence>
            </CardContent>
            <CardFooter className="flex justify-between p-6">
                <Button variant="ghost" onClick={back} disabled={index === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {isLast ? (
                    <Button onClick={submit}>
                        <Check className="mr-2 h-4 w-4" /> Submit
                    </Button>
                ) : (
                    <Button onClick={next}>
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </CardFooter>
        </Card>

        {submitted && (
            <Card className="mt-6">
            <CardHeader>
                <CardTitle>Submitted Payload (Preview)</CardTitle>
                <CardDescription>In a real application, this data would be sent to your backend for processing.</CardDescription>
            </CardHeader>
            <CardContent>
                <pre className="text-xs p-4 bg-muted rounded-md overflow-x-auto">{JSON.stringify(answers, null, 2)}</pre>
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}

    