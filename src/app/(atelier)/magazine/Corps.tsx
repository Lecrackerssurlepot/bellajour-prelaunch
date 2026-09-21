/* 02 à 05 — L'OBJET, LA COLLECTION, LES QUESTIONS, L'ACTE.
   Le corps de la page produit. Composant SERVEUR de bout en bout ; seul
   Reveal, qu'il enveloppe, est client.

   La FAQ est un <details> natif : aucun JS, ouverture au clavier acquise,
   et le texte des réponses est dans le document — donc lisible par un
   moteur de recherche, ce qu'un accordéon monté en JS ne garantit pas.
   Le balisage FAQPage de page.tsx décrit CE contenu-là, pas un autre. */

import Reveal from '../components/Reveal'
import { CTA_NOTE_PRICE, FAQ } from '../content'
import { PAGES_MIN, PAGES_MAX_PUBLIC } from '@/lib/atelier/grille'
import LienComposer from '../components/LienComposer'

/* Ce qui est compris. ⚠️ AUCUNE ligne ne doit dire ni laisser croire que le
   TRANSPORT est compris dans le prix (chantier barème par pages, 07/09/2026 :
   la livraison sort du prix, tarif en attente de la décision de Mathias —
   docs/produit/PROPOSITION-CGV-LIVRAISON.md). La ligne « Chez vous sous
   10 jours… » est un DÉLAI, pas une promesse d'inclusion : elle reste.
   Chaque ligne doit rester tenue par quelque chose :
   l'impression au plus près vient du réseau de l'imprimeur, qui route la
   commande vers l'atelier le plus proche de l'adresse (lib/atelier/
   cloudprinter.ts) ; le délai de dix jours de lib/atelier/urgence.ts ; la
   version digitale de l'article 1.2 des CGV ; les retouches du geste
   « republier la maquette » (lib/atelier/transitions.ts).
   Ne rien ajouter ici qui ne soit pas tenu quelque part.

   ⚠️ QUATRE PICTOS DISTINCTS, PAS QUATRE COCHES. Une coche répétée quatre
   fois ne dit rien d'autre que « oui » : l'œil la lit une fois et saute les
   trois autres. Un dessin par ligne se distingue à 18 px et donne le sujet
   avant même qu'on lise. Tous au trait, même grille de 24, même graisse de
   1,5 — un seul picto plein dans le lot casserait la série.
   La couleur vient du CSS (`currentColor`), jamais d'un attribut : c'est ce
   qui permet de la changer à un seul endroit. */
const COMPRIS = [
  { picto: 'impression', texte: 'Impression en Europe, au plus près de chez vous' },
  { picto: 'digital', texte: 'Version digitale HD incluse' },
  { picto: 'pinceau', texte: 'Retouches sur la maquette, sans frais, avant l’impression' },
  { picto: 'colis', texte: 'Chez vous sous 10 jours après validation de la maquette' },
] as const

const TRACES: Record<string, React.ReactNode> = {
  /* Une presse : capot, corps, feuille qui sort. */
  impression: (
    <>
      <path d="M7 9.5V4.5h10v5" />
      <path d="M7 17H5a2 2 0 0 1-2-2v-3.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v5.5H7z" />
    </>
  ),
  /* Un fichier qui descend : la version digitale. */
  digital: (
    <>
      <path d="M12 4v10" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M4.5 17v2a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-2" />
    </>
  ),
  /* Un pinceau — demandé nommément : manche en diagonale, mèche mouillée. */
  pinceau: (
    <>
      <path d="M17.4 4.4a2.2 2.2 0 0 1 3.1 3.1l-8.6 8.6-3.1-3.1 8.6-8.6Z" />
      <path d="m8.8 13 2.3 2.3" />
      <path d="M8.4 15.4c-1.4.5-2.2 1.6-2.4 3-.1.8-.5 1.4-1.1 1.8 1.5.6 3.4.3 4.5-.8.8-.8 1-1.9.7-2.9" />
    </>
  ),
  /* Un colis : la livraison chez vous. */
  colis: (
    <>
      <path d="M12 3.5 20 7.6v8.8L12 20.5 4 16.4V7.6l8-4.1Z" />
      <path d="M4 7.6 12 11.7l8-4.1" />
      <path d="M12 11.7v8.8" />
    </>
  ),
}

function Picto({ nom }: { nom: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRACES[nom]}
    </svg>
  )
}

