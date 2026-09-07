import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { TERMS } from '@/lib/legal/terms';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'The agreement between you and SportMind: what the service is, what it is not, and who is liable for what.',
};

export default function Page() {
    return <LegalPage doc={TERMS} />;
}
