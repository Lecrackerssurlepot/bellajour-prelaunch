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

/* ─────────── la version MOYENNE d'« Agrandir » (5A, décision de Mathias du 26/10) ───────────
   Le navigateur fabrique, à côté de la vignette, une version d'environ 1 600 px
   (JPEG : Safari ne sait pas encoder le WebP sur un canvas, il rendrait un PNG
   lourd). Elle va au coffre à côté de la vignette (`cleMoyenne`) et la
   visionneuse la montre ; l'original ne sert plus qu'au téléchargement et à
   l'impression. Sans elle (photo plus petite que ce côté, navigateur qui
   échoue, photo d'avant, migration pas passée) : l'original, comme avant. */

/** Le grand côté de la version moyenne, en pixels. */
export const COTE_MOYENNE = 1600;
/** Sa qualité JPEG (0 à 1) : celle d'un affichage plein écran, pas d'une impression. */
export const QUALITE_MOYENNE = 0.8;
/** Plafond d'une version moyenne : au-delà, l'URL signée servirait à pousser autre chose (même garde que la vignette). */
export const MAX_MOYENNE_BYTES = 2 * 1024 * 1024;
/** Le seul type qu'elle porte, côté signature comme côté HEAD. */
export const MIME_MOYENNE = "image/jpeg";
/** Ce que le moteur demande au worker (`reduire`, `apercusHeic`). */
export const DEMANDE_MOYENNE = { cote: COTE_MOYENNE, qualite: QUALITE_MOYENNE } as const;

/** La moyenne déclarée mérite-t-elle une URL signée ? Une taille positive, sous le plafond. */
export function moyenneSignable(taille: number | null | undefined): taille is number {
  return typeof taille === "number" && Number.isFinite(taille) && taille > 0 && taille <= MAX_MOYENNE_BYTES;
}

/**
 * Une version moyenne vaut-elle d'être gardée ? La photo dépasse le côté (sinon l'original est
 * déjà de cette taille), et ce qu'on a produit est sous le plafond et plus léger que l'original.
 * La règle des deux workers (navigateur) et du rattrapage (`scripts/collectif-moyennes-rattrapage.ts`).
 */
