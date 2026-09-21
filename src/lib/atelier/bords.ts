/**
 * LE CONTRÔLE DES BORDS D'UNE PAGE D'IMPRESSION — la partie PURE (T-121, 19/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Ce que l'œil de l'atelier cherchait à la main sur le premier dossier, page
 * par page : une photo qui touche la coupe doit déborder de 3 mm dans le fond
 * perdu (sinon un rognage un peu court laisse un filet blanc), et une photo ne
 * doit pas s'arrêter entre 0 et 3 mm à l'intérieur de la coupe (sinon le filet
 * blanc qui reste varie d'une feuille à l'autre). Sur Merisa, la page 36 ne
 * débordait que de 2,2 mm en bas ; personne ne l'aurait vu sans mesurer.
 *
 * Ce module raisonne sur une PAGE RENDUE en niveaux de gris (un tableau de
 * pixels, `pxParMm` pixels par millimètre) et rend un verdict par bord.
 * Aucun PDF, aucun canvas : le rendu est fait par pdf.js dans le navigateur
 * (`rendreBords.ts`), et le harnais éprouve la règle sur des pages inventées.
 * ══════════════════════════════════════════════════════════════════════════
 */
import { FOND_PERDU_MM } from "./impression";

export type Cote = "haut" | "bas" | "gauche" | "droite";
export const COTES: Cote[] = ["haut", "bas", "gauche", "droite"];

/** Une page rendue : gris 0..255, ligne par ligne, `largeur × hauteur` pixels. */
export type PageGrise = { gris: Uint8Array | Uint8ClampedArray; largeur: number; hauteur: number; pxParMm: number };

export type VerdictBord = {
  /** Une photo (ou un fond) touche la ligne de coupe sur ce bord. */
  touche: boolean;
  /** Part du bord (0..1) où quelque chose touche la coupe. */
  partTouchee: number;
  /**
   * Jusqu'où l'image déborde au-delà de la coupe, en mm, là où elle la touche
   * (la plus petite profondeur rencontrée). `null` si rien ne touche.
   */
  profondeurMm: number | null;
  /** Sur combien de mm de bord le débord est court (`null` si rien n'est court). */
  courtSurMm: number | null;
  /**
   * Où le débord court se trouve le long du bord : `debut` (à gauche pour un
   * bord haut ou bas, en haut pour un bord gauche ou droit), `milieu`, `fin`,
   * ou `partout` quand il couvre presque tout ce qui touche.
   */
  courtVers: "debut" | "milieu" | "fin" | "partout" | null;
  /** Une image s'arrête entre 0,3 et 3 mm À L'INTÉRIEUR de la coupe, sans la toucher. */
  presque: boolean;
};

export type AuditBords = { cotes: Record<Cote, VerdictBord>; remarques: string[] };

/* Un pixel plus sombre que ça est « de l'image », visible à l'œil contre le
   papier ; au-dessus, c'est du blanc ou du presque blanc. Sert à dire si
   quelque chose TOUCHE la coupe. */
const SEUIL_CONTENU = 245;
/* Le papier nu, dans un PDF rendu, vaut EXACTEMENT 255 (254 tolère
   l'arrondi). Une photo claire, elle, n'y est jamais : un ciel, du sable,
   un mur blanc restent à 240-253, avec du grain. C'est ce seuil-là qui
   mesure JUSQU'OÙ la photo déborde — le 19/09, avec 245 pour les deux, la
   couverture de Merisa (ciel à 247-251 dans le fond perdu, 243 à la coupe)
   faisait trois fausses alertes « ne déborde que de 0 mm ». */
const SEUIL_PAPIER = 254;
/* Sous cette profondeur, le fond perdu est jugé court : le rognage courant
   se fait au millimètre près, on veut deux millimètres et demi de marge. */
export const PROFONDEUR_MIN_MM = 2.5;
/* En deçà de cette part du bord, ce qui touche est du bruit (une poussière,
   un anticrénelage), pas une photo. */
