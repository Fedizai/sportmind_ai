

"use client"
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  Users,
  User as UserIcon,
  MessageSquare,
  Dumbbell,
  BarChart2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useStreakStore } from '@/stores/streak-store';


import { UserProvider, useUser } from "@/hooks/use-user";
import { PageTransition } from "@/components/page-transition";
import { cn } from "@/lib/utils";
import { useDailyReset } from "@/hooks/use-daily-reset";
import { Header } from "@/components/header";
import { useTranslation } from "@/hooks/use-translation";

function DashboardHeader() {
    const { user } = useUser();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState(pathname);
    const tabsContainerRef = useRef<HTMLElement>(null);
    const tabsRef = useRef<(HTMLAnchorElement | null)[]>([]);
    const { t } = useTranslation();

    const navItems = [
        { href: "/dashboard", label: t('sports'), icon: Dumbbell },
        { href: "/dashboard/insights", label: t('insights'), icon: BarChart2 },
        { href: "/dashboard/messages", label: t('messages'), icon: MessageSquare }
    ];

    const isDashboardRoot = ['/dashboard', '/dashboard/insights', '/dashboard/messages'].includes(pathname);

    useEffect(() => {
        const currentPath = pathname.split('?')[0];
        setActiveTab(currentPath);
    }, [pathname]);

    useEffect(() => {
        const tabs = tabsRef.current;
        const container = tabsContainerRef.current;
        const indicator = container?.querySelector("#tab-indicator") as HTMLSpanElement | null;
        const activeTabIndex = navItems.findIndex(item => item.href === activeTab);
        const activeTabEl = tabs[activeTabIndex];

        if (activeTabEl && indicator) {
            const containerRect = container!.getBoundingClientRect();
            const tabRect = activeTabEl.getBoundingClientRect();

            indicator.style.width = `${tabRect.width}px`;
            indicator.style.transform = `translateX(${tabRect.left - containerRect.left}px)`;
        }
    }, [activeTab, navItems]);


    if (!isDashboardRoot) {
        return null;
    }

    return (
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
             <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
                    {`${t('welcome')}, ${user?.displayName || t('athleteDefaultName')}!`}
                </h1>
                <p className="text-muted-foreground">
                    {t('dashboardSubtitle')}
                </p>
            </div>
             <div className="hidden md:flex items-center justify-center">
                <nav
                    ref={tabsContainerRef}
                    className="relative inline-flex items-center gap-8 rounded-full p-1.5 ring-1 ring-border/60 dark:ring-white/[0.08] bg-muted/40 dark:bg-white/[0.03] backdrop-blur-xl shadow-card"
                >
                    <span
                        id="tab-indicator"
                        className="pointer-events-none absolute left-0 h-9 rounded-full bg-background/90 dark:bg-white/[0.09] shadow-card border border-border/60 dark:border-white/[0.08] transition-all duration-300 ease-out"
                    />
                    {navItems.map((item, index) => {
                         const isActive = activeTab === item.href;
                         return (
                            <Link key={item.label} href={item.href} legacyBehavior>
                                <a
                                    ref={(el) => (tabsRef.current[index] = el)}
                                    className={cn(
                                        "relative z-10 px-4 py-2 text-sm font-medium transition-colors",
                                        isActive ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {item.label}
                                </a>
                            </Link>
                         )
                    })}
                </nav>
            </div>
        </div>
    )
}


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, isLoading } = useUser();
  useDailyReset();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { calculateStreak, lastCalculated } = useStreakStore();
  const { t } = useTranslation();

  const isDashboardRoot = ['/dashboard', '/dashboard/insights', '/dashboard/messages'].includes(pathname);

  useEffect(() => {
    if (user?.uid && lastCalculated !== new Date().toISOString().split('T')[0]) {
      calculateStreak(user.uid);
    }
  }, [user, lastCalculated, calculateStreak]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isCoachView = pathname.startsWith('/coach');

  const playerNavItems = [
    { href: "/dashboard", label: t('sports'), icon: Dumbbell },
    { href: "/dashboard/insights", label: t('insights'), icon: BarChart2 },
    { href: "/dashboard/messages", label: t('messages'), icon: MessageSquare },
    { href: "/dashboard/settings", label: t('profile'), icon: UserIcon },
  ];

  const coachNavItems = [
    { href: "/coach/dashboard", label: t('coachNavDashboard'), icon: Users },
    { href: "/dashboard", label: t('sports'), icon: Dumbbell },
    { href: "/dashboard/messages", label: t('messages'), icon: MessageSquare },
    { href: "/dashboard/settings", label: t('profile'), icon: UserIcon },
  ];

  const bottomNavItems = (user?.role === 'admin' || user?.role === 'coach')
    ? (isCoachView ? coachNavItems : playerNavItems)
    : playerNavItems;

  const getActiveIndex = () => {
    const sorted = [...bottomNavItems].sort((a, b) => b.href.length - a.href.length);
    const active = sorted.find(item => pathname.startsWith(item.href));
    return active ? bottomNavItems.findIndex(item => item.href === active.href) : -1;
  };

  const originalIndex = getActiveIndex();

  // ── Settled bubble position (React-controlled) ────────────────────────────
  const bottomNavRef      = useRef<HTMLDivElement>(null);
  const bottomNavItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [bubbleStyle, setBubbleStyle] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const container = bottomNavRef.current;
    const activeEl  = bottomNavItemRefs.current[originalIndex];
    if (!container || !activeEl || originalIndex === -1) { setBubbleStyle(null); return; }
    const pr = container.getBoundingClientRect();
    const ir = activeEl.getBoundingClientRect();
    setBubbleStyle({ left: ir.left - pr.left, width: ir.width });
  }, [originalIndex, bottomNavItems.length]);

  // ── Drag / swipe state ────────────────────────────────────────────────────
  // Refs keep drag state synchronous so handlers run at 60fps without re-renders.
  const isDraggingRef  = useRef(false);
  const hasDraggedRef  = useRef(false);   // true once finger moves past dead zone
  const dragStartXRef  = useRef(0);
  const dragBubbleRef  = useRef<HTMLDivElement>(null);
  // dragIndex = which slot looks active while the finger is in motion
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const effectiveIndex = dragIndex ?? originalIndex;

  // Returns bounding info for every slot relative to the pill container.
  const getItemRects = () => {
    const pill = bottomNavRef.current;
    if (!pill) return [];
    const pl = pill.getBoundingClientRect().left;
    return (bottomNavItemRefs.current as (HTMLDivElement | null)[]).map(el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left - pl, width: r.width, center: r.left - pl + r.width / 2 };
    });
  };

  // Nearest slot whose center is closest to `targetCenter`.
  const findNearestIndex = (
    rects: ReturnType<typeof getItemRects>,
    targetCenter: number
  ): number =>
    rects.reduce<number>((best, r, i) => {
      if (!r) return best;
      const br = rects[best];
      return Math.abs(r.center - targetCenter) < (br ? Math.abs(br.center - targetCenter) : Infinity) ? i : best;
    }, 0);

  // Directly mutates the bubble DOM node — no React re-render, stays at 60fps.
  const applyBubbleDirect = (left: number, width: number, animated: boolean) => {
    const b = dragBubbleRef.current;
    if (!b) return;
    b.style.transition = animated
      ? 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), width 0.35s cubic-bezier(0.34,1.56,0.64,1)'
      : 'none';
    b.style.left  = `${left}px`;
    b.style.width = `${width}px`;
  };

  // Capture the pointer on the pill so every subsequent move/up goes here,
  // even if the finger slides off an individual nav item.
  const handleNavPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    hasDraggedRef.current = false;         // reset for each new gesture
    isDraggingRef.current = false;
    dragStartXRef.current = e.clientX;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handleNavPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const deltaX = e.clientX - dragStartXRef.current;
    if (!hasDraggedRef.current) {
      if (Math.abs(deltaX) < 8) return;   // 8px dead zone prevents accidental swipes
      hasDraggedRef.current = true;
      isDraggingRef.current = true;
    }
    const rects  = getItemRects();
    const origin = rects[originalIndex];
    if (!origin) return;
    const nearest = findNearestIndex(rects, origin.center + deltaX);
    const target  = rects[nearest];
    if (target) applyBubbleDirect(target.left, target.width, false); // instant follow
    if (nearest !== effectiveIndex) setDragIndex(nearest);           // update icon colors
  };

  const handleNavPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const rects      = getItemRects();
    const origin     = rects[originalIndex];
    const deltaX     = e.clientX - dragStartXRef.current;
    if (!origin) { setDragIndex(null); return; }

    const nearest    = findNearestIndex(rects, origin.center + deltaX);
    const targetRect = rects[nearest];

    if (targetRect) {
      // Spring-animate bubble to the final slot
      applyBubbleDirect(targetRect.left, targetRect.width, true);
      // Pre-sync React state so the next re-render doesn't revert the position
      setBubbleStyle({ left: targetRect.left, width: targetRect.width });
    }
    setDragIndex(null);
    if (nearest !== originalIndex && bottomNavItems[nearest]) {
      router.push(bottomNavItems[nearest].href);
    }
  };

  if (isLoading || !user) {
    return (
        <div className="flex h-screen items-center justify-center bg-background" />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex flex-col p-4 md:p-8 pb-20 md:pb-8">
        <DashboardHeader />
        <div className={cn(!isDashboardRoot ? "mt-0" : "mt-8", "flex-grow")}>
            <PageTransition>
                {children}
            </PageTransition>
        </div>
      </main>

      {/* Bottom Navigation — Liquid Glass (iOS 26 style) */}
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pt-3 pb-safe transition-transform duration-300 ease-in-out",
          isNavVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* touchAction:none lets us capture horizontal swipes before the browser does */}
        <div
          ref={bottomNavRef}
          className="liquid-glass-pill relative flex h-[62px] w-full max-w-sm items-center overflow-hidden rounded-full"
          style={{ touchAction: 'none', userSelect: 'none' }}
          onPointerDown={handleNavPointerDown}
          onPointerMove={handleNavPointerMove}
          onPointerUp={handleNavPointerUp}
          onPointerCancel={handleNavPointerUp}
          // Block link clicks that are the tail-end of a drag gesture
          onClickCapture={(e) => { if (hasDraggedRef.current) e.stopPropagation(); }}
        >
          {/* Inner glass gradient */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(155deg, rgba(255,255,255,0.06) 0%, transparent 55%)' }}
          />

          {/* Bubble — always in DOM so dragBubbleRef is always valid */}
          <div
            ref={dragBubbleRef}
            className="liquid-glass-bubble absolute rounded-full"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              height: '46px',
              left: `${bubbleStyle?.left ?? -100}px`,
              width: `${bubbleStyle?.width ?? 0}px`,
              visibility: bubbleStyle ? 'visible' : 'hidden',
              transition: 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), width 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          />

          {/* Nav items — effectiveIndex drives visual active state during drag */}
          {bottomNavItems.map((item, index) => {
            const isActive = effectiveIndex === index;
            return (
              <div
                key={item.href}
                ref={(el) => { bottomNavItemRefs.current[index] = el; }}
                className="relative z-10"
                style={{ flex: 1 }}
              >
                <Link
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-[3px] h-[62px] w-full"
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    isActive ? "text-primary dark:text-white" : "text-foreground/35 dark:text-white/35"
                  )} />
                  <span className={cn(
                    "text-[9px] leading-none font-medium tracking-wide transition-colors duration-200",
                    isActive ? "text-foreground dark:text-white/90" : "text-foreground/30 dark:text-white/30"
                  )}>
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </UserProvider>
  );
}
