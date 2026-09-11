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
      /* ⚠️ LE NOM SUIT LE NOMBRE (11/09/2026, seconde passe).
         Une seule proposition : « La couverture », il n'y a rien à arbitrer.
         Plusieurs : « Couverture 1 », « Couverture 2 »… TOUTES numérotées.
         Jusqu'ici la première gardait « La couverture » au milieu d'une
         « Couverture 2 », ce qui donnait à lire deux objets de nature
         différente là où on demande de CHOISIR entre deux égales, et rendait
         la confirmation (« l'atelier composera avec la couverture 2 ») sans
         symétrique pour la première. Mathias : « je ne trouve pas ça très
         clair de choisir entre les couvertures ». Deux cartes, deux noms de
         la même famille, un numéro qui se dit au téléphone. */
      const nom = propositions.length > 1 ? `Couverture ${k + 1}` : 'La couverture'
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
            /* ⚠️ La loupe navigue PAR LÉGENDE (components/Loupe.tsx) : deux
               légendes identiques rendraient un visuel inatteignable. Le
               numéro de la carte les sépare, et le mot « à plat » sépare la
               planche entière de la face avant. */
            legende: `${nom} à plat`,
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

/* ══════════════════════════════════════════════════════════════════════════
   LE CHOIX DE COUVERTURE, RENDU CLAIR (11/09/2026, seconde passe)

   Mathias, en regardant sa propre page : « je ne trouve pas ça très clair de
   choisir entre les couvertures quand on a le choix, et nous, on reçoit la
   demande où ? » Deux reproches, deux réponses. Celle de l'atelier vit dans
   l'admin (le tag sur la ligne, la ligne de la fiche, le brief). Celle du
   client vit ici.

   Ce que l'écran disait AVANT : un titre « Vos couvertures », deux images,
   et sous l'une d'elles un petit bouton « Je préfère celle-ci » qui
   n'apparaissait que sur la carte NON retenue. Rien ne posait de question,
   rien ne nommait l'action, et le bouton disparaissait précisément là où on
   venait de cliquer : l'écran répondait par une absence.

   Ce qu'il dit MAINTENANT : une question en titre (« Laquelle
   préférez-vous ? »), un bouton PLEIN et identique sous chaque carte, un
   état « Votre choix » là où il a cliqué, une porte de sortie sous la grille
   (« Sans préférence »), et une ligne de confirmation qui répète en toutes
   lettres ce qui va être composé.

   Trois règles qui ne se négocient pas :
   1. TANT QU'IL N'A RIEN DIT, AUCUNE CARTE N'EST MARQUÉE. La couverture de
      rang 0 est la proposition de l'atelier, pas son choix à lui. La marquer
      par défaut, c'est lui faire dire quelque chose qu'il n'a pas dit, et
      c'est aussi effacer la seule information dont l'atelier a besoin :
      a-t-il répondu ?
   2. « SANS PRÉFÉRENCE » DÉMARQUE TOUT. C'est une réponse à part entière,
      pas une absence de réponse, et elle ne se confond avec aucune carte.
   3. ON PEUT TOUJOURS CHANGER D'AVIS. Le bouton reste sous les cartes non
      retenues, la confirmation se réécrit, le journal garde l'hésitation.

   Pur, et éprouvé par verif-atelier.ts : c'est une règle d'affichage qui peut
   mentir au client sur ce qu'il a demandé, donc elle ne vit pas dans l'écran.
   ══════════════════════════════════════════════════════════════════════════ */

/** L'état d'une carte dans la grille de choix. */
export type EtatCarte =
  /** Le client a désigné CELLE-CI : bordure accentuée, « Votre choix ». */
  | 'retenue'
  /** Tout le reste : le bouton « Choisir cette couverture » est offert. */
  | 'a-choisir'

