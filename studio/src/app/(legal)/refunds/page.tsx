import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { REFUNDS } from '@/lib/legal/refunds';

export const metadata: Metadata = {
    title: 'Refund Policy',
    description: 'How to cancel a Pro plan, the 14-day right of withdrawal, and when a refund is owed.',
};

export default function Page() {
    return <LegalPage doc={REFUNDS} />;
}
