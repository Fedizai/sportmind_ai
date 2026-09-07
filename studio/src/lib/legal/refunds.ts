import { BUSINESS } from './business';
import type { LegalDocument } from './types';

export const REFUNDS: LegalDocument = {
    slug: 'refunds',
    title: { en: 'Refund and Cancellation Policy', fr: 'Politique de remboursement et d’annulation' },
    intro: {
        en: 'How to cancel a Pro plan and when you get your money back.',
        fr: 'Comment annuler une offre Pro et dans quels cas vous êtes remboursé.',
    },
    sections: [
        {
            heading: { en: 'How Pro is sold', fr: 'Comment Pro est vendu' },
            blocks: [{
                p: {
                    en: 'There is no automatic checkout on the site. A Pro plan is arranged with us directly, and the price, the period it covers and the payment method are agreed with you in writing before you pay anything.',
                    fr: 'Il n’existe aucun paiement automatique sur le site. Une offre Pro est convenue directement avec nous : le prix, la période couverte et le moyen de paiement vous sont communiqués par écrit avant tout versement.',
                },
            }],
        },
        {
            heading: { en: 'If you live in the European Union', fr: 'Si vous résidez dans l’Union européenne' },
            blocks: [
                {
                    p: {
                        en: 'You have 14 days from the day the plan starts to change your mind, for any reason or none, and get a full refund. Tell us within those 14 days — an email is enough — and we will refund you within 14 days of receiving it, by the same means you paid.',
                        fr: 'Vous disposez de 14 jours à compter du début de l’offre pour changer d’avis, sans motif, et être intégralement remboursé. Informez-nous dans ce délai — un e-mail suffit — et nous vous rembourserons dans les 14 jours suivant sa réception, par le même moyen de paiement.',
                    },
                },
                {
                    callout: {
                        en: 'One exception, and we will always ask you before it applies: if you ask us to start your Pro access immediately and you confirm that you understand you lose the 14-day right once it is fully delivered, then you lose it. If you have not confirmed that, you keep the full 14 days.',
                        fr: 'Une seule exception, et nous vous la soumettrons toujours au préalable : si vous demandez le démarrage immédiat de votre accès Pro et confirmez comprendre que vous perdez le droit de rétractation une fois le service pleinement exécuté, alors vous le perdez. À défaut de cette confirmation, vous conservez les 14 jours.',
                    },
                },
            ],
        },
        {
            heading: { en: 'If you live in Tunisia or elsewhere', fr: 'Si vous résidez en Tunisie ou ailleurs' },
            blocks: [{
                p: {
                    en: 'We apply the same 14-day rule to everyone, wherever you are. Your own consumer law may give you more, and it takes precedence over this policy where it does.',
                    fr: 'Nous appliquons la même règle de 14 jours à tous, où que vous soyez. Votre droit de la consommation local peut vous accorder davantage : il prévaut alors sur la présente politique.',
                },
            }],
        },
        {
            heading: { en: 'Cancelling later, and when we owe you a refund anyway', fr: 'Annuler plus tard, et les cas où un remboursement vous est dû' },
            blocks: [
                {
                    p: {
                        en: 'After the 14 days you can stop at any time and you will not be charged again. We do not refund the part of a period already used, unless one of the following applies.',
                        fr: 'Passé les 14 jours, vous pouvez arrêter à tout moment et ne serez plus prélevé. Nous ne remboursons pas la fraction de période déjà consommée, sauf dans l’un des cas suivants.',
                    },
                },
                {
                    list: [
                        { en: 'The service was substantially unavailable or broken for a meaningful part of the period you paid for.', fr: 'Le service a été indisponible ou défaillant pendant une part significative de la période payée.' },
                        { en: 'We removed a feature you were paying for.', fr: 'Nous avons supprimé une fonctionnalité que vous payiez.' },
                        { en: 'You were charged twice, or charged after cancelling.', fr: 'Vous avez été prélevé deux fois, ou après annulation.' },
                        { en: 'We closed your account for a reason that turns out not to have been your fault.', fr: 'Nous avons fermé votre compte pour un motif qui s’avère ne pas vous être imputable.' },
                    ],
                },
            ],
        },
        {
            heading: { en: 'How to ask', fr: 'Comment demander' },
            blocks: [{
                p: {
                    en: `Email ${BUSINESS.email} with the address on your account and what you would like to happen. You do not need a form or a particular wording. We answer within 5 working days. If we say no, we will say why, and you keep every right to take it further — including the EU online dispute resolution platform at ec.europa.eu/consumers/odr. Last updated ${BUSINESS.lastUpdated}.`,
                    fr: `Écrivez à ${BUSINESS.email} en indiquant l’adresse de votre compte et ce que vous souhaitez. Aucun formulaire ni formulation particulière n’est requis. Nous répondons sous 5 jours ouvrés. En cas de refus, nous en donnons le motif, et vous conservez tous vos recours — y compris la plateforme européenne de règlement en ligne des litiges : ec.europa.eu/consumers/odr. Dernière mise à jour : ${BUSINESS.lastUpdated}.`,
                },
            }],
        },
    ],
};