/**
 * L'état de chaque carte, dans l'ordre des rangs.
 *
 * `aChoisi` est le seul témoin de la parole du client : à faux, tout est
 * `a-choisir`, quelle que soit la valeur de `choisie` (qui vaut 0 par défaut,
 * c'est-à-dire la proposition de l'atelier). `indifferent` gagne sur le rang :
 * dire « décidez pour moi » ne laisse aucune carte marquée.
 */
export function etatCartes(
  choisie: number,
  aChoisi: boolean,
  indifferent: boolean,
  n: number,
): EtatCarte[] {
  const cartes: EtatCarte[] = []
  for (let k = 0; k < Math.max(0, n); k++) {
    cartes.push(aChoisi && !indifferent && k === choisie ? 'retenue' : 'a-choisir')
  }
  return cartes
}

/**
 * Ce qui est confirmé au client, sous la section, ou `null` s'il n'a rien dit.
 *
 * On répète le NUMÉRO, pas « celle-ci » : la phrase doit rester juste lue
 * seule, au téléphone ou dans une capture d'écran, loin de la carte cliquée.
 */
export function phraseChoixCouverture(
  choisie: number,
  aChoisi: boolean,
  indifferent: boolean,
): string | null {
  if (!aChoisi) return null
  if (indifferent) return 'Merci. L’atelier choisira pour vous.'
  return `Merci. L’atelier composera votre magazine avec la couverture ${choisie + 1}.`
}

/* Deux et trois, écrits : MAX_PLANCHES vaut 3 (apercu.ts), donc la table
   couvre tout ce que l'atelier peut publier. Au-delà, le chiffre plutôt
   qu'un mot inventé. */
const NOMBRES = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq']

/**
 * Le chapeau de la section des couvertures.
 *
 * `nbAChoisir` compte les cartes qui portent un rang (donc choisissables) ;
 * `nbCartes` compte toutes les cartes, y compris les dossiers HISTORIQUES
 * (c1 et c4 séparés) où il n'y a rien à arbitrer. Les deux sont nécessaires :
 * deux cartes sans rang, ce sont deux faces d'un même objet, pas deux
 * propositions, et leur poser une question serait un contresens.
 */
export function enTeteCouvertures(
  nbAChoisir: number,
  nbCartes: number,
): { titre: string; sousTitre: string | null } {
  if (nbAChoisir > 1) {
    const mot = NOMBRES[nbAChoisir] ?? String(nbAChoisir)
    const debut = mot.charAt(0).toUpperCase() + mot.slice(1)
    return {
      titre: 'Laquelle préférez-vous ?',
      sousTitre: `${debut} propositions de l’atelier. Choisissez celle que vous voulez sur votre magazine, ou laissez-nous décider.`,
    }
  }
  return { titre: nbCartes > 1 ? 'Vos couvertures' : 'Votre couverture', sousTitre: null }
}

/**
 * L'étiquette courte du choix, pour la LIGNE d'un dossier dans l'admin
 * (11/09/2026). « Couv. 2 », « Sans préférence », ou `null` s'il n'a rien dit.
 *
 * Elle vit ICI, avec les autres règles d'affichage du choix, pour deux
 * raisons : la liste et le tableau de l'admin sont des composants CLIENT, et
 * `apercu.ts` (qui porte le type) tire le SDK AWS pour signer les URL R2 ; et
 * un tag qui se tromperait de numéro dirait à l'atelier de composer la
 * mauvaise couverture. Le rang est interne (0-based), le numéro affiché ne
 * l'est pas : la conversion se fait une fois, ici.
 *
 * ⚠️ `null` VEUT DIRE « RIEN DIT », et se rend par l'ABSENCE de tag. Afficher
 * « Couv. 1 » par défaut ferait passer la proposition de l'atelier pour la
 * réponse du client, ce qui est précisément l'information qu'on cherche.
 */
export function etiquetteChoixCouverture(
  choix: { rang: number } | { indifferent: true } | null,
): string | null {
  if (choix === null) return null
  if ('indifferent' in choix) return 'Sans préférence'
  return `Couv. ${choix.rang + 1}`
}
