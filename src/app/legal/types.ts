/* Modèle de contenu des pages légales (CGV, mentions légales, confidentialité,
   remboursement). Contenu structuré en blocs typés — JAMAIS de HTML brut /
   dangerouslySetInnerHTML. Le rendu vit dans LegalPage.tsx.

   Extensibilité multilingue : chaque document est un LocalizedDoc { fr, en?, pt? }.
   FR obligatoire ; EN/PT branchés plus tard sans framework i18n (cf. ?lang). */

export type Locale = 'fr' | 'en' | 'pt'
export const LOCALES: Locale[] = ['fr', 'en', 'pt']
export const LOCALE_LABEL: Record<Locale, string> = { fr: 'FR', en: 'EN', pt: 'PT' }

/* Un lien interne (ancre #fiche-produit) injecté dans un paragraphe. */
export interface InlineLink {
  text: string
  href: string
}

/* Un paragraphe : soit une chaîne simple, soit une suite de segments
   (texte brut + liens internes), pour porter un lien au milieu d'une phrase. */
export type Para = string | (string | InlineLink)[]

/* Blocs de contenu d'une section. */
export type Block =
  | { kind: 'p'; value: Para }
  | { kind: 'h3'; text: string } // sous-titre interne (ex. dans l'annexe Fiche produit)
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; columns: string[]; rows: string[][] }

export interface LegalSection {
  heading: string
  id?: string // ex. 'fiche-produit' → <section id="fiche-produit">
  blocks: Block[]
}

export interface LegalDoc {
  title: string
  /* Ligne d'en-tête sous le titre : version + date d'entrée en vigueur. */
  lastUpdated: string
  /* Paragraphes d'introduction (entité, avertissement de traduction, préambule). */
  intro?: Para[]
  sections: LegalSection[]
}

/* FR obligatoire, EN/PT optionnels (remplis plus tard). */
export type LocalizedDoc = Partial<Record<Locale, LegalDoc>> & { fr: LegalDoc }
