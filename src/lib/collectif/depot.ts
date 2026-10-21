/**
 * Le dépôt des photos : ce que le navigateur déclare, et ce que le serveur en
 * décide (PRD §5). Module PUR : aucun accès base, aucun réseau, aucune
 * variable d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA REPRISE SANS DOUBLON PASSE PAR LA CLÉ DE FICHIER, PAS PAR LE pHash
 *
 * Le pHash se calcule sur le serveur APRÈS l'arrivée : il ne peut rien
 * écarter avant l'envoi. Ce qui rend une reprise propre, c'est la clé
 * nom|taille|date de modification, calculée par le navigateur sur le fichier
 * D'ORIGINE (avant toute réduction) et unique par édition en base.
 * Re-sélectionner le même dossier après une coupure :
 * - une photo déjà confirmée répond « déjà là » (rien ne repart), et dit où
 *   elle est (cet album, un autre lien, la corbeille : `origineDeja`) ;
 * - une photo que son auteur avait supprimée revient (`restaurableParChoix`) ;
 * - une photo déclarée mais jamais arrivée se re-signe sur la MÊME clé R2 ;
 * - le reste est nouveau.
 * Le pHash, lui, nourrit le filtre « Doublons » : une remarque, jamais une
 * exclusion (même règle que l'atelier).
 * ══════════════════════════════════════════════════════════════════════════
 */

import { MAX_FILE_BYTES, resoudreMime } from "@/lib/atelier/formats";
import { trancherLot, type Place, type RaisonPlafond } from "./plafonds";

/** Une déclaration par appel : au-delà, la route ferait trop d'allers-retours d'un coup. */
export const LOT_DECLARATION = 25;
/** Une confirmation par appel (les HEAD R2 se font par paquets de 8). */
export const LOT_CONFIRMATION = 25;
/**
 * La vérification « déjà là ? » d'une reprise : des clés seulement, pas de
 * signature. 100, pas 500 : les clés partent dans l'URL du filtre `in`
 * (`lireExistants`), et 500 clés de fichier font 20 à 40 Ko d'URL, au-delà de
 * la limite de l'API ; 100 en font 8 au plus (mesuré le 19/10, `PAQUET_IN`
 * dans lignes.ts).
 */
export const LOT_VERIFICATION = 100;
/**
 * Une ligne déclarée et jamais arrivée cesse de compter dans les plafonds
 * passé ce délai : l'URL signée a expiré (1 h), l'envoi est mort. Sans ce
 * délai, une coupure réseau bloquerait le plafond d'un participant pour
 * toujours. Garde technique, pas une promesse.
 */
export const DELAI_DECLARATION_MORTE_MS = 2 * 60 * 60 * 1000;

/** La clé d'un fichier, calculée sur l'ORIGINAL : nom|taille|date de modification. */
export function cleFichier(nom: string, taille: number, modifieLe: number): string {
  return `${nom.slice(0, 200)}|${Math.max(0, Math.floor(taille))}|${Math.max(0, Math.floor(modifieLe))}`;
}

const CLE_FICHIER = /^.{1,200}\|\d{1,15}\|\d{1,16}$/;

export function estCleFichier(v: unknown): v is string {
  return typeof v === "string" && CLE_FICHIER.test(v);
}

export type FichierDeclare = {
  /** La clé de l'ORIGINAL (reprise). */
  cle: string;
  nom: string;
  /** Ce qui part réellement (après réduction) : c'est ce que la signature fige. */
  taille: number;
  type: string;
  /** Taille de la vignette JPEG, si le navigateur en a produit une. */
  tailleVignette: number | null;
  ordre: number | null;
};

export type ErreurDeclaration = { nom: string; erreur: "format" | "taille" | "cle" };

/**
 * Le lot envoyé par le navigateur, inspecté champ par champ. Un fichier
 * illisible est REFUSÉ seul (avec sa raison), le reste du lot passe.
 */
