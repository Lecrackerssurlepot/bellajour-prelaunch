/**
 * Le format d'un visuel de couverture — PLANCHE À PLAT ou COUVERTURE SEULE.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE MODULE EXISTE (11/09/2026, premiers vrais numéros)
 *
 * Depuis T2-2, la page du client traite TOUT fichier de couverture comme une
 * planche à plat : C4 | dos | C1 dans un seul export Canva. La vue « La
 * couverture » cadre la moitié droite, « La quatrième » la moitié gauche.
 *
 * Ce raisonnement est faux dès que l'atelier dépose une COUVERTURE SEULE
 * (portrait, ~210 × 297 mm, le format fini du magazine) : elle est alors
 * coupée en deux, « La couverture » n'en montre que la moitié droite, et
 * « La quatrième » montre la moitié GAUCHE de la première de couverture.
 * Constaté par Mathias sur un vrai dossier le 11/09/2026.
 *
 * On ne peut pas demander à l'atelier de déclarer le format : il déposerait
 * un jour l'un pour l'autre, et personne ne s'en apercevrait avant le client.
 * Le fichier, lui, le dit tout seul — une planche est deux fois plus large
 * qu'une page, la différence n'est pas subtile.
 *
 * LE SEUIL. Un A4 fait 210 × 297 (ratio 0,707) ; une planche A4 + dos fait
 * 420 à 430 × 297 (ratio 1,41 à 1,45). Entre les deux il n'y a RIEN : aucun
 * format d'impression du catalogue ne tombe autour de 1,15. Le seuil est donc
 * posé largement au-dessus de tout portrait imaginable (même un carré, ratio
 * 1,0, est traité en page seule : le couper en deux serait absurde) et
 * largement au-dessous de toute planche.
 *
 * Module PUR — aucune image, aucun DOM, aucun réseau, aucun React : il ne voit
 * que des nombres et des chaînes. C'est l'appelant qui MESURE (naturalWidth /
 * naturalHeight sur une `Image`), ici comme dans la fiche admin.
 *
 * Il porte aussi `construirePlanche`, la liste des CARTES et TUILES de la
 * planche (11/09/2026, T2 — remplace l'ancienne visionneuse en carrousel,
 * `construireVues`, dont l'unique appelant était `numero/[token]/Apercu.tsx`).
 * Même raison de vivre ici : c'est la seule règle de cet écran qui peut se
 * tromper EN SILENCE (montrer la moitié d'une couverture, ou rogner une
 * planche qu'on doit montrer entière), et elle vivait dans un composant que
 * le harnais ne peut pas charger — il tire une feuille CSS.
 *
 * LA PLANCHE, PAS LE CARROUSEL. Mathias (11/09) : « l'affichage n'est pas au
 * format » — une planche à plat vue en paysage plein cadre ne montre pas ce
 * qu'on va imprimer. La nouvelle grille montre TOUT d'un coup, chaque visuel
 * à ses proportions réelles : pour une planche, une tuile « première de
 * couverture » cadrée en A4 portrait (ce que le client tient en main) à côté
 * de la planche ENTIÈRE jamais rognée (ce qu'on imprime). La « quatrième »
 * cadrée séparément a disparu de cette carte : elle est déjà visible, entière,
 * dans la tuile « à plat ». `platsCadrageGauche` reste un paramètre accepté
 * (la fiche admin le règle encore pour son propre aperçu, `Fiche.tsx`) mais
 * n'a plus d'effet ICI, volontairement.
 * ══════════════════════════════════════════════════════════════════════════
 */

export type FormatVisuel = "portrait" | "planche";

/**
 * Au-dessous : une page seule, montrée entière. Au-dessus ou égal : une
 * planche, dont on cadre les deux faces.
 */
export const SEUIL_PLANCHE = 1.15;

/**
 * Le format d'un visuel d'après ses dimensions RÉELLES en pixels.
 *
 * ⚠️ UNE MESURE IMPOSSIBLE REND « planche », jamais une erreur. Hauteur nulle,
 * négative, NaN ou infinie : on ne sait pas, et le sens sûr est le
 * comportement HISTORIQUE — tous les dossiers publiés jusqu'au 11/09/2026 ont
 * été composés en planche à plat, et les rendre soudain en page seule
 * changerait ce que des clients ont déjà vu. En pratique le cas ne se produit
 * pas : l'appelant ne mesure qu'une image effectivement chargée, qui a donc
 * deux dimensions strictement positives.
 */
export function formatDepuisRatio(largeur: number, hauteur: number): FormatVisuel {
  if (!Number.isFinite(largeur) || !Number.isFinite(hauteur)) return "planche";
  if (largeur <= 0 || hauteur <= 0) return "planche";
  return largeur / hauteur < SEUIL_PLANCHE ? "portrait" : "planche";
}

export type EntreeVues = {
  plat: string | null
  plats: string[]
  c1: string | null
  c4: string | null
  doubles: string[]
  doublesCadrage: string[]
  platsCadrageDroite: string[]
  platsCadrageGauche: string[]
  /** Le format MESURÉ de chaque couverture, indexé par son `src`. Une entrée
      absente = pas encore mesurée : on ne DEVINE pas, on montre l'image
      entière en attendant (voir plus bas). */
  formats: Record<string, FormatVisuel | undefined>
}

