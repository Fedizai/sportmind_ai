import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { REFUNDS } from '@/lib/legal/refunds';

export const metadata: Metadata = { title: 'Refund Policy · SportMind AI' };

export default function Page() {
    return <LegalPage doc={REFUNDS} />;
}