export function lireDeclaration(v: unknown): { fichiers: FichierDeclare[]; refus: ErreurDeclaration[] } | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > LOT_DECLARATION) return null;
  const fichiers: FichierDeclare[] = [];
  const refus: ErreurDeclaration[] = [];
  for (const brut of v) {
    const f = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
    const nom = typeof f.nom === "string" ? f.nom.slice(0, 200) : "photo";
    const taille = Number(f.taille);
    const mime = resoudreMime(nom, typeof f.type === "string" ? f.type : "");
    if (!estCleFichier(f.cle)) refus.push({ nom, erreur: "cle" });
    else if (!Number.isFinite(taille) || taille <= 0 || taille > MAX_FILE_BYTES) refus.push({ nom, erreur: "taille" });
    else if (!mime) refus.push({ nom, erreur: "format" });
    else {
      const tv = Number(f.tailleVignette);
      fichiers.push({
        cle: f.cle,
        nom,
        taille: Math.floor(taille),
        type: mime,
        tailleVignette: Number.isFinite(tv) && tv > 0 ? Math.floor(tv) : null,
        ordre: Number.isInteger(f.ordre) ? (f.ordre as number) : null,
      });
    }
  }
  return { fichiers, refus };
}

/**
 * Ce que la base sait déjà d'une clé de fichier de cette édition. `corbeille` :
 * la photo est à la corbeille (migration 20261023). Les champs d'origine
 * (`par`, `provenanceId`, `role`, `appareilId`, `participantId`) disent d'où
 * elle vient et qui l'a mise à la corbeille ; absents (un appelant d'avant, ou
 * la migration 20261023 qui manque pour `par` et `participantId`), la règle
 * d'avant s'applique : « déjà là », sans dire où.
 */
export type Existant = {
  id: string;
  r2_key: string;
  confirmee: boolean;
  corbeille?: boolean;
  /** Qui l'a mise à la corbeille (`supprimee_par`) : « auteur », « responsable », « atelier ». */
  par?: string | null;
  /** Son lien (`provenance_id`) : `null` pour le lien général et le dépôt du responsable. */
  provenanceId?: string | null;
  /** Qui l'a déposée (`role_deposant`). */
  role?: string;
  appareilId?: string | null;
  participantId?: string | null;
};

/* ─────────── « déjà là », dit par cas (retours de Mathias du 21/10, édition « Recette 1 ») ───────────
   Le 21/10, le même iPhone avait envoyé par « Bateau 1 » et par « Bateau 2 », supprimé des photos,
   puis les avait choisies de nouveau : « 8 photos reçues » sur un lien à 5, rien n'était parti et
   l'album ne les montrait pas. La clé d'une photo est unique PAR ÉDITION : déjà arrivée par un autre
   lien, elle ne repart pas, et la page doit le DIRE. C'est sans risque : la clé porte le sel de CET
   appareil (cleDepot.ts), la réponse ne parle que de ses propres envois. */

/**
 * Où une photo « déjà là » avait été envoyée :
 * - `album` : dans CET album (ce lien, hors corbeille) ;
 * - `lien` : par un AUTRE lien de l'édition (son libellé, `null` pour le lien général) ;
 * - `edition` : déposée par l'organisateur (le même navigateur, la même clé) ;
 * - `restauree` : supprimée par son auteur depuis cet appareil ou par cette personne, et choisie
 *   de nouveau : elle revient dans son album (`ici` : celui de cette page) ;
 * - `retiree` : mise à la corbeille par le responsable ou l'atelier : elle ne revient pas ;
 * - `supprimee` : mise à la corbeille par son auteur, mais ni depuis cet appareil ni par cette
 *   personne (ou son lien n'existe plus) : elle ne revient pas d'ici ;
 * - `connue` : le serveur ne dit pas où (une réponse d'avant, un fichier deux fois dans un lot).
 */
export const OU_DEJA = ["album", "lien", "edition", "restauree", "retiree", "supprimee", "connue"] as const;
export type OuDeja = (typeof OU_DEJA)[number];