const PART_MIN = 0.02;
/* Un fond perdu court ne compte que s'il tient sur au moins 2 mm de bord
   d'un seul tenant : une colonne isolée qui tombe sur du blanc pur (un
   reflet cramé, une étoile, un grain) n'est pas une photo qui s'arrête. */
const TENANT_MIN_MM = 2;

const LIBELLE: Record<Cote, string> = { haut: "en haut", bas: "en bas", gauche: "à gauche", droite: "à droite" };

/**
 * Le verdict d'un bord. On lit deux bandes : la ligne juste À L'INTÉRIEUR de
 * la coupe (1 mm) dit si quelque chose la touche ; les 3 mm AU-DELÀ disent
 * jusqu'où ça déborde, colonne par colonne (ou ligne par ligne pour les bords
 * hauts et bas), en s'arrêtant au PAPIER (255), pas au presque blanc d'une
 * photo claire. Les 3 mm juste à l'intérieur, eux, servent au « presque ».
 */
export function verdictBord(page: PageGrise, cote: Cote, fondPerduMm = FOND_PERDU_MM): VerdictBord {
  const { gris, largeur, hauteur, pxParMm } = page;
  const b = Math.round(fondPerduMm * pxParMm);
  const un = Math.max(1, Math.round(1 * pxParMm));
  const tenant = Math.max(1, Math.round(TENANT_MIN_MM * pxParMm));
  const horizontal = cote === "haut" || cote === "bas";
  const longueur = horizontal ? largeur : hauteur;

  /* `pixel(k, d)` : le pixel à la position k le long du bord, à la distance d
     (en px) du bord extérieur de la page, en allant vers l'intérieur. */
  const pixel = (k: number, d: number): number => {
    if (cote === "haut") return gris[d * largeur + k];
    if (cote === "bas") return gris[(hauteur - 1 - d) * largeur + k];
    if (cote === "gauche") return gris[k * largeur + d];
    return gris[k * largeur + (largeur - 1 - d)];
  };

  /* Par colonne : la profondeur du débord (mm) si quelque chose touche la
     coupe, sinon `null`. */
  const profondeurs: (number | null)[] = new Array(longueur).fill(null);
  let presque = false;
  for (let k = 0; k < longueur; k++) {
    /* Quelque chose touche la coupe ? (le millimètre juste à l'intérieur) */
    let sombre = 0;
    for (let d = b; d < b + un; d++) if (pixel(k, d) < SEUIL_CONTENU) sombre++;
    if (sombre > un / 2) {
      /* Jusqu'où ça déborde au-delà de la coupe : on part de la coupe vers le
         bord extérieur, on s'arrête au premier pixel de papier nu. */
      let d = b - 1;
      while (d >= 0 && pixel(k, d) < SEUIL_PAPIER) d--;
      profondeurs[k] = (b - 1 - d) / pxParMm;
    } else {
      /* Rien à la coupe : une image s'arrête-t-elle dans les 3 mm intérieurs ?
         (entre 0,3 et 3 mm : plus près, c'est de l'anticrénelage) */
      const d0 = b + Math.round(0.3 * pxParMm);
      const d1 = b + b;
      for (let d = d0; d < d1; d++) {
        if (pixel(k, d) < SEUIL_CONTENU) {
          presque = true;
          break;
        }
      }
    }
  }

  /* La plus petite profondeur, mais un débord court ne compte que s'il tient
     sur `tenant` colonnes d'affilée ; une colonne courte isolée vaut comme un
     débord complet. */
  let touches = 0;
  let profondeurMin = Infinity;
  let debutCourt = -1;
  let colonnesCourtes = 0;
  let centrePire = -1;
  const clore = (fin: number) => {
    if (debutCourt < 0) return;
    if (fin - debutCourt >= tenant) {
      colonnesCourtes += fin - debutCourt;
      for (let k = debutCourt; k < fin; k++) {
        const pk = profondeurs[k] as number;
        if (pk < profondeurMin) {
          profondeurMin = pk;
          centrePire = (debutCourt + fin) / 2;
        }
      }
    }
    debutCourt = -1;
  };
  for (let k = 0; k <= longueur; k++) {
    const p = k < longueur ? profondeurs[k] : null;
    if (p === null) {
      clore(k);
      continue;
    }
    touches++;
    if (p < PROFONDEUR_MIN_MM) {
      if (debutCourt < 0) debutCourt = k;
    } else {
      clore(k);
      profondeurMin = Math.min(profondeurMin, p);
    }
  }
  const partTouchee = touches / longueur;
  const touche = partTouchee >= PART_MIN;
  /* Tout ce qui touche est court mais isolé : on rend le débord complet. */
  if (touche && profondeurMin === Infinity) profondeurMin = b / pxParMm;
  const court = touche && colonnesCourtes > 0;
  const part = centrePire / longueur;
  return {
    touche,
    partTouchee,
    profondeurMm: touche ? Math.round(profondeurMin * 100) / 100 : null,
    courtSurMm: court ? Math.round((colonnesCourtes / pxParMm) * 10) / 10 : null,
    courtVers: !court ? null : colonnesCourtes >= 0.9 * touches ? "partout" : part < 1 / 3 ? "debut" : part > 2 / 3 ? "fin" : "milieu",
    /* Un « presque » ne vaut que si le bord n'est pas, par ailleurs, une
       photo pleine page : sur une page où la photo touche la coupe, la
       zone intérieure est forcément sombre. */
    presque: presque && !touche,
  };
}

