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
 * Il porte aussi `construireVues`, la liste des vues de la visionneuse : c'est
 * la même règle vue de l'autre bout (quel cadre, quelle légende), et elle
 * vivait dans un composant que le harnais ne peut pas charger — il tire une
 * feuille CSS. Une règle qu'on ne peut pas éprouver finit par n'être éprouvée
 * par personne, et celle-ci se trompe EN SILENCE.
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

/* Le CADRAGE dit aussi le SUPPORT (04/09, maquettes validées) : les
   couvertures se posent sur un magazine FERMÉ (dos, tranche, épaisseur —
   `droite`/`pleine` vus de face, `gauche`/`pleine-dos` vus de dos, en
   miroir), les doubles pages sur un magazine OUVERT (`ouverte` : pli
   central, bloc de pages dessous), la planche `large` reste posée à plat
   avec la seule épaisseur du papier. Tout est en CSS pur (numero.css). */
type Cadre = 'droite' | 'gauche' | 'pleine' | 'pleine-dos' | 'large' | 'ouverte'
export type Vue = {
  src: string
  legende: string
  loupe: string
  cadre: Cadre
  /* Le cadrage réglé par l'atelier (`object-position`). Vide = centré.
     ⚠️ Réservé aux PLANCHES et aux doubles pages : sur une couverture seule,
     il n'y a pas de coupe à régler, et appliquer un cadrage de planche
     déplacerait une image qu'on montre entière. */
  cadrage?: string
  /* T-093 — le rang de la couverture que cette vue montre (0 = celle
     proposée par défaut). Absent sur les doubles pages : on ne choisit pas
     une double page, on choisit une couverture. */
  rang?: number
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

/**
 * Les vues, dans l'ordre du feuilletage — FONCTION PURE, éprouvée par
 * verif-atelier.ts.
 *
 * Elle est sortie du composant pour une raison simple : c'est la seule règle
 * de cet écran qui peut se tromper en silence (montrer la moitié d'une
 * couverture sous le nom « La quatrième »), et une règle qu'on ne peut pas
 * éprouver sans navigateur finit par n'être éprouvée par personne.
 *
 * Le vocabulaire est celui de la cliente ET de l'atelier — deux personnes qui
 * regardent le même visuel le nomment pareil. La loupe navigue par légende
 * (findIndex) : en mode à plat, les deux faces découpées pointent le MÊME
 * objet entier, sous une seule légende de loupe « La couverture à plat ».
 *
 * ⚠️ TANT QU'UNE COUVERTURE N'EST PAS MESURÉE, elle est rendue ENTIÈRE
 * (cadre `pleine`), en une seule vue. C'est le seul cadre neutre possible :
 * ne rien rendre ferait sauter la scène et retarderait le chargement de
 * l'image la plus importante de la page (elle ne serait plus dans le HTML),
 * et découper au hasard est exactement le défaut qu'on corrige. La mesure
 * arrive avec le décodage de l'image, donc dans le même souffle.
 */
export function construireVues(e: EntreeVues): { vues: Vue[]; couvertures: string[] } {
  const vues: Vue[] = []
  /* T-093 — `plats` fait foi quand il est là ; sinon la planche unique, donc
     tous les dossiers publiés jusqu'ici passent par le même chemin qu'avant. */
  const couvertures = e.plats.length ? e.plats : e.plat ? [e.plat] : []

  if (couvertures.length) {
    couvertures.forEach((src, k) => {
      const premiere = k === 0
      /* La première s'appelle « La couverture » : c'est celle qu'on propose.
         Les autres portent leur rang, c'est ce qui permet d'en parler au
         téléphone sans montrer son écran. */
      const nom = premiere ? 'La couverture' : `Couverture ${k + 1}`

      if (e.formats[src] === 'planche') {
        if (premiere) {
          vues.push({
            src,
            legende: 'La couverture',
            loupe: 'La couverture à plat',
            cadre: 'droite',
            rang: 0,
            cadrage: e.platsCadrageDroite[0] || undefined,
          })
          vues.push({
            src,
            legende: 'La quatrième',
            loupe: 'La couverture à plat',
            cadre: 'gauche',
            rang: 0,
            cadrage: e.platsCadrageGauche[0] || undefined,
          })
          vues.push({
            src,
            legende: 'La couverture à plat',
            loupe: 'La couverture à plat',
            cadre: 'large',
            rang: 0,
          })
        } else {
          /* Les autres propositions : une vue chacune, cadrée sur leur face
             avant — c'est elle qu'on compare. La loupe montre la planche
             entière, comme pour la première. */
          vues.push({
            src,
            legende: nom,
            loupe: nom,
            cadre: 'droite',
            rang: k,
            cadrage: e.platsCadrageDroite[k] || undefined,
          })
        }
      } else {
        /* Portrait (couverture seule) OU pas encore mesurée : l'image
           ENTIÈRE, une seule vue, aucune quatrième — il n'y en a pas dans le
           fichier. Aucun cadrage : celui de l'atelier règle une COUPE, et
           ici il n'y en a aucune. */
        vues.push({ src, legende: nom, loupe: nom, cadre: 'pleine', rang: k })
      }
    })
  } else {
    if (e.c1) vues.push({ src: e.c1, legende: 'La couverture', loupe: 'La couverture', cadre: 'pleine' })
    if (e.c4) vues.push({ src: e.c4, legende: 'La quatrième', loupe: 'La quatrième', cadre: 'pleine-dos' })
  }

  e.doubles.forEach((src, k) => {
    const nom = e.doubles.length > 1 ? `Double page ${k + 1}` : 'Une double page'
    vues.push({ src, legende: nom, loupe: nom, cadre: 'ouverte', cadrage: e.doublesCadrage[k] })
  })

  return { vues, couvertures }
}
