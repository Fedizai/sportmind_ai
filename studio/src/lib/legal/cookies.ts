import { BUSINESS } from './business';
import type { LegalDocument } from './types';

/**
 * Written after actually looking. The app sets no cookies of its own — there is
 * no `document.cookie` anywhere in the source — and everything it keeps in the
 * browser is either the sign-in session or a setting you chose. That is why
 * there is no consent banner: under the ePrivacy directive, storage strictly
 * necessary for a service the user asked for is exempt, and a banner asking
 * permission for things that need none trains people to click through the ones
 * that do. The one genuine third-party case, video embeds, asks separately.
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
            heading: { en: 'We set no cookies', fr: 'Nous ne déposons aucun cookie' },
            blocks: [
                {
                    p: {
                        en: 'SportMind sets no cookies of its own, and there is no analytics, advertising or tracking code anywhere in the app. Nobody is measuring you here.',
                        fr: 'SportMind ne dépose aucun cookie qui lui soit propre, et l’application ne contient aucun code d’analyse d’audience, de publicité ou de pistage. Personne ne vous mesure ici.',
                    },
                },
                {
                    p: {
                        en: 'It does store a few things in your browser’s local storage. Those are either the session that keeps you signed in, or a preference you set yourself. European rules exempt storage that is strictly necessary for a service you asked for, which is why you have not been asked to consent to them.',
                        fr: 'Elle enregistre en revanche quelques éléments dans le stockage local de votre navigateur : soit la session qui vous garde connecté, soit une préférence que vous avez vous-même définie. La réglementation européenne exempte le stockage strictement nécessaire au service demandé, d’où l’absence de demande de consentement.',
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
                            { en: 'sportmind:lastDailyReset', fr: 'sportmind:lastDailyReset' },
                            { en: 'The date your daily checklist last reset, so it resets once a day and not on every page load.', fr: 'La date de dernière réinitialisation de votre journée, pour qu’elle se remette à zéro une fois par jour et non à chaque chargement.' },
                        ],
                    ],
                },
            }],
        },
        {
            heading: { en: 'Videos are the exception', fr: 'Les vidéos font exception' },
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
