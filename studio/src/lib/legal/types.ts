/** A bilingual string. The site switches language from the header; so do these. */
export interface Bilingual { en: string; fr: string }

export interface LegalBlock {
    /** A paragraph. */
    p?: Bilingual;
    /** A bulleted list. */
    list?: Bilingual[];
    /** A two-column table: header row first. */
    table?: { head: [Bilingual, Bilingual]; rows: [Bilingual, Bilingual][] };
    /** Set apart, for the things a reader must not miss. */
    callout?: Bilingual;
}

export interface LegalSection {
    heading: Bilingual;
    blocks: LegalBlock[];
}

export interface LegalDocument {
    slug: string;
    title: Bilingual;
    /** One sentence under the title saying what the document is for. */
    intro: Bilingual;
    sections: LegalSection[];
}
