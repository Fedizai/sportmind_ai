
"use client"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  Dumbbell,
  BarChart2,
  MessageSquare,
  User as UserIcon,
} from "lucide-react";
import { UserProvider, useUser } from "@/hooks/use-user";
import { Logo } from "@/components/logo";
import { PageTransition } from "@/components/page-transition";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { Header } from "@/components/header";


function CoachLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, isLoading } = useUser();
  const { t } = useTranslation();
  const allowedRoles = ['coach', 'admin'];

  const navItems = [
    { href: "/coach/dashboard", label: t('coachNavDashboard') },
    { href: "/coach/sports", label: t('sports') },
    { href: "/coach/chat", label: t('messages') }
  ];

  const bottomNavItems = [
      { href: "/coach/dashboard", label: t('coachNavDashboard'), icon: Home },
      { href: "/coach/sports", label: t('sports'), icon: Dumbbell },
      { href: "/coach/chat", label: t('messages'), icon: MessageSquare },
      { href: "/coach/settings", label: t('profile'), icon: UserIcon },
  ];

  const isAdminPage = pathname === '/admin';
  const tabsContainerRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (!allowedRoles.includes(user.role || '')) {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

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

  useEffect(() => {
    const tabs = tabsRef.current;
    const container = tabsContainerRef.current;
    if (!container || !isNavVisible) return;
    const indicator = container.querySelector("#tab-indicator-coach") as HTMLSpanElement | null;
    const activeTabIndex = navItems.findIndex(item => pathname.startsWith(item.href));
    const activeTabEl = tabs[activeTabIndex];

    if (activeTabEl && indicator) {
        const containerRect = container.getBoundingClientRect();
        const tabRect = activeTabEl.getBoundingClientRect();

        indicator.style.width = `${tabRect.width}px`;
        indicator.style.transform = `translateX(${tabRect.left - containerRect.left}px)`;
    }
  }, [pathname, isNavVisible]);

  const getActiveBottomIndex = () => {
    const sorted = [...bottomNavItems].sort((a, b) => b.href.length - a.href.length);
    const active = sorted.find(item => pathname.startsWith(item.href));
    return active ? bottomNavItems.findIndex(item => item.href === active.href) : 0;
  };
  const activeBottomIndex = getActiveBottomIndex();

  // ── Settled bubble position (React-controlled) ────────────────────────────
  const bottomNavRef      = useRef<HTMLDivElement>(null);
  const bottomNavItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [bubbleStyle, setBubbleStyle] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const container = bottomNavRef.current;
    const activeEl  = bottomNavItemRefs.current[activeBottomIndex];
    if (!container || !activeEl || activeBottomIndex === -1) { setBubbleStyle(null); return; }
    const pr = container.getBoundingClientRect();
    const ir = activeEl.getBoundingClientRect();
    setBubbleStyle({ left: ir.left - pr.left, width: ir.width });
  }, [activeBottomIndex]);

  // ── Drag / swipe state ────────────────────────────────────────────────────
  // Refs keep drag state synchronous so handlers run at 60fps without re-renders.
  const isDraggingRef  = useRef(false);
  const hasDraggedRef  = useRef(false);   // true once finger moves past dead zone
  const dragStartXRef  = useRef(0);
  const dragBubbleRef  = useRef<HTMLDivElement>(null);
  // dragIndex = which slot looks active while the finger is in motion
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const effectiveIndex = dragIndex ?? activeBottomIndex;

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
    const origin = rects[activeBottomIndex];
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
    const origin     = rects[activeBottomIndex];
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
    if (nearest !== activeBottomIndex && bottomNavItems[nearest]) {
      router.push(bottomNavItems[nearest].href);
    }
  };

  if (isLoading || !user || !allowedRoles.includes(user.role || '')) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Logo className="h-16 animate-spin-slow" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />

      <main className="flex flex-1 flex-col p-4 md:p-8 pb-20 md:pb-8 overflow-hidden h-full">
        {!isAdminPage && (
             <div className="hidden md:flex justify-center md:justify-end mb-6 flex-shrink-0">
                 <nav
                    ref={tabsContainerRef}
                    className="relative inline-flex items-center rounded-full p-1.5 ring-1 ring-white/[0.08] bg-white/[0.04] dark:bg-white/[0.03] backdrop-blur-xl shadow-card"
                >
                    <span
                        id="tab-indicator-coach"
                        className="pointer-events-none absolute left-0 h-9 rounded-full bg-background/90 dark:bg-white/[0.09] shadow-card border border-white/[0.08] transition-all duration-300 ease-out"
                    />
                    {navItems.map((item, index) => {
                        const activeIndex = navItems.findIndex(i => pathname.startsWith(i.href));
                        const isActive = activeIndex === index;

                        return (
                            <Link key={item.label} href={item.href} legacyBehavior>
                                <a
                                    ref={(el) => (tabsRef.current[index] = el)}
                                    aria-selected={isActive}
                                    className={cn(
                                        "relative z-10 flex-1 flex items-center justify-center px-6 py-2 transition-colors",
                                        isActive ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {item.label}
                                </a>
                            </Link>
                        )
                    })}
                </nav>
            </div>
        )}
        <PageTransition>{children}</PageTransition>
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

export default function CoachDashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            <CoachLayoutContent>{children}</CoachLayoutContent>
        </UserProvider>
    )
}
