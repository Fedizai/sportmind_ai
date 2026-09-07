/**
 * Who is behind the site.
 *
 * Every legal page reads from here, so the details are stated once and cannot
 * drift between pages. **The placeholders below are not optional.** Publishing a
 * privacy policy that cannot say who the controller is, or a site notice with no
 * identifiable operator, is worse than publishing nothing: it is the specific
 * thing French LCEN art. 6-III, the EU e-commerce directive art. 5 and GDPR
 * art. 13(1)(a) each require by name.
 *
 * They are deliberately left as visible `[...]` markers rather than plausible
 * invented values. An invented address on a legal page is a false statement
 * about a real business, and it is the sort of thing that turns a small problem
 * into a large one.
 */

export interface BusinessDetails {
    /** Trading name of the service. */
    serviceName: string;
    /** The natural or legal person responsible. Required everywhere. */
    operator: string;
    /** Postal address. Required in the EU even for an individual. */
    address: string;
    /** Country of establishment — decides the lead supervisory authority. */
    country: string;
    /** A contact address that a person actually reads. Required. */
    email: string;
    /** Optional: only if one exists. Do not invent one. */
    phone: string | null;
    /**
     * Tunisian trade register / tax id, once registered. Empty until then —
     * see RISKS.md, which explains why trading unregistered is its own problem.
     */
    registration: string | null;
    /** VAT / tax identifier, if registered for it. */
    taxId: string | null;
    /** Who publishes the site — French "directeur de la publication". */
    publicationDirector: string;
    /** The host, which LCEN requires to be named with its address. */
    host: {
        name: string;
        address: string;
        website: string;
    };
    /** Where the data actually sits. Firebase App Hosting region for this project. */
    dataRegion: string;
    /** Last substantive review of the legal pages. */
    lastUpdated: string;
}

const TODO = (what: string) => `[À COMPLÉTER : ${what}]`;

export const BUSINESS: BusinessDetails = {
    serviceName: 'SportMind AI',
    operator: TODO('nom et prénom de la personne responsable'),
    address: TODO('adresse postale complète'),
    country: 'Tunisie',
    email: TODO('adresse e-mail de contact'),
    phone: null,
    registration: null,
    taxId: null,
    publicationDirector: TODO('nom du directeur de la publication'),
    host: {
        name: 'Google Ireland Limited (Firebase App Hosting)',
        address: 'Gordon House, Barrow Street, Dublin 4, D04 E5W5, Irlande',
        website: 'https://firebase.google.com',
    },
    dataRegion: 'europe-west4 (Pays-Bas)',
    lastUpdated: '2026-09-07',
};

/** True while any legally required field is still a placeholder. */
export const BUSINESS_INCOMPLETE = [
    BUSINESS.operator, BUSINESS.address, BUSINESS.email, BUSINESS.publicationDirector,
].some((value) => value.startsWith('['));
