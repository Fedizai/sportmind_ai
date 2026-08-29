

"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { ADMIN_EMAILS } from '@/lib/admin-emails';
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';
import { ensureUserProfile } from '@/lib/profile-actions';
import { usePathname, useRouter } from 'next/navigation';
import { useNutritionStore } from '@/stores/nutrition-store';
import { type GymPlan } from '@/stores/plan-store';
import { useAdminPreviewStore } from '@/stores/admin-preview-store';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
  plan?: 'athlete' | 'pro';
  photoUrl?: string | null;
  onboardingComplete?: boolean;
  gymPlan?: GymPlan | null;
  nutritionTarget?: {
    calories: number;
  };
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    units?: 'metric' | 'imperial';
  };
  notifications?: {
    emailNotifications?: boolean;
    trainingReminders?: boolean;
  };
  privacy?: {
    shareDataWithCoach?: boolean;
  };
  /** Sport profile captured during onboarding. Shape mirrors use-all-users.AppUser. */
  tennisProfile?: {
    level?: string;
    hasRanking?: boolean;
    ranking?: string;
    dominantHand?: string;
    playStyle?: string;
  };
}


interface UserContextType {
  user: AppUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  previewedUserData: AppUser | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Single source of truth, shared with the server-side Pro gate.
// (see lib/server-access.ts)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewedUserData, setPreviewedUserData] = useState<AppUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { startListener, stopListener } = useNutritionStore.getState();
  const previewUser = useAdminPreviewStore((state) => state.previewUser);
  const prevPreviewUidRef = useRef<string | null>(null);
  // One backfill attempt per account per session. The snapshot listener below
  // fires again as soon as the document lands, so retrying would loop.
  const backfilledUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) {
        setIsLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        startListener(firebaseUser.uid);
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            const isAdmin = firebaseUser.email ? ADMIN_EMAILS.includes(firebaseUser.email) : false;
            const userRole = isAdmin ? 'admin' : userData.role;

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: userData.displayName,
              role: userRole,
              plan: isAdmin ? 'pro' : (userData.plan || 'athlete'),
              photoUrl: userData.photoUrl || null,
              onboardingComplete: userData.onboardingComplete || false,
              gymPlan: userData.gymPlan || null, // Load the gym plan from Firestore
              nutritionTarget: userData.nutritionTarget || { calories: 2500 },
              preferences: userData.preferences || {},
              notifications: userData.notifications || {},
              privacy: userData.privacy || {},
            });

            // An owner whose stored role says otherwise is treated as an admin
            // by the app but not by the Firestore rules, which read the stored
            // role — so admin-only writes fail. Reconcile the document once.
            if (isAdmin && userData.role !== 'admin' && backfilledUidRef.current !== firebaseUser.uid) {
              backfilledUidRef.current = firebaseUser.uid;
              ensureUserProfile(firebaseUser.uid).catch((err) => {
                console.error('Could not reconcile the admin profile:', err);
              });
            }
          } else {
             // Authenticated but no Firestore profile. Show sensible defaults
             // immediately, then create the missing document: without one the
             // account is invisible in admin user management and every profile
             // write (streaks included) fails, since updateDoc needs the doc to
             // exist. The listener re-fires once it lands.
             const isAdmin = firebaseUser.email ? ADMIN_EMAILS.includes(firebaseUser.email) : false;
             setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role: isAdmin ? 'admin' : 'player', // Default to player if no doc, unless they are admin
                plan: isAdmin ? 'pro' : 'athlete'
            });

             if (backfilledUidRef.current !== firebaseUser.uid) {
               backfilledUidRef.current = firebaseUser.uid;
               ensureUserProfile(firebaseUser.uid).catch((err) => {
                 // Non-fatal: the app keeps working off the defaults above.
                 console.error('Could not create the missing user profile:', err);
               });
             }
          }
          setIsLoading(false);
        }, (error) => {
            console.error("Error fetching user document:", error);
            setIsLoading(false);
            setUser(null);
            stopListener();
        });
        return () => unsubscribeSnapshot();
      } else {
        const publicRoutes = ['/', '/login', '/forgot-password', '/pricing-details'];
        const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/signup');

        if (!isPublicRoute) {
            router.push('/login');
        }
        
        setUser(null);
        stopListener();
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [startListener, stopListener, pathname, router]);

  // Admin "view as user" preview: subscribe to the previewed user's profile
  // and switch the nutrition listener over to their data while previewing.
  useEffect(() => {
    const isAdminUser = user?.role === 'admin';

    if (isAdminUser && previewUser) {
      prevPreviewUidRef.current = previewUser.uid;
      const previewDocRef = doc(db, "users", previewUser.uid);
      const unsubscribePreview = onSnapshot(previewDocRef, (docSnap) => {
        if (!docSnap.exists()) {
          setPreviewedUserData(null);
          return;
        }
        const data = docSnap.data();
        setPreviewedUserData({
          uid: previewUser.uid,
          email: data.email ?? previewUser.email ?? null,
          displayName: data.displayName ?? previewUser.displayName ?? null,
          role: data.role || 'player',
          plan: data.plan || 'athlete',
          photoUrl: data.photoUrl || null,
          onboardingComplete: data.onboardingComplete || false,
          gymPlan: data.gymPlan || null,
          nutritionTarget: data.nutritionTarget || { calories: 2500 },
          preferences: data.preferences || {},
          notifications: data.notifications || {},
          privacy: data.privacy || {},
        });
      });
      useNutritionStore.getState().resetDailyData(previewUser.uid);
      return () => unsubscribePreview();
    } else {
      setPreviewedUserData(null);
      if (prevPreviewUidRef.current && user?.uid) {
        useNutritionStore.getState().resetDailyData(user.uid);
      }
      prevPreviewUidRef.current = null;
    }
  }, [user?.role, user?.uid, previewUser?.uid]);

  const logout = async () => {
    await signOut(auth);
    stopListener();
    router.push('/login');
  };

  return (
    <UserContext.Provider value={{ user, isLoading, logout, previewedUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  const previewAsPlayer = useAdminPreviewStore((state) => state.previewAsPlayer);
  const previewUser = useAdminPreviewStore((state) => state.previewUser);
  const stopUserPreview = useAdminPreviewStore((state) => state.stopUserPreview);

  const isAdmin = context.user?.role === 'admin';

  let user = context.user;
  if (isAdmin && previewUser && context.previewedUserData) {
    user = context.previewedUserData;
  } else if (isAdmin && previewAsPlayer && context.user) {
    user = { ...context.user, plan: 'athlete' as const };
  }

  return { ...context, user, isAdmin, previewAsPlayer, previewUser, stopUserPreview };
};
