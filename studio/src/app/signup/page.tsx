

"use client";

import Link from "next/link";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logo } from "@/components/logo";
import { signupSchema } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, Languages, Sun, Moon, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/hooks/use-translation";

const sports = [
    { id: 'football', label: 'Football' },
    { id: 'tennis', label: 'Tennis' },
    { id: 'gym', label: 'Gym/Fitness' },
];

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkoutUrl = searchParams.get('checkoutUrl');
  const { theme, setTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!checkoutUrl) {
      router.replace('/#pricing');
    }
  }, [checkoutUrl, router]);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: "player",
      age: 18,
      trainingFrequency: "1-2_per_week",
      mainGoal: "improve_fitness",
      sports: ["gym"],
      footballPosition: "midfielder",
      inClub: true,
      tennisLevel: "intermediate",
      hasRanking: false,
      tennisRanking: "",
      dominantHand: "right",
      playStyle: "baseliner",
      gymHeight: 180,
      gymWeight: 75,
      gymGoal: "muscle_gain",
    },
  });

  const selectedSports = form.watch("sports");

  const steps = [
    { id: 'account', fields: ['fullName', 'email', 'password', 'role'] },
    { id: 'general', fields: ['age', 'trainingFrequency', 'mainGoal', 'sports'] },
    ...(selectedSports.includes('football') ? [{ id: 'football', fields: ['footballPosition', 'inClub'] }] : []),
    ...(selectedSports.includes('tennis') ? [{ id: 'tennis', fields: ['tennisLevel', 'hasRanking', 'tennisRanking', 'dominantHand', 'playStyle'] }] : []),
    ...(selectedSports.includes('gym') ? [{ id: 'gym', fields: ['gymHeight', 'gymWeight', 'gymGoal'] }] : []),
  ];

  async function goToNextStep() {
    const fieldsToValidate = steps[currentStep].fields;
    // @ts-ignore
    const isValid = await form.trigger(fieldsToValidate, { shouldFocus: true });
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  }

  function goToPrevStep() {
    setCurrentStep(prev => prev - 1);
  }

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setIsSubmitting(true);
    
    try {
      if (!checkoutUrl) {
        toast({ title: "No Plan Selected", description: "Please select a plan from the homepage.", variant: "destructive" });
        router.push('/#pricing');
        setIsSubmitting(false);
        return;
      }
      sessionStorage.setItem('pendingUser', JSON.stringify(values));
      const stripeUrlWithEmail = `${checkoutUrl}?prefilled_email=${encodeURIComponent(values.email)}`;
      window.location.href = stripeUrlWithEmail;
    } catch (error: any) {
      console.error("Signup to checkout error:", error);
      toast({ title: "Error", description: "Could not proceed to checkout. Please try again.", variant: "destructive" });
      setIsSubmitting(false);
    }
  }

  if (!checkoutUrl) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }
  
  const progressValue = ((currentStep + 1) / (steps.length + 1)) * 100;

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
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                 className="hover:bg-foreground/10 text-foreground"
            >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        </div>
      </header>
      
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-lg space-y-6 relative z-10 bg-card/60 dark:bg-card/70 backdrop-blur-2xl p-8 rounded-3xl border border-white/[0.12] dark:border-white/[0.08] shadow-float overflow-hidden">
            {/* top edge shine */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            {/* inner corner glow */}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent rounded-3xl" />
            <Progress value={progressValue} className="absolute top-0 left-0 rounded-t-3xl h-1" />
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Step 0: Account Creation */}
                    {currentStep === 0 && (
                        <div className="space-y-4">
                             <div className="text-center">
                                <h2 className="text-xl font-bold">Create Your Account</h2>
                                <p className="text-sm text-muted-foreground">Let's start with the basics.</p>
                            </div>
                            <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder={t('fullNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder={t('emailPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder={t('passwordPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>I am a...</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex pt-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="player" /></FormControl><FormLabel className="font-normal">Player</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="coach" /></FormControl><FormLabel className="font-normal">Coach</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    )}
                    {/* Step 1: General Info */}
                    {currentStep === 1 && (
                         <div className="space-y-4">
                            <div className="text-center"><h2 className="text-xl font-bold">About You</h2><p className="text-sm text-muted-foreground">Tell us a bit about yourself.</p></div>
                            <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="mainGoal" render={({ field }) => (<FormItem><FormLabel>What is your main athletic goal?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4 pt-2"><FormItem><RadioGroupItem value="improve_fitness" id="g1" className="peer sr-only" /><Label htmlFor="g1" className="radio-label">Improve General Fitness</Label></FormItem><FormItem><RadioGroupItem value="lose_weight" id="g2" className="peer sr-only" /><Label htmlFor="g2" className="radio-label">Lose Weight</Label></FormItem><FormItem><RadioGroupItem value="gain_muscle" id="g3" className="peer sr-only" /><Label htmlFor="g3" className="radio-label">Gain Muscle</Label></FormItem><FormItem><RadioGroupItem value="improve_performance" id="g4" className="peer sr-only" /><Label htmlFor="g4" className="radio-label">Improve Sport Performance</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="trainingFrequency" render={({ field }) => (<FormItem><FormLabel>How often do you train?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4 pt-2"><FormItem><RadioGroupItem value="1-2_per_week" id="f1" className="peer sr-only" /><Label htmlFor="f1" className="radio-label">1-2 times/week</Label></FormItem><FormItem><RadioGroupItem value="3-4_per_week" id="f2" className="peer sr-only" /><Label htmlFor="f2" className="radio-label">3-4 times/week</Label></FormItem><FormItem><RadioGroupItem value="5+_per_week" id="f3" className="peer sr-only" /><Label htmlFor="f3" className="radio-label">5+ times/week</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="sports" render={() => (<FormItem><FormLabel>What sports do you play?</FormLabel><div className="grid grid-cols-2 gap-4 pt-2">{sports.map((sport) => (<FormField key={sport.id} control={form.control} name="sports" render={({ field }) => (<FormItem key={sport.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(sport.id)} onCheckedChange={(checked) => {return checked ? field.onChange([...field.value, sport.id]) : field.onChange(field.value?.filter((value) => value !== sport.id))}} /></FormControl><FormLabel className="font-normal">{sport.label}</FormLabel></FormItem>)} />))}</div><FormMessage /></FormItem>)} />
                        </div>
                    )}
                    {/* Step 2: Football */}
                    {currentStep === 2 && steps[2].id === 'football' && (
                        <div className="space-y-4">
                             <div className="text-center"><h2 className="text-xl font-bold">Football Profile</h2><p className="text-sm text-muted-foreground">Tell us about your football career.</p></div>
                             <FormField control={form.control} name="footballPosition" render={({ field }) => (<FormItem><FormLabel>What is your primary position?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4 pt-2"><FormItem><RadioGroupItem value="goalkeeper" id="p1" className="peer sr-only" /><Label htmlFor="p1" className="radio-label">Goalkeeper</Label></FormItem><FormItem><RadioGroupItem value="defender" id="p2" className="peer sr-only" /><Label htmlFor="p2" className="radio-label">Defender</Label></FormItem><FormItem><RadioGroupItem value="midfielder" id="p3" className="peer sr-only" /><Label htmlFor="p3" className="radio-label">Midfielder</Label></FormItem><FormItem><RadioGroupItem value="forward" id="p4" className="peer sr-only" /><Label htmlFor="p4" className="radio-label">Forward</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="inClub" render={({ field }) => (<FormItem><FormLabel>Are you currently in a club?</FormLabel><FormControl><RadioGroup onValueChange={(val) => field.onChange(val === 'true')} defaultValue={String(field.value)} className="flex pt-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="true" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="false" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    )}
                    {/* Step 3: Tennis */}
                    {currentStep === (steps.findIndex(s => s.id === 'tennis')) && steps.find(s => s.id === 'tennis') && (
                         <div className="space-y-4">
                            <div className="text-center"><h2 className="text-xl font-bold">Tennis Profile</h2><p className="text-sm text-muted-foreground">Let's get your tennis details.</p></div>
                             <FormField control={form.control} name="tennisLevel" render={({ field }) => (<FormItem><FormLabel>Skill Level</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4 pt-2"><FormItem><RadioGroupItem value="beginner" id="tl1" className="peer sr-only" /><Label htmlFor="tl1" className="radio-label">Beginner</Label></FormItem><FormItem><RadioGroupItem value="intermediate" id="tl2" className="peer sr-only" /><Label htmlFor="tl2" className="radio-label">Intermediate</Label></FormItem><FormItem><RadioGroupItem value="advanced" id="tl3" className="peer sr-only" /><Label htmlFor="tl3" className="radio-label">Advanced</Label></FormItem><FormItem><RadioGroupItem value="pro" id="tl4" className="peer sr-only" /><Label htmlFor="tl4" className="radio-label">Pro</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="dominantHand" render={({ field }) => (<FormItem><FormLabel>Dominant Hand</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex pt-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="right" /></FormControl><FormLabel className="font-normal">Right</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="left" /></FormControl><FormLabel className="font-normal">Left</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="playStyle" render={({ field }) => (<FormItem><FormLabel>Play Style</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4 pt-2"><FormItem><RadioGroupItem value="baseliner" id="ps1" className="peer sr-only" /><Label htmlFor="ps1" className="radio-label">Baseliner</Label></FormItem><FormItem><RadioGroupItem value="serve_volley" id="ps2" className="peer sr-only" /><Label htmlFor="ps2" className="radio-label">Serve & Volley</Label></FormItem><FormItem><RadioGroupItem value="all_court" id="ps3" className="peer sr-only" /><Label htmlFor="ps3" className="radio-label">All-Court</Label></FormItem><FormItem><RadioGroupItem value="counter_puncher" id="ps4" className="peer sr-only" /><Label htmlFor="ps4" className="radio-label">Counter-Puncher</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                         </div>
                    )}
                    {/* Step 4: Gym */}
                    {currentStep === (steps.findIndex(s => s.id === 'gym')) && steps.find(s => s.id === 'gym') && (
                        <div className="space-y-4">
                            <div className="text-center"><h2 className="text-xl font-bold">Gym Profile</h2><p className="text-sm text-muted-foreground">Provide your physical stats.</p></div>
                             <FormField control={form.control} name="gymHeight" render={({ field }) => (<FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="gymWeight" render={({ field }) => (<FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="gymGoal" render={({ field }) => (<FormItem><FormLabel>Primary Gym Goal</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4 pt-2"><FormItem><RadioGroupItem value="fat_loss" id="gg1" className="peer sr-only" /><Label htmlFor="gg1" className="radio-label">Fat Loss</Label></FormItem><FormItem><RadioGroupItem value="muscle_gain" id="gg2" className="peer sr-only" /><Label htmlFor="gg2" className="radio-label">Muscle Gain</Label></FormItem><FormItem><RadioGroupItem value="strength" id="gg3" className="peer sr-only" /><Label htmlFor="gg3" className="radio-label">Strength</Label></FormItem><FormItem><RadioGroupItem value="endurance" id="gg4" className="peer sr-only" /><Label htmlFor="gg4" className="radio-label">Endurance</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="flex justify-between items-center pt-4">
                <Button type="button" variant="ghost" onClick={goToPrevStep} disabled={currentStep === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {currentStep < steps.length - 1 ? (
                    <Button type="button" onClick={goToNextStep}>
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Proceed to Payment
                    </Button>
                )}
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="underline text-primary">
                    Login
                </Link>
            </div>
        </form>
      </FormProvider>
    </div>
  );
}
