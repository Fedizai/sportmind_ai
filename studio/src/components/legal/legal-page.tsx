'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

import { useTranslation } from '@/hooks/use-translation';
import { BUSINESS_INCOMPLETE } from '@/lib/legal/business';
import type { Bilingual, LegalDocument } from '@/lib/legal/types';

const S = {
    back: { en: 'Back to SportMind', fr: 'Retour à SportMind' },
    other: { en: 'Other legal pages', fr: 'Autres pages légales' },
    incomplete: {
        en: 'This page is not finished. Fields marked [À COMPLÉTER] must be filled in before this site is relied on: a legal notice that cannot identify its publisher does not satisfy the obligation it exists to satisfy.',
        fr: 'Cette page n’est pas terminée. Les champs marqués [À COMPLÉTER] doivent être renseignés avant toute mise en production : des mentions légales qui n’identifient pas leur éditeur ne remplissent pas l’obligation qui les impose.',
    },
} as const;

const LINKS: { href: string; label: Bilingual }[] = [
    { href: '/privacy', label: { en: 'Privacy', fr: 'Confidentialité' } },
    { href: '/terms', label: { en: 'Terms', fr: 'Conditions' } },
    { href: '/cookies', label: { en: 'Cookies', fr: 'Cookies' } },
    { href: '/refunds', label: { en: 'Refunds', fr: 'Remboursements' } },
    { href: '/legal-notice', label: { en: 'Legal notice', fr: 'Mentions légales' } },
];

/**
 * One renderer for every legal document.
 *
 * Headings run h1 then h2 with nothing skipped, tables carry real column
 * headers, and the measure is capped near 70 characters — a privacy policy
 * nobody can read is the same as one nobody has.
 */
export function LegalPage({ doc }: { doc: LegalDocument }) {
    const { language } = useTranslation();
    const tr = (b: Bilingual) => (language === 'fr' ? b.fr : b.en);

    return (
        <div className="mx-auto max-w-[72ch] px-5 py-16 md:px-8 md:py-24">
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-white/70 underline-offset-4 hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {tr(S.back)}
            </Link>

            <h1 className="mt-8 font-display text-[clamp(2rem,5vw,3rem)] font-extrabold uppercase leading-[1.05] tracking-[-0.015em]">
                {tr(doc.title)}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-white/70">{tr(doc.intro)}</p>

            {BUSINESS_INCOMPLETE && (
                <p className="mt-8 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm leading-relaxed text-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {tr(S.incomplete)}
                </p>
            )}

            {doc.sections.map((section) => (
                <section key={section.heading.en} className="mt-12">
                    <h2 className="font-display text-2xl font-bold uppercase tracking-[-0.01em]">
                        {tr(section.heading)}
                    </h2>

                    {section.blocks.map((block, i) => {
                        if (block.p) {
                            return (
                                <p key={i} className="mt-4 leading-relaxed text-white/80">
                                    {tr(block.p)}
                                </p>
                            );
                        }
                        if (block.callout) {
                            return (
                                <p key={i} className="mt-5 rounded-xl border border-primary/40 bg-primary/10 p-4 leading-relaxed text-white/90">
                                    {tr(block.callout)}
                                </p>
                            );
                        }
                        if (block.list) {
                            return (
                                <ul key={i} className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-white/80 marker:text-primary">
                                    {block.list.map((item) => <li key={item.en}>{tr(item)}</li>)}
                                </ul>
                            );
                        }
                        if (block.table) {
                            return (
                                <div key={i} className="mt-5 overflow-x-auto">
                                    <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                                        <thead>
                                            <tr>
                                                {block.table.head.map((h) => (
                                                    <th key={h.en} scope="col" className="border-b border-white/25 pb-2 pr-6 font-semibold text-white">
                                                        {tr(h)}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {block.table.rows.map(([a, b]) => (
                                                <tr key={a.en} className="align-top">
                                                    <td className="border-b border-white/10 py-3 pr-6 leading-relaxed text-white/90">{tr(a)}</td>
                                                    <td className="border-b border-white/10 py-3 leading-relaxed text-white/75">{tr(b)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        }
                        return null;
                    })}
                </section>
            ))}

            <nav aria-label={tr(S.other)} className="mt-16 border-t border-white/15 pt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">{tr(S.other)}</h2>
                <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {LINKS.filter((l) => l.href !== `/${doc.slug}`).map((l) => (
                        <li key={l.href}>
                            <Link
                                href={l.href}
                                className="text-white/75 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                            >
                                {tr(l.label)}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}