/** Une photo « déjà là », telle que la page la lit (le libellé du lien d'origine, s'il y a lieu). */
export type DejaLa = { ou: OuDeja; lien: string | null; ici: boolean };

export const DEJA_CONNUE: DejaLa = { ou: "connue", lien: null, ici: false };

/** Lire ce que le serveur dit d'une photo « déjà là » (la déclaration ou la vérification d'une reprise). */
export function lireDejaLa(r: Record<string, unknown>): DejaLa {
  const ou = typeof r.ou === "string" && (OU_DEJA as readonly string[]).includes(r.ou) ? (r.ou as OuDeja) : r.corbeille === true ? "supprimee" : "connue";
  const lien = typeof r.lien === "string" && r.lien.trim() ? r.lien.trim().slice(0, 120) : null;
  return { ou, lien, ici: r.ici === true };
}

/** Qui déclare, et d'où : la page qui dépose (le rôle, son lien, son appareil, sa personne). */
export type ContexteDeclaration = {
  role: "participant" | "responsable";
  /** Le lien de CETTE page (`null` : le lien général, ou le dépôt du responsable). */
  provenanceId: string | null;
  /** Le cookie de l'appareil, tel que la requête le porte (`null` : un appareil nouveau). */
  appareil: string | null;
  /** La personne pour qui cet appareil parle (20261023), ou `null`. */
  participantId: string | null;
};

/**
 * La photo est-elle du lien de cette page ? Un lien de contribution : sa
 * provenance ; le lien général : une photo de participant sans provenance.
 * La même règle que `duLien` (album.ts), écrite ici pour que le moteur
 * n'importe pas l'album ; le harnais compare les deux.
 */
export function duMemeLien(e: { provenanceId?: string | null; role?: string }, provenanceId: string | null): boolean {
  return provenanceId ? e.provenanceId === provenanceId : (e.provenanceId ?? null) === null && e.role === "participant";
}

/**
 * Re-choisir une photo qu'on a supprimée la RESTAURE (Mathias, 21/10) : une
 * photo de la corbeille mise là par son AUTEUR, choisie de nouveau par un
 * participant depuis le même appareil, ou par la même personne. Jamais une
 * photo retirée par le responsable ou l'atelier : leur geste fait foi. La place
 * se décide à part (elle compte de nouveau dans le plafond de SON lien).
 */
export function restaurableParChoix(e: Existant, ctx: ContexteDeclaration): boolean {
  if (ctx.role !== "participant" || !e.corbeille || e.par !== "auteur") return false;
  return (ctx.appareil !== null && e.appareilId === ctx.appareil) || (ctx.participantId !== null && e.participantId === ctx.participantId);
}

/** Où était une photo « déjà là » qui ne se restaure pas (et `lienId` : son lien, pour en dire le libellé). */
export function origineDeja(e: Existant, ctx: ContexteDeclaration): { ou: Exclude<OuDeja, "restauree">; lienId: string | null } {
  if (e.corbeille) return { ou: e.par === "responsable" || e.par === "atelier" ? "retiree" : "supprimee", lienId: null };
  if (e.role === undefined) return { ou: "connue", lienId: null };
  if (duMemeLien(e, ctx.provenanceId)) return { ou: "album", lienId: null };
  if (e.provenanceId) return { ou: "lien", lienId: e.provenanceId };
  /* Sans provenance : le lien général (vu d'un lien de contribution), ou le dépôt de l'organisateur. */
  return e.role === "participant" ? { ou: "lien", lienId: null } : { ou: "edition", lienId: null };
}

export type Decision =
  | { cle: string; sorte: "deja"; id: string; corbeille?: true; ou?: OuDeja; lienId?: string | null }
  | { cle: string; sorte: "reprise"; id: string; r2_key: string }
  | { cle: string; sorte: "nouvelle" }
  /** Le même fichier une seconde fois dans le lot : ignoré, la première suffit. */
  | { cle: string; sorte: "double" }
  /** `corbeille` : une photo qui serait revenue de la corbeille, mais la place manque : elle y reste. */
  | { cle: string; sorte: "refusee"; raison: RaisonPlafond; corbeille?: true }
  /**
   * À sortir de la corbeille (`restaurableParChoix`). `ici` : du lien de cette
   * page, la place est déjà tranchée avec les nouvelles ; sinon, la route la
   * tranche avec la place de SON lien (`lienId`, `null` : le lien général).
   */
  | { cle: string; sorte: "restaurer"; id: string; ici: boolean; lienId: string | null };

