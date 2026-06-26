

"use client";

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Camera, Send, Loader2, Bot, UtensilsCrossed, Zap, Trash2, Plus, PenSquare, Search, Drumstick, Sparkles, ShoppingCart, RefreshCw, CheckCircle, Check, ImagePlus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getNutritionInfo } from '@/ai/flows/nutrition-flow';
import { searchFood } from '@/ai/flows/nutrition-search-flow';
import { generateNutritionPlan } from '@/ai/flows/nutrition-plan-flow';
import { logPlannedMeal } from '@/ai/flows/log-planned-meal-flow';
import type { NutritionInfoOutput, FoodSearchOutput, NutritionPlanOutput, NutritionItem } from '@/ai/schemas';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useUser } from '@/hooks/use-user';
import { logNutrition, deleteNutritionLog } from './actions';
import { mealItemSchema } from '@/lib/schemas';
import { z } from 'zod';
import Image from 'next/image';
import { useDebounce } from 'use-debounce';
import { Label } from '@/components/ui/label';
import { useNutritionStore, type DailyLog } from '@/stores/nutrition-store';
import { useNutritionPlanStore, type Meal } from '@/stores/nutrition-plan-store';
import { useShoppingListStore } from '@/stores/shopping-list-store';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UpgradeProModal } from '@/components/upgrade-pro-modal';

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type ManualMealItem = z.infer<typeof mealItemSchema>;
type SearchResultItem = FoodSearchOutput['items'][0];
type Goal = "fat_loss" | "muscle_gain" | "maintenance";


