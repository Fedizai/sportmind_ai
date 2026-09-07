import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { NOTICE } from '@/lib/legal/notice';

export const metadata: Metadata = { title: 'Legal Notice · SportMind AI' };

export default function Page() {
    return <LegalPage doc={NOTICE} />;
}