/**
 * Le partage d'un lot : déjà là, à reprendre, nouveau, ou refusé par le
 * plafond. Seules les NOUVELLES consomment de la place (une reprise est déjà
 * comptée, une déjà-là aussi). Un même fichier deux fois dans le lot ne
 * compte qu'une fois.
 *
 * Avec le contexte de la page (`ctx`, la route le passe depuis le 21/10) :
 * chaque « déjà là » dit où il était (`origineDeja`), et une photo que son
 * auteur avait supprimée revient (`restaurer`). Revenue sur le lien de cette
 * page, elle CONSOMME la place comme une nouvelle, dans l'ordre du lot ; sans
 * place, elle reste à la corbeille et le refus du plafond le dit. Sans `ctx`,
 * la règle d'avant : la corbeille reste « déjà là ».
 */
export function planDeclaration(
  fichiers: readonly FichierDeclare[],
  existants: ReadonlyMap<string, Existant>,
  place: Place,
  ctx?: ContexteDeclaration
): Decision[] {
  const restaurable = (e: Existant | undefined): e is Existant => Boolean(e && ctx && restaurableParChoix(e, ctx));
  const vus = new Set<string>();
  /* Ce qui consomme la place, dans l'ordre du lot : les nouvelles, et les photos qui reviennent sur CE lien. */
  const consommatrices = fichiers.filter((f) => {
    const e = existants.get(f.cle);
    const consomme = !e || (restaurable(e) && duMemeLien(e, ctx?.provenanceId ?? null));
    return consomme && !vus.has(f.cle) && vus.add(f.cle);
  });
  const tranche = trancherLot(consommatrices.length, place);
  const acceptees = new Set(consommatrices.slice(0, tranche.acceptees).map((f) => f.cle));
  const dejaDecide = new Set<string>();

  return fichiers.map((f): Decision => {
    const e = existants.get(f.cle);
    if (restaurable(e) && ctx) {
      if (dejaDecide.has(f.cle)) return { cle: f.cle, sorte: "double" };
      dejaDecide.add(f.cle);
      if (!duMemeLien(e, ctx.provenanceId)) return { cle: f.cle, sorte: "restaurer", id: e.id, ici: false, lienId: e.provenanceId ?? null };
      return acceptees.has(f.cle)
        ? { cle: f.cle, sorte: "restaurer", id: e.id, ici: true, lienId: ctx.provenanceId }
        : { cle: f.cle, sorte: "refusee", raison: tranche.raison ?? "plafond_total", corbeille: true };
    }
    if (e) {
      const origine = ctx ? origineDeja(e, ctx) : null;
      const ou = origine ? { ou: origine.ou, lienId: origine.lienId } : {};
      /* Une photo à la corbeille ne repart pas : elle est « déjà là », et la réponse le dit (`corbeille`). */
      if (e.corbeille) return { cle: f.cle, sorte: "deja", id: e.id, corbeille: true, ...ou };
      return e.confirmee ? { cle: f.cle, sorte: "deja", id: e.id, ...ou } : { cle: f.cle, sorte: "reprise", id: e.id, r2_key: e.r2_key };
    }
    if (acceptees.has(f.cle) && !dejaDecide.has(f.cle)) {
      dejaDecide.add(f.cle);
      return { cle: f.cle, sorte: "nouvelle" };
    }
    if (dejaDecide.has(f.cle)) return { cle: f.cle, sorte: "double" };
    dejaDecide.add(f.cle);
    return { cle: f.cle, sorte: "refusee", raison: tranche.raison ?? "plafond_total" };
  });
}

