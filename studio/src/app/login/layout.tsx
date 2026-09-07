import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Log in',
    description: 'Sign in to SportMind to pick up your training, nutrition and progress where you left off.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
