import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { ConsentControl } from '@/components/legal/consent-control';
import { COOKIES } from '@/lib/legal/cookies';

export const metadata: Metadata = {
    title: 'Cookie Policy',
    description: 'What SportMind keeps in your browser, and how to change your mind about analytics.',
};

export default function Page() {
    return (
        <>
            <LegalPage doc={COOKIES} />
            {/* The switch sits inside the same measure as the document above it. */}
            <div className="mx-auto max-w-[72ch] px-5 pb-16 md:px-8 md:pb-24">
                <ConsentControl />
            </div>
        </>
    );
}