/** Les quatre bords, et les phrases que l'écran affiche. `numero` : le numéro de page lisible. */
export function auditerBords(page: PageGrise, numero: number, fondPerduMm = FOND_PERDU_MM): AuditBords {
  const cotes = Object.fromEntries(COTES.map((c) => [c, verdictBord(page, c, fondPerduMm)])) as Record<Cote, VerdictBord>;
  const remarques: string[] = [];
  const mmTxt = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");
  for (const c of COTES) {
    const v = cotes[c];
    if (v.touche && v.profondeurMm !== null && v.profondeurMm < PROFONDEUR_MIN_MM && v.courtVers) {
      /* Où chercher dans Canva : la page 28 de Merisa n'était courte que sur
         3 mm, au coin bas droit d'une photo un peu inclinée ; sans le dire,
         la phrase envoie chercher un défaut sur toute la largeur. */
      const horizontal = c === "haut" || c === "bas";
      const ou =
        v.courtVers === "partout"
          ? horizontal ? "sur toute la largeur" : "sur toute la hauteur"
          : v.courtVers === "milieu"
            ? "au milieu"
            : horizontal
              ? v.courtVers === "debut" ? "vers la gauche" : "vers la droite"
              : v.courtVers === "debut" ? "vers le haut" : "vers le bas";
      const etendue = v.courtVers === "partout" || v.courtSurMm === null ? "" : ` sur ${mmTxt(v.courtSurMm)} mm de bord`;
      remarques.push(
        `Page ${numero}, ${LIBELLE[c]}, ${ou} : la photo touche la coupe mais ne déborde que de ${mmTxt(v.profondeurMm)} mm${etendue} (il en faut ${fondPerduMm}). Dans Canva, étirer la photo au-delà du bord de la page.`,
      );
    }
    if (v.presque) {
      remarques.push(
        `Page ${numero}, ${LIBELLE[c]} : une image s'arrête à moins de 3 mm de la coupe sans la toucher : le filet blanc variera d'un exemplaire à l'autre.`,
      );
    }
  }
  return { cotes, remarques };
}

/** Le résumé pour l'écran, une fois toutes les pages passées. */
export function resumeBords(nbPages: number, remarques: string[]): string {
  if (!remarques.length) return `Bords contrôlés sur ${nbPages} page${nbPages > 1 ? "s" : ""} : chaque photo au bord déborde bien dans le fond perdu.`;
  return `Bords contrôlés sur ${nbPages} page${nbPages > 1 ? "s" : ""} : ${remarques.length} remarque${remarques.length > 1 ? "s" : ""}.`;
}