export function moyenneUtile(p: { largeur: number; hauteur: number; taille: number; tailleOriginal: number | null }): boolean {
  if (!(Math.max(p.largeur, p.hauteur) > COTE_MOYENNE)) return false;
  if (!moyenneSignable(p.taille)) return false;
  return p.tailleOriginal === null || p.taille < p.tailleOriginal;
}

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
  /** Taille de la version moyenne (5A), si le navigateur en a produit une (absente : aucune). */
  tailleMoyenne?: number | null;
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
      const tm = Number(f.tailleMoyenne);
      fichiers.push({
        cle: f.cle,
        nom,
        taille: Math.floor(taille),
        type: mime,
        tailleVignette: Number.isFinite(tv) && tv > 0 ? Math.floor(tv) : null,
        tailleMoyenne: Number.isFinite(tm) && tm > 0 ? Math.floor(tm) : null,
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
 *
 * `photosDeLaPersonne` (28/10) : les photos ARRIVÉES de la personne qui déclare (participant connu,
 * ou le responsable), lues pour les noms du lot (`lirePhotosDeLaPersonne`). Une clé neuve qui
 * désigne l'une d'elles, sel mis à part (`jumelleDeLaPersonne`), est « déjà là » : la même photo
 * renvoyée d'un autre appareil. Elle ne consomme pas la place, rien ne s'écrit, et la réponse dit
 * où elle est, comme pour un « déjà là » du même appareil.
 */
export function planDeclaration(
  fichiers: readonly FichierDeclare[],
  existants: ReadonlyMap<string, Existant>,
  place: Place,
  ctx?: ContexteDeclaration,
  photosDeLaPersonne: readonly PhotoDeLaPersonne[] = []
): Decision[] {
  const restaurable = (e: Existant | undefined): e is Existant => Boolean(e && ctx && restaurableParChoix(e, ctx));
  const jumelle = (cle: string) => jumelleDeLaPersonne(cle, ctx, photosDeLaPersonne);
  const vus = new Set<string>();
  /* Ce qui consomme la place, dans l'ordre du lot : les nouvelles, et les photos qui reviennent sur CE lien. */
  const consommatrices = fichiers.filter((f) => {
    const e = existants.get(f.cle);
    const consomme = (!e && !jumelle(f.cle)) || (restaurable(e) && duMemeLien(e, ctx?.provenanceId ?? null));
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
    /* La même photo, déjà arrivée par un AUTRE appareil de la même personne (28/10). */
    const j = jumelle(f.cle);
    if (j && ctx) {
      const origine = origineDeja(j, ctx);
      return { cle: f.cle, sorte: "deja", id: j.id, ou: origine.ou, lienId: origine.lienId };
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

/**
 * Une ligne compte dans les plafonds si elle est arrivée, ou déclarée depuis peu. `remplacee` :
 * une déclaration jamais arrivée dont la même personne a depuis la photo, arrivée par un autre
 * appareil (`remplaceesParmi`, 28/10) ; elle ne réserve plus rien. La base ne sait pas l'écrire
 * en filtre : `filtreDansPlafond` compte comme avant, et `retirerRemplacees` ôte ces lignes-là.
 */
export function compteDansPlafond(l: { confirmee_le: string | null; created_at: string }, maintenant: Date, remplacee = false): boolean {
  if (l.confirmee_le) return true;
  if (remplacee) return false;
  const t = Date.parse(l.created_at);
  return Number.isFinite(t) && maintenant.getTime() - t < DELAI_DECLARATION_MORTE_MS;
}

/* ─────────── la même photo, renvoyée par la même personne d'un AUTRE appareil (simulation Audencia du 28/10) ───────────
   La clé porte le sel de l'appareil (cleDepot.ts) : c'est voulu, deux participants qui envoient chacun un
   « IMG_1234.JPG » de même poids ne doivent pas se confondre (la seconde serait perdue en « déjà là »). Mais
   la MÊME personne qui renvoie depuis un autre navigateur passait pour une nouvelle photo : en base, Julie
   avait `2l6m414c60~IMG_4301.JPG|2028553|1793022990404` ET `1r0o524z25~IMG_4301.JPG|2028553|1793022990404`,
   même empreinte, même personne ; l'écran a dit 19 reçues au lieu de 17 et son quota a compté deux fois.
   La règle : pour une PERSONNE CONNUE (`participant_id`) ou le responsable, ce qui suit le sel
   (`nom|taille|date`) suffit à reconnaître SA photo. Jamais entre deux personnes : la requête ne lit que les
   siennes, et `memePersonne` le vérifie encore ici. */

/** Le sel d'un appareil devant le nom (`selDeLAppareil` : 6 à 12 caractères, puis `~`). */
const SEL_DEVANT = /^[a-z0-9]{6,12}~/;

/** Ce que dit une clé une fois le sel ôté : le nom d'origine, le poids, la date (0 : pas une vraie date, `dateDeCle`). */
export type PartiesCle = { nom: string; taille: number; date: number };

/** Lire une clé de fichier (`sel~nom|taille|date`, ou une clé d'avant le sel). `null` : illisible. */
export function partiesDeCle(cle: string): PartiesCle | null {
  const m = /^(.*)\|(\d{1,15})\|(\d{1,16})$/.exec(cle);
  if (!m) return null;
  const nom = m[1].replace(SEL_DEVANT, "");
  return nom ? { nom, taille: Number(m[2]), date: Number(m[3]) } : null;
}

/**
 * Deux clés désignent-elles le même fichier, sel mis à part ? Même nom, même poids, et même date,
 * sauf si l'une vaut 0 (photothèque d'iPhone : la date est celle du choix, `dateDeCle`) : alors
 * nom et poids suffisent. Ne dit RIEN de la personne : `memePersonne` à côté, toujours.
 */
export function memeFichier(a: string, b: string): boolean {
  const x = partiesDeCle(a);
  const y = partiesDeCle(b);
  if (!x || !y) return false;
  return x.nom === y.nom && x.taille === y.taille && (x.date === y.date || x.date === 0 || y.date === 0);
}

/** Qui a déposé, tel qu'on peut le reconnaître d'un appareil à l'autre. */
export type Personne = { role?: string; participantId?: string | null };

/**
 * La même personne ? Deux participants connus de même `participant_id`, ou le responsable deux fois
 * (il est seul à déposer sous ce rôle : l'équipe ne dépose pas). Un participant inconnu (sans
 * `participant_id`) n'est reconnu sur aucun autre appareil : rien ne dit que c'est lui.
 */
export function memePersonne(a: Personne, b: Personne): boolean {
  if (a.participantId && b.participantId) return a.participantId === b.participantId;
  if (a.participantId || b.participantId) return false;
  return a.role === "responsable" && b.role === "responsable";
}

/** Une photo de la personne qui déclare, lue avec sa clé (`lirePhotosDeLaPersonne`). */
export type PhotoDeLaPersonne = Existant & { cle: string };

/** La personne de la page qui déclare, ou `null` si elle ne peut pas être reconnue ailleurs. */
export function personneDuContexte(ctx: ContexteDeclaration): Personne | null {
  if (ctx.role === "responsable") return { role: "responsable", participantId: null };
  return ctx.participantId ? { role: "participant", participantId: ctx.participantId } : null;
}

/**
 * La photo de CETTE personne, déjà arrivée par un autre appareil, que désigne cette clé : arrivée,
 * hors corbeille, même fichier sel mis à part. `null` : aucune (ou une personne qu'on ne reconnaît
 * pas d'un appareil à l'autre). La même clé exacte est l'affaire de `existants` (la reprise).
 */
export function jumelleDeLaPersonne(cle: string, ctx: ContexteDeclaration | undefined, photos: readonly PhotoDeLaPersonne[]): PhotoDeLaPersonne | null {
  const qui = ctx ? personneDuContexte(ctx) : null;
  if (!qui) return null;
  return photos.find((p) => p.confirmee && !p.corbeille && p.cle !== cle && memePersonne(p, qui) && memeFichier(p.cle, cle)) ?? null;
}

/**
 * Une déclaration encore EN COURS d'envoi, pour la page Photos du responsable : 15 minutes au plus
 * sans confirmation. Pourquoi 15 : le moteur ne signe que 8 photos d'avance pour 4 voies
 * (`FILE_SIGNEE`, `VOIES`) et confirme toutes les 15 s ; une photo déclarée attend donc au plus une
 * douzaine d'envois, soit moins de 15 min jusqu'à 3 Mo par photo à 320 kb/s. Au-delà, c'est un
 * téléphone fermé ou une déclaration reprise ailleurs : plus « en cours ». Ce n'est QUE l'affichage :
 * la place, elle, reste réservée 2 h (`DELAI_DECLARATION_MORTE_MS`, la reprise y retrouve sa ligne).
 */
export const DELAI_EN_COURS_MS = 15 * 60_000;

/** Une ligne de `collectif_photos` pas encore arrivée, lue pour « en cours » et les plafonds. */
export type DeclarationEnSuspens = Personne & {
  id: string;
  cle: string;
  created_at: string;
  appareilId: string | null;
  provenanceId: string | null;
  empreinte?: string | null;
};

/** Une photo arrivée, comparée à une déclaration en suspens. */
export type PhotoArrivee = Personne & { id: string; cle: string; empreinte?: string | null };

/**
 * Les déclarations en suspens que la même personne a depuis reçues autrement : une photo arrivée,
 * hors corbeille (l'appelant ne passe qu'elles), même fichier sel mis à part, ou même empreinte
 * quand les deux en ont une. Jamais entre deux personnes. Rien n'est effacé en base : elles cessent
 * seulement de compter (plafond, « en cours »).
 */
export function remplaceesParmi(suspens: readonly DeclarationEnSuspens[], arrivees: readonly PhotoArrivee[]): Set<string> {
  const out = new Set<string>();
  for (const s of suspens) {
    if (!s.participantId && s.role !== "responsable") continue;
    const trouvee = arrivees.some(
      (a) => a.id !== s.id && memePersonne(a, s) && (memeFichier(a.cle, s.cle) || (Boolean(s.empreinte) && a.empreinte === s.empreinte))
    );
    if (trouvee) out.add(s.id);
  }
  return out;
}

/** Une déclaration en suspens est-elle encore vivante (`DELAI_EN_COURS_MS`) ? */
export function declarationVivante(l: { created_at: string }, maintenant: Date): boolean {
  const t = Date.parse(l.created_at);
  return Number.isFinite(t) && maintenant.getTime() - t < DELAI_EN_COURS_MS;
}

/**
 * « N en cours » de la page Photos : les déclarations vivantes et non remplacées, ZÉRO quand la
 * collecte est close (état effectif, `collecteOuverte`) : plus personne n'envoie, même si des
 * lignes coupées restent en base.
 */
export function enCoursAffiche(suspens: readonly { id: string; created_at: string }[], remplacees: ReadonlySet<string>, ouverte: boolean, maintenant: Date): number {
  if (!ouverte) return 0;
  return suspens.filter((s) => !remplacees.has(s.id) && declarationVivante(s, maintenant)).length;
}

/**
 * Les comptes du plafond (`compterPourPlafond`), moins les déclarations remplacées : du total, et de
 * la place de la personne quand elles sont à elle (le même filtre que le compte : sa personne si
 * elle est connue, sinon son appareil ; son lien si le plafond est celui d'un lien). `suspens` ne
 * porte que des lignes que le compte a comptées (récentes de moins de 2 h, non arrivées, hors
 * corbeille).
 */
export function retirerRemplacees(
  comptes: { total: number; parAppareil: number },
  suspens: readonly DeclarationEnSuspens[],
  remplacees: ReadonlySet<string>,
  qui: { appareil: string | null; participantId: string | null; provenanceId: string | null }
): { total: number; parAppareil: number } {
  const parties = suspens.filter((s) => remplacees.has(s.id));
  const aLui = parties.filter((s) => {
    const personne = qui.participantId ? s.participantId === qui.participantId : qui.appareil !== null && s.appareilId === qui.appareil;
    return personne && (!qui.provenanceId || s.provenanceId === qui.provenanceId);
  });
  return { total: Math.max(0, comptes.total - parties.length), parAppareil: Math.max(0, comptes.parAppareil - aLui.length) };
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
export const PHOTOS_SEULEMENT = "Photos seulement.";

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
