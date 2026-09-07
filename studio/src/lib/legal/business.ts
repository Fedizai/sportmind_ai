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
    /**
     * The natural or legal person(s) responsible. Required everywhere.
     *
     * Two names here is not a formatting detail: under GDPR art. 26 two people
     * who jointly decide why and how the data is processed are joint
     * controllers, which carries its own obligations — see the privacy policy
     * and RISKS.md.
     */
    operator: string;
    /**
     * Postal address, or `null` where the operators have chosen not to publish
     * one.
     *
     * The EU e-commerce directive art. 5 and French LCEN art. 6-III both want a
     * geographic address, and `null` does not satisfy that. It is nullable
     * because the alternative — a plausible invented address — is a false
     * statement about real people on a page whose entire purpose is to identify
     * them truthfully. Where it is null the pages say so plainly and give the
     * email as the contact route, rather than leaving a gap the reader has to
     * interpret. The residual exposure is recorded in RISKS.md §1.2.
     */
    address: string | null;
    /** Country of establishment — decides the lead supervisory authority. */
    country: string;
    /** A contact address that a person actually reads. Required. */
    email: string;
    /** Optional: only if one exists. Do not invent one. */
    phone: string | null;
    /**
     * Tunisian trade register / tax id, once registered. `null` until then, and
     * the pages say "non immatriculé à ce jour" rather than leaving a blank a
     * reader has to interpret. See RISKS.md on why trading unregistered is its
     * own problem.
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
    operator: 'Fedy Zayen et Khaled Attia',
    address: null,
    country: 'Tunisie',
    email: 'sportmindai@gmail.com',
    phone: null,
    registration: null,
    taxId: null,
    publicationDirector: 'Fedy Zayen et Khaled Attia',
    host: {
        name: 'Google Ireland Limited (Firebase App Hosting)',
        address: 'Gordon House, Barrow Street, Dublin 4, D04 E5W5, Irlande',
        website: 'https://firebase.google.com',
    },
    dataRegion: 'europe-west4 (Pays-Bas)',
    lastUpdated: '2026-09-07',
};

/**
 * True while any field is still an unfilled `[À COMPLÉTER]` marker.
 *
 * A deliberate `null` is not a placeholder: the operators have decided not to
 * publish a postal address, the pages state that in as many words, and a
 * permanent warning banner on top of a settled decision would only teach people
 * to ignore banners.
 */
export const BUSINESS_INCOMPLETE = [
    BUSINESS.operator, BUSINESS.email, BUSINESS.publicationDirector,
].some((value) => value.startsWith('['));

/** How to reach the operators, for the pages that need one line of it. */
export const CONTACT_LINE = {
    en: BUSINESS.address
        ? `${BUSINESS.operator}, ${BUSINESS.address}, ${BUSINESS.country}`
        : `${BUSINESS.operator} (${BUSINESS.country}) — contactable by email at ${BUSINESS.email}`,
    fr: BUSINESS.address
        ? `${BUSINESS.operator}, ${BUSINESS.address}, ${BUSINESS.country}`
        : `${BUSINESS.operator} (${BUSINESS.country}) — joignables par e-mail à ${BUSINESS.email}`,
};
