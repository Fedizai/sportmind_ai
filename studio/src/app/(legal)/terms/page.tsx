import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { TERMS } from '@/lib/legal/terms';

export const metadata: Metadata = { title: 'Terms of Service · SportMind AI' };

export default function Page() {
    return <LegalPage doc={TERMS} />;
}
