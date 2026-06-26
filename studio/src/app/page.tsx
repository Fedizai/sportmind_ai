"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Logo } from '@/components/logo';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Menu,
  Languages,
  Sun,
  Moon,
  ChevronDown,
  ScanLine,
  Activity,
  BrainCircuit,
  BarChart,
  Dumbbell,
  UtensilsCrossed,
  Users,
  Trophy,
  Gauge,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useLanguageStore } from '@/stores/language-store';
import { useTranslation } from '@/hooks/use-translation';
import dynamic from 'next/dynamic';
import { BODY_RINGS } from '@/components/body-scan/three/human-landmarks';
import type { RingDatum } from '@/components/body-scan/three/measure-rings';

// Lazy, client-only so the public route paints text first and streams the WebGL
// scanner in after. The placeholder reserves the exact frame to avoid layout shift.
const BodyScan3D = dynamic(
  () => import('@/components/body-scan/body-scan-3d').then((m) => ({ default: m.BodyScan3D })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-[1.75rem] border border-primary/15 bg-[#04090d]" />
    ),
  }
);

/* ------------------------------------------------------------------ */
/*  Count-up — animates a number on mount (hero is above the fold).     */
/* ------------------------------------------------------------------ */
function Counter({ to, delayMs = 0, durationMs = 1500, className }: { to: number; delayMs?: number; durationMs?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce) {
      setValue(to);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 4); // ease-out-quart
      setValue(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to, delayMs, durationMs, reduce]);

  return <span className={cn('tabular-nums', className)}>{Math.round(value)}</span>;
}

