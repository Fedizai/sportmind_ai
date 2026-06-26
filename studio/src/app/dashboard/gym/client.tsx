

"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Utensils, Plus, Trash2, Loader2, Calendar, Target, Sparkles, CheckCircle, RefreshCw, Video, Upload, LineChart, BarChart2, CalendarDays, HeartPulse, Move, Eye, Camera, ImagePlus, Weight, FileImage, FileVideo, X, Lock } from "lucide-react";
import { bodyParts, exercises as allExercises } from "@/lib/data";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AnimatePresence, motion } from "framer-motion";
import { usePlanStore } from '@/stores/plan-store';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { generateGymPlan } from '@/ai/flows/gym-plan-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { PlanOptions, GymPlan, WeightUnit } from '@/stores/plan-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { analyzeGymVideo } from '@/ai/flows/gym-video-analysis-flow';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, YAxis, Line, LineChart as RechartsLineChart } from "recharts"
import { Dialog, DialogHeader, DialogTitle, DialogTrigger, DialogContent, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useUser } from '@/hooks/use-user';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO, isValid as isDateValid } from 'date-fns';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import MuscleBodySelector from './body';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { UpgradeProModal } from '@/components/upgrade-pro-modal';
import { fr, enUS } from 'date-fns/locale';
import NutritionTab from './nutrition-tab';
import { useTranslation } from '@/hooks/use-translation';

type BodyPart = typeof bodyParts[0];
type Exercise = typeof allExercises[0];
type LogSet = { reps: string; weight: string };

const sessionSchema = z.object({
    title: z.string().min(1, "Session title is required."),
    type: z.enum(["strength", "cardio", "flexibility", "other"]),
    date: z.date({ required_error: "A date is required." }),
    duration: z.coerce.number().min(5, "Duration must be at least 5 minutes."),
    notes: z.string().optional(),
});
type SessionInput = z.infer<typeof sessionSchema>;
type ScheduleItem = SessionInput & { id: number; completed: boolean; date: Date | null };


// Video Upload Types
type UploadStatus = "AI is reviewing..." | "Reviewed" | "Failed";
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

const weightLogSchema = z.object({
  weight: z.coerce.number().min(1, "Weight must be greater than 0."),
  date: z.date(),
  notes: z.string().optional(),
});
type WeightLogInput = z.infer<typeof weightLogSchema>;
type WeightLog = WeightLogInput & { id: string; date: Date };

const progressPhotoSchema = z.object({
  date: z.date(),
  notes: z.string().optional(),
});
type ProgressPhotoInput = z.infer<typeof progressPhotoSchema>;
type ProgressPhoto = {
  id: string;
  url: string;
  date: Date;
  notes?: string;
  storagePath: string;
};

