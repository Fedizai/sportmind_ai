import { z } from 'zod';

import { signupSchema } from '@/lib/schemas';

/**
 * The signup questionnaire, described once.
 *
 * There used to be two. `/signup` asked for age, training frequency, main
 * goal, position, club, tennis level, hand, play style, height, weight and gym
 * goal, and wrote them onto the user document. `/signup/questions` — the page
 * behind the admin header's "Signup Questions" — asked an entirely different
 * set (coaching, sessions per week, best quality, free-text goals) and wrote
 * it to `onboardingResponses/{randomLocalStorageId}`, a collection nothing in
 * the app has ever read. So an admin opening "Signup Questions" was shown a
 * questionnaire no applicant fills in, about answers nobody stores.
 *
 * This is the real one. Labels live here and are read by both the form and the
 * admin's view, and the options are pulled straight out of `signupSchema`, so
 * the two cannot describe different things.
 */

export type SignupValues = z.infer<typeof signupSchema>;
export type SignupField = keyof SignupValues;

/** Unwraps `.optional()` so an optional enum still yields its values. */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
    let current = schema;
    while (current instanceof z.ZodOptional || current instanceof z.ZodDefault) {
        current = current._def.innerType;
    }
    return current;
}

/** The stored values a field accepts, or null when it is free input. */
export function optionsFor(field: SignupField): string[] | null {
    const shape = (signupSchema as any).shape as Record<string, z.ZodTypeAny>;
    const inner = unwrap(shape[field]);
    if (inner instanceof z.ZodEnum) return [...inner.options] as string[];
    if (inner instanceof z.ZodBoolean) return ['true', 'false'];
    return null;
}

export interface QuestionLabel {
    en: string;
    fr: string;
}

/**
 * Every field in `signupSchema`, and nothing else.
 *
 * `Record<SignupField, …>` is the point: adding a question to the schema
 * without describing it here, or describing one that no longer exists, stops
 * the build rather than quietly desynchronising the admin's view again.
 */
export const QUESTION_LABELS: Record<SignupField, QuestionLabel> = {
    fullName: { en: 'Full name', fr: 'Nom complet' },
    username: { en: 'Username', fr: "Nom d'utilisateur" },
    email: { en: 'Email', fr: 'E-mail' },
    password: { en: 'Password', fr: 'Mot de passe' },
    role: { en: 'I am a…', fr: 'Je suis…' },
    age: { en: 'Age', fr: 'Âge' },
    trainingFrequency: { en: 'How often do you train?', fr: 'À quelle fréquence t\'entraînes-tu ?' },
    mainGoal: { en: 'What is your main athletic goal?', fr: 'Quel est ton objectif sportif principal ?' },
    sports: { en: 'What sports do you play?', fr: 'Quels sports pratiques-tu ?' },
    footballPosition: { en: 'What is your primary position?', fr: 'Quel est ton poste principal ?' },
    inClub: { en: 'Are you currently in a club?', fr: 'Es-tu actuellement dans un club ?' },
    tennisLevel: { en: 'Skill level', fr: 'Niveau' },
    hasRanking: { en: 'Do you have a ranking?', fr: 'As-tu un classement ?' },
    tennisRanking: { en: 'Ranking', fr: 'Classement' },
    dominantHand: { en: 'Dominant hand', fr: 'Main dominante' },
    playStyle: { en: 'Play style', fr: 'Style de jeu' },
    gymHeight: { en: 'Height (cm)', fr: 'Taille (cm)' },
    gymWeight: { en: 'Weight (kg)', fr: 'Poids (kg)' },
    gymGoal: { en: 'Primary gym goal', fr: 'Objectif principal en salle' },
};

export interface SignupSection {
    id: string;
    title: QuestionLabel;
    /** Present when the section is only asked of athletes who chose that sport. */
    sport?: 'football' | 'tennis' | 'gym';
    fields: SignupField[];
}

/** The order the applicant meets them in — the same order `/signup` steps through. */
export const SIGNUP_SECTIONS: SignupSection[] = [
    {
        id: 'account',
        title: { en: 'Account', fr: 'Compte' },
        fields: ['fullName', 'username', 'email', 'password', 'role'],
    },
    {
        id: 'general',
        title: { en: 'About you', fr: 'À propos de toi' },
        fields: ['age', 'mainGoal', 'trainingFrequency', 'sports'],
    },
    {
        id: 'football',
        title: { en: 'Football profile', fr: 'Profil football' },
        sport: 'football',
        fields: ['footballPosition', 'inClub'],
    },
    {
        id: 'tennis',
        title: { en: 'Tennis profile', fr: 'Profil tennis' },
        sport: 'tennis',
        fields: ['tennisLevel', 'hasRanking', 'tennisRanking', 'dominantHand', 'playStyle'],
    },
    {
        id: 'gym',
        title: { en: 'Gym profile', fr: 'Profil musculation' },
        sport: 'gym',
        fields: ['gymHeight', 'gymWeight', 'gymGoal'],
    },
];

/**
 * Where each answer ends up on the user document.
 *
 * `/signup` renames as it saves — `footballPosition` becomes
 * `footballProfile.position`, `gymHeight` becomes `gymProfile.height` — which
 * is exactly the kind of quiet rename that let the admin's cards read fields
 * that were never written. Spelling it out means one lookup, shared.
 * `null` marks an answer that is not stored on the profile (the password).
 */
export const STORED_AT: Record<SignupField, string | null> = {
    fullName: 'displayName',
    username: 'username',
    email: 'email',
    password: null,
    role: 'role',
    age: 'age',
    trainingFrequency: 'trainingFrequency',
    mainGoal: 'mainGoal',
    sports: 'sports',
    footballPosition: 'footballProfile.position',
    inClub: 'footballProfile.inClub',
    tennisLevel: 'tennisProfile.level',
    hasRanking: 'tennisProfile.hasRanking',
    tennisRanking: 'tennisProfile.ranking',
    dominantHand: 'tennisProfile.dominantHand',
    playStyle: 'tennisProfile.playStyle',
    gymHeight: 'gymProfile.height',
    gymWeight: 'gymProfile.weight',
    gymGoal: 'gymProfile.goal',
};

/** Follows a dotted path from STORED_AT. */
export function readStored(user: Record<string, any> | null | undefined, field: SignupField): unknown {
    const path = STORED_AT[field];
    if (!path || !user) return undefined;
    return path.split('.').reduce<any>((value, key) => (value == null ? undefined : value[key]), user);
}

/** "serve_volley" reads as "Serve volley" rather than being shown raw. */
export function prettyOption(value: string): string {
    if (value === 'true') return 'Yes';
    if (value === 'false') return 'No';
    return value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Where a sport's answers are stored on the user document.
 *
 * `/signup` writes them nested under these keys, which is what the admin's
 * user cards read back.
 */
export const PROFILE_FIELD = {
    football: 'footballProfile',
    tennis: 'tennisProfile',
    gym: 'gymProfile',
} as const;
