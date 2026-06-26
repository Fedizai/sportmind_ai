
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { signupSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useTranslation } from '@/hooks/use-translation';

const ADMIN_EMAILS = ['fedizayen12@gmail.com', 'khaled05062006@gmail.com', 'khaled050620062@gmail.com'];

// Calorie Calculation Function
const calculateTDEE = (age: number, height: number, weight: number, trainingFrequency: string) => {
    // Mifflin-St Jeor Equation for BMR (assuming male for a general calculation)
    const bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;

    let activityMultiplier = 1.375; // Default for 1-2 times/week
    if (trainingFrequency === '3-4_per_week') {
        activityMultiplier = 1.55;
    } else if (trainingFrequency === '5+_per_week') {
        activityMultiplier = 1.725;
    }
    
    const tdee = bmr * activityMultiplier;
    return Math.round(tdee);
};

export default function CreateAccountPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [status, setStatus] = useState("Processing payment and creating account...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const createAccount = async () => {
            if (!isFirebaseConfigured()) {
                setError("Firebase is not configured. Cannot create account.");
                return;
            }

            const pendingUserJson = sessionStorage.getItem('pendingUser');
            if (!pendingUserJson) {
                setError("No pending user data found. Please sign up again.");
                toast({
                    title: "Registration Error",
                    description: "Your session has expired. Please return to the signup page.",
                    variant: "destructive",
                });
                router.push('/signup');
                return;
            }
            
            try {
                const pendingUser = JSON.parse(pendingUserJson);
                const validation = signupSchema.safeParse(pendingUser);
                
                if (!validation.success) {
                    console.error("Zod validation errors:", validation.error.flatten());
                    throw new Error("Invalid user data in session.");
                }

                const { 
                    fullName, email, password, role,
                    age, trainingFrequency, mainGoal, sports,
                    footballPosition, inClub,
                    tennisLevel, hasRanking, tennisRanking, dominantHand, playStyle,
                    gymHeight, gymWeight, gymGoal
                } = validation.data;
                
                // 1. Create user in Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // 2. Determine role and plan
                const userRole = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : role;
                const plan = role === 'coach' ? 'pro' : 'athlete'; // Coaches are pro, players start as athlete

                // 3. Calculate and set target calories
                const targetCalories = calculateTDEE(age, gymHeight || 175, gymWeight || 70, trainingFrequency);
                
                // 4. Construct Firestore document data
                const userData = {
                    uid: user.uid,
                    email: email,
                    displayName: fullName,
                    role: userRole,
                    plan: plan,
                    createdAt: serverTimestamp(),
                    onboardingComplete: true,
                    age,
                    trainingFrequency,
                    mainGoal,
                    sports,
                    ...(sports.includes('football') && {
                        footballProfile: {
                            position: footballPosition,
                            inClub,
                        },
                    }),
                    ...(sports.includes('tennis') && {
                        tennisProfile: {
                            level: tennisLevel,
                            hasRanking,
                            ranking: tennisRanking,
                            dominantHand,
                            playStyle,
                        },
                    }),
                    ...(sports.includes('gym') && {
                        gymProfile: {
                            height: gymHeight,
                            weight: gymWeight,
                            goal: gymGoal,
                        },
                    }),
                    // Add the nutrition target to the user's profile
                    nutritionTarget: {
                        calories: targetCalories
                    }
                };


                // 5. Update profile and create Firestore document
                await Promise.all([
                    updateProfile(user, { displayName: fullName }),
                    setDoc(doc(db, "users", user.uid), userData),
                    sendEmailVerification(user)
                ]);

                // 6. Clean up session storage
                sessionStorage.removeItem('pendingUser');

                setStatus(t('accountCreated'));
                toast({
                    title: "Welcome to SportMind AI!",
                    description: "Your account has been created. Please check your verification email and log in.",
                });

                // Redirect to the login page
                router.push('/login');

            } catch (e: any) {
                console.error("Post-payment registration error:", e);
                let errorMessage = "An unexpected error occurred during account creation.";
                if (e.code === "auth/email-already-in-use") {
                  errorMessage = "This email is already registered. Please log in.";
                   toast({
                    title: "Account Exists",
                    description: errorMessage,
                    variant: "destructive",
                  });
                  router.push('/login');
                  return;
                }
                 toast({
                    title: "Registration Failed",
                    description: errorMessage,
                    variant: "destructive",
                });
                setError(errorMessage);
            }
        };

        createAccount();
    }, [router, toast, t]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-background text-foreground">
            <Logo className="h-16 w-auto mb-4" />
            <div className="flex items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <div className="text-center">
                    <p className="text-lg font-semibold">{t('processingPayment')}</p>
                    {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
}