/**
 * La vérification d'une reprise (`connues`, qui n'écrit rien) : ce que la page
 * apprend de chaque clé AVANT toute réduction. `confirmees` : déjà là, avec
 * où (`details`) ; `aRevoir` : à la corbeille par son auteur, elles partent en
 * déclaration (sans réduction) où le serveur décide de les restaurer, la
 * personne de l'appareil et la place connues. Une clé déclarée jamais arrivée
 * n'est dans aucune liste : elle se réduit et se reprend.
 */
export function partagerConnues(
  existants: ReadonlyMap<string, Existant>,
  ctx: ContexteDeclaration
): { confirmees: string[]; aRevoir: string[]; details: { cle: string; ou: OuDeja; lienId: string | null }[] } {
  const confirmees: string[] = [];
  const aRevoir: string[] = [];
  const details: { cle: string; ou: OuDeja; lienId: string | null }[] = [];
  for (const [cle, e] of existants) {
    if (!e.confirmee) continue;
    if (ctx.role === "participant" && e.corbeille && e.par === "auteur") {
      aRevoir.push(cle);
      continue;
    }
    confirmees.push(cle);
    details.push({ cle, ...origineDeja(e, ctx) });
  }
  return { confirmees, aRevoir, details };
}

/** Une ligne compte dans les plafonds si elle est arrivée, ou déclarée depuis peu. */
export function compteDansPlafond(l: { confirmee_le: string | null; created_at: string }, maintenant: Date): boolean {
  if (l.confirmee_le) return true;
  const t = Date.parse(l.created_at);
  return Number.isFinite(t) && maintenant.getTime() - t < DELAI_DECLARATION_MORTE_MS;
}

/* ─────────── les vidéos (T-200 : refusées, décision de Mathias du 20/10) ───────────
   Un magazine n'imprime pas de vidéo. Elles étaient déjà écartées à l'ajout (le
   format n'est pas une photo), mais la page ne le disait qu'APRÈS le choix, et
   d'un « ce ne sont pas des photos » qui ne nommait rien. Une Live Photo d'iPhone
   part comme une photo : seule sa partie vidéo reste. */

/** Les extensions de vidéo d'un téléphone ou d'un appareil (le type arrive parfois vide, iCloud). */
const EXTENSIONS_VIDEO = /\.(mov|mp4|m4v|3gp|3g2|avi|mkv|webm|mts|m2ts|wmv)$/i;

/** Ce fichier est-il une vidéo ? Par le type annoncé, sinon par l'extension. Une photo acceptée n'en est jamais une. */
export function estVideo(nom: string, type: string): boolean {
  if (resoudreMime(nom, type)) return false;
  return (type || "").trim().toLowerCase().startsWith("video/") || EXTENSIONS_VIDEO.test(nom.trim());
}

/** La ligne discrète de la page de dépôt, AVANT le choix des photos (T-200). */
export const PHOTOS_SEULEMENT = "Photos seulement : les vidéos ne partent pas.";

/**
 * Les fichiers écartés à l'ajout, dits par ce qu'ils sont : la vidéo NOMMÉE
 * (une seule : son nom ; plusieurs : leur nombre), puis le reste. `videos` est
 * compté parmi `ignores`.
 */
export function phrasesIgnores(ignores: number, videos: number, premiereVideo: string | null): string[] {
  const total = Math.max(0, Math.floor(ignores));
  const v = Math.min(total, Math.max(0, Math.floor(videos)));
  const autres = total - v;
  const phrases: string[] = [];
  if (v === 1) phrases.push(premiereVideo ? `« ${premiereVideo} » est une vidéo : seules les photos partent.` : "1 vidéo ignorée : seules les photos partent.");
  else if (v > 1) phrases.push(`${v} vidéos ignorées : seules les photos partent.`);
  if (autres) phrases.push(`${autres} fichier${autres > 1 ? "s" : ""} ignoré${autres > 1 ? "s" : ""} : ce ne sont pas des photos.`);
  return phrases;
}
