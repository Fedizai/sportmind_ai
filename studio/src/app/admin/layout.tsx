
"use client";

import { UserProvider, useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { Header } from "@/components/header";
import { PageTransition } from "@/components/page-transition";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) {
            return; // Wait until user data is loaded
        }

        if (!user || user.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [user, isLoading, router]);

    // While loading, or if the user is not an admin, don't render the children.
    // This prevents a flash of admin content for unauthorized users before the redirect.
    if (isLoading || !user || user.role !== 'admin') {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background">
                <Logo className="h-16 animate-spin-slow" />
            </div>
        );
    }
    
    // Only render the admin content if the user is fully loaded and has the 'admin' role.
    return (
         <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 flex flex-col p-4 md:p-8">
                <PageTransition>{children}</PageTransition>
            </main>
        </div>
    );
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            <AdminLayoutContent>
                {children}
            </AdminLayoutContent>
        </UserProvider>
    )
}
