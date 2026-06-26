
"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LogOut,
  Languages,
  Sun,
  Moon,
  Users,
  User as UserIcon,
  Shield,
  FileQuestion,
  Menu,
  ChevronDown,
  Eye
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useUser } from "@/hooks/use-user";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StreakCounter } from "./streak-counter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/stores/language-store";
import { useTranslation } from "@/hooks/use-translation";
import { useAdminPreviewStore } from "@/stores/admin-preview-store";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, previewUser, stopUserPreview } = useUser();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const [showAdminFeatures, setShowAdminFeatures] = useState(false);
  const { previewAsPlayer, togglePreviewAsPlayer } = useAdminPreviewStore();

  const handleLogout = async () => {
    await logout();
  };

  const handleExitUserPreview = () => {
    stopUserPreview();
    router.push('/admin');
  };

  const isCoachView = pathname.startsWith('/coach');

  return (
    <>
    {previewUser && (
      <div className="sticky top-0 z-50 flex h-10 items-center justify-center gap-3 bg-amber-500 px-4 text-sm font-medium text-black">
        <Eye className="h-4 w-4" />
        <span>Previewing as {previewUser.displayName || previewUser.email}</span>
        <Button size="sm" variant="secondary" className="h-7" onClick={handleExitUserPreview}>
          Exit Preview
        </Button>
      </div>
    )}
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between px-4 md:px-8 border-b border-border/60 dark:border-white/[0.07] bg-background/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <Logo className="h-10 w-auto" />
                <span className="font-bold text-lg whitespace-nowrap">SportMind AI</span>
            </Link>
            <StreakCounter />
             <div className="hidden md:flex items-center gap-2">
                {(user?.role === 'admin' || user?.role === 'coach') && (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={isCoachView ? "/dashboard" : "/coach/dashboard"}>
                            {isCoachView ? <UserIcon className="mr-2 h-4 w-4" /> : <Users className="mr-2 h-4 w-4" />}
                            {isCoachView ? "Player View" : "Coach View"}
                        </Link>
                    </Button>
                )}
                {user?.role === 'admin' && (
                  <>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin">
                            <Shield className="mr-2 h-4 w-4" />
                            User Management
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/signup/questions">
                            <FileQuestion className="mr-2 h-4 w-4" />
                            Signup Questions
                        </Link>
                    </Button>
                  </>
                )}
            </div>
        </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2">
           <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
             <Button
                variant="outline"
                size="icon"
                onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
              >
                <Languages className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Change language</span>
              </Button>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Avatar className="h-5 w-5 sm:mr-2">
                        <AvatarImage src={user?.photoUrl || undefined} alt={user?.displayName || 'User'} />
                        <AvatarFallback className="text-[10px]">{user?.displayName?.charAt(0).toUpperCase() || <Menu className="h-3 w-3" />}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">Menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.displayName || "Account"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>{t('profile')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setShowAdminFeatures((prev) => !prev)}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span className="flex-1">{t('admin')}</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", showAdminFeatures && "rotate-180")} />
                    </DropdownMenuItem>
                    {showAdminFeatures && (
                      <>
                        <DropdownMenuItem className="pl-8" onClick={() => router.push('/admin')}>
                            <Shield className="mr-2 h-4 w-4" />
                            <span>User Management</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="pl-8" onClick={() => router.push('/signup/questions')}>
                            <FileQuestion className="mr-2 h-4 w-4" />
                            <span>Signup Questions</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="pl-8" onClick={() => router.push(isCoachView ? "/dashboard" : "/coach/dashboard")}>
                            {isCoachView ? <UserIcon className="mr-2 h-4 w-4" /> : <Users className="mr-2 h-4 w-4" />}
                            <span>{isCoachView ? "Player View" : "Coach View"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="pl-8" onSelect={(e) => e.preventDefault()} onClick={togglePreviewAsPlayer}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span className="flex-1">Preview as Player</span>
                            <Switch checked={previewAsPlayer} className="pointer-events-none" />
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                 <div className="sm:hidden">
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <div className="flex items-center justify-between w-full">
                           <div className="flex items-center">
                             <Languages className="mr-2 h-4 w-4" />
                             <span>{t('language')}</span>
                           </div>
                           <div className="flex items-center p-0.5 bg-muted rounded-md">
                             <Button variant={language === 'en' ? 'secondary' : 'ghost'} size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={() => setLanguage('en')}>EN</Button>
                             <Button variant={language === 'fr' ? 'secondary' : 'ghost'} size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={() => setLanguage('fr')}>FR</Button>
                           </div>
                         </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                       <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span>{t('theme')}</span>
                          </div>
                          <div className="flex items-center p-0.5 bg-muted rounded-md">
                              <Button variant={theme === 'light' ? 'secondary' : 'ghost'} size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={() => setTheme('light')}><Sun className="h-3 w-3" /></Button>
                              <Button variant={theme === 'dark' ? 'secondary' : 'ghost'} size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={() => setTheme('dark')}><Moon className="h-3 w-3" /></Button>
                          </div>
                        </div>
                    </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('logout')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  )
}
