import { BUSINESS, CONTACT_LINE } from './business';
import type { LegalDocument } from './types';

/**
 * The privacy policy, written against what the code actually does.
 *
 * Every collection, third party and retention period below was read out of this
 * repository rather than copied from a template: the Firestore collections, the
 * Storage uploads, the outbound hosts, the on-device photo pipeline. A policy
 * that describes a different app than the one it ships with is not a smaller
 * problem than having no policy — it is a written, dated, signed misstatement.
 */
export const PRIVACY: LegalDocument = {
    slug: 'privacy',
    title: { en: 'Privacy Policy', fr: 'Politique de confidentialité' },
    intro: {
        en: 'What SportMind collects about you, why, who else sees it, and what you can make us do about it.',
        fr: 'Ce que SportMind collecte à votre sujet, pourquoi, qui d’autre y a accès, et ce que vous pouvez exiger.',
    },
    sections: [
        {
            heading: { en: 'Who is responsible', fr: 'Qui est responsable' },
            blocks: [
                {
                    p: {
                        en: `${BUSINESS.serviceName} is operated by ${CONTACT_LINE.en}. For anything in this policy, write to ${BUSINESS.email} — we read it.`,
                        fr: `${BUSINESS.serviceName} est exploité par ${CONTACT_LINE.fr}. Pour toute question relative à cette politique, écrivez à ${BUSINESS.email} — nous le lisons.`,
                    },
                },
                {
                    p: {
                        en: 'We are the data controllers: we decide what is collected and why. The companies listed further down act on our instructions, or on their own account where we say so.',
                        fr: 'Nous sommes responsables du traitement : nous décidons de ce qui est collecté et pourquoi. Les sociétés listées plus bas agissent sur nos instructions, ou pour leur propre compte lorsque cela est précisé.',
                    },
                },
                {
                    /*
                     * GDPR art. 26(2): where two people jointly decide the why
                     * and the how, they are joint controllers, and the essence
                     * of the arrangement between them has to be made available
                     * to the people whose data it is. This paragraph is that.
                     */
                    p: {
                        en: 'Two of us run SportMind together and we are joint controllers of your data. Between us we answer jointly for it, and either of us can act on a request from you. Whichever of us you write to, you will get one answer, and you can exercise every right in this policy against either of us.',
                        fr: 'Nous sommes deux à exploiter SportMind et nous sommes responsables conjoints du traitement de vos données. Nous en répondons conjointement, et chacun de nous peut donner suite à votre demande. Quel que soit celui à qui vous écrivez, vous obtiendrez une seule réponse, et vous pouvez exercer chacun des droits prévus par la présente politique auprès de l’un ou de l’autre.',
                    },
                },
            ],
        },
        {
            heading: { en: 'What we collect', fr: 'Ce que nous collectons' },
            blocks: [
                {
                    table: {
                        head: [{ en: 'Data', fr: 'Données' }, { en: 'Where it comes from', fr: 'Origine' }],
                        rows: [
                            [
                                { en: 'Name, username, email address, age, and whether you are an athlete or a coach', fr: 'Nom, nom d’utilisateur, adresse e-mail, âge, et si vous êtes athlète ou entraîneur' },
                                { en: 'You, at sign-up', fr: 'Vous, à l’inscription' },
                            ],
                            [
                                { en: 'Your sports, position, level, dominant hand, playing style, training frequency, goals and club', fr: 'Vos sports, poste, niveau, main dominante, style de jeu, fréquence d’entraînement, objectifs et club' },
                                { en: 'You, during onboarding and in your profile', fr: 'Vous, pendant l’intégration et dans votre profil' },
                            ],
                            [
                                { en: 'Health data: height, weight, body measurements and body scans, food and nutrition logs, workouts and training sessions', fr: 'Données de santé : taille, poids, mensurations et scans corporels, journaux alimentaires et nutritionnels, séances et entraînements' },
                                { en: 'You, as you use the app', fr: 'Vous, au fil de votre utilisation' },
                            ],
                            [
                                { en: 'Videos you upload for technique review, messages you send, support tickets and reports you file', fr: 'Vidéos que vous téléversez pour analyse technique, messages envoyés, tickets de support et signalements' },
                                { en: 'You', fr: 'Vous' },
                            ],
                            [
                                { en: 'Your IP address, and the approximate region (country, city) derived from it', fr: 'Votre adresse IP, et la région approximative (pays, ville) qui en est déduite' },
                                { en: 'Automatically, when you use the app', fr: 'Automatiquement, lors de votre utilisation' },
                            ],
                            [
                                { en: 'Sign-in records, device and browser information, and security logs', fr: 'Journaux de connexion, informations sur l’appareil et le navigateur, journaux de sécurité' },
                                { en: 'Automatically, via Firebase', fr: 'Automatiquement, via Firebase' },
                            ],
                        ],
                    },
                },
                {
                    callout: {
                        en: 'Photos you take for the body scan are measured in your browser, on your own device. They are not uploaded and we never receive them. Only the resulting measurements are saved to your account.',
                        fr: 'Les photos prises pour le scan corporel sont mesurées dans votre navigateur, sur votre appareil. Elles ne sont pas téléversées et nous ne les recevons jamais. Seules les mensurations obtenues sont enregistrées sur votre compte.',
                    },
                },
            ],
        },
        {
            heading: { en: 'Health data, and why we ask for your consent', fr: 'Données de santé, et pourquoi nous demandons votre consentement' },
            blocks: [
                {
                    p: {
                        en: 'Your weight, your measurements, what you eat and what you lift are data concerning health under European law. That is a special category: it may not be processed at all unless you explicitly agree to it, separately from agreeing to the terms.',
                        fr: 'Votre poids, vos mensurations, ce que vous mangez et ce que vous soulevez constituent des données concernant la santé au sens du droit européen. C’est une catégorie particulière : leur traitement est interdit sauf consentement explicite, distinct de l’acceptation des conditions.',
                    },
                },
                {
                    p: {
                        en: 'You give that consent with a separate tick box when you create your account. You can withdraw it at any time in Settings or by writing to us. Withdrawing it does not undo what was lawful before, but it stops the processing and you can ask us to delete what we hold.',
                        fr: 'Vous donnez ce consentement via une case à cocher distincte lors de la création du compte. Vous pouvez le retirer à tout moment dans les Réglages ou en nous écrivant. Le retrait ne remet pas en cause ce qui était licite auparavant, mais il arrête le traitement et vous pouvez demander la suppression des données conservées.',
                    },
                },
                {
                    p: {
                        en: 'SportMind is a training and nutrition tool. It is not a medical device, it does not diagnose anything, and nothing it produces is medical advice. Talk to a doctor before changing how you train or eat, particularly if you are pregnant, under treatment, injured, or have a heart, metabolic or eating disorder.',
                        fr: 'SportMind est un outil d’entraînement et de nutrition. Ce n’est pas un dispositif médical, il ne diagnostique rien, et rien de ce qu’il produit ne constitue un avis médical. Consultez un médecin avant de modifier votre entraînement ou votre alimentation, en particulier en cas de grossesse, de traitement en cours, de blessure, ou de trouble cardiaque, métabolique ou du comportement alimentaire.',
                    },
                },
            ],
        },
        {
            heading: { en: 'Why we process it, and on what basis', fr: 'Pourquoi, et sur quelle base' },
            blocks: [
                {
                    table: {
                        head: [{ en: 'Purpose', fr: 'Finalité' }, { en: 'Legal basis', fr: 'Base légale' }],
                        rows: [
                            [
                                { en: 'Creating and running your account, and providing the features you asked for', fr: 'Créer et gérer votre compte, et fournir les fonctionnalités demandées' },
                                { en: 'Performance of our contract with you (GDPR art. 6(1)(b))', fr: 'Exécution du contrat qui nous lie (RGPD art. 6-1-b)' },
                            ],
                            [
                                { en: 'Building training and nutrition plans from your body, food and workout data', fr: 'Construire des plans d’entraînement et de nutrition à partir de vos données corporelles, alimentaires et d’entraînement' },
                                { en: 'Your explicit consent (GDPR art. 9(2)(a))', fr: 'Votre consentement explicite (RGPD art. 9-2-a)' },
                            ],
                            [
                                { en: 'Analysing an uploaded video or a body scan with an AI model to produce feedback', fr: 'Analyser une vidéo ou un scan corporel avec un modèle d’IA pour produire un retour' },
                                { en: 'Your explicit consent, given when you start the analysis', fr: 'Votre consentement explicite, donné au lancement de l’analyse' },
                            ],
                            [
                                { en: 'Showing prices and shop suggestions relevant to where you are', fr: 'Afficher des prix et suggestions adaptés à votre localisation' },
                                { en: 'Our legitimate interest in a usable product (GDPR art. 6(1)(f))', fr: 'Notre intérêt légitime à un produit utilisable (RGPD art. 6-1-f)' },
                            ],
                            [
                                { en: 'Keeping accounts secure, preventing abuse, and investigating reports', fr: 'Sécuriser les comptes, prévenir les abus, instruire les signalements' },
                                { en: 'Our legitimate interest in a safe service (GDPR art. 6(1)(f))', fr: 'Notre intérêt légitime à un service sûr (RGPD art. 6-1-f)' },
                            ],
                            [
                                { en: 'Loading a YouTube or Vimeo video inside the app', fr: 'Charger une vidéo YouTube ou Vimeo dans l’application' },
                                { en: 'Your consent, asked for each time before the player loads', fr: 'Votre consentement, demandé avant chaque chargement du lecteur' },
                            ],
                        ],
                    },
                },
            ],
        },
        {
            heading: { en: 'Who else sees your data', fr: 'Qui d’autre y a accès' },
            blocks: [
                {
                    p: {
                        en: 'We do not sell your data and we do not share it for advertising. These are the only third parties involved, and what each of them gets:',
                        fr: 'Nous ne vendons pas vos données et ne les partageons pas à des fins publicitaires. Voici les seuls tiers impliqués, et ce que chacun reçoit :',
                    },
                },
                {
                    table: {
                        head: [{ en: 'Recipient', fr: 'Destinataire' }, { en: 'What they receive', fr: 'Ce qu’ils reçoivent' }],
                        rows: [
                            [
                                { en: 'Google Ireland Ltd — Firebase authentication, database, file storage, hosting', fr: 'Google Ireland Ltd — authentification, base de données, stockage de fichiers, hébergement Firebase' },
                                { en: 'Everything you store with us. Hosted in the EU (Netherlands). Acts on our instructions.', fr: 'Tout ce que vous enregistrez chez nous. Hébergé dans l’UE (Pays-Bas). Agit sur nos instructions.' },
                            ],
                            [
                                { en: 'Google — Gemini models, for AI analysis', fr: 'Google — modèles Gemini, pour l’analyse par IA' },
                                { en: 'The specific text, measurements or video you submit for analysis, at the moment you submit it.', fr: 'Le texte, les mensurations ou la vidéo que vous soumettez à l’analyse, au moment où vous la soumettez.' },
                            ],
                            [
                                { en: 'ipwho.is and geojs.io — IP geolocation', fr: 'ipwho.is et geojs.io — géolocalisation par IP' },
                                { en: 'Your IP address, to return a country and city. No account or identifier is sent.', fr: 'Votre adresse IP, pour renvoyer un pays et une ville. Aucun compte ni identifiant n’est transmis.' },
                            ],
                            [
                                { en: 'Open Food Facts, Open Prices, FatSecret, USDA FoodData Central — food databases', fr: 'Open Food Facts, Open Prices, FatSecret, USDA FoodData Central — bases alimentaires' },
                                { en: 'The barcode or food name you look up, and your IP address. Not your account.', fr: 'Le code-barres ou le nom d’aliment recherché, et votre adresse IP. Pas votre compte.' },
                            ],
                            [
                                { en: 'YouTube (Google) and Vimeo — video players', fr: 'YouTube (Google) et Vimeo — lecteurs vidéo' },
                                { en: 'Your IP address and their own cookies, but only after you agree to load a player.', fr: 'Votre adresse IP et leurs propres cookies, mais seulement après votre accord pour charger un lecteur.' },
                            ],
                            [
                                { en: 'Unsplash — photographs used on the public pages', fr: 'Unsplash — photographies des pages publiques' },
                                { en: 'Your IP address, because the images load from their servers.', fr: 'Votre adresse IP, car les images sont chargées depuis leurs serveurs.' },
                            ],
                            [
                                { en: 'Your coach, if you join a team', fr: 'Votre entraîneur, si vous rejoignez une équipe' },
                                { en: 'Your training data, plans and the videos you share with the team.', fr: 'Vos données d’entraînement, vos plans et les vidéos partagées avec l’équipe.' },
                            ],
                        ],
                    },
                },
            ],
        },
        {
            heading: { en: 'Where your data goes', fr: 'Où vont vos données' },
            blocks: [
                {
                    p: {
                        en: `Your account data is stored in the European Union (${BUSINESS.dataRegion}). We are established in Tunisia, which the European Commission has not recognised as offering an adequate level of protection. That means our own access to your data from Tunisia is a transfer outside the EEA.`,
                        fr: `Vos données de compte sont stockées dans l’Union européenne (${BUSINESS.dataRegion}). Nous sommes établis en Tunisie, pays que la Commission européenne n’a pas reconnu comme offrant un niveau de protection adéquat. Notre propre accès à vos données depuis la Tunisie constitue donc un transfert hors EEE.`,
                    },
                },
                {
                    p: {
                        en: 'Some of the services above are established outside the EEA as well. Where that is the case, transfers rely on the European Commission’s standard contractual clauses or on your explicit consent, and you may ask us for a copy of the safeguards in place.',
                        fr: 'Certains services ci-dessus sont également établis hors EEE. Le cas échéant, les transferts reposent sur les clauses contractuelles types de la Commission européenne ou sur votre consentement explicite, et vous pouvez nous demander copie des garanties mises en place.',
                    },
                },
            ],
        },
        {
            heading: { en: 'How long we keep it', fr: 'Combien de temps nous les conservons' },
            blocks: [
                {
                    list: [
                        { en: 'Account and training data: for as long as your account exists.', fr: 'Compte et données d’entraînement : tant que votre compte existe.' },
                        { en: 'After you delete your account: erased within 30 days, except where we must keep something to comply with the law or to defend a legal claim.', fr: 'Après suppression du compte : effacées sous 30 jours, sauf ce que nous devons conserver pour respecter la loi ou faire valoir un droit en justice.' },
                        { en: 'Uploaded videos: until you delete them, or until your account is deleted.', fr: 'Vidéos téléversées : jusqu’à leur suppression par vous, ou celle de votre compte.' },
                        { en: 'Support tickets and abuse reports: up to 3 years, so that a pattern of abuse can still be seen.', fr: 'Tickets de support et signalements : jusqu’à 3 ans, afin qu’un comportement répété reste identifiable.' },
                        { en: 'Security and sign-in logs: up to 12 months.', fr: 'Journaux de sécurité et de connexion : jusqu’à 12 mois.' },
                    ],
                },
            ],
        },
        {
            heading: { en: 'What you can require of us', fr: 'Ce que vous pouvez exiger' },
            blocks: [
                {
                    p: {
                        en: 'You can ask for a copy of your data, have it corrected, have it deleted, have its use restricted, object to processing based on our legitimate interest, receive it in a portable format, and withdraw any consent you have given. Write to us and we will answer within one month.',
                        fr: 'Vous pouvez demander une copie de vos données, leur rectification, leur effacement, la limitation de leur usage, vous opposer aux traitements fondés sur notre intérêt légitime, les recevoir dans un format portable, et retirer tout consentement donné. Écrivez-nous : nous répondons sous un mois.',
                    },
                },
                {
                    p: {
                        en: 'If you are not satisfied, you can complain to a supervisory authority: in Tunisia the Instance Nationale de Protection des Données Personnelles (INPDP), in France the CNIL, or the authority where you live in the EU.',
                        fr: 'En cas de désaccord, vous pouvez saisir une autorité de contrôle : en Tunisie l’Instance Nationale de Protection des Données Personnelles (INPDP), en France la CNIL, ou l’autorité de votre pays de résidence dans l’UE.',
                    },
                },
                {
                    p: {
                        en: 'You never have to give us health data to have an account. Refusing it means the plans and the body tracking will not work, but the rest of the app does.',
                        fr: 'Vous n’êtes jamais obligé de fournir des données de santé pour avoir un compte. Les refuser désactive les plans et le suivi corporel, mais le reste de l’application fonctionne.',
                    },
                },
            ],
        },
        {
            heading: { en: 'Age', fr: 'Âge' },
            blocks: [
                {
                    p: {
                        en: 'SportMind is for people aged 16 and over. We do not knowingly create accounts for anyone younger. If you believe a child has an account, write to us and we will delete it.',
                        fr: 'SportMind s’adresse aux personnes de 16 ans et plus. Nous ne créons pas sciemment de compte pour une personne plus jeune. Si vous pensez qu’un enfant dispose d’un compte, écrivez-nous et nous le supprimerons.',
                    },
                },
            ],
        },
        {
            heading: { en: 'Changes', fr: 'Modifications' },
            blocks: [
                {
                    p: {
                        en: `Last updated ${BUSINESS.lastUpdated}. If we change anything that matters, we will tell you in the app before it takes effect.`,
                        fr: `Dernière mise à jour : ${BUSINESS.lastUpdated}. En cas de modification substantielle, nous vous en informerons dans l’application avant son entrée en vigueur.`,
                    },
                },
            ],
        },
    ],
};