export function NutritionClient() {
  const { toast } = useToast();
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const searchParams = useSearchParams();
  const { dailyLogs, dailyTotals, isLoading: isLogLoading, startListener } = useNutritionStore();
  const { generatedPlan, setGeneratedPlan, toggleMealCompleted, removePlan } = useNutritionPlanStore();
  const shoppingListStore = useShoppingListStore();

  useEffect(() => {
    if (user?.uid) {
        startListener(user.uid);
    }
  }, [user?.uid, startListener]);

  const [activeTab, setActiveTab] = useState('search');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const [textInput, setTextInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutritionInfoOutput | null>(null);
  const [mealType, setMealType] = useState<MealType>("snack");
  
  const [currentMeal, setCurrentMeal] = useState<ManualMealItem[]>([]);
  const [isLogging, setIsLogging] = useState(false);

  // States for food search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [selectedSearchItem, setSelectedSearchItem] = useState<SearchResultItem | null>(null);
  const [portion, setPortion] = useState(100);

  // States for manual entry
  const [manualItem, setManualItem] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', sugar: '', sodium: '', iron: '', potassium: '', portion: '100' });
  
  // States for plan generator
  const [planGoal, setPlanGoal] = useState<Goal>('maintenance');
  const [dietaryNeeds, setDietaryNeeds] = useState('');
  const [targetCalories, setTargetCalories] = useState('2000');
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  
  // State for shopping list
  const [customShoppingItem, setCustomShoppingItem] = useState("");


  useEffect(() => {
    if (activeTab === 'scan' && !isStreaming) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);


  useEffect(() => {
    const performSearch = async () => {
        if (debouncedSearchQuery.trim().length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchFood({ query: debouncedSearchQuery });
            setSearchResults(results.items);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Search Error', description: 'Could not fetch food data.' });
        } finally {
            setIsSearching(false);
        }
    };
    performSearch();
  }, [debouncedSearchQuery, toast]);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsStreaming(true);
          };
        }
        setHasCameraPermission(true);
      } else {
        throw new Error('Camera not supported');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const performAiAnalysis = async (type: 'scan' | 'text' | 'upload', photoUri?: string) => {
      let analysisInput: {query?: string, photoDataUri?: string} = {};
      if (type === 'scan') {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        analysisInput = { photoDataUri: canvas.toDataURL('image/jpeg') };
      } else if (type === 'upload') {
          if (!photoUri) return;
          analysisInput = { photoDataUri: photoUri };
      } else {
          if (!textInput.trim()) return;
          analysisInput = { query: textInput };
      }

      setIsAiLoading(true);
      setNutritionData(null);
      try {
        const result = await getNutritionInfo(analysisInput);
        setNutritionData(result);
        if (result.items.length > 0) {
            const mealItems = result.items.map(item => {
                const multiplier = item.portion / 100;
                return {
                    ...item,
                    id: Math.random().toString(),
                    calories: item.calories * multiplier,
                    protein: item.protein * multiplier,
                    carbs: item.carbs * multiplier,
                    fat: item.fat * multiplier,
                    sugar: item.sugar * multiplier,
                    sodium: item.sodium * multiplier,
                    iron: item.iron * multiplier,
                    potassium: item.potassium * multiplier,
                    portion: item.portion,
                };
            });
            setCurrentMeal(mealItems);
        }
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not analyze input.' });
      } finally {
        setIsAiLoading(false);
      }
  }
  
    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                performAiAnalysis('upload', result);
            };
            reader.readAsDataURL(file);
        }
        // Reset file input to allow uploading the same file again
        if(event.target) event.target.value = '';
    };

  const handleGeneratePlan = async () => {
      if (!user) return;
      if (!targetCalories) {
          toast({ variant: 'destructive', title: 'Missing Info', description: 'Please enter a target calorie amount.' });
          return;
      }
      setIsPlanLoading(true);
      const options = {
          userId: user.uid,
          goal: planGoal,
          dietaryNeeds: dietaryNeeds,
          calories: parseInt(targetCalories, 10),
      };
      setGeneratedPlan(null);
      try {
          const result = await generateNutritionPlan(options);
          setGeneratedPlan(result, options);
          toast({ title: 'Plan Generated!', description: 'Your personalized meal plan is ready.' });
      } catch (error: any) {
          console.error(error);
          toast({ variant: 'destructive', title: 'AI Error', description: error.message || 'Could not generate a nutrition plan.' });
      } finally {
          setIsPlanLoading(false);
      }
  }
  
    const handleRegeneratePlan = async () => {
      if (!generatedPlan || !generatedPlan.lastOptions) {
        toast({ variant: 'destructive', title: 'Error', description: 'No previous plan options found to regenerate.' });
        return;
      }
      setIsPlanLoading(true);
      try {
          const result = await generateNutritionPlan(generatedPlan.lastOptions);
          setGeneratedPlan(result, generatedPlan.lastOptions);
          toast({ title: 'Plan Regenerated!', description: 'A new plan has been created with the same options.' });
      } catch (error: any) {
          console.error(error);
          toast({ variant: 'destructive', title: 'AI Error', description: 'Could not regenerate the nutrition plan.' });
      } finally {
          setIsPlanLoading(false);
      }
  }

  const handleAddItemToMeal = () => {
    if (!selectedSearchItem) return;
    const multiplier = portion / 100;
    setCurrentMeal([...currentMeal, {
        id: Math.random().toString(),
        name: selectedSearchItem.name,
        calories: selectedSearchItem.calories * multiplier,
        protein: selectedSearchItem.protein * multiplier,
        carbs: selectedSearchItem.carbs * multiplier,
        fat: selectedSearchItem.fat * multiplier,
        sugar: (selectedSearchItem.sugar || 0) * multiplier,
        sodium: (selectedSearchItem.sodium || 0) * multiplier,
        iron: (selectedSearchItem.iron || 0) * multiplier,
        potassium: (selectedSearchItem.potassium || 0) * multiplier,
        portion: portion,
    }]);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSearchItem(null);
    setPortion(100);
  };

  const handleManualItemChange = (field: keyof typeof manualItem, value: string) => {
    setManualItem(prev => ({ ...prev, [field]: value }));
  }

  const handleAddManualItemToMeal = () => {
      const parsedItem = {
        name: manualItem.name,
        calories: parseFloat(manualItem.calories),
        protein: parseFloat(manualItem.protein),
        carbs: parseFloat(manualItem.carbs),
        fat: parseFloat(manualItem.fat),
        sugar: parseFloat(manualItem.sugar) || 0,
        sodium: parseFloat(manualItem.sodium) || 0,
        iron: parseFloat(manualItem.iron) || 0,
        potassium: parseFloat(manualItem.potassium) || 0,
        portion: parseFloat(manualItem.portion),
      };

      if (!parsedItem.name || isNaN(parsedItem.calories) || isNaN(parsedItem.protein) || isNaN(parsedItem.carbs) || isNaN(parsedItem.fat) || isNaN(parsedItem.portion)) {
          toast({ variant: 'destructive', title: 'Incomplete Item', description: 'Please fill out all required fields with valid numbers.' });
          return;
      }
      
      const multiplier = parsedItem.portion / 100;
      setCurrentMeal([...currentMeal, {
          id: Math.random().toString(),
          name: parsedItem.name,
          calories: parsedItem.calories * multiplier,
          protein: parsedItem.protein * multiplier,
          carbs: parsedItem.carbs * multiplier,
          fat: parsedItem.fat * multiplier,
          sugar: parsedItem.sugar * multiplier,
          sodium: parsedItem.sodium * multiplier,
          iron: parsedItem.iron * multiplier,
          potassium: parsedItem.potassium * multiplier,
          portion: parsedItem.portion,
      }]);
      // Reset form
      setManualItem({ name: '', calories: '', protein: '', carbs: '', fat: '', sugar: '', sodium: '', iron: '', potassium: '', portion: '100' });
  };


  const handleLogMeal = async (items: Omit<ManualMealItem, 'id'>[], type: MealType) => {
      if (!user || !items.length) return;
      setIsLogging(true);
      try {
          await logNutrition({
              userId: user.uid,
              mealType: type,
              items: items,
          });
          toast({ title: "Meal Logged!", description: "Your meal has been added to your daily log." });
          setNutritionData(null);
          setTextInput('');
          setCurrentMeal([]);
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Logging Error', description: 'Could not save your meal.' });
      } finally {
          setIsLogging(false);
      }
  }
  
    const handleLogCurrentMeal = async () => {
        if (currentMeal.length === 0) return;
        const itemsToLog = currentMeal.map(({ id, ...rest }) => rest);
        await handleLogMeal(itemsToLog, mealType);
    };

  const handleDeleteLog = async (id: string) => {
    try {
        await deleteNutritionLog(id);
        toast({ title: "Log Deleted", description: "The meal log has been removed." });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Deletion Error', description: 'Could not delete the log.' });
    }
  }
  
    const handleAddCustomShoppingItem = () => {
        if (!customShoppingItem.trim()) return;
        shoppingListStore.addCustomItem(customShoppingItem);
        setCustomShoppingItem("");
    };

    const handlePopulateListFromPlan = () => {
        if (!generatedPlan) {
            toast({
                variant: 'destructive',
                title: 'No Plan Found',
                description: 'Please generate a nutrition plan first.'
            });
            return;
        }
        shoppingListStore.addItemsFromPlan(generatedPlan);
        toast({
            title: 'List Populated!',
            description: 'Ingredients from your meal plan have been added to the shopping list.'
        });
    };
    
    const handleLogPlanMeal = async (meal: Meal) => {
        if (!user) return;
        setIsLogging(true);
        try {
            // Call the new AI flow to get nutritional data for the meal items.
            const { items } = await logPlannedMeal({ items: meal.items });
            
            // Log the meal with the data returned from the AI.
            await handleLogMeal(items, meal.name.toLowerCase() as MealType);
            
            // Mark the meal as completed in the UI
            const mealIndex = generatedPlan?.meals.findIndex(m => m.name === meal.name) ?? -1;
            if (mealIndex !== -1) {
                toggleMealCompleted(mealIndex);
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Logging Error', description: 'AI could not process the meal items.' });
        } finally {
            setIsLogging(false);
        }
    };
    
    const handleAddItemToShoppingList = (item: string) => {
        // Remove quantities and units from the string, e.g., "4 oz", "1/2 cup"
        const cleanedItem = item.replace(/^[0-9/.\s]+(oz|cup|cups|tbsp|tsp|g|kg|lbs|slice|slices)?\s*/i, '').trim();
        shoppingListStore.addCustomItem(cleanedItem);
        toast({
            title: `Added to Shopping List`,
            description: `"${cleanedItem}" has been added.`
        })
    };
  
  const grandTotalCalories = dailyTotals.calories;

  const tabs = [
    { value: 'search', labelKey: 'Search', icon: Search, pro: false },
    { value: 'manual', labelKey: 'Manual Entry', icon: PenSquare, pro: false },
    { value: 'scan', labelKey: 'Scan', icon: Camera, pro: true },
    { value: 'analyze', labelKey: 'AI Analysis', icon: Send, pro: true },
    { value: 'generator', labelKey: 'Plan Generator', icon: Sparkles, pro: true },
    { value: 'list', labelKey: 'Shopping List', icon: ShoppingCart, pro: false },
  ];
  
    const handleTabChange = (value: string) => {
        const selectedTab = tabs.find(t => t.value === value);
        if (selectedTab?.pro && user?.plan !== 'pro') {
            setIsUpgradeModalOpen(true);
        } else {
            setActiveTab(value);
        }
    };

    useEffect(() => {
        const tab = searchParams.get('tab');
        const selectedTab = tabs.find(t => t.value === tab);
        if (selectedTab) {
            if (selectedTab.pro && user?.plan !== 'pro') {
                setIsUpgradeModalOpen(true);
            } else {
                setActiveTab(tab!);
            }
        }
    }, [searchParams, user]);

  const MealLogCard = ({ title, logs }: { title: string; logs: DailyLog[keyof DailyLog] }) => {
    if (logs.length === 0) return null;
    const totalMealCalories = logs.reduce((sum, log) => sum + log.items.reduce((itemSum, item) => itemSum + item.calories, 0), 0);
    
    return (
        <Card className="bg-muted/50">
            <CardHeader className="p-4">
                <CardTitle className="text-lg flex justify-between items-center capitalize">
                    <span>{title}</span>
                    <span className="text-sm font-medium text-muted-foreground">{totalMealCalories.toFixed(0)} kcal</span>
                </CardTitle>
            </CardHeader>
             <Accordion type="multiple" className="w-full">
                {logs.map((log) => (
                <AccordionItem value={`log-${log.id}`} key={log.id} className="border-b-0 px-4">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <div className="flex justify-between w-full items-center">
                             <span className="truncate pr-2">{log.items.map(i => i.name).join(', ')}</span>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.id); }}>
                                <Trash2 className="h-4 w-4" />
                             </Button>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                         {log.items.map((item, itemIndex) => (
                             <div key={itemIndex} className="text-xs text-muted-foreground border-t pt-2 mt-2">
                                <p className="capitalize font-semibold text-foreground">{item.name} ({item.portion}g)</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-1">
                                    <span>Calories: {(item.calories || 0).toFixed(0)}</span>
                                    <span>Protein: {(item.protein || 0).toFixed(1)}g</span>
                                    <span>Carbs: {(item.carbs || 0).toFixed(1)}g</span>
                                    <span>Fat: {(item.fat || 0).toFixed(1)}g</span>
                                    <span>Sugar: {(item.sugar || 0).toFixed(1)}g</span>
                                    <span>Sodium: {(item.sodium || 0).toFixed(0)}mg</span>
                                    <span>Iron: {(item.iron || 0).toFixed(1)}mg</span>
                                    <span>Potassium: {(item.potassium || 0).toFixed(0)}mg</span>
                                </div>
                             </div>
                         ))}
                    </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        </Card>
    );
};


  return (
    <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <nav className="flex justify-center mb-4">
                        <div className="w-full overflow-x-auto no-scrollbar">
                            <TabsList className="inline-flex h-auto w-max min-w-full justify-start sm:w-auto sm:min-w-0 sm:justify-center">
                                {tabs.map(tab => (
                                    <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
                                        <tab.icon className="w-4 h-4 mr-2" />
                                        {tab.labelKey}
                                        {tab.pro && user?.plan !== 'pro' && <Lock className="h-3 w-3 ml-2 text-muted-foreground" />}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                    </nav>
                    <TabsContent value="scan" className="mt-4">
                    <Card>
                        <CardHeader>
                        <CardTitle>Camera Scan</CardTitle>
                        <CardDescription>Point your camera at a food item and click scan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                            <canvas ref={canvasRef} className="hidden" />
                            <input
                                type="file"
                                ref={photoInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                            />
                            {hasCameraPermission === false && (
                            <div className="text-center text-muted-foreground p-4">
                                <Camera className="h-12 w-12 mx-auto mb-4" />
                                <p className="font-semibold">Camera access is required.</p>
                                <p className="text-sm">Please enable camera permissions in your browser to use this feature.</p>
                            </div>
                            )}
                            {hasCameraPermission === null && (
                            <div className="text-center text-muted-foreground p-4">
                                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
                                <p className="font-semibold">Requesting camera...</p>
                            </div>
                            )}
                        </div>
                        </CardContent>
                        <CardFooter className="grid grid-cols-2 gap-2">
                            <Button onClick={() => performAiAnalysis('scan')} disabled={isAiLoading || !isStreaming} className="w-full">
                                {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                                {isAiLoading ? "Scanning..." : "Scan"}
                            </Button>
                            <Button onClick={() => photoInputRef.current?.click()} disabled={isAiLoading} variant="secondary" className="w-full">
                                <ImagePlus className="mr-2 h-4 w-4" />
                                Import from Photos
                            </Button>
                        </CardFooter>
                    </Card>
                    </TabsContent>
                    <TabsContent value="analyze" className="mt-4">
                    <Card>
                        <CardHeader>
                        <CardTitle>AI Analysis</CardTitle>
                        <CardDescription>Describe what you ate, e.g., "1 apple and 2 slices of bread."</CardDescription>
                        </CardHeader>
                        <CardContent>
                        <div className="flex gap-2">
                            <Input
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="e.g., a bowl of oatmeal with berries"
                            disabled={isAiLoading}
                            onKeyDown={(e) => e.key === 'Enter' && performAiAnalysis('text')}
                            />
                            <Button onClick={() => performAiAnalysis('text')} disabled={isAiLoading || !textInput.trim()}>
                            {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                        </CardContent>
                        <CardFooter>
                            <Alert>
                                <Zap className="h-4 w-4" />
                                <AlertTitle>AI Powered!</AlertTitle>
                                <AlertDescription>
                                    Our AI will estimate the nutrition. For precise logging, use the search.
                                </AlertDescription>
                            </Alert>
                        </CardFooter>
                    </Card>
                    </TabsContent>
                    <TabsContent value="search" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Search Food Database</CardTitle>
                                <CardDescription>Find food items in a live database to log.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AnimatePresence mode="wait">
                                {selectedSearchItem ? (
                                    <motion.div
                                        key="portion-selector"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                    >
                                        <p className='font-semibold mb-2'>{selectedSearchItem.name}</p>
                                        <Label htmlFor="portion">Portion in grams</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="portion"
                                                type="number"
                                                value={portion}
                                                onChange={(e) => setPortion(parseInt(e.target.value) || 0)}
                                                placeholder="e.g., 150"
                                            />
                                            <Button onClick={handleAddItemToMeal}>Add Item</Button>
                                        </div>
                                        <Button variant="link" size="sm" className="p-0 h-auto mt-2" onClick={() => setSelectedSearchItem(null)}>Back to search</Button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="search-box"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                    >
                                        <div className="relative">
                                            <Input 
                                                placeholder="e.g., 1 large apple"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pr-10"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 text-muted-foreground" />}
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                                            {searchResults.map(item => (
                                                <div key={item.fdcId} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedSearchItem(item)}>
                                                    <div className="w-12 h-12 bg-muted rounded-md flex-shrink-0 relative">
                                                        {item.image ? (
                                                            <Image src={item.image} alt={item.name} fill className="object-cover rounded-md" data-ai-hint="food item" />
                                                        ) : (
                                                            <Drumstick className="w-6 h-6 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                        )}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-semibold capitalize">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground">{item.calories.toFixed(0)} kcal &bull; {item.protein.toFixed(1)}g P (per 100g)</p>
                                                    </div>
                                                    <Button size="icon" variant="ghost"><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="manual" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Manual Entry</CardTitle>
                                <CardDescription>Log an item (per 100g) if you can't find it in search.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="manual-name">Food Name</Label>
                                    <Input id="manual-name" placeholder="e.g., Homemade Cereal Bar" value={manualItem.name} onChange={e => handleManualItemChange('name', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="manual-calories">Calories (per 100g)</Label>
                                        <Input id="manual-calories" type="number" placeholder="kcal" value={manualItem.calories} onChange={e => handleManualItemChange('calories', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="manual-protein">Protein (per 100g)</Label>
                                        <Input id="manual-protein" type="number" placeholder="g" value={manualItem.protein} onChange={e => handleManualItemChange('protein', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="manual-carbs">Carbs (per 100g)</Label>
                                        <Input id="manual-carbs" type="number" placeholder="g" value={manualItem.carbs} onChange={e => handleManualItemChange('carbs', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="manual-fat">Fat (per 100g)</Label>
                                        <Input id="manual-fat" type="number" placeholder="g" value={manualItem.fat} onChange={e => handleManualItemChange('fat', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="manual-sugar">Sugar (per 100g)</Label>
                                        <Input id="manual-sugar" type="number" placeholder="g" value={manualItem.sugar} onChange={e => handleManualItemChange('sugar', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="manual-sodium">Sodium (mg per 100g)</Label>
                                        <Input id="manual-sodium" type="number" placeholder="mg" value={manualItem.sodium} onChange={e => handleManualItemChange('sodium', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="manual-iron">Iron (mg per 100g)</Label>
                                        <Input id="manual-iron" type="number" placeholder="mg" value={manualItem.iron} onChange={e => handleManualItemChange('iron', e.target.value)} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="manual-potassium">Potassium (mg per 100g)</Label>
                                        <Input id="manual-potassium" type="number" placeholder="mg" value={manualItem.potassium} onChange={e => handleManualItemChange('potassium', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="manual-portion">Portion Eaten (g)</Label>
                                    <Input id="manual-portion" type="number" placeholder="e.g. 55" value={manualItem.portion} onChange={e => handleManualItemChange('portion', e.target.value)} />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={handleAddManualItemToMeal}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Item to Meal
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                    <TabsContent value="generator" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Nutrition Plan Generator</CardTitle>
                                <CardDescription>Get a personalized meal plan created by AI.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="goal">Fitness Goal</Label>
                                        <Select value={planGoal} onValueChange={(v) => setPlanGoal(v as Goal)}>
                                            <SelectTrigger id="goal"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="fat_loss">Fat Loss</SelectItem>
                                                <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="calories">Target Daily Calories</Label>
                                        <Input id="calories" type="number" placeholder="e.g., 2000" value={targetCalories} onChange={e => setTargetCalories(e.target.value)}/>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="diet">Dietary Needs or Preferences</Label>
                                    <Input id="diet" placeholder="e.g., vegetarian, no nuts" value={dietaryNeeds} onChange={e => setDietaryNeeds(e.target.value)}/>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleGeneratePlan} disabled={isPlanLoading} className="w-full">
                                    {isPlanLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    {isPlanLoading ? 'Generating Plan...' : 'Generate Meal Plan'}
                                </Button>
                            </CardFooter>
                        </Card>
                        
                        {generatedPlan && (
                            <Card className="mt-6">
                                <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                    <div>
                                        <CardTitle>Your Personalized Meal Plan</CardTitle>
                                        {generatedPlan.lastOptions?.calories && (
                                            <CardDescription>A plan for approximately {generatedPlan.lastOptions.calories} kcal.</CardDescription>
                                        )}
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button variant="outline" size="icon" onClick={handleRegeneratePlan} disabled={isPlanLoading} className="w-full sm:w-auto">
                                            <RefreshCw className={cn("h-4 w-4", isPlanLoading && "animate-spin")} />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" className="w-full sm:w-auto">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove Plan?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to remove this meal plan? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => removePlan()}>Remove</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                                        {generatedPlan.meals.map((meal, index) => (
                                            <AccordionItem value={`item-${index}`} key={index}>
                                                <AccordionTrigger className="capitalize">
                                                    <div className="flex items-center gap-4">
                                                        <Checkbox
                                                            checked={meal.completed}
                                                            onCheckedChange={() => toggleMealCompleted(index)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        {meal.name}
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <p className="font-semibold mb-2">{meal.description}</p>
                                                    <p className="text-sm text-muted-foreground">Calories: ~{meal.calories}</p>
                                                    <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                                                        {meal.items.map((item, i) => (
                                                            <li key={i} className="flex justify-between items-center">
                                                                <span>{item}</span>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddItemToShoppingList(item)}>
                                                                    <ShoppingCart className="h-4 w-4 text-muted-foreground hover:text-primary"/>
                                                                </Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <Button size="sm" className="mt-4" onClick={() => handleLogPlanMeal(meal)} disabled={isLogging}>
                                                        {isLogging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4"/>}
                                                        Add to Log
                                                    </Button>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                    <TabsContent value="list" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Shopping List</CardTitle>
                                <CardDescription>Your grocery list based on your plan and custom items.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add custom item..."
                                        value={customShoppingItem}
                                        onChange={e => setCustomShoppingItem(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddCustomShoppingItem()}
                                    />
                                    <Button onClick={handleAddCustomShoppingItem}><Plus className="h-4 w-4" /></Button>
                                </div>
                                <div className="space-y-2">
                                    {shoppingListStore.items.map(item => (
                                        <div key={item.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                                            <Checkbox
                                                id={`item-${item.id}`}
                                                checked={item.checked}
                                                onCheckedChange={() => shoppingListStore.toggleItemChecked(item.id)}
                                            />
                                            <label
                                                htmlFor={`item-${item.id}`}
                                                className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", item.checked && "line-through text-muted-foreground")}
                                            >
                                                {item.name}
                                            </label>
                                        </div>
                                    ))}
                                    {shoppingListStore.items.length === 0 && (
                                        <p className="text-center text-muted-foreground text-sm pt-4">Your shopping list is empty.</p>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex-col sm:flex-row gap-2">
                                <Button variant="outline" className="w-full sm:w-auto" onClick={handlePopulateListFromPlan}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Add from Plan
                                </Button>
                                <Button variant="secondary" className="w-full sm:w-auto" onClick={shoppingListStore.clearCompletedItems}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Clear Checked Items
                                </Button>
                                <Button variant="destructive" className="w-full sm:w-auto" onClick={shoppingListStore.clearList}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Clear Shopping List
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>
                <AnimatePresence>
                {currentMeal.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                    >
                    <Card className="sticky top-24">
                        <CardHeader>
                        <CardTitle>Current Meal</CardTitle>
                        <CardDescription>Review items below and log them.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center bg-primary/10 p-4 rounded-lg">
                                <p className="text-muted-foreground">Total Estimated Calories</p>
                                <p className="text-4xl font-bold text-primary">{currentMeal.reduce((sum, item) => sum + item.calories, 0).toFixed(0)} kcal</p>
                            </div>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {currentMeal.map((item, index) => (
                                <Card key={item.id || index} className="bg-muted/50">
                                    <CardHeader className="p-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-base capitalize">{item.name}</CardTitle>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMeal(currentMeal.filter((_, i) => i !== index))}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm p-3 pt-0">
                                    <div className="bg-background/50 p-2 rounded-md text-center">
                                        <p className="font-bold">{item.portion}g</p>
                                        <p className="text-xs text-muted-foreground">Portion</p>
                                    </div>
                                    <div className="bg-background/50 p-2 rounded-md text-center">
                                        <p className="font-bold">{item.calories.toFixed(0)}</p>
                                        <p className="text-xs text-muted-foreground">Calories</p>
                                    </div>
                                    <div className="bg-background/50 p-2 rounded-md text-center">
                                        <p className="font-bold">{item.protein.toFixed(1)}g</p>
                                        <p className="text-xs text-muted-foreground">Protein</p>
                                    </div>
                                    <div className="bg-background/50 p-2 rounded-md text-center">
                                        <p className="font-bold">{item.carbs.toFixed(1)}g</p>
                                        <p className="text-xs text-muted-foreground">Carbs</p>
                                    </div>
                                    <div className="bg-background/50 p-2 rounded-md text-center">
                                        <p className="font-bold">{item.fat.toFixed(1)}g</p>
                                        <p className="text-xs text-muted-foreground">Fat</p>
                                    </div>
                                    </CardContent>
                                </Card>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row gap-2">
                            <Select onValueChange={(v) => setMealType(v as MealType)} defaultValue={mealType}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Select Meal Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="breakfast">Breakfast</SelectItem>
                                    <SelectItem value="lunch">Lunch</SelectItem>
                                    <SelectItem value="dinner">Dinner</SelectItem>
                                    <SelectItem value="snack">Snack</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleLogCurrentMeal} disabled={isLogging} className="w-full flex-1">
                            {isLogging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            {isLogging ? "Logging..." : "Log Meal"}
                            </Button>
                        </CardFooter>
                    </Card>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
            <Card className="lg:sticky lg:top-24">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Today's Log</CardTitle>
                            <CardDescription>A summary of your meals for today.</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{grandTotalCalories.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">Total kcal</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="min-h-[24rem] max-h-[calc(100vh-16rem)] overflow-y-auto">
                {isLogLoading && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                )}
                {!isLogLoading && grandTotalCalories === 0 && (
                    <div className="text-center space-y-4 text-muted-foreground h-full flex flex-col justify-center items-center">
                        <UtensilsCrossed className="h-12 w-12 mx-auto" />
                        <p>No meals logged for today.</p>
                        <p className="text-xs">Use the scanner or search to add a meal.</p>
                    </div>
                )}
                {!isLogLoading && grandTotalCalories > 0 && (
                    <div className="space-y-4">
                        <MealLogCard title="Breakfast" logs={dailyLogs.breakfast} />
                        <MealLogCard title="Lunch" logs={dailyLogs.lunch} />
                        <MealLogCard title="Dinner" logs={dailyLogs.dinner} />
                        <MealLogCard title="Snack" logs={dailyLogs.snack} />
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
        <UpgradeProModal open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen} />
    </>
  );
}
