import { BUSINESS } from './business';
import type { LegalDocument } from './types';

/**
 * Rewritten when analytics was added.
 *
 * The previous version said there was no measurement anywhere and therefore no
 * banner. Adding Google Analytics made both halves of that false, and a cookie
 * policy that describes the absence of the thing it now does is the worst kind
 * of document to have published. Analytics is the reason the banner exists; the
 * strictly-necessary storage below still needs no consent and still does not
 * get a checkbox.
 */
export const COOKIES: LegalDocument = {
    slug: 'cookies',
    title: { en: 'Cookie Policy', fr: 'Politique relative aux cookies' },
    intro: {
        en: 'What SportMind keeps in your browser, and why you have not been shown a banner.',
        fr: 'Ce que SportMind conserve dans votre navigateur, et pourquoi aucune bannière ne vous est présentée.',
    },
    sections: [
        {
            heading: { en: 'Two kinds of storage, one of which you choose', fr: 'Deux types de stockage, dont un que vous choisissez' },
            blocks: [
                {
                    p: {
                        en: 'SportMind sets no cookies of its own and carries no advertising or profiling code. There is exactly one non-essential thing: Google Analytics, which measures which pages get used. It is off until you accept it, and refusing changes nothing about how the app works.',
                        fr: 'SportMind ne dépose aucun cookie qui lui soit propre et ne contient aucun code publicitaire ni de profilage. Il n’y a qu’une seule chose non essentielle : Google Analytics, qui mesure les pages consultées. Elle reste désactivée tant que vous ne l’acceptez pas, et refuser ne change rien au fonctionnement de l’application.',
                    },
                },
                {
                    p: {
                        en: 'Everything else it stores is either the session that keeps you signed in or a preference you set yourself. European rules exempt storage strictly necessary for a service you asked for, so those get no checkbox — asking permission for things that need none is how people learn to click through the questions that matter.',
                        fr: 'Tout le reste de ce qu’elle enregistre est soit la session qui vous garde connecté, soit une préférence que vous avez définie. La réglementation européenne exempte le stockage strictement nécessaire au service demandé : ces éléments n’ont donc pas de case à cocher — demander la permission pour ce qui n’en a pas besoin est précisément ce qui apprend aux gens à cliquer sans lire.',
                    },
                },
            ],
        },
        {
            heading: { en: 'What is stored, exactly', fr: 'Ce qui est stocké, précisément' },
            blocks: [{
                table: {
                    head: [{ en: 'Stored item', fr: 'Élément stocké' }, { en: 'What it is for', fr: 'À quoi il sert' }],
                    rows: [
                        [
                            { en: 'Firebase sign-in session', fr: 'Session de connexion Firebase' },
                            { en: 'Keeps you signed in between visits. Deleting it signs you out.', fr: 'Vous garde connecté d’une visite à l’autre. Le supprimer vous déconnecte.' },
                        ],
                        [
                            { en: 'language-storage', fr: 'language-storage' },
                            { en: 'Whether you chose French or English.', fr: 'Votre choix entre français et anglais.' },
                        ],
                        [
                            { en: 'selectedSport, streak-storage', fr: 'selectedSport, streak-storage' },
                            { en: 'The sport you were last on, and your streak, so the dashboard opens where you left it.', fr: 'Le sport en cours et votre série, pour rouvrir le tableau de bord là où vous l’aviez laissé.' },
                        ],
                        [
                            { en: 'nutrition-plan-storage, shopping-list-storage, shopping-region-storage', fr: 'nutrition-plan-storage, shopping-list-storage, shopping-region-storage' },
                            { en: 'Your current meal plan, shopping list and region, kept on the device so they load instantly.', fr: 'Votre plan de repas, liste de courses et région, conservés sur l’appareil pour un chargement immédiat.' },
                        ],
                        [
                            { en: 'chat-history-storage', fr: 'chat-history-storage' },
                            { en: 'Your conversation with the assistant, so it is still there when you come back.', fr: 'Votre conversation avec l’assistant, afin de la retrouver à votre retour.' },
                        ],
                        [
                            { en: 'sportmind-consent', fr: 'sportmind-consent' },
                            { en: 'Your answer to the analytics question, and when you gave it. Kept so you are not asked again.', fr: 'Votre réponse à la question sur les mesures d’audience, et sa date. Conservée pour ne plus vous la reposer.' },
                        ],
                        [
                            { en: 'sportmind:lastDailyReset', fr: 'sportmind:lastDailyReset' },
                            { en: 'The date your daily checklist last reset, so it resets once a day and not on every page load.', fr: 'La date de dernière réinitialisation de votre journée, pour qu’elle se remette à zéro une fois par jour et non à chaque chargement.' },
                        ],
                    ],
                },
            }],
        },
        {
            heading: { en: 'Analytics, if you say yes', fr: 'Les mesures d’audience, si vous acceptez' },
            blocks: [
                {
                    p: {
                        en: 'If you accept, Google Analytics loads and sets its own cookies to tell one visit from another and one visitor from another. It sees your IP address, the pages you open and roughly where you are. We use it to find out which parts of the app are worth working on. It is never loaded before you answer — not loaded and idle, not loaded at all.',
                        fr: 'Si vous acceptez, Google Analytics se charge et dépose ses propres cookies afin de distinguer une visite d’une autre et un visiteur d’un autre. Il voit votre adresse IP, les pages que vous ouvrez et approximativement où vous êtes. Nous nous en servons pour savoir quelles parties de l’application méritent du travail. Il n’est jamais chargé avant votre réponse — ni chargé puis mis en veille, ni chargé du tout.',
                    },
                },
                {
                    p: {
                        en: 'Refusing is one click, in the same row and the same size as accepting. You can change your mind at any time with the button at the bottom of this page, and refusing later switches collection off in place.',
                        fr: 'Refuser tient en un clic, sur la même ligne et à la même taille qu’accepter. Vous pouvez changer d’avis à tout moment avec le bouton en bas de cette page, et un refus ultérieur désactive la collecte immédiatement.',
                    },
                },
            ],
        },
        {
            heading: { en: 'Videos are the exception too', fr: 'Les vidéos aussi font exception' },
            blocks: [
                {
                    p: {
                        en: 'Where the app shows a YouTube or Vimeo video, that player is loaded from Google or Vimeo and would set their cookies and see your IP address. Those are not necessary for SportMind to work, so no player loads until you press the button that says so. Press it and you are agreeing, for that video, to their terms and their cookies.',
                        fr: 'Lorsque l’application affiche une vidéo YouTube ou Vimeo, le lecteur provient de Google ou de Vimeo et déposerait leurs cookies tout en voyant votre adresse IP. Ces éléments ne sont pas nécessaires au fonctionnement de SportMind : aucun lecteur ne se charge tant que vous n’avez pas appuyé sur le bouton prévu. En appuyant, vous acceptez, pour cette vidéo, leurs conditions et leurs cookies.',
                    },
                },
                {
                    p: {
                        en: 'The choice is remembered for your current visit only, so closing the app resets it.',
                        fr: 'Ce choix n’est mémorisé que pour la visite en cours : fermer l’application le réinitialise.',
                    },
                },
            ],
        },
        {
            heading: { en: 'How to clear it', fr: 'Comment l’effacer' },
            blocks: [{
                p: {
                    en: `Clearing site data for this site in your browser settings removes everything above, including your sign-in session. Nothing is kept elsewhere on your device. Questions: ${BUSINESS.email}.`,
                    fr: `Effacer les données de site pour ce domaine dans les réglages de votre navigateur supprime tout ce qui précède, y compris votre session. Rien n’est conservé ailleurs sur votre appareil. Questions : ${BUSINESS.email}.`,
                },
            }],
        },
    ],
};
