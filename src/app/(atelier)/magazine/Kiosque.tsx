/* 01 — LE KIOSQUE. Le premier écran de la page produit.

   Composant SERVEUR : il n'y a rien à écouter ici. Le collage est une
   composition statique, le parcours et la grille sont du texte. Tout le JS
   de cette page tient dans la barre de tête et dans Reveal.

   ⚠️ La première photo du collage est l'élément LCP de la page. Elle est
   `fetchPriority="high"` et préchargée depuis page.tsx. Les deux autres sont
   paresseuses : sur un téléphone, où le collage passe en pleine largeur,
   elles arrivent sous la ligne de flottaison. */

import Reveal from '../components/Reveal'
import { COMPOSER_HREF, CTA_LABEL, ETAPES, PALIERS } from '../content'

/* Le rythme annoncé à chaque étape. Il vit ICI et non dans content.ts : ce
   sont des repères d'affichage. Les délais OPPOSABLES, eux, sont dans
   src/lib/atelier/urgence.ts — c'est cette table-là qui fait foi pour
   l'atelier comme pour la page d'état de la cliente, et il ne doit jamais y
   avoir deux endroits qui promettent deux choses. */
const RYTHME = ['2 min', '40 à 100', '48 h'] as const

export default function Kiosque() {
  return (
    <section className="wrap kiosque">
      {/* ── colonne gauche : le mot, puis le collage qui lui passe devant ── */}
      <div>
        <Reveal>
          {/* Le mot géant est un MASTHEAD, pas le titre de la page : c'est le
              mot posé sur une couverture de magazine. Il reste du vrai texte
              — lisible, sélectionnable, énoncé par un lecteur d'écran — mais
              le <h1> est la phrase, dans la colonne de droite.
              ⚠️ Il n'y a PLUS de chapeau au-dessus (« Numéro 01 · votre
              premier ») : deux chapeaux sur un même écran, l'un à gauche
              l'autre à droite, se disputaient l'entrée de la page. Celui qui
              situe la marque a été gardé, celui-ci coupé — le mot se suffit,
              et les 26 px récupérés servent à faire tenir le bouton dans
              l'écran. */}
          <p className="mot">MAGAZINE</p>
        </Reveal>

        <Reveal delay={90} className="bloc-collage">
          <div className="collage">
            <figure className="c1">
              <img
                src="/images/lancement/galerie/marrakech.webp"
                alt="Un numéro Bellajour consacré à un voyage à Marrakech"
                width={450}
                height={675}
                fetchPriority="high"
                decoding="sync"
              />
            </figure>
            <figure className="c2">
              <img
                src="/images/lancement/galerie/santorin.webp"
                alt="Un numéro Bellajour consacré à un séjour à Santorin"
                width={450}
                height={675}
                loading="lazy"
                decoding="async"
              />
            </figure>
            <figure className="c3">
              <img
                src="/images/lancement/galerie/japon.webp"
                alt="Un numéro Bellajour consacré à un voyage au Japon"
                width={450}
                height={675}
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </Reveal>

        {/* La note qui legendait le collage a ete RETIREE le 31/08/2026, sur
            demande de Mathias : « Un album, on en fait un dans sa vie. Un
            numero, on en fait un par moment. Le festival de juin, l'ete, la
            soiree d'octobre… ». Elle ne paraissait que sur grand ecran — le
            telephone la masquait deja. L'argument qu'elle portait n'est pas
            perdu : « Un numero par moment » vit dans la description de la
            page, dans le partage social et sur /numero. */}
      </div>

      {/* ── colonne droite : le récit, la grille, l'acte ──
          Le parcours n'est plus ici : il est sorti en bande pleine largeur
          sous les deux colonnes (voir plus bas).
          ⚠️ La classe n'est pas decorative. Le CSS visait cette colonne par
          `.kiosque > div:last-child`, ce qui designait le DERNIER enfant de
          la section : des qu'on en ajoute un troisieme, la regle change de
          cible en silence. */}
      <div className="colonne-recit">
        <Reveal>
          {/* Sur UNE ligne, sans retour forcé : à gauche le masthead dit
              « MAGAZINE », ici la phrase dit de quoi il est le magazine. Les
              deux se lisent ensemble, en travers de la page. */}
          <h1 className="titre"><em>Un moment de vie</em></h1>
          {/* « magazine personnalisé » est la requête qu'on vise, et elle est
              maintenant écrite d'un seul tenant dans le corps de la page, pas
              seulement dans le <title>. Le gras n'est pas décoratif : c'est la
              phrase qui dit ce qu'on vend, elle doit se lire même en diagonale.
              La virgule a bougé — « votre magazine personnalisé imprimé »
              empilait deux adjectifs et se lisait mal. */}
          <p className="lede">
            Vous racontez le moment, vous déposez vos photos.{' '}
            <b>L’atelier compose votre magazine personnalisé</b>, imprimé page
            à page. Vous voyez la couverture avant de décider.
          </p>
        </Reveal>

        <Reveal delay={140} className="bloc-prix">
          {/* Une LISTE, pas une pile de div : trois paliers sont une
              énumération, et qui écoute la page doit pouvoir les compter. */}
          <ul className="prix">
            {PALIERS.map((p) => (
              <li key={p.prix}>
                <span className="combien">{p.photos}</span>
                <span className="euros">{p.prix}</span>
                <span className="pages">{p.pages}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={210} className="bloc-acte">
          <div className="acte">
            <a className="at-cta" href={COMPOSER_HREF}>
              {CTA_LABEL} <span className="at-cta-arrow" aria-hidden="true">→</span>
            </a>
            {/* DEUX GAGES, PAS UN PARAGRAPHE.
                La phrase qui tenait cette place (« Premier aperçu gratuit ·
                Votre magazine sur-mesure dès 30 € ») et la mention qui la
                suivait faisaient quatre lignes de petit texte sous le bouton :
                personne ne lit quatre lignes de gris à cet endroit-là.
                Deux gages picto + trois mots se lisent d'un coup d'œil, et ce
                sont les deux seules objections qui comptent avant de cliquer —
                « ça m'engage à quoi » et « je paie quand ».
                Le prix ne manque pas : la grille est juste au-dessus.
                ⚠️ Pictos DESSINÉS, jamais d'emoji : ils doivent prendre la
                couleur de l'accent et rester nets à 17 px. */}
            <ul className="gages">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 7.6v10.9" />
                  <path d="M12 7.6C10.5 6.1 8.5 5.5 4.5 5.5v11.2c4 0 6 .6 7.5 2.1" />
                  <path d="M12 7.6c1.5-1.5 3.5-2.1 7.5-2.1v11.2c-4 0-6 .6-7.5 2.1" />
                </svg>
                {/* ⚠️ Le texte est enveloppé dans un <span>. Le <li> est un
                    conteneur flex avec `gap: 10px` : sans cette enveloppe,
                    chaque <b> et chaque bout de texte devient un élément flex
                    à part entière, et les espaces de la phrase s'écartent de
                    10 px — « Premier aperçu   gratuit   sous   48 h ». */}
                <span>Premier aperçu <b>gratuit</b> sous <b>48&nbsp;h</b></span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3.4 19 5.9v5.5c0 4-3 6.8-7 8.4-4-1.6-7-4.4-7-8.4V5.9l7-2.5Z" />
                  <path d="m9 12.1 2.1 2.1 4.1-4.3" />
                </svg>
                <span>Rien à payer avant la couverture</span>
              </li>
            </ul>
          </div>
        </Reveal>
      </div>

      {/* ── le parcours, en bande sous les deux colonnes ──
          Il etait la quatrieme chose de la colonne de droite, remise APRES le
          bouton par un `order` pour ne pas manger le premier ecran. Demande
          de Mathias, 31/08/2026 : qu'il sorte carrement de la composition a
          deux colonnes et passe dessous, en ligne. Deux choses s'ensuivent —
          le premier ecran ne montre plus que les images et le texte, chacun
          sur toute la hauteur ; et les trois etapes se lisent cote a cote, ce
          qui est leur forme naturelle : elles sont paralleles, pas empilees.
          ⚠️ Il reste APRES la colonne de droite dans le DOM, donc apres le
          bouton pour le clavier et le lecteur d'ecran — c'est l'ordre de
          lecture voulu, et il n'a plus besoin d'`order` pour l'obtenir. */}
      <Reveal delay={70} className="bloc-pas">
        <ol className="pas">
          {ETAPES.map((e, i) => (
            <li key={e.titre}>
              <span className="n" aria-hidden="true">{i + 1}</span>
              <span>
                <b>{e.titre}</b>
                <p>{e.texte}</p>
              </span>
              <span className="quand">{RYTHME[i]}</span>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  )
}