/** Une image, montrée entière ou cadrée — le grain de la planche. */
export type TuilePlanche = {
  src: string
  legende: string
  /** `object-position` réglé par l'atelier. Vide = centré. Réservé aux
      tuiles CADRÉES (`premiere`) : une tuile entière n'a rien à cadrer. */
  cadrage?: string
}

/**
 * Une carte de couverture, telle qu'affichée dans la section « Vos
 * couvertures ». `format: 'inconnu'` = pas encore mesurée : traitée comme un
 * portrait (image entière, sans découpe) tant qu'on ne sait pas.
 */
export type CarteCouverture = {
  /** Le rang parmi les couvertures PROPOSÉES (plats/plat), pour le choix et
      la marque « votre choix ». Absent pour un dossier HISTORIQUE (c1/c4
      séparés, dossiers publiés avant le format à plat) : il n'y a rien à
      choisir, seulement à regarder. */
  rang?: number
  nom: string
  format: FormatVisuel | 'inconnu'
  /** Toujours présente : l'image ENTIÈRE, jamais rognée. Pour une planche,
      c'est l'objet à plat (« À plat : quatrième, dos, première »). Pour un
      portrait ou une mesure en attente, c'est l'unique tuile de la carte. */
  entiere: TuilePlanche
  /** PLANCHE SEULEMENT : la première de couverture, cadrée en portrait A4
      (`object-fit: cover`) — c'est elle qui « fait objet » dans la carte. */
  premiere?: TuilePlanche
}

/** Une double page, à son ratio réel. */
export type TuileDouble = {
  src: string
  legende: string
  cadrage?: string
}

/**
 * La planche : les cartes de couverture et les tuiles de double page, dans
 * l'ordre d'affichage — FONCTION PURE, éprouvée par verif-atelier.ts.
 *
 * Remplace `construireVues` (visionneuse en carrousel, T-089) le 11/09/2026 :
 * Mathias, capture à l'appui — « l'affichage n'est pas au format », il veut
 * tout voir d'un coup, en grille, chaque visuel à ses proportions réelles.
 * Une planche vue en paysage plein cadre ne montre pas ce qu'on va imprimer ;
 * une carte avec la première de couverture ET la planche entière, si.
 *
 * Le vocabulaire reste celui de la cliente ET de l'atelier — deux personnes
 * qui regardent le même visuel le nomment pareil.
 *
 * ⚠️ TANT QU'UNE COUVERTURE N'EST PAS MESURÉE, elle est rendue ENTIÈRE
 * (`format: 'inconnu'`), jamais découpée au hasard. Ne rien rendre ferait
 * sauter la grille et retarderait le chargement de l'image la plus
 * importante de la page (elle ne serait plus dans le HTML). La mesure arrive
 * avec le décodage de l'image, donc dans le même souffle — la carte se
 * réorganise alors en planche à deux tuiles.
 */
export function construirePlanche(e: EntreeVues): { couvertures: CarteCouverture[]; doubles: TuileDouble[] } {
  const couvertures: CarteCouverture[] = []
  /* T-093 — `plats` fait foi quand il est là ; sinon la planche unique, donc
     tous les dossiers publiés jusqu'ici passent par le même chemin qu'avant. */
  const propositions = e.plats.length ? e.plats : e.plat ? [e.plat] : []

  if (propositions.length) {
    propositions.forEach((src, k) => {
      const premiere = k === 0
      /* La première s'appelle « La couverture » : c'est celle qu'on propose.
         Les autres portent leur rang, c'est ce qui permet d'en parler au
         téléphone sans montrer son écran. */
      const nom = premiere ? 'La couverture' : `Couverture ${k + 1}`
      const format = e.formats[src]

      if (format === 'planche') {
        couvertures.push({
          rang: k,
          nom,
          format: 'planche',
          premiere: {
            src,
            legende: nom,
            cadrage: e.platsCadrageDroite[k] || undefined,
          },
          entiere: {
            src,
            legende: premiere ? 'La couverture à plat' : `${nom} à plat`,
          },
        })
      } else {
        /* Portrait (couverture seule) OU pas encore mesurée : l'image
           ENTIÈRE, une seule tuile, aucun cadrage — celui de l'atelier règle
           une COUPE, et ici il n'y en a aucune. */
        couvertures.push({
          rang: k,
          nom,
          format: format === 'portrait' ? 'portrait' : 'inconnu',
          entiere: { src, legende: nom },
        })
      }
    })
  } else {
    /* Dossier HISTORIQUE : c1 et c4 sont deux fichiers séparés, pas une
       planche. Rien à choisir (`rang` absent) : ils se montrent, entiers. */
    if (e.c1) couvertures.push({ nom: 'La couverture', format: 'portrait', entiere: { src: e.c1, legende: 'La couverture' } })
    if (e.c4) couvertures.push({ nom: 'La quatrième', format: 'portrait', entiere: { src: e.c4, legende: 'La quatrième' } })
  }

  const doubles: TuileDouble[] = e.doubles.map((src, k) => ({
    src,
    legende: e.doubles.length > 1 ? `Double page ${k + 1}` : 'Une double page',
    cadrage: e.doublesCadrage[k] || undefined,
  }))

  return { couvertures, doubles }
}