export default function LandingPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [selectedFeature, setSelectedFeature] = useState(0);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);

  // Measurements that drive the holographic hero scan + the floating readouts.
  const heroValues: Record<string, number> = { chest: 108, waist: 84, hips: 99 };
  const heroRings: RingDatum[] = BODY_RINGS.filter((r) => heroValues[r.source] !== undefined).map((r) => ({
    id: r.id,
    label: r.id.toUpperCase(),
    valueText: `${heroValues[r.source]} cm`,
    y: r.y,
    radiusX: r.radiusX,
    radiusZ: r.radiusZ,
    side: r.side,
  }));
  const heroScanLabels = {
    title: t('geneticReport'),
    front: t('frontView'),
    side: t('sideView'),
    back: t('backView'),
    hint: t('bodyScanDragHint'),
  };

  const sports = ['Gym', 'Football', 'Tennis', 'Basketball', 'Boxing', 'Swimming'];

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [isLoading, user, router]);

  const handleGetStarted = (checkoutUrl: string) => {
    if (user) {
      window.location.href = checkoutUrl;
    } else {
      toast({
        title: "Account Required",
        description: "Please create an account to subscribe to a plan.",
      });
      router.push(`/signup?checkoutUrl=${encodeURIComponent(checkoutUrl)}`);
    }
  };

  const handleViewInfo = (index: number) => {
    setSelectedFeature(index);
    setIsFeatureDialogOpen(true);
  };

  const features = [
    {
      icon: <Dumbbell className="h-6 w-6" />,
      title: t('featureLogTitle'),
      description: t('featureLogDescription'),
      longDescription: t('featureLogLongDescription'),
      span: 'lg:col-span-2',
    },
    {
      icon: <BrainCircuit className="h-6 w-6" />,
      title: t('featureAiCoachingTitle'),
      description: t('featureAiCoachingDescription'),
      longDescription: t('featureAiCoachingLongDescription'),
      span: 'lg:col-span-1',
    },
    {
      icon: <BarChart className="h-6 w-6" />,
      title: t('featureVisualizeTitle'),
      description: t('featureVisualizeDescription'),
      longDescription: t('featureVisualizeLongDescription'),
      span: 'lg:col-span-1',
    },
    {
      icon: <UtensilsCrossed className="h-6 w-6" />,
      title: t('featureNutritionTitle'),
      description: t('featureNutritionDescription'),
      longDescription: t('featureNutritionLongDescription'),
      span: 'lg:col-span-1',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: t('featureCoachHubTitle'),
      description: t('featureCoachHubDescription'),
      longDescription: t('featureCoachHubLongDescription'),
      span: 'lg:col-span-1',
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: t('featureTacticalTitle'),
      description: t('featureTacticalDescription'),
      longDescription: t('featureTacticalLongDescription'),
      span: 'lg:col-span-3',
    },
  ];

  const steps = [
    { title: t('howItWorksStep1Title'), description: t('howItWorksStep1Description'), icon: ScanLine },
    { title: t('howItWorksStep2Title'), description: t('howItWorksStep2Description'), icon: BrainCircuit },
    { title: t('howItWorksStep3Title'), description: t('howItWorksStep3Description'), icon: Trophy },
  ];

  const pricingTiers = [
    {
      name: 'Athlete',
      checkoutUrl: 'https://knct.me/9I6H_gEj-',
      price: 40,
      description: t('tierAthleteDescription'),
      features: [
        t('pricingFeatureAllSportModules'),
        t('pricingFeatureAiFitnessCoach'),
        t('pricingFeatureNutritionTracking'),
        t('pricingFeatureProgressAnalytics'),
      ],
      featured: false,
    },
    {
      name: 'Pro',
      checkoutUrl: 'https://knct.me/eGQSM5PVY',
      price: 60,
      description: t('tierProDescription'),
      features: [
        t('pricingFeatureAllAthleteFeatures'),
        t('pricingFeatureAdvancedPronostics'),
        t('pricingFeatureVideoFormAnalysis'),
        t('pricingFeaturePrioritySupport'),
      ],
      featured: true,
    },
    {
      name: 'Coach',
      checkoutUrl: 'https://knct.me/2nLmVs0pO',
      price: 50,
      description: t('tierCoachDescription'),
      features: [
        t('pricingFeatureAllProFeatures'),
        t('pricingFeatureManageAthletes'),
        t('pricingFeatureTeamAnalytics'),
        t('pricingFeatureDrillPlanner'),
      ],
      featured: false,
    },
  ];

  const ease = [0.16, 1, 0.3, 1] as const;
  const fadeUp = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
  };
  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3, staggerChildren: 0.1 } },
  };

  if (isLoading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Logo className="h-32 w-32 animate-spin-slow" />
      </div>
    );
  }

  const marqueeItems = [
    t('geneticReport'),
    t('featureAiCoachingTitle'),
    t('physiqueScoreTitle'),
    t('featureNutritionTitle'),
    t('featureTacticalTitle'),
    t('featureVisualizeTitle'),
    ...sports,
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.06]">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-auto" />
            <span className="text-lg font-bold tracking-tight">
              SportMind <span className="text-primary">AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 sm:flex">
            <Link href="#capabilities" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t('features')}
            </Link>
            <Link href="#how" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t('howItWorksTitle')}
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t('pricing')}
            </Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t('login')}
            </Link>
          </nav>

          <div className="hidden items-center gap-1 sm:flex">
            <Button variant="ghost" size="icon" onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}>
              <Languages className="h-[1.1rem] w-[1.1rem]" />
              <span className="sr-only">Change language</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button asChild className="ml-2 glow-primary-sm group">
              <Link href="#pricing" className="flex items-center">
                {t('getStarted')}
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="sm:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href="#capabilities">{t('features')}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#how">{t('howItWorksTitle')}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#pricing">{t('pricing')}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/login">{t('login')}</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex justify-between">
                <div className="flex items-center">
                  <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span>Theme</span>
                </div>
                <div className="flex items-center rounded-md bg-muted p-0.5">
                  <Button variant={theme === 'light' ? 'secondary' : 'ghost'} size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={() => setTheme('light')}><Sun className="h-3 w-3" /></Button>
                  <Button variant={theme === 'dark' ? 'secondary' : 'ghost'} size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={() => setTheme('dark')}><Moon className="h-3 w-3" /></Button>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center"><Languages className="mr-2 h-4 w-4" /><span>Language</span></div>
                  <div className="flex items-center rounded-md bg-muted p-0.5">
                    <Button variant={language === 'en' ? 'secondary' : 'ghost'} size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={() => setLanguage('en')}>EN</Button>
                    <Button variant={language === 'fr' ? 'secondary' : 'ghost'} size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={() => setLanguage('fr')}>FR</Button>
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1">
        {/* ───────────────────────── Hero ───────────────────────── */}
        <section className="relative w-full overflow-hidden">
          {/* atmosphere */}
          <div aria-hidden className="hud-grid pointer-events-none absolute inset-0 opacity-[0.35]" />
          <div aria-hidden className="pointer-events-none absolute -top-48 right-[-12%] h-[600px] w-[600px] rounded-full bg-primary/20 blur-[150px] dark:bg-primary/15" />
          <div aria-hidden className="pointer-events-none absolute bottom-[-30%] left-[-15%] h-[520px] w-[520px] rounded-full bg-primary/10 blur-[150px] dark:bg-primary/[0.08]" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

          <div className="container relative z-10 px-4 pb-20 pt-16 md:px-6 md:pb-28 md:pt-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
              {/* message */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="max-w-xl text-center lg:text-left"
              >
                <motion.span
                  variants={fadeUp}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  {t('statusAiCoachOnline')}
                </motion.span>

                <motion.h1
                  variants={fadeUp}
                  className="mt-6 text-balance font-display text-[clamp(2.75rem,6.2vw,5.25rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-foreground"
                >
                  {t('heroTitle')}
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  className="mx-auto mt-6 max-w-[48ch] text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0"
                >
                  {t('heroSubtitle')}
                </motion.p>

                <motion.div variants={fadeUp} className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-4 lg:items-start lg:justify-start">
                  <Button size="lg" asChild className="glow-primary group h-12 px-8 text-base">
                    <Link href="#pricing" className="flex items-center">
                      {t('getStarted')}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
                    <Link href="#capabilities">{t('exploreFeatures')}</Link>
                  </Button>
                </motion.div>

                {/* sport coverage */}
                <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  {sports.map((s) => (
                    <span key={s} className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm dark:border-white/[0.07]">
                      {s}
                    </span>
                  ))}
                </motion.div>
              </motion.div>

              {/* diagnostic instrument */}
              <motion.div
                initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.15, ease }}
                className="relative mx-auto w-full max-w-[34rem]"
              >
                {/* glow base */}
                <div aria-hidden className="pointer-events-none absolute inset-6 -z-10 rounded-full bg-primary/20 blur-[90px]" />

                <div className="relative rounded-[1.9rem] border border-white/10 bg-[#04090d]/95 p-3 shadow-float">
                  {/* corner brackets */}
                  <span aria-hidden className="absolute -left-px -top-px h-6 w-6 rounded-tl-[1.9rem] border-l-2 border-t-2 border-primary/70" />
                  <span aria-hidden className="absolute -right-px -top-px h-6 w-6 rounded-tr-[1.9rem] border-r-2 border-t-2 border-primary/70" />
                  <span aria-hidden className="absolute -bottom-px -left-px h-6 w-6 rounded-bl-[1.9rem] border-b-2 border-l-2 border-primary/70" />
                  <span aria-hidden className="absolute -bottom-px -right-px h-6 w-6 rounded-br-[1.9rem] border-b-2 border-r-2 border-primary/70" />

                  <div className="relative h-[440px] overflow-hidden rounded-[1.4rem] sm:h-[500px] lg:h-[540px]">
                    <BodyScan3D
                      rings={heroRings}
                      labels={heroScanLabels}
                      scanDate={t('livePreview')}
                      className="h-full"
                    />
                    {/* scan sweep line */}
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 shadow-[0_0_18px_2px_hsl(var(--primary))] animate-scan-sweep motion-reduce:hidden" />
                  </div>

                  {/* physique score readout — the product's signature metric */}
                  <motion.div
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.6, ease }}
                    className="absolute bottom-5 left-5 z-20 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">Physique Score</p>
                    <p className="mt-1 flex items-baseline gap-1 font-display text-3xl font-bold text-white">
                      <Counter to={87} delayMs={600} />
                      <span className="text-sm font-medium text-primary">/100</span>
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div
            className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 text-foreground/30 lg:block"
            animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        </section>

        {/* ──────────────────── Capability marquee ──────────────────── */}
        <div className="relative w-full overflow-hidden border-y border-border/60 bg-card/60 py-4 dark:border-white/[0.06]">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-card to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-card to-transparent" />
          <div className="flex w-max animate-marquee items-center gap-10 pr-10 motion-reduce:animate-none">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="flex items-center gap-10 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {item}
                <span className="h-1 w-1 rotate-45 bg-primary/50" />
              </span>
            ))}
          </div>
        </div>

        {/* ─────────────── Spotlight: the Genetic Report ─────────────── */}
        <section className="relative w-full overflow-hidden py-24 md:py-32">
          <div aria-hidden className="pointer-events-none absolute right-0 top-1/4 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[130px]" />
          <div className="container px-4 md:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={stagger}
              className="grid items-center gap-14 lg:grid-cols-2"
            >
              <motion.div variants={fadeUp} className="order-2 lg:order-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                  <ScanLine className="h-3.5 w-3.5" />
                  {t('geneticReport')}
                </span>
                <h2 className="mt-6 text-balance font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em]">
                  {t('landingScanTitle')}
                </h2>
                <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
                  {t('landingScanSubtitle')}
                </p>

                <ul className="mt-8 space-y-4">
                  {[
                    { icon: Gauge, text: t('featureVisualizeTitle') },
                    { icon: Activity, text: t('featureNutritionTitle') },
                    { icon: ShieldCheck, text: t('featureAiCoachingTitle') },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-medium text-foreground">{text}</span>
                    </li>
                  ))}
                </ul>

                <Button size="lg" asChild className="group mt-9 h-12 px-7">
                  <Link href="#pricing" className="flex items-center">
                    {t('getStarted')}
                    <ArrowUpRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </Button>
              </motion.div>

              {/* Genetic Report card — static, on-brand, no second WebGL canvas */}
              <motion.div variants={fadeUp} className="order-1 lg:order-2">
                <div className="relative mx-auto w-full max-w-md">
                  <div aria-hidden className="pointer-events-none absolute inset-6 -z-10 rounded-full bg-primary/20 blur-[90px]" />
                  <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#070c12] p-6 shadow-float sm:p-8">
                    <div aria-hidden className="hud-grid pointer-events-none absolute inset-0 opacity-20" />

                    {/* header */}
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <ScanLine className="h-4 w-4" />
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/80">{t('geneticReport')}</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {t('physiqueElite')}
                      </span>
                    </div>

                    {/* score gauge */}
                    <div className="relative mt-7 flex items-center gap-6">
                      <div className="relative h-32 w-32 shrink-0">
                        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                          <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
                          <circle
                            cx="60" cy="60" r="52" fill="none"
                            stroke="hsl(var(--primary))" strokeWidth="9" strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 52}
                            strokeDashoffset={2 * Math.PI * 52 * (1 - 0.87)}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-display text-4xl font-extrabold leading-none text-white">
                            <Counter to={87} delayMs={300} />
                          </span>
                          <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">/ 100</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{t('physiqueScoreTitle')}</p>
                        <p className="mt-1 font-display text-2xl font-bold text-white">{t('physiqueElite')}</p>
                        <p className="mt-2 flex items-center gap-2 text-sm text-white/55">
                          <span className="font-mono text-primary">{t('bmiLabel')}</span> 23.1
                        </p>
                      </div>
                    </div>

                    {/* composition */}
                    <div className="relative mt-8">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{t('bodyCompositionTitle')}</p>
                      <div className="mt-4 space-y-3.5">
                        {[
                          { label: t('compMuscle'), value: 42 },
                          { label: t('compFat'), value: 14 },
                          { label: t('compWater'), value: 58 },
                          { label: t('compBone'), value: 15 },
                        ].map((row) => (
                          <div key={row.label}>
                            <div className="mb-1.5 flex items-center justify-between text-xs">
                              <span className="text-white/70">{row.label}</span>
                              <span className="font-mono tabular-nums text-white/90">{row.value}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                              <div
                                className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out"
                                style={{ width: `${row.value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ─────────────── Capabilities bento ─────────────── */}
        <section id="capabilities" className="w-full py-24 md:py-32">
          <div className="container px-4 md:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              className="mx-auto mb-14 max-w-2xl text-center"
            >
              <h2 className="text-balance font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em]">
                {t('landingFeaturesTitle')}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">{t('landingFeaturesSubtitle')}</p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className="grid grid-cols-1 gap-5 lg:grid-cols-3"
            >
              {features.map((feature, index) => (
                <motion.div key={feature.title} variants={fadeUp} className={feature.span}>
                  <Card
                    className={cn(
                      'group flex h-full cursor-pointer flex-col justify-between text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/40',
                      feature.span === 'lg:col-span-3' && 'lg:flex-row lg:items-center lg:gap-10'
                    )}
                    onClick={() => handleViewInfo(index)}
                  >
                    <div className={cn('flex flex-col', feature.span === 'lg:col-span-3' && 'lg:flex-1')}>
                      <CardHeader>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                          {feature.icon}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <CardTitle className="mb-2 text-xl">{feature.title}</CardTitle>
                        <p className="max-w-[60ch] text-muted-foreground">{feature.description}</p>
                      </CardContent>
                    </div>
                    <CardFooter className={cn(feature.span === 'lg:col-span-3' && 'lg:shrink-0')}>
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <span>{t('viewInfo')}</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─────────────── How it works ─────────────── */}
        <section id="how" className="relative w-full overflow-hidden border-y border-border/60 bg-card py-24 dark:border-white/[0.06] md:py-32">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/10 blur-[130px]" />
          <div className="container relative px-4 md:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              className="mx-auto mb-16 max-w-2xl text-center"
            >
              <h2 className="text-balance font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em]">
                {t('howItWorksTitle')}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">{t('howItWorksSubtitle')}</p>
            </motion.div>

            <motion.ol
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={stagger}
              className="relative mx-auto grid max-w-5xl gap-8 md:grid-cols-3"
            >
              {/* connecting rail */}
              <div aria-hidden className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.li key={step.title} variants={fadeUp} className="relative flex flex-col items-center text-center md:items-start md:text-left">
                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-background text-primary shadow-card">
                      <Icon className="h-6 w-6" />
                      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-6 font-display text-xl font-bold tracking-tight">{step.title}</h3>
                    <p className="mt-2 max-w-[40ch] text-muted-foreground">{step.description}</p>
                  </motion.li>
                );
              })}
            </motion.ol>
          </div>
        </section>

        {/* ─────────────── App preview ─────────────── */}
        <section className="relative w-full overflow-hidden py-24 md:py-32">
          <div className="container px-4 md:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={stagger}
              className="grid items-center gap-14 lg:grid-cols-2"
            >
              <motion.div variants={fadeUp}>
                <h2 className="text-balance font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em]">
                  {t('featureLogTitle')}
                </h2>
                <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
                  {t('howItWorksSubtitle')}
                </p>
                <div className="mt-8 flex flex-wrap gap-2.5">
                  {sports.map((s) => (
                    <span key={s} className="rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-sm font-medium text-muted-foreground dark:border-white/[0.07]">
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="relative mx-auto w-full max-w-sm">
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] bg-primary/20 blur-[90px]" />
                <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.02] p-3 shadow-float">
                  <div className="mb-3 flex items-center justify-between px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>{t('livePreview')}</span>
                    <span className="flex items-center gap-1.5 text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary glow-primary-sm" />
                      {t('synced')}
                    </span>
                  </div>
                  <Image
                    src="/tw_iph.png"
                    alt="SportMind AI mobile app — training dashboard"
                    width={940}
                    height={788}
                    className="h-auto w-full rounded-2xl"
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ─────────────── Pricing ─────────────── */}
        <section id="pricing" className="relative w-full overflow-hidden py-24 md:py-32">
          <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 h-[420px] w-[640px] -translate-x-1/2 translate-y-1/3 rounded-full bg-primary/10 blur-[140px]" />
          <div className="container relative px-4 md:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              className="mx-auto mb-16 max-w-2xl text-center"
            >
              <h2 className="text-balance font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em]">
                {t('pricingHeading')}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">{t('pricingSubtitle')}</p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-6 md:grid-cols-3"
            >
              {pricingTiers.map((tier) => (
                <motion.div
                  key={tier.name}
                  variants={fadeUp}
                  className={cn(
                    'relative flex flex-col rounded-2xl border bg-card p-7 shadow-card transition-transform duration-300',
                    tier.featured
                      ? 'border-primary/50 shadow-[0_0_0_1px_rgba(59,130,246,0.3),0_24px_70px_-20px_rgba(59,130,246,0.45)] md:-translate-y-4'
                      : 'border-border/70 hover:-translate-y-1 dark:border-white/[0.07]'
                  )}
                >
                  {tier.featured && (
                    <span className="absolute -top-3 left-7 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                      {t('mostPopular')}
                    </span>
                  )}
                  <h3 className="font-display text-2xl font-bold tracking-tight">{tier.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-5xl font-extrabold tracking-[-0.02em]">${tier.price}</span>
                    <span className="text-base font-normal text-muted-foreground">{t('perMonth')}</span>
                  </div>
                  <ul className="mt-7 flex-grow space-y-3.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleGetStarted(tier.checkoutUrl)}
                    className={cn('mt-8 w-full', tier.featured && 'glow-primary-sm')}
                    variant={tier.featured ? 'default' : 'secondary'}
                  >
                    {t('getStartedWithTier', { tier: tier.name })}
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─────────────── Final CTA ─────────────── */}
        <section className="w-full px-4 pb-24 md:px-6 md:pb-32">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="container relative overflow-hidden rounded-[2rem] border border-primary/20 bg-card px-6 py-16 text-center shadow-float md:py-24 dark:border-primary/15"
          >
            <div aria-hidden className="hud-grid pointer-events-none absolute inset-0 opacity-30" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-balance font-display text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-[1] tracking-[-0.02em]">
                {t('heroTitle')}
              </h2>
              <p className="mx-auto mt-5 max-w-[46ch] text-lg text-muted-foreground">{t('heroSubtitleShort')}</p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Button size="lg" asChild className="glow-primary group h-12 px-8 text-base">
                  <Link href="#pricing" className="flex items-center">
                    {t('getStarted')}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
                  <Link href="/login">{t('login')}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
        <DialogContent className="max-w-4xl">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-xl border border-primary/10 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent md:aspect-square md:h-auto">
              <div className="text-primary/20 [&>svg]:h-32 [&>svg]:w-32">
                {features[selectedFeature].icon}
              </div>
            </div>
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-2xl">
                  {features[selectedFeature].icon}
                  {features[selectedFeature].title}
                </DialogTitle>
                <DialogDescription className="pt-2 text-base">
                  {features[selectedFeature].longDescription}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─────────────── Footer ─────────────── */}
      <footer className="border-t border-border/60 bg-card dark:border-white/[0.06]">
        <div className="container px-4 py-16 md:px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="space-y-4 md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 font-semibold">
                <Logo className="h-9 w-auto" />
                <span className="text-lg font-bold tracking-tight">SportMind AI</span>
              </Link>
              <p className="max-w-xs text-sm text-muted-foreground">{t('footerTagline')}</p>
            </div>
            <div className="grid grid-cols-2 gap-8 md:col-span-3 md:grid-cols-4">
              <div>
                <h3 className="mb-4 text-sm font-semibold text-foreground">{t('footerProduct')}</h3>
                <ul className="space-y-3 text-sm">
                  <li><Link href="#capabilities" className="text-muted-foreground transition-colors hover:text-primary">{t('features')}</Link></li>
                  <li><Link href="#pricing" className="text-muted-foreground transition-colors hover:text-primary">{t('pricing')}</Link></li>
                  <li><Link href="/login" className="text-muted-foreground transition-colors hover:text-primary">{t('login')}</Link></li>
                  <li><Link href="/signup" className="text-muted-foreground transition-colors hover:text-primary">{t('footerSignUp')}</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-semibold text-foreground">{t('footerCompany')}</h3>
                <ul className="space-y-3 text-sm">
                  <li><Link href="#" className="text-muted-foreground transition-colors hover:text-primary">{t('footerAboutUs')}</Link></li>
                  <li><Link href="#" className="text-muted-foreground transition-colors hover:text-primary">{t('footerCareers')}</Link></li>
                  <li><Link href="#" className="text-muted-foreground transition-colors hover:text-primary">{t('footerContact')}</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-semibold text-foreground">{t('footerLegal')}</h3>
                <ul className="space-y-3 text-sm">
                  <li><Link href="#" className="text-muted-foreground transition-colors hover:text-primary">{t('footerPrivacyPolicy')}</Link></li>
                  <li><Link href="#" className="text-muted-foreground transition-colors hover:text-primary">{t('footerTermsOfService')}</Link></li>
                </ul>
              </div>
              <div className="col-span-2 md:col-span-1">
                <h3 className="mb-4 text-sm font-semibold text-foreground">{t('footerNewsletterHeading')}</h3>
                <p className="mb-3 text-sm text-muted-foreground">{t('getLatestNews')}</p>
                <form className="flex gap-2">
                  <Input type="email" placeholder={t('enterYourEmail')} className="flex-1" />
                  <Button type="submit" size="sm">{t('subscribe')}</Button>
                </form>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} SportMind AI. {t('allRightsReserved')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
