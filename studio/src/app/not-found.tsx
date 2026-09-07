'use client';

import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLanguageStore } from '@/stores/language-store';

/**
 * A 404 that offers a way out.
 *
 * Next's default is an unstyled black-on-white line of text with no navigation,
 * which on a dark site reads as a crash rather than a wrong address. The three
 * links are the three places someone who mistyped a URL actually wants.
 */
export default function NotFound() {
    const language = useLanguageStore((s) => s.language);
    const fr = language === 'fr';

    return (
        <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0C] px-6 py-24 text-center text-white">
            <Compass className="h-10 w-10 text-primary" aria-hidden="true" />
            <p className="mt-6 font-display text-6xl font-extrabold tracking-tight">404</p>
            <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">
                {fr ? 'Cette page n’existe pas' : 'This page does not exist'}
            </h1>
            <p className="mt-4 max-w-[46ch] leading-relaxed text-white/70">
                {fr
                    ? 'Le lien est peut-être ancien, ou l’adresse comporte une faute. Voici par où repartir.'
                    : 'The link may be old, or the address has a typo. Here is where to pick things up.'}
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                        {fr ? 'Retour à l’accueil' : 'Back to the home page'}
                    </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="/signup">{fr ? 'Créer un compte' : 'Create an account'}</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                    <Link href="/login">{fr ? 'Se connecter' : 'Log in'}</Link>
                </Button>
            </div>
        </main>
    );
}
