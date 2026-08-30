"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Languages, Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useLanguageStore } from '@/stores/language-store';

/* -------------------------------------------------------------------------- */
/*  Imagery — Unsplash IDs, each verified to resolve 200 at the CDN            */
/* -------------------------------------------------------------------------- */

const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const PHOTO = {
  hero: 'photo-1613845205719-8c87760ab728',
  manifesto: 'photo-1676655079738-af54dfd6318e',
  measure: 'photo-1696536823512-79d724454616',
  adapt: 'photo-1637430308606-86576d8fef3c',
  tactics: 'photo-1560272564-c83b66b1ad12',
  athlete: 'photo-1574772135913-d519461c3996',
  coach: 'photo-1431324155629-1a6deb1dec8d',
  closing: 'photo-1485827031228-b1736cb1fd06',
} as const;

/* -------------------------------------------------------------------------- */
/*  Campaign copy — kept local so marketing voice doesn't bloat i18n.ts        */
/* -------------------------------------------------------------------------- */

type Bi = { en: string; fr: string };

const L = {
  navProduct: { en: 'Product', fr: 'Produit' },
  navAudience: { en: 'Who it is for', fr: 'Pour qui' },
  login: { en: 'Log in', fr: 'Connexion' },
  start: { en: 'Start training', fr: 'Commencer' },
  menu: { en: 'Menu', fr: 'Menu' },

  heroTitleA: { en: 'Built for athletes', fr: 'Conçu pour les athlètes' },
  heroTitleB: { en: 'who measure everything', fr: 'qui mesurent tout' },
  heroSub: {
    en: 'SportMind turns your training, nutrition and match data into one clear plan — and rewrites it every week as you change.',
    fr: 'SportMind transforme vos données d’entraînement, de nutrition et de match en un plan clair — réécrit chaque semaine à mesure que vous évoluez.',
  },
  heroSignUp: { en: 'Create an account', fr: 'Créer un compte' },
  railSports: { en: 'Six sport modules', fr: 'Six modules sportifs' },
  railPlans: { en: 'Plans that adapt weekly', fr: 'Des plans réajustés chaque semaine' },
  railCoach: { en: 'Coach-ready from day one', fr: 'Prêt pour le coach dès le premier jour' },

  manifesto: {
    en: 'Progress is not a feeling. It is a measurement.',
    fr: 'Le progrès n’est pas une sensation. C’est une mesure.',
  },
  manifestoBody: {
    en: 'Most athletes train hard and guess often. SportMind closes that gap: it records what you actually did, compares it to where you were, and tells you what to change before the next session — not after the season.',
    fr: 'La plupart des athlètes s’entraînent dur et devinent souvent. SportMind comble cet écart : il enregistre ce que vous avez réellement fait, le compare à votre point de départ et vous dit quoi ajuster avant la prochaine séance — pas après la saison.',
  },

  cap1Title: { en: 'Know exactly where you stand', fr: 'Sachez exactement où vous en êtes' },
  cap1Body: {
    en: 'Log measurements, body composition and bodyweight, then read the trend instead of the daily noise. Every number is timestamped, so progress becomes a line you can point at.',
    fr: 'Enregistrez mensurations, composition corporelle et poids, puis lisez la tendance plutôt que le bruit quotidien. Chaque chiffre est horodaté : le progrès devient une courbe que vous pouvez montrer.',
  },
  cap1Alt: {
    en: 'Sprinter accelerating out of the blocks on an outdoor track',
    fr: 'Sprinteur en pleine accélération sur une piste extérieure',
  },

  cap2Title: { en: 'A plan that rewrites itself', fr: 'Un plan qui se réécrit' },
  cap2Body: {
    en: 'Training and nutrition plans are built around your goal, your equipment and the sessions you actually completed. Miss a week and the plan adjusts — it does not shame you, it re-plans.',
    fr: 'Les plans d’entraînement et de nutrition sont construits selon votre objectif, votre matériel et les séances réellement réalisées. Une semaine manquée ? Le plan s’ajuste — il ne vous juge pas, il replanifie.',
  },
  cap2Alt: {
    en: 'Empty weight room lit low before opening',
    fr: 'Salle de musculation vide, faiblement éclairée avant l’ouverture',
  },

  cap3Title: { en: 'Tactics that survive contact', fr: 'Une tactique qui tient sur le terrain' },
  cap3Body: {
    en: 'Log matches, review your form on video and get tactical guidance built for your sport — football, tennis, basketball, boxing, swimming or the gym floor.',
    fr: 'Enregistrez vos matchs, analysez votre technique en vidéo et obtenez des conseils tactiques adaptés à votre sport — football, tennis, basket, boxe, natation ou salle.',
  },
  cap3Alt: {
    en: 'Footballer striking a ball mid-air against an overcast sky',
    fr: 'Footballeur frappant le ballon en plein vol sous un ciel couvert',
  },

  audienceTitle: { en: 'Two jobs. One system.', fr: 'Deux métiers. Un seul système.' },
  athleteLabel: { en: 'For athletes', fr: 'Pour les athlètes' },
  athleteBody: {
    en: 'Built for one hand and thirty seconds. Log a set between rounds, see what today asks of you, and get on with it.',
    fr: 'Pensé pour une main et trente secondes. Enregistrez une série entre deux rounds, voyez ce que la journée demande, et passez à l’action.',
  },
  athleteAlt: {
    en: 'Lone player carrying a ball across a fog-covered pitch at dawn',
    fr: 'Joueur seul traversant un terrain couvert de brume à l’aube',
  },
  coachLabel: { en: 'For coaches', fr: 'Pour les entraîneurs' },
  coachBody: {
    en: 'Your roster, their plans, the video review and the messages — in one place, on the tablet you already carry to every session.',
    fr: 'Votre effectif, leurs plans, l’analyse vidéo et les messages — au même endroit, sur la tablette que vous emportez déjà à chaque séance.',
  },
  coachAlt: {
    en: 'Team training under floodlights on a pitch at night',
    fr: 'Entraînement d’équipe sous les projecteurs, de nuit',
  },

  perMonth: { en: '/month', fr: '/mois' },
  choose: { en: 'Choose', fr: 'Choisir' },
  popular: { en: 'Most chosen', fr: 'Le plus choisi' },

  closingTitle: {
    en: 'Your next season starts with a number.',
    fr: 'Votre prochaine saison commence par un chiffre.',
  },
  closingBody: {
    en: 'Create an account, log one session, and let the system take it from there.',
    fr: 'Créez un compte, enregistrez une séance, et laissez le système faire le reste.',
  },
  closingAlt: {
    en: 'Overhead view of yard markings painted across a green field',
    fr: 'Vue aérienne des lignes de marquage peintes sur un terrain vert',
  },

  heroAlt: {
    en: 'Athlete carrying a loaded weight plate across a dark training floor',
    fr: 'Athlète portant un disque de fonte dans une salle sombre',
  },
  manifestoAlt: {
    en: 'Rim-lit torso of an athlete emerging from near-total darkness',
    fr: 'Torse d’athlète éclairé en contre-jour, émergeant de l’obscurité',
  },

  rights: { en: 'All rights reserved.', fr: 'Tous droits réservés.' },
} satisfies Record<string, Bi>;

