import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { PRIVACY } from '@/lib/legal/privacy';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'What SportMind collects about you, why, who else sees it, and the rights you can exercise.',
};

export default function Page() {
    return <LegalPage doc={PRIVACY} />;
}
