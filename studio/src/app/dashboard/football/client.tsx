
"use client";

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay, endOfDay } from "date-fns";
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { useUser } from "@/hooks/use-user";
import { footballMatchSchema, type NutritionLog } from "@/lib/schemas";
import { getTacticalAdvice } from "@/ai/flows/sports-flows";
import type { TacticalAdviceOutput, TennisDrillOutput } from "@/ai/schemas";
import { deleteMatch } from "./actions";
import { useTranslation } from "@/hooks/use-translation";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Line, LineChart, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Calendar as CalendarIcon, Bot, Sparkles, Send, Trophy, BrainCircuit, Star, Plus, CheckCircle, Trash2, Loader2, Bookmark, MessageSquare, Share2, Heart, BarChart2, Shield, Flame, Activity, CalendarDays, ClipboardList, Lightbulb, User as UserIcon, Clock, Repeat, Droplets, Bed, Check, Dumbbell, ShieldCheck, Zap, Edit, Target, Upload, Video, Lock, FileVideo, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AnimatePresence, motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDrillSuggestions } from "@/ai/flows/tennis-drill-flow";
import { analyzeFootballVideo } from "@/ai/flows/video-analysis-flow";
import { useNutritionStore } from "@/stores/nutrition-store";
import { UpgradeProModal } from "@/components/upgrade-pro-modal";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";


type FootballMatchInput = z.infer<typeof footballMatchSchema>;
type FootballMatch = FootballMatchInput & { id: string; date: Date };
type MatchResult = 'win' | 'draw' | 'loss';
type ChatMessage = { role: 'user' | 'ai'; content: string };

const sessionSchema = z.object({
    title: z.string().min(1, "Session title is required."),
    type: z.enum(["technical", "tactical", "physical", "other"]),
    date: z.date({ required_error: "A date is required." }),
    duration: z.coerce.number().min(5, "Duration must be at least 5 minutes."),
    notes: z.string().optional(),
});
type SessionInput = z.infer<typeof sessionSchema>;
type ScheduleItem = SessionInput & { id: number; completed: boolean; date: Date | null };

// Video Upload Types
type UploadStatus = "Pending Review" | "Reviewed" | "AI is reviewing..." | "Failed";
type UploadedVideo = {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  status: UploadStatus;
  prompt: string;
  feedback: string | null;
  uploadDate: Date;
};

const wizardSteps = [
    { step: 1, titleKey: 'matchDetails', fields: ['opponent', 'date', 'result'] },
    { step: 2, titleKey: 'yourStats', fields: ['position', 'minutesPlayed', 'goals', 'assists', 'motm'] },
    { step: 3, titleKey: 'yourFeedback', fields: ['stamina', 'notes'] }
];