/* -------------------------------------------------------------------------- */

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { toast } = useToast();
  const { language } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const tr = (b: Bi) => b[language] ?? b.en;

  useEffect(() => {
    if (!isLoading && user) router.push('/dashboard');
  }, [isLoading, user, router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);



  const capabilities = [
    { photo: PHOTO.measure, title: L.cap1Title, body: L.cap1Body, alt: L.cap1Alt },
    { photo: PHOTO.adapt, title: L.cap2Title, body: L.cap2Body, alt: L.cap2Alt },
    { photo: PHOTO.tactics, title: L.cap3Title, body: L.cap3Body, alt: L.cap3Alt },
  ];

  const navLinks = [
    { href: '#product', label: L.navProduct },
    { href: '#audience', label: L.navAudience },
  ];

  const rise = {
    hidden: { opacity: 0, y: reduce ? 0 : 22 },
    show: { opacity: 1, y: 0 },
  };
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    // The campaign commits to a dark canvas regardless of app theme; scoping
    // `dark` here keeps every design token resolving to its dark value.
    <div className="dark min-h-screen bg-[#0A0A0C] font-sans text-white antialiased">
      {/* ─────────────────────────── Nav ─────────────────────────── */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
          scrolled
            ? 'border-b border-white/10 bg-[#0A0A0C]/90 backdrop-blur-md'
            : 'border-b border-transparent'
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-5 md:px-10">
          <Link href="/" className="font-display text-2xl font-extrabold uppercase tracking-[0.08em]">
            Sport<span className="text-primary">Mind</span>
          </Link>

          <nav className="hidden items-center gap-9 md:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-white/65 transition-colors hover:text-white"
              >
                {tr(l.label)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
              className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold uppercase text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Change language"
            >
              <Languages className="h-4 w-4" />
              {language}
            </button>
            <Button
              asChild
              variant="ghost"
              className="hidden text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <Link href="/login">{tr(L.login)}</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/signup">{tr(L.start)}</Link>
            </Button>
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white md:hidden"
              aria-label={tr(L.menu)}
              aria-expanded={navOpen}
            >
              {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {navOpen && (
          <div className="border-t border-white/10 bg-[#0A0A0C] px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setNavOpen(false)}
                  className="rounded-lg px-2 py-2.5 text-base font-medium text-white/75 hover:bg-white/5 hover:text-white"
                >
                  {tr(l.label)}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                <Button asChild variant="outline">
                  <Link href="/login">{tr(L.login)}</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">{tr(L.start)}</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ─────────────────────────── Hero ─────────────────────────── */}
        <section className="relative min-h-[92vh] w-full overflow-hidden md:min-h-screen">
          <img
            src={img(PHOTO.hero, 2000)}
            alt={tr(L.heroAlt)}
            className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
          />
          {/* scrims keep white type at AA contrast over any part of the photo */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0C] via-[#0A0A0C]/85 to-[#0A0A0C]/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-[#0A0A0C]/70" />

          <div className="relative mx-auto flex min-h-[92vh] max-w-[1400px] flex-col justify-end px-5 pb-14 pt-32 md:min-h-screen md:px-10 md:pb-20">
            <motion.div
              initial="hidden"
              animate="show"
              transition={{ staggerChildren: reduce ? 0 : 0.09 }}
            >
              <motion.h1
                variants={rise}
                transition={{ duration: 0.7, ease }}
                className="max-w-[17ch] text-balance font-display text-[clamp(3.1rem,10.5vw,8rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.02em]"
              >
                {tr(L.heroTitleA)} <span className="text-primary">{tr(L.heroTitleB)}</span>
              </motion.h1>

              <motion.p
                variants={rise}
                transition={{ duration: 0.7, ease }}
                className="mt-7 max-w-[54ch] text-lg leading-relaxed text-white/75 md:text-xl"
              >
                {tr(L.heroSub)}
              </motion.p>

              <motion.div
                variants={rise}
                transition={{ duration: 0.7, ease }}
                className="mt-9 flex flex-wrap gap-3"
              >
                <Button asChild size="lg" className="px-8 text-base">
                  <Link href="/signup">
                    {tr(L.start)} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-8 text-base">
                  <a href="/signup">{tr(L.heroSignUp)}</a>
                </Button>
              </motion.div>
            </motion.div>

            {/* understated rail — plain sentences, not a stat-card template */}
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.5, duration: 0.6 }}
              className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-white/60 sm:flex-row sm:gap-10"
            >
              <li>{tr(L.railSports)}</li>
              <li>{tr(L.railPlans)}</li>
              <li>{tr(L.railCoach)}</li>
            </motion.ul>
          </div>
        </section>

        {/* ───────────────────────── Manifesto ───────────────────────── */}
        <section className="relative w-full overflow-hidden">
          <img
            src={img(PHOTO.manifesto, 1800)}
            alt={tr(L.manifestoAlt)}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-[#0A0A0C]/70" />
          <div className="relative mx-auto max-w-[1400px] px-5 py-28 md:px-10 md:py-40">
            <motion.h2
              initial={{ opacity: 0, y: reduce ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, ease }}
              className="max-w-[16ch] text-balance font-display text-[clamp(2.5rem,7vw,5.6rem)] font-bold uppercase leading-[0.94] tracking-[-0.015em]"
            >
              {tr(L.manifesto)}
            </motion.h2>
            <p className="mt-8 max-w-[62ch] text-lg leading-relaxed text-white/70">{tr(L.manifestoBody)}</p>
          </div>
        </section>

        {/* ──────────────────────── Capabilities ──────────────────────── */}
        <section id="product" className="w-full scroll-mt-20 bg-[#0A0A0C]">
          {capabilities.map((cap, i) => (
            <div
              key={cap.title.en}
              className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 py-20 md:grid-cols-2 md:gap-16 md:px-10 md:py-28"
            >
              <motion.div
                initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.65, ease }}
                className={cn('relative overflow-hidden rounded-sm', i % 2 === 1 && 'md:order-2')}
              >
                <img
                  src={img(cap.photo, 1200)}
                  alt={tr(cap.alt)}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.65, delay: reduce ? 0 : 0.08, ease }}
                className={cn(i % 2 === 1 && 'md:order-1')}
              >
                <h3 className="text-balance font-display text-[clamp(2rem,4.4vw,3.2rem)] font-bold uppercase leading-[0.96] tracking-[-0.01em]">
                  {tr(cap.title)}
                </h3>
                <p className="mt-5 max-w-[54ch] text-base leading-relaxed text-white/70 md:text-lg">
                  {tr(cap.body)}
                </p>
              </motion.div>
            </div>
          ))}
        </section>

        {/* ───────────────────────── Audiences ───────────────────────── */}
        <section id="audience" className="w-full scroll-mt-20 border-t border-white/10 py-20 md:py-28">
          <div className="mx-auto max-w-[1400px] px-5 md:px-10">
            <h2 className="max-w-[18ch] font-display text-[clamp(2.2rem,5.2vw,4.2rem)] font-bold uppercase leading-[0.96] tracking-[-0.015em]">
              {tr(L.audienceTitle)}
            </h2>

            <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
              {[
                { label: L.athleteLabel, body: L.athleteBody, photo: PHOTO.athlete, alt: L.athleteAlt },
                { label: L.coachLabel, body: L.coachBody, photo: PHOTO.coach, alt: L.coachAlt },
              ].map((a) => (
                <motion.article
                  key={a.label.en}
                  initial={{ opacity: 0, y: reduce ? 0 : 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.6, ease }}
                  className="group relative overflow-hidden rounded-sm"
                >
                  <img
                    src={img(a.photo, 1200)}
                    alt={tr(a.alt)}
                    loading="lazy"
                    className="aspect-[5/6] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] sm:aspect-[4/3] md:aspect-[5/6]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/45 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <h3 className="font-display text-3xl font-bold uppercase tracking-[-0.01em] md:text-4xl">
                      {tr(a.label)}
                    </h3>
                    <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-white/75 md:text-base">
                      {tr(a.body)}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────────── Closing CTA ───────────────────────── */}
        <section className="relative w-full overflow-hidden">
          <img
            src={img(PHOTO.closing, 1800)}
            alt={tr(L.closingAlt)}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0A0A0C]/[0.78]" />
          <div className="relative mx-auto max-w-[1400px] px-5 py-28 text-center md:px-10 md:py-36">
            <h2 className="mx-auto max-w-[17ch] text-balance font-display text-[clamp(2.3rem,6.5vw,5.2rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.015em]">
              {tr(L.closingTitle)}
            </h2>
            <p className="mx-auto mt-6 max-w-[52ch] text-lg text-white/75">{tr(L.closingBody)}</p>
            <Button asChild size="lg" className="mt-9 px-9 text-base">
              <Link href="/signup">
                {tr(L.start)} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ─────────────────────────── Footer ─────────────────────────── */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-6 px-5 md:flex-row md:items-center md:px-10">
          <Link href="/" className="font-display text-xl font-extrabold uppercase tracking-[0.08em]">
            Sport<span className="text-primary">Mind</span>
          </Link>
          <nav className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-white/55">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-white">
                {tr(l.label)}
              </a>
            ))}
            <Link href="/login" className="transition-colors hover:text-white">
              {tr(L.login)}
            </Link>
          </nav>
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} SportMind AI. {tr(L.rights)}
          </p>
        </div>
      </footer>
    </div>
  );
}