function ProgressTab() {
  const { user } = useUser();
  const { toast } = useToast();
  const [weightHistory, setWeightHistory] = useState<WeightLog[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isWeightFormOpen, setIsWeightFormOpen] = useState(false);
  const [isPhotoFormOpen, setIsPhotoFormOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const weightForm = useForm<WeightLogInput>({
    resolver: zodResolver(weightLogSchema),
    defaultValues: {
      weight: 75,
      date: new Date(),
      notes: "",
    },
  });

  const photoForm = useForm<ProgressPhotoInput>({
    resolver: zodResolver(progressPhotoSchema),
    defaultValues: {
      date: new Date(),
      notes: "",
    },
  });
  
  useEffect(() => {
    if (!user?.uid) return;

    const weightQuery = query(collection(db, `users/${user.uid}/bodyweightLogs`), orderBy("date", "asc"));
    const unsubscribeWeight = onSnapshot(weightQuery, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: (doc.data().date as Timestamp).toDate() } as WeightLog));
        setWeightHistory(logs);
    }, (error) => console.error("Error fetching weight logs:", error));

    const photoQuery = query(collection(db, `users/${user.uid}/progressPhotos`), orderBy("date", "desc"));
    const unsubscribePhotos = onSnapshot(photoQuery, (snapshot) => {
        const photos = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: (doc.data().date as Timestamp).toDate() } as ProgressPhoto));
        setProgressPhotos(photos);
    }, (error) => console.error("Error fetching progress photos:", error));
    
    return () => {
        unsubscribeWeight();
        unsubscribePhotos();
    };
}, [user?.uid]);

  const handleAddWeight = async (values: WeightLogInput) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not logged in' });
      return;
    }
    try {
      await addDoc(collection(db, `users/${user.uid}/bodyweightLogs`), {
        ...values,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Weight logged successfully!' });
      weightForm.reset({ weight: values.weight, date: new Date(), notes: "" });
      setIsWeightFormOpen(false);
    } catch (error) {
      console.error("Error logging weight:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not log weight.' });
    }
  };
  
   const handlePhotoUpload = async (values: ProgressPhotoInput) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not logged in' });
        return;
    }
    if (!selectedFile) {
        toast({ variant: 'destructive', title: 'No photo selected' });
        return;
    }
    const file = selectedFile;

    setIsUploading(true);
    setUploadProgress(0);
    const storagePath = `progressPhotos/${user.uid}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        },
        (error) => {
            console.error("Upload error:", error);
            toast({ variant: 'destructive', title: 'Upload failed', description: 'Could not upload your photo. Check storage rules and CORS configuration.' });
            setIsUploading(false);
        },
        async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(db, `users/${user.uid}/progressPhotos`), {
                ...values,
                date: Timestamp.fromDate(values.date),
                url: downloadURL,
                storagePath,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Photo uploaded!' });
            setIsUploading(false);
            photoForm.reset({ date: new Date(), notes: "" });
            setSelectedFile(null);
            setIsPhotoFormOpen(false);
        }
    );
};

const handleDeletePhoto = async (photo: ProgressPhoto) => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, `users/${user.uid}/progressPhotos`, photo.id));
        const storageRef = ref(storage, photo.storagePath);
        await deleteObject(storageRef);
        toast({ title: "Photo Deleted" });
    } catch (error) {
        console.error("Delete failed:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not delete photo." });
    }
};

  const weightChartConfig: ChartConfig = {
    weight: {
      label: "Weight (kg)",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Weight History</CardTitle>
          <CardDescription>Track your weight and upload photos to visualize your transformation. Combine data and visuals to stay motivated and measure your real results.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full mb-6">
             <ChartContainer config={weightChartConfig} className="w-full h-full">
                <RechartsLineChart data={weightHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(tick) => {
                           if (isDateValid(new Date(tick))) {
                               return format(new Date(tick), 'MMM d');
                           }
                           return '';
                        }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip
                         content={<ChartTooltipContent
                            formatter={(value) => `${value} kg`}
                            labelFormatter={(label) => {
                              try {
                                return format(new Date(label), 'PPP');
                              } catch (e) {
                                return label;
                              }
                            }}
                        />}
                    />
                    <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </RechartsLineChart>
            </ChartContainer>
          </div>
          <Dialog open={isWeightFormOpen} onOpenChange={setIsWeightFormOpen}>
             <DialogTrigger asChild>
                <Button className="w-full"><Plus className="mr-2 h-4 w-4" /> Add Weight Entry</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Weight Entry</DialogTitle>
                </DialogHeader>
                <Form {...weightForm}>
                    <form onSubmit={weightForm.handleSubmit(handleAddWeight)} className="space-y-4">
                        <FormField control={weightForm.control} name="weight" render={({ field }) => (<FormItem><Label>Weight (kg)</Label><Input type="number" {...field} /></FormItem>)} />
                        <FormField control={weightForm.control} name="date" render={({ field }) => (
                            <FormItem className="flex flex-col"><Label>Date</Label>
                            <Popover>
                                <PopoverTrigger asChild><Button variant="outline" className="justify-start font-normal"><Calendar className="mr-2 h-4 w-4"/>{field.value ? format(field.value, 'PPP') : "Pick a date"}</Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} /></PopoverContent>
                            </Popover>
                            </FormItem>
                        )} />
                        <FormField control={weightForm.control} name="notes" render={({ field }) => (<FormItem><Label>Notes (Optional)</Label><Textarea {...field} /></FormItem>)} />
                        <DialogFooter>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Visual Progress</CardTitle>
          <CardDescription>Visually track your progress by uploading photos.</CardDescription>
        </CardHeader>
        <CardContent>
             <Dialog open={isPhotoFormOpen} onOpenChange={setIsPhotoFormOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full"><Plus className="mr-2 h-4 w-4" /> Add Photo</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Progress Photo</DialogTitle>
                    </DialogHeader>
                     <Form {...photoForm}>
                        <form onSubmit={photoForm.handleSubmit(handlePhotoUpload)} className="space-y-4">
                            <Input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                            {selectedFile && <p className="text-sm text-muted-foreground">Selected file: {selectedFile.name}</p>}
                            <FormField control={photoForm.control} name="date" render={({ field }) => (
                                <FormItem className="flex flex-col"><Label>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant="outline" className="justify-start font-normal"><Calendar className="mr-2 h-4 w-4"/>{field.value ? format(field.value, 'PPP') : "Pick a date"}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} /></PopoverContent>
                                </Popover>
                                </FormItem>
                            )} />
                            <FormField control={photoForm.control} name="notes" render={({ field }) => (<FormItem><Label>Notes (Optional)</Label><Textarea {...field} /></FormItem>)} />
                            {isUploading && <Progress value={uploadProgress} className="w-full" />}
                            <DialogFooter>
                                <Button type="submit" disabled={isUploading || !selectedFile}>
                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    {isUploading ? "Uploading..." : "Upload"}
                                </Button>
                            </DialogFooter>
                        </form>
                     </Form>
                </DialogContent>
            </Dialog>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {progressPhotos.map(photo => (
                    <Card key={photo.id} className="group relative overflow-hidden">
                        <Image src={photo.url} alt={photo.notes || `Progress photo from ${format(photo.date, 'PPP')}`} width={200} height={300} className="rounded-t-lg object-cover aspect-[3/4]" data-ai-hint="progress photo" />
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. Are you sure you want to delete this progress photo?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePhoto(photo)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        <div className="p-2 text-xs">
                            <p className="font-semibold">{format(photo.date, 'PPP')}</p>
                            {photo.notes && <p className="text-muted-foreground truncate">{photo.notes}</p>}
                        </div>
                    </Card>
                ))}
            </div>
             {progressPhotos.length === 0 && !isUploading && (
                <div className="mt-6 text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                    <FileImage className="mx-auto h-12 w-12" />
                    <p className="mt-4 font-semibold">No progress photos yet.</p>
                    <p>Click "Add Photo" to start your visual timeline.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}


function WorkoutLogger() {
  const { t } = useTranslation();
  const [selectedBodyPartId, setSelectedBodyPartId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<LogSet[]>([{ reps: "10", weight: "60" }]);

  const handleSelectPart = (partId: string | null) => {
    setSelectedBodyPartId(partId);
    setSelectedExercise(null);
  };
  
  const selectedBodyPart = bodyParts.find(p => p.id === selectedBodyPartId) || null;

  const filteredExercises = selectedBodyPartId
    ? allExercises.filter((e) => e.bodyPartId === selectedBodyPartId)
    : [];

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setSets([{ reps: "10", weight: "60" }]);
  };

  const handleAddSet = () => {
    setSets([...sets, { reps: "", weight: "" }]);
  };

  const handleRemoveSet = (index: number) => {
    setSets(sets.filter((_, i) => i !== index));
  };

  const handleSetChange = (index: number, field: keyof LogSet, value: string) => {
    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  const handleSave = () => {
    console.log({
      exercise: selectedExercise,
      sets: sets,
    });
    alert(`Workout for ${selectedExercise?.name} saved!`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('selectBodyPart')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-4">
             <MuscleBodySelector selectedId={selectedBodyPartId} onSelect={handleSelectPart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedBodyPart?.name ? selectedBodyPart.name : "Select a Part"}</CardTitle>
            <CardDescription>Choose an exercise from the list.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {selectedBodyPart ? (
              filteredExercises.length > 0 ? (
                filteredExercises.map((ex) => (
                  <Button
                    key={ex.id}
                    variant={selectedExercise?.id === ex.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleSelectExercise(ex)}
                  >
                    {ex.name}
                  </Button>
                ))
              ) : <p className="text-sm text-muted-foreground">No exercises found for this body part.</p>
            ) : (
                <div className="space-y-2">
                    {bodyParts.map(part => (
                        <Button
                            key={part.id}
                            variant={selectedBodyPart?.id === part.id ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => handleSelectPart(part.id)}
                        >
                            {part.name}
                        </Button>
                    ))}
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>{selectedExercise?.name || t('noExerciseSelected')}</CardTitle>
          </CardHeader>
          {selectedExercise ? (
            <>
              <CardContent className="space-y-6">
                <div className="bg-muted rounded-lg p-4 flex justify-center">
                  <Image
                    src={selectedExercise.gifUrl}
                    alt={`${selectedExercise.name} GIF`}
                    data-ai-hint="exercise"
                    width={300}
                    height={300}
                    className="rounded-md"
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Workout Log</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/4">Set</TableHead>
                        <TableHead>Reps</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sets.map((set, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder="0"
                              value={set.reps}
                              onChange={(e) => handleSetChange(index, "reps", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder="0"
                              value={set.weight}
                              onChange={(e) => handleSetChange(index, "weight", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            {sets.length > 1 && (
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveSet(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button variant="outline" className="mt-4 w-full" onClick={handleAddSet}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Set
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0">
                <Button className="w-full" onClick={handleSave}>
                  Save Workout
                </Button>
              </CardFooter>
            </>
          ) : (
            <CardContent>
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                <p>{t('selectExerciseToStartLogging')}</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

const wizardSteps = [
    { step: 1, titleKey: 'Goals & Experience' },
    { step: 2, titleKey: 'Availability' },
    { step: 3, titleKey: 'Focus Areas' },
    { step: 4, titleKey: 'Generate Plan' }
];

function PlanGenerator() {
    const { toast } = useToast();
    const { setPlan } = usePlanStore();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    const [planOptions, setPlanOptions] = useState<PlanOptions>({
        goal: 'muscle_gain',
        experience: 'intermediate',
        daysPerWeek: 3,
        equipment: ['barbell', 'dumbbell'],
        focusAreas: ['chest', 'back', 'legs']
    });

    const handleGeneratePlan = async () => {
        setIsLoading(true);
        try {
            const result = await generateGymPlan(planOptions);
            if (!result || !result.days) {
                throw new Error("AI failed to generate a plan.");
            }
            await setPlan(result);
            toast({
                title: "Plan Generated!",
                description: "Your new gym plan is ready. Check your dashboard to see today's workout.",
            });
            // Don't reset wizard, the parent component will unmount this
        } catch (error) {
            console.error("Plan generation error:", error);
            toast({
                variant: 'destructive',
                title: "Generation Failed",
                description: "The AI coach couldn't create a plan. Please try again."
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const setOption = <K extends keyof PlanOptions>(key: K, value: PlanOptions[K]) => {
        setPlanOptions(prev => ({...prev, [key]: value}));
    };

    const toggleEquipment = (item: string) => {
        const current = planOptions.equipment;
        const newEquipment = current.includes(item)
            ? current.filter(i => i !== item)
            : [...current, item];
        setOption('equipment', newEquipment);
    };

    const toggleFocusArea = (area: string) => {
        const current = planOptions.focusAreas;
        const newAreas = current.includes(area)
            ? current.filter(i => i !== area)
            : [...current, area];
        setOption('focusAreas', newAreas);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI-Powered Gym Plan Generator</CardTitle>
                <CardDescription>Follow the steps to create a personalized workout plan.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-8">
                    {wizardSteps.map((s, index) => (
                        <React.Fragment key={s.step}>
                            <div className="flex flex-col items-center gap-1">
                                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center transition-all", currentStep > s.step ? "bg-primary text-primary-foreground" : currentStep === s.step ? "bg-primary text-primary-foreground ring-4 ring-primary/30" : "bg-muted text-muted-foreground")}>
                                    {currentStep > s.step ? <CheckCircle className="h-5 w-5" /> : <span className="font-bold">{s.step}</span>}
                                </div>
                                <p className={cn("text-xs transition-colors text-center", currentStep >= s.step ? "text-primary" : "text-muted-foreground")}>{s.titleKey}</p>
                            </div>
                            {index < wizardSteps.length - 1 && <div className="flex-1 h-0.5 bg-border mt-[-1.5rem]" />}
                        </React.Fragment>
                    ))}
                </div>

                <div className="min-h-[400px]">
                  <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ x: 30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -30, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                          {currentStep === 1 && (
                            <div className="space-y-8">
                                <div>
                                    <Label className="text-lg font-semibold">What is your primary goal?</Label>
                                    <RadioGroup value={planOptions.goal} onValueChange={(v) => setOption('goal', v as any)} className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {(['fat_loss', 'muscle_gain', 'recomposition'] as const).map(value => (
                                            <Label key={value} className={cn("border rounded-md p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors", planOptions.goal === value && "border-primary ring-2 ring-primary")}>
                                                <RadioGroupItem value={value} id={`goal-${value}`} />
                                                <span className="font-medium capitalize">{value.replace('_', ' ')}</span>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>
                                 <div>
                                    <Label className="text-lg font-semibold">What is your experience level?</Label>
                                    <RadioGroup value={planOptions.experience} onValueChange={(v) => setOption('experience', v as any)} className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {(['beginner', 'intermediate', 'advanced'] as const).map(value => (
                                            <Label key={value} className={cn("border rounded-md p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors", planOptions.experience === value && "border-primary ring-2 ring-primary")}>
                                                <RadioGroupItem value={value} id={`exp-${value}`} />
                                                <span className="font-medium capitalize">{value}</span>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>
                            </div>
                          )}
                          {currentStep === 2 && (
                            <div className="space-y-8">
                                <div>
                                    <Label className="text-lg font-semibold">How many days per week can you train?</Label>
                                    <div className="flex items-center gap-4 mt-2">
                                        <Slider
                                            value={[planOptions.daysPerWeek]}
                                            onValueChange={(v) => setOption('daysPerWeek', v[0])}
                                            min={1} max={7} step={1}
                                            className="flex-1"
                                        />
                                        <span className="font-bold text-xl w-16 text-center p-2 rounded-md bg-muted">{planOptions.daysPerWeek}</span>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-lg font-semibold">What equipment do you have access to?</Label>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {(['barbell', 'dumbbell', 'machine', 'bands', 'bodyweight'] as const).map(item => (
                                            <Label key={item} className={cn("border rounded-md p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors", planOptions.equipment.includes(item) && "border-primary ring-2 ring-primary")}>
                                                <Checkbox checked={planOptions.equipment.includes(item)} onCheckedChange={() => toggleEquipment(item)} />
                                                <span className="font-medium capitalize">{item}</span>
                                            </Label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                          )}
                          {currentStep === 3 && (
                            <div>
                                <Label className="text-lg font-semibold">What muscle groups do you want to focus on?</Label>
                                <p className="text-sm text-muted-foreground">Select the areas you want to prioritize.</p>
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {bodyParts.map(part => (
                                        <Label key={part.id} className={cn("border rounded-md p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors", planOptions.focusAreas.includes(part.id) && "border-primary ring-2 ring-primary")}>
                                            <Checkbox checked={planOptions.focusAreas.includes(part.id)} onCheckedChange={() => toggleFocusArea(part.id)} />
                                            <span className="font-medium capitalize">{part.name}</span>
                                        </Label>
                                    ))}
                                </div>
                            </div>
                          )}
                          {currentStep === 4 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-semibold">Summary</h3>
                                <Card className="bg-muted/50">
                                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div><strong className="block text-base">Goal</strong> <span className="capitalize">{planOptions.goal.replace('_', ' ')}</span></div>
                                        <div><strong className="block text-base">Experience</strong> <span className="capitalize">{planOptions.experience}</span></div>
                                        <div><strong className="block text-base">Training Days</strong> {planOptions.daysPerWeek} per week</div>
                                        <div><strong className="block text-base">Equipment</strong> <span className="capitalize">{planOptions.equipment.join(', ')}</span></div>
                                        <div className="md:col-span-2"><strong className="block text-base">Focus Areas</strong> <span className="capitalize">{planOptions.focusAreas.join(', ')}</span></div>
                                    </CardContent>
                                </Card>
                                <p className="text-xs text-muted-foreground">The AI will generate a {planOptions.daysPerWeek}-day plan tailored to your selections. You can regenerate this plan at any time.</p>
                            </div>
                          )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 1}>Back</Button>
                {currentStep < 4 && <Button onClick={() => setCurrentStep(p => p + 1)}>Next</Button>}
                {currentStep === 4 && <Button onClick={handleGeneratePlan} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {isLoading ? "Generating plan..." : "Generate My Gym Plan"}
                </Button>}
            </CardFooter>
        </Card>
    );
}

function PlanViewer({ plan }: { plan: GymPlan }) {
    const { resetPlan, toggleExerciseCompleted, updateExerciseWeight } = usePlanStore();
    const [unit, setUnit] = useState<WeightUnit>('kg');

    const convertWeight = (value: number, from: WeightUnit, to: WeightUnit) => {
        if (from === to) return value;
        if (from === 'kg' && to === 'lbs') return value * 2.20462;
        if (from === 'lbs' && to === 'kg') return value / 2.20462;
        return value;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Your Custom Gym Plan</CardTitle>
                        <CardDescription>Here is your {plan.days.length}-day workout schedule.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                           <Label htmlFor="unit-switch" className={cn(unit === 'kg' ? 'text-foreground' : 'text-muted-foreground')}>KG</Label>
                           <Switch
                                id="unit-switch"
                                checked={unit === 'lbs'}
                                onCheckedChange={(checked) => setUnit(checked ? 'lbs' : 'kg')}
                           />
                           <Label htmlFor="unit-switch" className={cn(unit === 'lbs' ? 'text-foreground' : 'text-muted-foreground')}>LBS</Label>
                        </div>
                        <Button variant="outline" onClick={resetPlan}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Generate New Plan
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                    {plan.days.map((day, dayIndex) => (
                        <AccordionItem value={`item-${dayIndex}`} key={dayIndex}>
                            <AccordionTrigger>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-primary">Day {day.day}</span>
                                    <span className="font-semibold text-foreground">{day.focus}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">Done</TableHead>
                                            <TableHead>Exercise</TableHead>
                                            <TableHead>Sets</TableHead>
                                            <TableHead>Reps</TableHead>
                                            <TableHead>Weight ({unit})</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {day.exercises.map((ex, exerciseIndex) => {
                                            const displayValue = ex.weight.unit === 'bodyweight'
                                                ? 'Bodyweight'
                                                : convertWeight(ex.weight.value, ex.weight.unit, unit).toFixed(1);

                                            return (
                                                <TableRow key={exerciseIndex} className={cn(ex.completed && "bg-success/10")}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={ex.completed}
                                                            onCheckedChange={() => toggleExerciseCompleted(dayIndex, exerciseIndex)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">{ex.name}</TableCell>
                                                    <TableCell>{ex.sets}</TableCell>
                                                    <TableCell>{ex.reps}</TableCell>
                                                    <TableCell>
                                                        {ex.weight.unit === 'bodyweight' ? (
                                                            <span className="text-muted-foreground text-sm">Bodyweight</span>
                                                        ) : (
                                                            <Input
                                                                type="number"
                                                                className="h-8 w-24"
                                                                value={displayValue}
                                                                onChange={(e) => {
                                                                    const newDisplayValue = parseFloat(e.target.value) || 0;
                                                                    const newKgValue = convertWeight(newDisplayValue, unit, 'kg');
                                                                    updateExerciseWeight(dayIndex, exerciseIndex, newKgValue);
                                                                }}
                                                            />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}


function GymPlanTabContent() {
    const { user, isLoading: isUserLoading } = useUser();
    const { plan, isHydrated, initialize } = usePlanStore();

    useEffect(() => {
        if (user && !isHydrated) {
            initialize(user.uid, user.gymPlan || null);
        }
    }, [user, isHydrated, initialize]);

    if (!isHydrated || isUserLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={plan ? 'viewer' : 'generator'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
            >
                {plan ? <PlanViewer plan={plan} /> : <PlanGenerator />}
            </motion.div>
        </AnimatePresence>
    );
}

function GymScheduleTab() {
    const { toast } = useToast();
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);

    const addSessionForm = useForm<SessionInput>({
        resolver: zodResolver(sessionSchema),
        defaultValues: {
            title: "",
            type: "strength",
            date: new Date(),
            duration: 60,
            notes: "",
        }
    });

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
            title: "Session Added!",
            description: `Session "${newSession.title}" has been added to your schedule.`,
        });
    };

    const handleDeleteSession = (sessionId: number) => {
        setSchedule(prev => prev.filter(session => session.id !== sessionId));
        toast({
            title: "Session Removed",
            description: "The session has been removed from your schedule.",
        });
    };

    const handleToggleSession = (sessionId: number) => {
        setSchedule(prev => prev.map(session =>
            session.id === sessionId ? { ...session, completed: !session.completed } : session
        ));
        toast({ title: "Session status updated!" });
    };

    const sessionsForSelectedDate = schedule.filter(s => {
        if (!selectedDate || !s.date) return false;
        return format(s.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
    });

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <div>
                    <CardTitle>Training Schedule</CardTitle>
                    <CardDescription>Plan and track your sessions.</CardDescription>
                </div>
                <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add Session</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Session</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={addSessionForm.handleSubmit(handleAddSession)} className="space-y-4">
                            <div>
                                <Label htmlFor="title">Session Title</Label>
                                <Input id="title" {...addSessionForm.register("title")} placeholder="e.g., Upper Body Strength" />
                                {addSessionForm.formState.errors.title && <p className="text-destructive text-xs mt-1">{addSessionForm.formState.errors.title.message}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Type</Label>
                                    <Select onValueChange={(value) => addSessionForm.setValue("type", value as any)} defaultValue={addSessionForm.getValues("type")}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="strength">Strength</SelectItem>
                                            <SelectItem value="cardio">Cardio</SelectItem>
                                            <SelectItem value="flexibility">Flexibility</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="duration">Duration (mins)</Label>
                                    <Input id="duration" type="number" {...addSessionForm.register("duration")} />
                                    {addSessionForm.formState.errors.duration && <p className="text-destructive text-xs mt-1">{addSessionForm.formState.errors.duration.message}</p>}
                                </div>
                            </div>
                            <div>
                                <Label>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !addSessionForm.watch("date") && "text-muted-foreground")}>
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {addSessionForm.watch("date") ? format(addSessionForm.watch("date"), "PPP") : <span>Pick a date</span>}
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
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea id="notes" {...addSessionForm.register("notes")} placeholder="e.g., Focus on form, try to increase bench press weight." />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsAddSessionOpen(false)}>Cancel</Button>
                                <Button type="submit">Save Session</Button>
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
                        className="rounded-md border p-0"
                    />
                </div>
                <div className="md:col-span-2 space-y-4">
                    <h3 className="font-semibold text-lg">Upcoming Sessions</h3>
                    <ScrollArea className="h-72">
                        <div className="space-y-4 pr-4">
                            {sessionsForSelectedDate.length > 0 ? (
                                sessionsForSelectedDate.map(session => (
                                    <Card key={session.id} className="flex items-center p-4 gap-4">
                                        <div className="flex-shrink-0">
                                            {session.type === 'strength' && <Dumbbell className="h-8 w-8 text-muted-foreground" />}
                                            {session.type === 'cardio' && <HeartPulse className="h-8 w-8 text-muted-foreground" />}
                                            {session.type === 'flexibility' && <Move className="h-8 w-8 text-muted-foreground" />}
                                            {session.type === 'other' && <Sparkles className="h-8 w-8 text-muted-foreground" />}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-semibold">{session.title}</p>
                                            <p className="text-sm text-muted-foreground">{session.duration} mins</p>
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
                                                        <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete the "{session.title}" session? This action is irréversible.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteSession(session.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center h-full flex items-center justify-center text-muted-foreground">
                                    <p>No sessions scheduled for this day.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}

function GymVideoReviewTab() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [videoAnalysisPrompt, setVideoAnalysisPrompt] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, `users/${user.uid}/gymVideos`),
      orderBy("uploadDate", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        uploadDate: (doc.data().uploadDate as Timestamp).toDate(),
      })) as UploadedVideo[];
      setUploadedVideos(videos);
    });
    return () => unsubscribe();
  }, [user?.uid]);

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

  const fileToDataUri = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast({
        variant: "destructive",
        title: "No file selected",
      });
      return;
    }
    if (!videoAnalysisPrompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt Required",
        description: "Please tell the AI what to look for.",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const storagePath = `gym-videos/${user.uid}/${Date.now()}_${selectedFile.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Firebase Storage Error:", error);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: `Error: ${error.code}. Check browser console and CORS rules.`,
        });
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const docRef = await addDoc(
          collection(db, `users/${user.uid}/gymVideos`),
          {
            name: selectedFile!.name,
            url: downloadURL,
            storagePath,
            status: "AI is reviewing...",
            prompt: videoAnalysisPrompt,
            feedback: null,
            uploadDate: serverTimestamp(),
          }
        );
        
        const fileForAnalysis = selectedFile; // Capture file for analysis
        const currentPrompt = videoAnalysisPrompt;
        setSelectedFile(null);
        setVideoAnalysisPrompt("");
        toast({
          title: "Upload Complete!",
          description: "AI analysis has started.",
        });

        try {
          const fileAsDataUri = await fileToDataUri(fileForAnalysis!);
          const result = await analyzeGymVideo({
            videoDataUri: fileAsDataUri,
            prompt: currentPrompt,
          });
          await updateDoc(doc(db, `users/${user.uid}/gymVideos`, docRef.id), {
            status: "Reviewed",
            feedback: result.feedback,
          });
          toast({
            title: "AI Review Complete!",
            description: "The AI coach has provided feedback.",
          });
        } catch (error: any) {
          console.error(error);
          await updateDoc(doc(db, `users/${user.uid}/gymVideos`, docRef.id), {
            status: "Failed",
            feedback: "Sorry, the analysis failed.",
          });
          toast({
            variant: "destructive",
            title: "AI Review Failed",
            description: error.message,
          });
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  const handleDeleteVideo = async (video: UploadedVideo) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/gymVideos`, video.id));
      const storageRef = ref(storage, video.storagePath);
      await deleteObject(storageRef);
      toast({ title: "Video Deleted" });
    } catch (error) {
      console.error("Delete failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the video.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
          <CardHeader>
 <CardTitle>{t('videoReviewZone')}</CardTitle>
              <CardDescription>Upload workout footage for AI-powered form analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="video-prompt-gym">What should the AI look for?</Label>
                  <Input id="video-prompt-gym" placeholder="e.g., 'Check my squat depth and back angle'" value={videoAnalysisPrompt} onChange={(e) => setVideoAnalysisPrompt(e.target.value)} disabled={isUploading}/>
              </div>
              {selectedFile ? (
                  <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-start gap-4">
                          <div className="bg-primary/10 text-primary p-3 rounded-lg"><FileVideo className="h-6 w-6" /></div>
                          <div className="flex-grow"><p className="font-semibold">{selectedFile.name}</p><p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} disabled={isUploading}><X className="h-4 w-4" /></Button>
                      </div>
                      {isUploading && (
                          <div className="space-y-2">
                              <Progress value={uploadProgress} className="w-full" />
                              <p className="text-xs text-muted-foreground text-center">{`Uploading... ${uploadProgress.toFixed(0)}%`}</p>
                          </div>
                      )}
                      <Button onClick={handleUpload} disabled={isUploading || !videoAnalysisPrompt.trim()} className="w-full">
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          {isUploading ? "Analyzing..." : "Upload & Analyze"}
                      </Button>
                  </div>
              ) : (
                  <label htmlFor="video-upload-gym" className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg p-12 text-center group hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground group-hover:text-primary" />
                      <h3 className="mt-4 text-lg font-medium">Click to select or drag & drop a video</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Max file size: 500MB</p>
                      <Input id="video-upload-gym" type="file" className="sr-only" accept="video/*" onChange={handleFileSelect} disabled={isUploading} />
                  </label>
              )}
          </CardContent>
      </Card>
      <Card>
          <CardHeader><CardTitle>Submitted Videos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
              {uploadedVideos.length > 0 ? (
                  uploadedVideos.map((video) => (
                      <Card key={video.id} className="flex flex-col md:flex-row gap-4 p-4">
                          <div className="w-full md:w-48 h-32 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                              <Video className="w-10 h-10 text-muted-foreground"/>
                          </div>
                          <div className="flex-grow">
                              <h4 className="font-semibold">{video.name}</h4>
                              <p className="text-xs text-muted-foreground">Prompt: <span className="font-medium text-foreground">{video.prompt}</span></p>
                              <p className="text-xs text-muted-foreground">
                                  Status: <span className={cn(video.status === "AI is reviewing..." && "text-primary animate-pulse", video.status === "Reviewed" && "text-success", video.status === "Failed" && "text-destructive")}>{video.status}</span>
                              </p>
                              <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                  <h5 className="text-sm font-semibold">AI Feedback</h5>
                                  <p className="text-xs text-muted-foreground italic mt-1 whitespace-pre-wrap">{video.feedback || "No feedback yet."}</p>
                              </div>
                          </div>
                          <div className="flex-shrink-0">
                              <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>Delete Video?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{video.name}"? This action is irreversible.</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteVideo(video)}>Delete</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </div>
                      </Card>
                  ))
              ) : (
                  <div className="text-center py-12 text-muted-foreground"><p>You have not submitted any videos yet.</p></div>
              )}
          </CardContent>
      </Card>
    </div>
  );
}



function GymModuleClientContent() {
  const { t } = useTranslation();
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('workout');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
        handleTabChange(tab);
    }
  }, [searchParams]);

  const tabs = [
    { value: 'workout', labelKey: t('gymWorkoutLoggerTab'), icon: Dumbbell, pro: false },
    { value: 'plan', labelKey: t('gymPlan'), icon: Calendar, pro: false },
    { value: 'progress', labelKey: t('gymProgressTab'), icon: LineChart, pro: false },
    { value: 'schedule', labelKey: t('gymScheduleTab'), icon: CalendarDays, pro: false },
    { value: 'nutrition', labelKey: t('gymNutritionCalculatorTab'), icon: Utensils, pro: false },
    { value: 'video', labelKey: t('videoReview'), icon: Video, pro: true },
  ];

  const handleTabChange = (value: string, initialLoad = false) => {
    const selectedTab = tabs.find(tab => tab.value === value);
    if (!initialLoad && selectedTab?.pro && user?.plan !== 'pro') {
      setIsUpgradeModalOpen(true);
      return;
    }
    setActiveTab(value);
    router.replace(`/dashboard/gym?tab=${value}`, { scroll: false });
  };
  
  if (isUserLoading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="flex w-full justify-start overflow-x-auto no-scrollbar h-auto gap-1">
         {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.labelKey}
                {tab.pro && user?.plan !== 'pro' && <Lock className="h-3 w-3 ml-2 text-muted-foreground" />}
            </TabsTrigger>
         ))}
      </TabsList>
      <TabsContent value="workout" className="mt-6"><WorkoutLogger /></TabsContent>
      <TabsContent value="plan" className="mt-6"><GymPlanTabContent /></TabsContent>
      <TabsContent value="progress" className="mt-6"><ProgressTab /></TabsContent>
      <TabsContent value="schedule" className="mt-6"><GymScheduleTab /></TabsContent>
      <TabsContent value="nutrition" className="mt-6">
        <NutritionTab />
      </TabsContent>
      <TabsContent value="video" className="mt-6">
        <GymVideoReviewTab />
      </TabsContent>
    </Tabs>
    <UpgradeProModal open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen} />
    </>
  );
}

export default function GymDashboardClient() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GymModuleClientContent />
        </Suspense>
    )
}
