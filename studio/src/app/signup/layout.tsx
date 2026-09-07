import type { Metadata } from 'next';

/**
 * The page itself is a client component, which cannot export metadata. A layout
 * can, and this is the whole reason it exists.
 */
export const metadata: Metadata = {
    title: 'Create your account',
    description: 'Set up SportMind in a few minutes: your sports, your goals and your starting numbers. Free to start.',
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
