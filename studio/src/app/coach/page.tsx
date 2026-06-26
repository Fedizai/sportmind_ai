
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProvider, useUser } from '@/hooks/use-user';
import { Logo } from '@/components/logo';

// This component handles the redirection from /coach to /coach/dashboard
function CoachPageRedirectContent() {
  const router = useRouter();
  const { isLoading } = useUser();

  useEffect(() => {
    if (!isLoading) {
        // Always redirect from the base /coach route
        router.replace('/coach/dashboard');
    }
  }, [isLoading, router]);

  // Display a loading indicator while the redirect is happening
  return (
    <div className="flex h-screen items-center justify-center">
      <Logo className="h-16 animate-spin-slow" />
    </div>
  );
}


export default function CoachPageRedirect() {
    return (
        <UserProvider>
            <CoachPageRedirectContent />
        </UserProvider>
    )
}
