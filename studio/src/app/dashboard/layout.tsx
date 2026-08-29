

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
import { useConversations } from '@/hooks/use-conversations';
import { usePresence } from '@/hooks/use-presence';


import { UserProvider, useUser } from "@/hooks/use-user";
import { PageTransition } from "@/components/page-transition";
import { cn } from "@/lib/utils";
import { useDailyReset } from "@/hooks/use-daily-reset";
import { Header } from "@/components/header";
import { StreakLevelUp } from "@/components/streak-level-up";
import { useTranslation } from "@/hooks/use-translation";

/**
 * The dashboard header: who you are on the left, where you can go on the right,
 * on one line.
 *
 * The navigation used to be a pill in its own centred block, hidden entirely
 * below `md`. It now sits at the end of the same header row and stays usable on
 * a phone by scrolling horizontally rather than disappearing.
 */
const NAV_ROUTES = ['/dashboard', '/dashboard/insights', '/dashboard/social', '/dashboard/autres'];

function DashboardHeader() {
    const { user } = useUser();
    const pathname = usePathname();
    const { t } = useTranslation();

    const navItems = [
        { href: "/dashboard", label: t('sports') },
        { href: "/dashboard/insights", label: t('insights') },
        { href: "/dashboard/social", label: t('navSocial') },
        { href: "/dashboard/autres", label: t('navOther') },
    ];

    if (!NAV_ROUTES.includes(pathname)) return null;

    // Each section titles itself, so nothing is repeated below the header.
    const heading =
        pathname === '/dashboard/insights' ? { title: t('insights'), subtitle: t('generalInsightsSubtitle') }
        : pathname === '/dashboard/social' ? { title: t('navSocial'), subtitle: t('friendsSubtitle') }
        : pathname === '/dashboard/autres' ? { title: t('navOther'), subtitle: t('navOtherSubtitle') }
        : { title: `${t('welcome')}, ${user?.displayName || t('athleteDefaultName')}!`, subtitle: t('dashboardSubtitle') };

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
                <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">
                    {heading.title}
                </h1>
                <p className="text-muted-foreground">{heading.subtitle}</p>
            </div>

            {/* Scrolls instead of wrapping on narrow screens: four labels on one
                line would otherwise push the header two rows tall on a phone. */}
            <nav className="-mx-4 overflow-x-auto px-4 md:mx-0 md:shrink-0 md:px-0">
                <ul className="flex min-w-max items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        "relative block whitespace-nowrap px-3 py-2 text-sm transition-colors",
                                        isActive
                                            ? "font-semibold text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {item.label}
                                    {/* A rule under the label, not a filled button. */}
                                    <span
                                        aria-hidden
                                        className={cn(
                                            "absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-opacity",
                                            isActive ? "bg-primary opacity-100" : "opacity-0"
                                        )}
                                    />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
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
  const calculateStreak = useStreakStore((s) => s.calculateStreak);
  const { unreadCount } = useConversations(user?.uid);
  usePresence(user?.uid);
  const { t } = useTranslation();

  const isDashboardRoot = NAV_ROUTES.includes(pathname);

  // Refresh on navigation and on tab focus so a session logged a moment ago is
  // reflected immediately; the store throttles the actual Firestore reads.
  useEffect(() => {
    if (!user?.uid) return;
    calculateStreak(user.uid);
    const onFocus = () => calculateStreak(user.uid);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.uid, pathname, calculateStreak]);

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
    { href: "/dashboard/social", label: t('navSocial'), icon: MessageSquare },
    { href: "/dashboard/settings", label: t('profile'), icon: UserIcon },
  ];

  const coachNavItems = [
    { href: "/coach/dashboard", label: t('coachNavDashboard'), icon: Users },
    { href: "/dashboard", label: t('sports'), icon: Dumbbell },
    { href: "/dashboard/social", label: t('navSocial'), icon: MessageSquare },
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
          className="liquid-glass-pill relative flex h-[62px] w-full max-w-sm items-center overflow-hidden rounded-xl"
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
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{ background: 'linear-gradient(155deg, rgba(255,255,255,0.06) 0%, transparent 55%)' }}
          />

          {/* Bubble — always in DOM so dragBubbleRef is always valid */}
          <div
            ref={dragBubbleRef}
            className="liquid-glass-bubble absolute rounded-md"
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
                  <span className="relative">
                    <item.icon className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      isActive ? "text-primary dark:text-white" : "text-foreground/35 dark:text-white/35"
                    )} />
                    {/* Unread messages have to be visible from every page, not
                        only once you are already inside the messages screen. */}
                    {item.href === "/dashboard/social" && unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
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

      {/* Mounted once here so the celebration can fire from any dashboard page
          the streak happens to be recalculated on. */}
      <StreakLevelUp />
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
