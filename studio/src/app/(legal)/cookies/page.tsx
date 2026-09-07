import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { COOKIES } from '@/lib/legal/cookies';

export const metadata: Metadata = { title: 'Cookie Policy · SportMind AI' };

export default function Page() {
    return <LegalPage doc={COOKIES} />;
}
