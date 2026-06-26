
"use client";

import { UserProvider, useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'admin')) {
            router.push('/dashboard');
        }
    }, [user, isLoading, router]);

    if (isLoading || !user || user.role !== 'admin') {
        return (
            <div className="flex h-screen items-center justify-center">
                <Logo className="h-16 animate-spin-slow" />
            </div>
        );
    }
    
    return <>{children}</>;
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
