import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { PRIVACY } from '@/lib/legal/privacy';

export const metadata: Metadata = { title: 'Privacy Policy · SportMind AI' };

export default function Page() {
    return <LegalPage doc={PRIVACY} />;
}
