"use client";

import Link from 'next/link';
import { ArrowLeft, FileQuestion, Lock } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useTranslation } from '@/hooks/use-translation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    optionsFor, prettyOption, QUESTION_LABELS, SIGNUP_SECTIONS,
    type SignupField,
} from '@/lib/signup-questions';
import { SHIPPED_SPORTS } from '@/lib/sports';

/**
 * What an applicant is actually asked.
 *
 * This page is linked from the admin header as "Signup Questions", and it used
 * to be a second, live questionnaire — one asking about coaching, sessions per
 * week, a best quality and free-text goals, saved to
 * `onboardingResponses/{randomLocalStorageId}`, a collection nothing in the app
 * has ever read. Meanwhile `/signup` asked a different set entirely and wrote
 * it to the user document, which is what the admin's user cards display. An
 * admin checking "the signup questions" was shown a form no applicant fills in.
 *
 * It is now a read-only reference rendered from the same definition `/signup`
 * validates against, so the two cannot disagree.
 */
export default function SignupQuestionsPage() {
    const { user } = useUser();
    const { t, language } = useTranslation();
    const label = (value: { en: string; fr: string }) => (language === 'fr' ? value.fr : value.en);

    if (user && user.role !== 'admin') {
        return (
            <div className="mx-auto max-w-2xl p-8">
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                        <Lock className="h-8 w-8 text-muted-foreground/50" />
                        <p className="font-semibold">{t('accessDenied')}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const describe = (field: SignupField) => {
        // An array of sport ids has no enum to read, but the choice on offer
        // is still a fixed list.
        if (field === 'sports') return SHIPPED_SPORTS.map(prettyOption).join(' · ');
        const options = optionsFor(field);
        if (options) return options.map(prettyOption).join(' · ');
        if (field === 'age' || field === 'gymHeight' || field === 'gymWeight') return t('signupQuestionsNumber');
        return t('signupQuestionsFreeText');
    };

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
            <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground">
                <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToDashboard')}</Link>
            </Button>

            <div className="space-y-2">
                <h1 className="flex items-center gap-3 font-headline text-3xl font-bold tracking-tight">
                    <FileQuestion className="h-8 w-8 text-primary" />
                    {t('signupQuestionsTitle')}
                </h1>
                <p className="text-muted-foreground">{t('signupQuestionsSubtitle')}</p>
            </div>

            {SIGNUP_SECTIONS.map((section) => (
                <Card key={section.id}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{label(section.title)}</CardTitle>
                        {section.sport && (
                            <CardDescription>
                                {t('signupQuestionsAskedIf', { sport: t(section.sport) })}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {section.fields.map((field) => (
                            <div key={field} className="rounded-lg border p-3">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="font-medium">{label(QUESTION_LABELS[field])}</p>
                                    <Badge variant="secondary" className="font-mono text-xs">{field}</Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-medium">{t('signupQuestionsAnswers')}: </span>
                                    {describe(field)}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