const goalsChartConfig = {
  goals: {
    label: "Goals",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const radarChartConfig = {
    value: {
        label: "Current",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig

const initialSprintTestData = [
  { date: "Jan", time: 11.5 },
  { date: "Feb", time: 11.3 },
  { date: "Mar", time: 11.4 },
  { date: "Apr", time: 11.1 },
  { date: "May", time: 11.0 },
  { date: "Jun", time: 10.9 },
];
const sprintChartConfig = { time: { label: "Time (s)", color: "hsl(var(--chart-1))" } } satisfies ChartConfig;

const initialSkillsData = [
    { name: 'passing', value: 85 },
    { name: 'shooting', value: 90 },
    { name: 'dribbling', value: 75 },
    { name: 'tackling', value: 65 },
    { name: 'pace', value: 88 },
    { name: 'vision', value: 82 },
];

const initialRecoveryChecklist = [
    { id: 'foam_roll', label: 'Foam Roll', checked: false },
    { id: 'stretch', label: 'Stretching', checked: true },
    { id: 'ice_bath', label: 'Ice Bath', checked: false },
    { id: 'massage', label: 'Massage', checked: false },
];

const goalSchema = z.object({
    goal: z.string().min(5, "Your goal should be at least 5 characters long."),
});
type GoalInput = z.infer<typeof goalSchema>;

const sprintTestSchema = z.object({
  date: z.string().min(1, "Date is required (e.g., 'Jul')."),
  time: z.coerce.number().min(1, "Time must be a positive number."),
});
type SprintTestInput = z.infer<typeof sprintTestSchema>;

const recoverySchema = z.object({
    sleep: z.coerce.number().min(0).max(24).optional(),
    hrv: z.coerce.number().min(0).optional(),
    soreness: z.enum(["None", "Low", "Medium", "High"]).optional(),
});
type RecoveryInput = z.infer<typeof recoverySchema>;
type RecoveryData = {
    sleep: number;
    hrv: number;
    soreness: "None" | "Low" | "Medium" | "High";
    hydration: number;
};


export default function FootballModuleClient() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isUserLoading } = useUser();
  const { t } = useTranslation();
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);


  const [tacticalQuestion, setTacticalQuestion] = useState("");
  const [tacticalAdvice, setTacticalAdvice] = useState<TacticalAdviceOutput | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(1);

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);

  const [goal, setGoal] = useState<string | null>("Improve my weak foot accuracy");
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const goalForm = useForm<GoalInput>({ resolver: zodResolver(goalSchema), defaultValues: { goal: goal || "" } });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
      { role: 'ai', content: t('footballCoachGreeting') },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiResponding, setIsAiResponding] = useState(false);

  // State for Skills & Fitness and Nutrition & Recovery tabs
  const [sprintTestData, setSprintTestData] = useState(initialSprintTestData);
  const [skillsData, setSkillsData] = useState(initialSkillsData);
  const [recoveryChecklist, setRecoveryChecklist] = useState(initialRecoveryChecklist);
  const [isLogTestOpen, setIsLogTestOpen] = useState(false);
  const [isRecoveryDialogOpen, setIsRecoveryDialogOpen] = useState(false);
  const [recoveryData, setRecoveryData] = useState<RecoveryData>({ sleep: 8.2, hrv: 68, soreness: "Low", hydration: 2.5 });
  const { dailyTotals } = useNutritionStore();

  // Video Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [videoAnalysisPrompt, setVideoAnalysisPrompt] = useState("");


  const sprintTestForm = useForm<SprintTestInput>({
    resolver: zodResolver(sprintTestSchema),
    defaultValues: {
      date: "",
      time: 0,
    },
  });
  
  const recoveryForm = useForm<RecoveryInput>({
    resolver: zodResolver(recoverySchema),
    defaultValues: {
        sleep: recoveryData.sleep,
        hrv: recoveryData.hrv,
        soreness: recoveryData.soreness,
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setSelectedFile(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please select a valid video file.",
      });
    }
  };

  const fileToDataUri = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Fetch videos from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/footballVideos`), orderBy("uploadDate", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadDate: (doc.data().uploadDate as any).toDate(),
      })) as UploadedVideo[];
      setUploadedVideos(videos);
    });
    return () => unsubscribe();
  }, [user]);
  
  const handleUpload = async () => {
    if (!selectedFile || !user) {
        toast({ variant: 'destructive', title: 'No file or user' });
        return;
    }
    if (!videoAnalysisPrompt.trim()) {
      toast({ variant: 'destructive', title: 'Prompt Required', description: "Please tell the AI coach what to look for." });
      return;
    }

    const fileForUpload = selectedFile;
    setIsUploading(true);
    setUploadProgress(0);

    const storagePath = `football-videos/${user.uid}/${Date.now()}_${fileForUpload.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, fileForUpload);
    
    uploadTask.on('state_changed',
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => {
        console.error("Firebase Storage Error:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: `CORS or permission issue likely. Check storage rules and browser console.` });
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const docRef = await addDoc(collection(db, `users/${user.uid}/footballVideos`), {
          name: fileForUpload.name,
          url: downloadURL,
          storagePath,
          status: "AI is reviewing...",
          prompt: videoAnalysisPrompt,
          feedback: null,
          uploadDate: serverTimestamp(),
        });
        
        setSelectedFile(null);
        const currentPrompt = videoAnalysisPrompt;
        setVideoAnalysisPrompt("");
        toast({ title: 'Upload Complete!', description: 'AI analysis has started.' });

        try {
          const fileAsDataUri = await fileToDataUri(fileForUpload);
          const result = await analyzeFootballVideo({
            userId: user.uid,
            videoDataUri: fileAsDataUri,
            prompt: currentPrompt,
          });
          
          await updateDoc(doc(db, `users/${user.uid}/footballVideos`, docRef.id), {
            status: 'Reviewed',
            feedback: result.feedback,
          });

          toast({ title: "AI Review Complete!", description: "The AI coach has provided feedback." });

        } catch (error: any) {
          console.error(error);
          await updateDoc(doc(db, `users/${user.uid}/footballVideos`, docRef.id), {
            status: 'Failed',
            feedback: 'AI analysis failed. Please try again.',
          });
          toast({ variant: 'destructive', title: "AI Review Failed", description: error.message });
        } finally {
          setIsUploading(false);
        }
      }
    );
  };
  
  const handleDeleteVideo = async (video: UploadedVideo) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/footballVideos`, video.id));
      const storageRef = ref(storage, video.storagePath);
      await deleteObject(storageRef);
      toast({ title: "Video Deleted" });
    } catch (error) {
      console.error("Delete failed:", error);
      toast({ variant: 'destructive', title: "Error", description: "Could not delete video." });
    }
  }

  useEffect(() => {
    recoveryForm.reset(recoveryData);
  }, [recoveryData, recoveryForm]);


  useEffect(() => {
        goalForm.reset({ goal: goal || "" });
  }, [goal, goalForm]);

  const addSessionForm = useForm<SessionInput>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
        title: "",
        type: "technical",
        date: new Date(),
        duration: 60,
        notes: "",
    }
  });
  
  const handleUpdateSkill = (skillName: string, newValue: number[]) => {
    setSkillsData(prevSkills => 
        prevSkills.map(skill => 
            skill.name === skillName ? { ...skill, value: newValue[0] } : skill
        )
    );
  };
  
  const handleToggleRecoveryItem = (itemId: string) => {
    setRecoveryChecklist(prevItems =>
        prevItems.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
        )
    );
  };


  const handleAddSession = (values: SessionInput) => {
    const newSession: ScheduleItem = {
        id: Date.now(),
        ...values,
        date: values.date,
        completed: false,
    };
    setSchedule(prev => [...prev, newSession].sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0)));
    setIsAddSessionOpen(false);
    addSessionForm.reset();
    toast({
        title: t('sessionAdded'),
        description: t('sessionAddedDescription', { title: newSession.title }),
    });
  }

  const handleDeleteSession = (sessionId: number) => {
    setSchedule(prev => prev.filter(session => session.id !== sessionId));
    toast({
        title: t('sessionRemoved'),
        description: t('sessionRemovedDescription'),
    });
  }
  
  const handleToggleSession = (sessionId: number) => {
    setSchedule(prev => prev.map(session => 
        session.id === sessionId ? { ...session, completed: !session.completed } : session
    ));
    toast({ title: t('sessionStatusUpdated') });
  };


  const logMatchForm = useForm<FootballMatchInput>({
    resolver: zodResolver(footballMatchSchema),
    defaultValues: { 
        opponent: "",
        result: "draw",
        goals: 0,
        assists: 0, 
        minutesPlayed: 90,
        position: "",
        stamina: 5, 
        date: new Date(),
        notes: "",
        motm: false,
    },
  });
  
  const selectedResult = logMatchForm.watch("result");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "football_matches"), where("userId", "==", user.uid), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userMatches: FootballMatch[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        userMatches.push({ id: doc.id, ...data, date: (data.date as Timestamp).toDate() } as FootballMatch);
      });
      setMatches(userMatches);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogMatchSubmit = async (values: FootballMatchInput) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "football_matches"), { ...values, userId: user.uid });
      logMatchForm.reset();
      setIsLogDialogOpen(false);
      setCurrentStep(1);
      toast({ title: t('matchReportFiled'), description: t('matchReportFiledDescription', { opponent: values.opponent }) });
    } catch (error) {
      console.error("Error logging match: ", error);
      toast({ title: "Error", description: t('matchLogError'), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try {
        await deleteMatch(matchId);
        toast({
            title: t('matchDeleted'),
            description: t('matchDeletedDescription'),
        });
    } catch (error) {
        console.error("Error deleting match:", error);
        toast({
            title: t('deletionFailed'),
            description: t('deletionFailedDescription'),
            variant: "destructive",
        });
    }
  }
  
  const goToNextStep = async () => {
    const fieldsToValidate = wizardSteps.find(s => s.step === currentStep)?.fields;
    const isValid = await logMatchForm.trigger(fieldsToValidate as any);
    if (isValid) {
        setCurrentStep(prev => prev + 1);
    }
  }

  const goToPrevStep = () => {
      setCurrentStep(prev => prev - 1);
  }

  const handleTacticalQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tacticalQuestion.trim() || !user) return;
    setIsAsking(true);
    setTacticalAdvice(null);
    try {
      const result = await getTacticalAdvice({ userId: user!.uid, sport: 'football', question: tacticalQuestion });
      setTacticalAdvice(result);
    } catch (error: any) {
      console.error("Error getting tactical advice:", error);
      toast({ title: t('aiError'), description: error.message || t('tacticalCoachError'), variant: "destructive" });
    } finally {
      setIsAsking(false);
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiResponding || !user) return;

    const newUserMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, newUserMessage]);
    const currentChatInput = chatInput;
    setChatInput("");
    setIsAiResponding(true);

    try {
        const result = await getTacticalAdvice({ userId: user.uid, sport: 'football', question: currentChatInput });
        const aiResponseMessage: ChatMessage = { role: 'ai', content: result.advice };
        setChatMessages(prev => [...prev, aiResponseMessage]);
    } catch (error: any) {
        console.error("AI chat error:", error);
        const errorResponse: ChatMessage = { role: 'ai', content: error.message || "Sorry, I'm having trouble connecting. Please try again in a moment." };
        setChatMessages(prev => [...prev, errorResponse]);
        toast({
            title: t('aiError'),
            description: error.message || t('tacticalCoachError'),
            variant: "destructive"
        });
    } finally {
        setIsAiResponding(false);
    }
  };


  const handleSetGoal = (values: GoalInput) => {
    setGoal(values.goal);
    setIsGoalDialogOpen(false);
    toast({ title: t('goalSet'), description: t('goalUpdated') });
  }

  const handleCompleteGoal = () => {
      toast({
          title: t('goalCompleted'),
          description: `${t('goalCompletedDescription')}: "${goal}"`,
      });
      setGoal(null);
  }
  
  const handleLogTestSubmit = (values: SprintTestInput) => {
    setSprintTestData(prev => [...prev, values]);
    sprintTestForm.reset();
    setIsLogTestOpen(false);
    toast({
        title: "Test Result Logged!",
        description: "Your sprint data has been updated.",
    });
  }

  const handleUpdateRecovery = (values: RecoveryInput) => {
    setRecoveryData(prev => ({
        ...prev,
        sleep: values.sleep ?? prev.sleep,
        hrv: values.hrv ?? prev.hrv,
        soreness: values.soreness ?? prev.soreness,
    }));
    setIsRecoveryDialogOpen(false);
    toast({ title: "Recovery data updated!" });
  }


  const analytics = useMemo(() => {
    const totalMatches = matches.length;
    if (totalMatches === 0) {
        return {
            totalTrainingSessions: schedule.length,
            totalMinutesPlayed: 0,
            totalGoals: 0,
            totalAssists: 0,
            staminaData: [],
            goalData: [],
        };
    }

    const totalMinutesPlayed = matches.reduce((sum, m) => sum + m.minutesPlayed, 0);
    const totalGoals = matches.reduce((sum, m) => sum + m.goals, 0);
    const totalAssists = matches.reduce((sum, m) => sum + m.assists, 0);
    const staminaData = matches.slice(0, 5).map(m => ({ match: `vs ${m.opponent}`, stamina: m.stamina })).reverse();
    
    // Group goals by month
    const goalsByMonth: {[key: string]: number} = {};
    matches.forEach(m => {
        const month = format(m.date, 'MMM');
        if (!goalsByMonth[month]) {
            goalsByMonth[month] = 0;
        }
        goalsByMonth[month] += m.goals;
    });

    const goalData = Object.keys(goalsByMonth).map(month => ({ month, goals: goalsByMonth[month] }));

    return {
        totalTrainingSessions: schedule.length,
        totalMinutesPlayed,
        totalGoals,
        totalAssists,
        staminaData,
        goalData,
    };
  }, [matches, schedule]);


  const radarChartData = useMemo(() => {
    return skillsData.map(skill => ({
      subject: t(skill.name as any),
      value: skill.value,
      fullMark: 100,
    }));
  }, [skillsData, t]);


  const renderLoading = () => (
    <div className="flex justify-center items-center h-full p-8">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  );
  
  const getResultClasses = (result: MatchResult) => {
      switch (result) {
          case 'win': return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' };
          case 'draw': return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30' };
          case 'loss': return { bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/30' };
      }
  }
  
  const [activeTab, setActiveTab] = useState("overview");

  const tabsConfig = [
    { value: "overview", labelKey: "overview", icon: Activity, pro: false },
    { value: "training", labelKey: "training", icon: CalendarDays, pro: false },
    { value: "logbook", labelKey: "logbook", icon: ClipboardList, pro: false },
    { value: "skills", labelKey: "skills", icon: Shield, pro: false },
    { value: "video", labelKey: "video", icon: Video, pro: true },
    { value: "coach", labelKey: "aiCoach", icon: BrainCircuit, pro: true },
  ];

  const handleTabChange = (value: string) => {
    const selectedTab = tabsConfig.find(t => t.value === value);
    if (selectedTab?.pro && user?.plan !== 'pro') {
      setIsUpgradeModalOpen(true);
    } else {
      setActiveTab(value);
    }
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    const selectedTab = tabsConfig.find(t => t.value === tab);
    if (selectedTab) {
      if (selectedTab.pro && user?.plan !== 'pro') {
        setIsUpgradeModalOpen(true);
      } else {
        setActiveTab(tab!);
      }
    }
  }, [searchParams, user]);

  return (
    <>
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
            {tabsConfig.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                    <tab.icon className="w-4 h-4 mr-2" />
                    {t(tab.labelKey as any)}
                    {tab.pro && user?.plan !== 'pro' && <Lock className="h-3 w-3 ml-2 text-yellow-500" />}
                </TabsTrigger>
            ))}
        </TabsList>
        <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-6">
                      <Card>
                          <CardHeader className="flex flex-row items-center gap-4">
                              <Avatar className="h-20 w-20">
                                  <AvatarImage src={`https://placehold.co/128x128.png`} alt={user?.displayName || "Player"} data-ai-hint="player portrait" />
                                  <AvatarFallback>{user?.displayName?.charAt(0) || "P"}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <CardTitle className="text-2xl">{user?.displayName || 'Player Name'}</CardTitle>
                                  <CardDescription>{t('forward')} - {t('localFC')}</CardDescription>
                              </div>
                          </CardHeader>
                      </Card>
                      <Card>
                          <CardHeader>
                              <CardTitle>{t('aiCoachInsight')}</CardTitle>
                          </CardHeader>
                          <CardContent>
                              <div className="p-4 bg-primary/10 rounded-lg">
                                  <p className="text-sm font-semibold">{t('aiCoachInsightExample')}</p>
                              </div>
                          </CardContent>
                      </Card>
                      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                          <Card className="p-4 flex flex-col items-center justify-center text-primary bg-primary/10 hover:border-primary/50 transition-colors">
                              {goal ? (
                                  <>
                                      <div className="flex-grow text-center">
                                          <p className="text-lg font-bold">🎯 {t('currentGoal')}</p>
                                          <p className="text-xs mt-1">{goal}</p>
                                      </div>
                                      <div className="flex gap-1 mt-2">
                                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCompleteGoal}><Check className="h-4 w-4 text-success" /></Button>
                                          <DialogTrigger asChild>
                                              <Button size="icon" variant="ghost" className="h-7 w-7"><Edit className="h-4 w-4" /></Button>
                                          </DialogTrigger>
                                      </div>
                                  </>
                              ) : (
                                  <DialogTrigger asChild>
                                      <div className="text-center cursor-pointer">
                                          <Plus className="mx-auto h-8 w-8" />
                                          <p className="text-xs font-semibold">{t('setGoal')}</p>
                                      </div>
                                  </DialogTrigger>
                              )}
                          </Card>
                          <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>{goal ? t('editGoal') : t('setNewGoal')}</DialogTitle>
                                  <DialogDescription>
                                      {t('goalPrompt')}
                                  </DialogDescription>
                              </DialogHeader>
                              <form onSubmit={goalForm.handleSubmit(handleSetGoal)} className="space-y-4">
                                  <Textarea {...goalForm.register("goal")} placeholder={t('goalPlaceholder')} />
                                  {goalForm.formState.errors.goal && <p className="text-destructive text-xs">{goalForm.formState.errors.goal.message}</p>}
                                  <DialogFooter>
                                      <Button type="submit">{t('saveGoal')}</Button>
                                  </DialogFooter>
                              </form>
                          </DialogContent>
                      </Dialog>
                  </div>
                  <div className="lg:col-span-2 space-y-6">
                      <Card>
                          <CardHeader>
                              <CardTitle>{t('weeklyRecap')}</CardTitle>
                              <CardDescription>{t('weeklyRecapDescription')}</CardDescription>
                          </CardHeader>
                          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                              <div className="bg-muted p-4 rounded-lg">
                                  <p className="text-3xl font-bold">{analytics.totalTrainingSessions}</p>
                                  <p className="text-xs text-muted-foreground">{t('sessions')}</p>
                              </div>
                              <div className="bg-muted p-4 rounded-lg">
                                  <p className="text-3xl font-bold">{analytics.totalMinutesPlayed}</p>
                                  <p className="text-xs text-muted-foreground">{t('minsPlayed')}</p>
                              </div>
                              <div className="bg-muted p-4 rounded-lg">
                                  <p className="text-3xl font-bold">{analytics.totalGoals}</p>
                                  <p className="text-xs text-muted-foreground">{t('goals')}</p>
                              </div>
                              <div className="bg-muted p-4 rounded-lg">
                                  <p className="text-3xl font-bold">{analytics.totalAssists}</p>
                                  <p className="text-xs text-muted-foreground">{t('assists')}</p>
                              </div>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader>
                              <CardTitle>{t('progressRadar')}</CardTitle>
                              <CardDescription>{t('progressRadarDescription')}</CardDescription>
                          </CardHeader>
                          <CardContent className="h-80 w-full p-0">
                              <ChartContainer config={radarChartConfig} className="mx-auto aspect-square h-full w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                                          <PolarGrid />
                                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                          <Radar name="Player" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                                          <ChartTooltip content={<ChartTooltipContent />} />
                                      </RadarChart>
                                  </ResponsiveContainer>
                              </ChartContainer>
                          </CardContent>
                      </Card>
                  </div>
              </div>
          </TabsContent>
          <TabsContent value="training" className="mt-6 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                          <CardTitle>{t('trainingSchedule')}</CardTitle>
                          <CardDescription>{t('trainingScheduleDescription')}</CardDescription>
                      </div>
                      <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
                          <DialogTrigger asChild>
                              <Button><Plus className="mr-2 h-4 w-4" /> {t('addSession')}</Button>
                          </DialogTrigger>
                          <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>{t('addSession')}</DialogTitle>
                                  <DialogDescription>{t('addSessionDescription')}</DialogDescription>
                              </DialogHeader>
                              <form onSubmit={addSessionForm.handleSubmit(handleAddSession)} className="space-y-4">
                                  <div>
                                      <Label htmlFor="title">{t('sessionName')}</Label>
                                      <Input id="title" {...addSessionForm.register("title")} placeholder={t('sessionNamePlaceholder')} />
                                      {addSessionForm.formState.errors.title && <p className="text-destructive text-xs mt-1">{addSessionForm.formState.errors.title.message}</p>}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <Label>{t('sessionType')}</Label>
                                          <Select onValueChange={(value) => addSessionForm.setValue("type", value as any)} defaultValue={addSessionForm.getValues("type")}>
                                              <SelectTrigger><SelectValue placeholder={t('sessionTypePlaceholder')} /></SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value="technical">{t('technical')}</SelectItem>
                                                  <SelectItem value="tactical">{t('tactical')}</SelectItem>
                                                  <SelectItem value="physical">{t('physical')}</SelectItem>
                                                  <SelectItem value="other">{t('other')}</SelectItem>
                                              </SelectContent>
                                          </Select>
                                      </div>
                                      <div>
                                          <Label htmlFor="duration">{t('duration')} (mins)</Label>
                                          <Input id="duration" type="number" {...addSessionForm.register("duration")} />
                                          {addSessionForm.formState.errors.duration && <p className="text-destructive text-xs mt-1">{addSessionForm.formState.errors.duration.message}</p>}
                                      </div>
                                  </div>
                                  <div>
                                      <Label>{t('date')}</Label>
                                      <Popover>
                                          <PopoverTrigger asChild>
                                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !addSessionForm.watch("date") && "text-muted-foreground")}>
                                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                                  {addSessionForm.watch("date") ? format(addSessionForm.watch("date"), "PPP") : <span>{t('pickADate')}</span>}
                                              </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0">
                                              <Calendar
                                                  mode="single"
                                                  selected={addSessionForm.watch("date")}
                                                  onSelect={(date) => addSessionForm.setValue("date", date as Date)}
                                                  initialFocus
                                              />
                                          </PopoverContent>
                                      </Popover>
                                      {addSessionForm.formState.errors.date && <p className="text-destructive text-xs mt-1">{addSessionForm.formState.errors.date.message}</p>}
                                  </div>
                                  <div>
                                      <Label htmlFor="notes">{t('notes')}</Label>
                                      <Textarea id="notes" {...addSessionForm.register("notes")} placeholder={t('notesPlaceholder')} />
                                  </div>
                                  <DialogFooter>
                                      <Button type="button" variant="ghost" onClick={() => setIsAddSessionOpen(false)}>{t('cancel')}</Button>
                                      <Button type="submit">{t('saveSession')}</Button>
                                  </DialogFooter>
                              </form>
                          </DialogContent>
                      </Dialog>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1">
                          <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              className="rounded-md border"
                          />
                      </div>
                      <div className="md:col-span-2 space-y-4">
                          <h3 className="font-semibold text-lg">{t('upcomingSessions')}</h3>
                          <ScrollArea className="h-72">
                              <div className="space-y-4 pr-4">
                                  {schedule.length > 0 && schedule.filter(s => {
                                      if (!selectedDate) return true;
                                      if (!s.date) return false;
                                      return s.date.toDateString() === selectedDate.toDateString();
                                  }).length > 0 ? (
                                      schedule.filter(s => {
                                          if (!selectedDate) return true;
                                          if (!s.date) return false;
                                          return s.date.toDateString() === selectedDate.toDateString();
                                      }).map(session => (
                                          <Card key={session.id} className="flex items-center p-4 gap-4">
                                              <div className="flex-shrink-0">
                                                  {session.type === 'technical' && <Sparkles className="h-8 w-8 text-muted-foreground" />}
                                                  {session.type === 'tactical' && <BrainCircuit className="h-8 w-8 text-muted-foreground" />}
                                                  {session.type === 'physical' && <Dumbbell className="h-8 w-8 text-muted-foreground" />}
                                                  {session.type === 'other' && <Activity className="h-8 w-8 text-muted-foreground" />}
                                              </div>
                                              <div className="flex-grow">
                                                  <p className="font-semibold">{session.title}</p>
                                                  <p className="text-sm text-muted-foreground">{session.duration} {t('mins')}</p>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                  <Checkbox
                                                      checked={session.completed}
                                                      onCheckedChange={() => handleToggleSession(session.id)}
                                                      id={`session-${session.id}`}
                                                  />
                                                  <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                                              <Trash2 className="h-4 w-4 text-destructive" />
                                                          </Button>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                          <AlertDialogHeader>
                                                              <AlertDialogTitle>{t('deleteSessionTitle')}</AlertDialogTitle>
                                                              <AlertDialogDescription>
                                                                  {t('deleteSessionDescription', { title: session.title })}
                                                              </AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                              <AlertDialogAction onClick={() => handleDeleteSession(session.id)}>{t('delete')}</AlertDialogAction>
                                                          </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                  </AlertDialog>
                                              </div>
                                          </Card>
                                      ))
                                  ) : (
                                      <p className="text-muted-foreground text-center py-10">{t('noSessionsScheduled')}</p>
                                  )}
                              </div>
                          </ScrollArea>
                      </div>
                  </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="logbook" className="mt-6 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                          <CardTitle>{t('matchHistory')}</CardTitle>
                          <CardDescription>{t('matchHistoryDescription')}</CardDescription>
                      </div>
                      <Dialog open={isLogDialogOpen} onOpenChange={(isOpen) => { setIsLogDialogOpen(isOpen); if (!isOpen) { logMatchForm.reset(); setCurrentStep(1); }}}>
                          <DialogTrigger asChild>
                              <Button>
                                  <Plus className="mr-2 h-4 w-4" />
                                  {t('logNewMatch')}
                              </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl p-0">
                              <DialogHeader className="p-6 pb-4">
                                  <DialogTitle className="text-2xl font-bold font-headline">{t('postMatchReport')}</DialogTitle>
                                  <CardDescription>{t('postMatchReportDescription')}</CardDescription>
                              </DialogHeader>

                              <div className="px-6 pb-6">
                                  <div className="flex items-center gap-4 mb-6">
                                      {wizardSteps.map((s, index) => (
                                          <React.Fragment key={s.step}>
                                              <div className="flex flex-col items-center gap-1">
                                                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center transition-all", currentStep > s.step ? "bg-primary text-primary-foreground" : currentStep === s.step ? "bg-primary text-primary-foreground ring-4 ring-primary/30" : "bg-muted text-muted-foreground")}>
                                                      {currentStep > s.step ? <CheckCircle className="h-5 w-5" /> : <span className="font-bold">{s.step}</span>}
                                                  </div>
                                                  <p className={cn("text-xs transition-colors", currentStep >= s.step ? "text-primary" : "text-muted-foreground")}>{t(s.titleKey as any)}</p>
                                              </div>
                                              {index < wizardSteps.length - 1 && <div className="flex-1 h-0.5 bg-border mt-[-1rem]" />}
                                          </React.Fragment>
                                      ))}
                                  </div>


                                  <Form {...logMatchForm}>
                                      <form onSubmit={logMatchForm.handleSubmit(handleLogMatchSubmit)} className="min-h-[350px]">
                                          <AnimatePresence mode="wait">
                                              <motion.div
                                                  key={currentStep}
                                                  initial={{ x: 30, opacity: 0 }}
                                                  animate={{ x: 0, opacity: 1 }}
                                                  exit={{ x: -30, opacity: 0 }}
                                                  transition={{ duration: 0.3 }}
                                              >
                                                  {currentStep === 1 && (
                                                      <div className="space-y-6">
                                                          <FormField control={logMatchForm.control} name="opponent" render={({ field }) => (<FormItem><FormLabel>{t('opponent')}</FormLabel><FormControl><Input placeholder={t('footballOpponentPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                          <FormField control={logMatchForm.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>{t('dateOfMatch')}</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP")) : (<span>{t('pickADate')}</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                                          <FormField control={logMatchForm.control} name="result" render={({ field }) => (
                                                              <FormItem>
                                                                  <FormLabel>{t('finalResult')}</FormLabel>
                                                                  <div className="flex gap-2 pt-2">
                                                                      {(['win', 'draw', 'loss'] as MatchResult[]).map((result) => (
                                                                          <Button key={result} type="button" variant={selectedResult === result ? 'default' : 'outline'} onClick={() => field.onChange(result)} className="w-full capitalize">{t(result)}</Button>
                                                                      ))}
                                                                  </div>
                                                                  <FormMessage />
                                                              </FormItem>
                                                          )} />
                                                      </div>
                                                  )}

                                                  {currentStep === 2 && (
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                          <FormField control={logMatchForm.control} name="position" render={({ field }) => (<FormItem><FormLabel>{t('positionPlayed')}</FormLabel><FormControl><Input placeholder={t('footballPositionPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                          <FormField control={logMatchForm.control} name="minutesPlayed" render={({ field }) => (<FormItem><FormLabel>{t('minutesPlayed')}</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                                                          <FormField control={logMatchForm.control} name="goals" render={({ field }) => (<FormItem><FormLabel>{t('goalsScored')}</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)}/></FormControl><FormMessage /></FormItem>)} />
                                                          <FormField control={logMatchForm.control} name="assists" render={({ field }) => (<FormItem><FormLabel>{t('assistsProvided')}</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)}/></FormControl><FormMessage /></FormItem>)} />
                                                          <FormField control={logMatchForm.control} name="motm" render={({ field }) => (
                                                              <FormItem className="md:col-span-2 flex flex-row items-center justify-between rounded-lg border p-4">
                                                                  <div className="space-y-0.5"><FormLabel className="text-base">{t('manOfTheMatch')}</FormLabel><FormDescription>{t('motmDescription')}</FormDescription></div>
                                                                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                              </FormItem>
                                                          )} />
                                                      </div>
                                                  )}

                                                  {currentStep === 3 && (
                                                      <div className="space-y-6">
                                                          <FormField control={logMatchForm.control} name="stamina" render={({ field }) => (
                                                              <FormItem>
                                                                  <FormLabel>{t('staminaRating')} ({field.value}/10)</FormLabel>
                                                                  <FormControl><Slider min={1} max={10} step={1} defaultValue={[field.value]} onValueChange={(value) => field.onChange(value[0])} /></FormControl>
                                                                  <FormMessage />
                                                              </FormItem>
                                                          )} />
                                                          <FormField control={logMatchForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>{t('performanceNotes')}</FormLabel><FormControl><Textarea placeholder={t('performanceNotesPlaceholder')} className="min-h-[120px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                      </div>
                                                  )}
                                              </motion.div>
                                          </AnimatePresence>

                                          <div className="flex justify-between gap-2 pt-8">
                                              <div>
                                                  {currentStep > 1 && (<Button type="button" variant="ghost" onClick={goToPrevStep}>{t('back')}</Button>)}
                                              </div>
                                              <div>
                                                  {currentStep < wizardSteps.length && (<Button type="button" onClick={goToNextStep}>{t('next')}</Button>)}
                                                  {currentStep === wizardSteps.length && (<Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('saving') : t('saveReport')}</Button>)}
                                              </div>
                                          </div>
                                      </form>
                                  </Form>
                              </div>
                          </DialogContent>
                      </Dialog>
                  </CardHeader>
                  <CardContent>
                      {isUserLoading ? renderLoading() : (
                      <div className="space-y-4">
                          {matches.length > 0 ? matches.map((match) => {
                              const resultClasses = getResultClasses(match.result);
                              return (
                              <Card key={match.id} className={cn("overflow-hidden hover:border-primary/50 transition-colors group", resultClasses.bg)}>
                                  <div className={cn("h-1.5 w-full", resultClasses.text.replace('text-', 'bg-'))}></div>
                                  <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="font-bold text-lg text-foreground">vs {match.opponent}</p>
                                          <p className={cn("text-sm font-semibold capitalize", resultClasses.text)}>{t(match.result)}</p>
                                      </div>
                                      <div className="text-right">
                                          <div className="flex items-center gap-2">
                                              <p className="text-sm text-muted-foreground">{format(match.date, "dd MMM yyyy")}</p>
                                              <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                          <Trash2 className="h-4 w-4" />
                                                      </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                      <AlertDialogHeader>
                                                      <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                          {t('deleteMatchConfirmation', { opponent: match.opponent })}
                                                      </AlertDialogDescription>
                                                      </AlertDialogHeader>
                                                      <AlertDialogFooter>
                                                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                      <AlertDialogAction onClick={() => handleDeleteMatch(match.id)}>{t('delete')}</AlertDialogAction>
                                                      </AlertDialogFooter>
                                                  </AlertDialogContent>
                                              </AlertDialog>
                                          </div>
                                          {match.motm && <div className="mt-1 flex justify-end items-center gap-1 text-warning"><Star className="h-4 w-4" /><span className="text-xs font-semibold">MOTM</span></div>}
                                      </div>
                                  </div>
                                  <div className="mt-4 flex justify-around text-center border-t border-border/20 pt-3">
                                      <div className="text-foreground"><p className="font-bold text-xl">{match.goals}</p><p className="text-xs text-muted-foreground">{t('goals')}</p></div>
                                      <div className="text-foreground"><p className="font-bold text-xl">{match.assists}</p><p className="text-xs text-muted-foreground">{t('assists')}</p></div>
                                      <div className="text-foreground"><p className="font-bold text-xl">{match.minutesPlayed}</p><p className="text-xs text-muted-foreground">{t('mins')}</p></div>
                                      <div className="text-foreground"><p className="font-bold text-xl">{match.stamina}/10</p><p className="text-xs text-muted-foreground">{t('stamina')}</p></div>
                                  </div>
                                  {match.notes && <div className="mt-4 text-xs text-muted-foreground border-t border-border/20 pt-3"><strong>{t('notes')}:</strong> {match.notes}</div>}
                                  </CardContent>
                              </Card>
                          )}) : (<div className="text-center h-48 text-muted-foreground flex flex-col items-center justify-center">
                              <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
                              <h3 className="font-semibold">{t('noMatchesLogged')}</h3>
                              <p className="text-sm">{t('noMatchesLoggedDescription')}</p>
                          </div>)}
                      </div>
                      )}
                  </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                      <CardHeader>
                          <CardTitle>{t('staminaOverMatches')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <ChartContainer config={{stamina: {label: "Stamina", color: "hsl(var(--primary))"}}} className="h-64">
                              <BarChart data={analytics.staminaData} accessibilityLayer>
                                  <CartesianGrid vertical={false} />
                                  <XAxis dataKey="match" tickLine={false} tickMargin={10} axisLine={false} />
                                  <YAxis domain={[0, 10]} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Bar dataKey="stamina" fill="var(--color-stamina)" radius={4} />
                              </BarChart>
                          </ChartContainer>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader>
                          <CardTitle>{t('goalsPerMonth')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <ChartContainer config={goalsChartConfig} className="h-64">
                              <AreaChart data={analytics.goalData} accessibilityLayer>
                                  <CartesianGrid vertical={false} />
                                  <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                                  <YAxis />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Area dataKey="goals" type="natural" fill="var(--color-goals)" fillOpacity={0.4} stroke="var(--color-goals)" />
                              </AreaChart>
                          </ChartContainer>
                      </CardContent>
                  </Card>
              </div>
          </TabsContent>
          <TabsContent value="skills" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                      <CardHeader>
                          <CardTitle>{t('technicalSkills')}</CardTitle>
                          <CardDescription>{t('technicalSkillsDescription')}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          {skillsData.map(skill => (
                              <div key={skill.name}>
                                  <div className="flex justify-between mb-1">
                                      <Label className="text-sm capitalize">{t(skill.name as any)}</Label>
                                      <span className="text-sm font-semibold">{skill.value}</span>
                                  </div>
                                  <Slider 
                                      defaultValue={[skill.value]} 
                                      max={100} 
                                      step={1} 
                                      onValueChange={(value) => handleUpdateSkill(skill.name, value)}
                                  />
                              </div>
                          ))}
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader>
                          <CardTitle>{t('physicalTests')}</CardTitle>
                          <CardDescription>{t('physicalTestsDescription')}</CardDescription>
                      </CardHeader>
                      <CardContent className="h-80">
                          <ChartContainer config={sprintChartConfig} className="h-full w-full">
                              <LineChart accessibilityLayer data={sprintTestData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                  <CartesianGrid vertical={false} />
                                  <XAxis dataKey="date" />
                                  <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Line type="monotone" dataKey="time" stroke="var(--color-time)" strokeWidth={2} dot={{r: 4}} />
                              </LineChart>
                          </ChartContainer>
                      </CardContent>
                      <CardFooter>
                          <Dialog open={isLogTestOpen} onOpenChange={setIsLogTestOpen}>
                              <DialogTrigger asChild>
                                  <Button className="w-full" variant="secondary">
                                      {t('logNewTest')}
                                  </Button>
                              </DialogTrigger>
                              <DialogContent>
                                  <DialogHeader>
                                      <DialogTitle>Log New Sprint Test</DialogTitle>
                                      <DialogDescription>Add a new 100m sprint test result.</DialogDescription>
                                  </DialogHeader>
                                  <Form {...sprintTestForm}>
                                      <form onSubmit={sprintTestForm.handleSubmit(handleLogTestSubmit)} className="space-y-4">
                                          <FormField
                                              control={sprintTestForm.control}
                                              name="date"
                                              render={({ field }) => (
                                                  <FormItem>
                                                      <FormLabel>Date Abbreviation</FormLabel>
                                                      <FormControl>
                                                          <Input placeholder="e.g., Jul" {...field} />
                                                      </FormControl>
                                                      <FormMessage />
                                                  </FormItem>
                                              )}
                                          />
                                          <FormField
                                              control={sprintTestForm.control}
                                              name="time"
                                              render={({ field }) => (
                                                  <FormItem>
                                                      <FormLabel>Time (seconds)</FormLabel>
                                                      <FormControl>
                                                          <Input type="number" step="0.01" placeholder="e.g., 10.8" {...field} />
                                                      </FormControl>
                                                      <FormMessage />
                                                  </FormItem>
                                              )}
                                          />
                                          <DialogFooter>
                                              <Button type="submit">Save Result</Button>
                                          </DialogFooter>
                                      </form>
                                  </Form>
                              </DialogContent>
                          </Dialog>
                      </CardFooter>
                  </Card>
              </div>
          </TabsContent>
          <TabsContent value="video" className="mt-6 space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle>{t('videoReviewZone')}</CardTitle>
                      <CardDescription>{t('videoReviewZoneDescriptionFootball')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="video-prompt">{t("videoPrompt")}</Label>
                          <Input 
                              id="video-prompt"
                              placeholder={t("footballVideoPromptPlaceholder")}
                              value={videoAnalysisPrompt}
                              onChange={(e) => setVideoAnalysisPrompt(e.target.value)}
                              disabled={isUploading}
                          />
                      </div>
                      {selectedFile ? (
                          <div className="border rounded-lg p-4 space-y-4">
                              <div className="flex items-start gap-4">
                                  <div className="bg-primary/10 text-primary p-3 rounded-lg"><FileVideo className="h-6 w-6" /></div>
                                  <div className="flex-grow">
                                      <p className="font-semibold">{selectedFile.name}</p>
                                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} disabled={isUploading}><X className="h-4 w-4" /></Button>
                              </div>
                              {isUploading && (
                                  <div className="space-y-2">
                                  <Progress value={uploadProgress} />
                                  <p className="text-xs text-muted-foreground text-center">{`${t("uploading")}... ${uploadProgress.toFixed(0)}%`}</p>
                                  </div>
                              )}
                              <Button onClick={handleUpload} disabled={isUploading || !videoAnalysisPrompt.trim()} className="w-full">
                                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                  {isUploading ? t('analyzing') : t('uploadAndAnalyze')}
                              </Button>
                          </div>
                      ) : (
                          <label 
                              htmlFor="video-upload-football"
                              className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg p-12 text-center group hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                              <Upload className="mx-auto h-12 w-12 text-muted-foreground group-hover:text-primary" />
                              <h3 className="mt-4 text-lg font-medium">{t("clickToSelectVideo")}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">{t("maxFileSizeFootball")}</p>
                              <Input
                                  id="video-upload-football"
                                  type="file"
                                  className="sr-only"
                                  accept="video/*"
                                  onChange={handleFileSelect}
                                  disabled={isUploading}
                              />
                          </label>
                      )}
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>{t("submittedVideos")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {uploadedVideos.length > 0 ? (
                          uploadedVideos.map((video) => (
                              <Card key={video.id} className="flex flex-col md:flex-row gap-4 p-4">
                                  <div className="w-full md:w-48 h-32 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Video className="w-10 h-10 text-muted-foreground"/>
                                  </div>
                                  <div className="flex-grow">
                                      <h4 className="font-semibold">{video.name}</h4>
                                      <p className="text-xs text-muted-foreground">
                                          Prompt: <span className="font-medium text-foreground">{video.prompt}</span>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                          Status: <span className={cn(
                                              video.status === "AI is reviewing..." && "text-primary animate-pulse",
                                              video.status === "Reviewed" && "text-success",
                                              video.status === "Failed" && "text-destructive"
                                          )}>{video.status}</span>
                                      </p>
                                      <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                          <h5 className="text-sm font-semibold">AI Feedback</h5>
                                          <p className="text-xs text-muted-foreground italic mt-1 whitespace-pre-wrap">
                                              {video.feedback || "No feedback yet."}
                                          </p>
                                      </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                      <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon">
                                                  <Trash2 className="h-4 w-4 text-destructive" />
                                              </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                              <AlertDialogHeader>
                                                  <AlertDialogTitle>{t("deleteVideo")}</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                      {t("deleteVideoConfirmation", { fileName: video.name })}
                                                  </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDeleteVideo(video)}>{t("delete")}</AlertDialogAction></AlertDialogFooter>
                                          </AlertDialogContent>
                                      </AlertDialog>
                                  </div>
                              </Card>
                          ))
                      ) : (
                          <div className="text-center py-12 text-muted-foreground">
                              <p>{t("noVideosUploaded")}</p>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="coach" className="mt-6">
              <Card className="h-[70vh] flex flex-col">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Bot /> {t('aiCoachChat')}</CardTitle>
                      <CardDescription>{t('aiCoachChatDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow overflow-hidden">
                      <ScrollArea className="h-full pr-4">
                          <div className="space-y-4">
                              {chatMessages.map((message, index) => (
                                  <div key={index} className={cn("flex items-start gap-3", message.role === 'user' && 'justify-end')}>
                                      {message.role === 'ai' && (
                                          <Avatar className="w-8 h-8 border">
                                              <AvatarFallback><Bot /></AvatarFallback>
                                          </Avatar>
                                      )}
                                      <div className={cn("p-3 rounded-lg max-w-md", message.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground')}>
                                          <p className="text-sm">{message.content}</p>
                                      </div>
                                      {message.role === 'user' && (
                                          <Avatar className="w-8 h-8 border">
                                              <AvatarFallback><UserIcon /></AvatarFallback>
                                          </Avatar>
                                      )}
                                  </div>
                              ))}
                              {isAiResponding && (
                                  <div className="flex items-start gap-3">
                                      <Avatar className="w-8 h-8 border">
                                          <AvatarFallback><Bot /></AvatarFallback>
                                      </Avatar>
                                      <div className="bg-muted p-3 rounded-lg max-w-md flex items-center gap-2">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <p className="text-sm text-muted-foreground">Thinking...</p>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </ScrollArea>
                  </CardContent>
                  <CardFooter className="pt-4 border-t">
                      <form className="flex w-full items-center space-x-2" onSubmit={handleChatSubmit}>
                          <Input 
                              id="message" 
                              placeholder={t('footballChatPlaceholder')}
                              className="flex-1" 
                              autoComplete="off" 
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              disabled={isAiResponding}
                          />
                          <Button type="submit" size="icon" disabled={isAiResponding || !chatInput.trim()}>
                              {isAiResponding ? <Loader2 className="animate-spin"/> : <Send />}
                              <span className="sr-only">Send</span>
                          </Button>
                      </form>
                  </CardFooter>
              </Card>
          </TabsContent>
      </Tabs>
      <UpgradeProModal open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen} />
      </>
  );
}