export default function Corps() {
  return (
    <>
      {/* ─────────── 02 · L'OBJET ─────────── */}
      <section className="objet filet" id="objet">
        <div className="wrap objet-grille">
          <Reveal>
            {/* ── LA DOUBLE PAGE, UNE SEULE IMAGE (14/09/2026) ──
                Elle etait un montage CSS : une photo a gauche, un feuillet de
                papier a droite portant « Chapitre deux », deux timbres et un
                folio, plus un pli dessine au milieu. Mathias a tranche : un
                seul grand visuel en travers des deux feuillets.
                Le master livre EST une double page finie — elle porte son
                propre titre et son propre pli. Superposer les notres donnerait
                deux typographies et deux pliures sur la meme page. Tout le
                montage est donc parti avec sa raison (pdp.css).
                ⚠️ LE <picture> N'EST PAS UN CONFORT. Sous 560 px, pdp.css
                montrait jusqu'ici la seule page de gauche : un paysage de
                1,4145 y serait ampute de moitie. Le master PORTRAIT (M04V)
                est servi la, et le cadre prend son rapport.
                ⚠️ Les deux `media` doivent rester MIROIRS de la bascule de
                pdp.css (560 px) : s'ils divergent, le navigateur sert le
                paysage dans un cadre portrait, et le sujet sort du cadre. */}
            <div className="double">
              <picture>
                <source
                  media="(max-width: 560px)"
                  srcSet="/images/v2/magazine/double-page-australie-portrait-560.webp 560w, /images/v2/magazine/double-page-australie-portrait-840.webp 840w, /images/v2/magazine/double-page-australie-portrait-1120.webp 1120w"
                  sizes="100vw"
                />
                <img
                  src="/images/v2/magazine/double-page-australie-1050.webp"
                  srcSet="/images/v2/magazine/double-page-australie-700.webp 700w, /images/v2/magazine/double-page-australie-1050.webp 1050w, /images/v2/magazine/double-page-australie-1400.webp 1400w"
                  sizes="(max-width: 560px) 100vw, 55vw"
                  alt="Une double page d’un numéro : un paysage australien en pleine page, face au titre du chapitre"
                  width={1400}
                  height={990}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <p className="kicker">L’objet</p>
              <h2 className="titre">Un vrai magazine,<br />pas un tirage.</h2>
              {/* ⚠️ CES CHIFFRES SONT DÉSORMAIS SOURCÉS (11/09/2026). Ils ont
                  été affirmés sans donnée du 28/08 au 11/09 (T-028) : le
                  papier n'était pas tranché, la page le promettait quand
                  même. Il l'est — relevé products/info et prix usine du
                  11/09, consignés dans docs/reference/SPECS-CLOUDPRINTER.md,
                  et commandés par `PAPIER_INTERIEUR` / `PAPIER_COUVERTURE`.
                  Ne pas retoucher un grammage ici sans le changer LÀ. */}
              {/* Une seule reliure depuis le 15/09/2026 : le dos carré collé
                  (l'agrafé de 20 pages est archivé dans archive/agrafe-2026-09/).
                  Les bornes sont DÉRIVÉES de la grille, jamais recopiées. */}
              <p className="lede">
                Format A4, papier intérieur couché 130 g, couverture 250 g.
                Dos carré collé, de {PAGES_MIN} à {PAGES_MAX_PUBLIC} pages.
                Composé page à page par l’atelier.
              </p>
              {/* Le seul choix d'objet laissé au client, dit ici parce que
                  c'est ici qu'on décrit l'objet — et redit au bon de
                  commande, là où il se fait. Sans supplément : le relevé du
                  11/09 donne un demi-centime d'écart entre les deux.
                  Depuis le 21/09/2026 le papier intérieur SUIT ce choix
                  (`PAPIER_INTERIEUR_PAR_FINITION`, impression.ts) : brillant
                  sous une couverture brillante, satiné sous une mate. */}
              <p className="lede">
                Couverture pelliculée <b>brillante ou mate</b>, à votre choix
                au moment de la commande. Le papier intérieur suit&nbsp;:
                brillant avec la couverture brillante, satiné avec la mate.
                Sans supplément.
              </p>
            </Reveal>
            <Reveal delay={70}>
              <ul className="compris">
                {COMPRIS.map((c) => (
                  <li key={c.texte}><Picto nom={c.picto} />{c.texte}</li>
                ))}
              </ul>
              {/* Descendue du kiosque le 30/08 : c'est ici qu'elle est à sa
                  place. Elle explique POURQUOI il y a trois prix, et cette
                  question ne se pose qu'une fois la grille lue — sous le
                  bouton du premier écran, elle n'était qu'une ligne de gris
                  de plus. */}
              <p className="mention">
                Le nombre de pages dépend de vos photos&nbsp;: on vous
                l’annonce avec votre couverture, avant tout paiement.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─────────── 03 · LA COLLECTION — RETIRÉE le 30/08/2026 ───────────
          « On n'attend plus le mariage » et l'étagère des quatre dos sont
          sorties de la page produit (décision de Mathias). Rien n'est perdu :
          le dessin d'origine vit dans archive/accueil-v1/S2Collection.tsx et
          s2-collection.css (T-016), et les quatre dos restent déclarés
          dans content.ts → SPINES. Remettre la section, c'est reprendre ce
          composant-là, pas le réécrire. */}

      {/* ─────────── 04 · LES QUESTIONS ─────────── */}
      {/* Pas de `filet` ici, et c'est une conséquence directe du retrait de la
          collection : « L'objet » et « Questions » partagent le même fond
          (--c-bg). Le trait qui les séparait avait un sens quand une section
          en noir plein s'intercalait entre les deux ; sans elle, il ne
          sépare plus rien — deux bandes de ton identique de part et d'autre
          d'une ligne. Les deux ne font donc plus qu'une seule bande de
          réassurance, et c'est l'acte final qui remonte au noir.
          ⚠️ Si une section revient s'intercaler ici, le filet doit revenir. */}
      <section className="questions" id="questions">
        <div className="wrap questions-grille">
          <Reveal>
            <p className="kicker">Questions</p>
            <h2 className="titre">Ce qu’on nous<br />demande le plus.</h2>
          </Reveal>

          <Reveal delay={70}>
            <div className="faq">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>
                    {f.q}
                    <span className="plus" aria-hidden="true">+</span>
                  </summary>
                  <p>{f.r}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── 05 · L'ACTE ─────────── */}
      <section className="final filet">
        <div className="wrap">
          <Reveal>
            <p className="kicker">Vivez. Nous composons.</p>
            <h2>Quel est votre<br /><em>numéro 1</em>&nbsp;?</h2>
          </Reveal>
          <Reveal delay={70}>
            <div className="acte">
              <LienComposer />
              <p>
                Premier aperçu gratuit · Votre magazine sur-mesure dès{' '}
                <b>{CTA_NOTE_PRICE}</b>.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
