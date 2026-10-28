/**
 * Les PERSONNES d'une édition (planches 4, 6 et 8 du 20/10, T-198 ; décisions
 * de Mathias du 20/10). Module PUR : aucun accès base, aucun réseau, aucune
 * variable d'environnement. Importable par le navigateur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUI FAIT UNE PERSONNE
 *
 * - Son ADRESSE, normalisée (`normaliserEmail`) et unique par édition
 *   (`collectif_participants`, migration 20261023). La même adresse est la
 *   même personne sur tous ses téléphones et tous les liens de l'édition.
 * - ⚠️ L'adresse n'est PAS vérifiée (décision du 20/10) : qui tape l'adresse
 *   de quelqu'un envoie en son nom et lit son prénom et son nombre de photos.
 *   Elle reconnaît, elle ne prouve rien : elle n'ouvre donc aucun droit de
 *   SUPPRIMER (corbeille.ts : seulement les photos de ce téléphone).
 * - Prénom ET nom, donnés la première fois, que le participant ne corrige
 *   jamais lui-même : seuls le responsable et l'atelier renomment
 *   (`lireRenommage`), et toutes ses photos suivent (`deposant` réécrit).
 * - L'atelier voit l'adresse entière, le responsable une version masquée
 *   (`masquerEmail`, « l•••@audencia.com »), l'équipe aucune.
 *
 * Une personne d'AVANT (photos sans adresse) reste ce qu'elle était : un NOM
 * comparé sans la casse (`clePersonne`, dossiers.ts). Elle se renomme et se
 * fusionne aussi, par ce nom (`RefPersonne` « n: »).
 *
 * LES DOUBLONS DE NOMS se PROPOSENT (« Léa » et « Lea »), ils ne se fusionnent
 * jamais tout seuls (`proposerFusions`) : la comparaison ignore les accents et
 * la casse pour proposer, la décision reste au responsable ou à l'atelier.
 * Une fusion se DÉFAIT par l'atelier : le journal garde ce qu'il faut pour la
 * rejouer à l'envers (`lireFusionJournal`).
 * ══════════════════════════════════════════════════════════════════════════
 */

import { clePersonne, estParticipant, nomDePersonne, SANS_NOM } from "./dossiers";
import { NOM_MAX, nettoyerMorceau } from "./participant";
import { compareInstants } from "./resumePhotos";

/* ─────────────────────────────── l'adresse ─────────────────────────────── */

export const EMAIL_MAX = 254;

/**
 * Une adresse écrite comme la base la garde : sans blanc autour, en
 * minuscules, en ASCII imprimable (la base compare à `lower()` : une lettre
 * hors ASCII pourrait s'y mettre en minuscule autrement qu'ici). `null` si
 * elle n'a pas la forme d'une adresse.
 */
export function normaliserEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.normalize("NFC").trim().toLowerCase();
  if (!e || e.length > EMAIL_MAX) return null;
  if (!/^[\x21-\x7e]+$/.test(e)) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

/** « l•••@audencia.com » : ce que voit le responsable (planche 4). L'atelier voit l'adresse entière. */
export function masquerEmail(email: string): string {
  const i = email.lastIndexOf("@");
  if (i < 1) return "•••";
  return `${email.slice(0, 1)}•••${email.slice(i)}`;
}

/** Qui voit quoi de l'adresse. */
export type VueEmail = "entier" | "masque" | "aucun";

export function emailPour(email: string | null, vue: VueEmail): string | null {
  if (!email || vue === "aucun") return null;
  return vue === "entier" ? email : masquerEmail(email);
}

/* ─────────────────────────────── le nom ─────────────────────────────── */

/** Le nom comparé pour PROPOSER une fusion : sans les accents, sans la casse, espaces resserrés. */
export function cleSansAccents(nom: string | null | undefined): string {
  return nomDePersonne(nom)
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("fr");
}

/** « Prénom Nom », tel que la photo le porte (`deposant`). */
export function nomAffiche(p: { prenom: string; nom: string }): string {
  return `${nettoyerMorceau(p.prenom)} ${nettoyerMorceau(p.nom)}`.trim().slice(0, NOM_MAX);
}

/**
 * Ce qu'un participant LIT d'une personne retrouvée par son adresse (audit du
 * 20/10, S1) : son PRÉNOM, jamais son nom de famille. L'adresse n'est pas
 * vérifiée : qui tape celle de quelqu'un lit son prénom et son nombre de
 * photos (décision acceptée), rien de plus. Vaut pour « connu » et « qui »
 * (`depot/participant`) et pour `moi.participant` (`depot/album`) : un
 * téléphone parle pour la personne dont on a TAPÉ l'adresse. Seule la création
 * (`cree`) redit ce qui vient d'être tapé. `nom: null` et `nomAffiche` = le
 * prénom : la forme de la réponse ne change pas, le nom de famille n'y est plus.
 */
export function vuePersonneConnue(p: { prenom: string }): { prenom: string; nom: null; nomAffiche: string } {
  const prenom = nettoyerMorceau(p.prenom).slice(0, NOM_MAX);
  return { prenom, nom: null, nomAffiche: prenom };
}

/** Le prénom seul, pour l'album (« Léa ») : décision du 20/10, jamais le nom complet des autres. */
export function prenomPourAlbum(p: { prenom?: string | null; deposant?: string | null }): string {
  const prenom = p.prenom ? nettoyerMorceau(p.prenom) : "";
  if (prenom) return prenom;
  const nom = nomDePersonne(p.deposant);
  return nom === SANS_NOM ? SANS_NOM : (nom.split(" ")[0] ?? SANS_NOM);
}

export type Identite = { prenom: string; nom: string };

export type LectureIdentite =
  | { ok: true; email: string; identite: Identite | null }
  | { ok: false; erreur: "email_invalide" | "nom_incomplet"; message: string };

/**
 * Ce qu'un participant envoie pour se présenter : l'adresse, et la première
 * fois prénom ET nom. Sans prénom ni nom, c'est une simple question (« cette
 * adresse est-elle connue ? ») ; avec un seul des deux, un refus.
 */
export function lireIdentite(corps: Record<string, unknown>, tu: boolean): LectureIdentite {
  const email = normaliserEmail(corps.email);
  if (!email) return { ok: false, erreur: "email_invalide", message: tu ? "Vérifie ton adresse : elle ne semble pas complète." : "Vérifiez votre adresse : elle ne semble pas complète." };
  const prenom = typeof corps.prenom === "string" ? nettoyerMorceau(corps.prenom).slice(0, NOM_MAX) : "";
  const nom = typeof corps.nom === "string" ? nettoyerMorceau(corps.nom).slice(0, NOM_MAX) : "";
  if (!prenom && !nom) return { ok: true, email, identite: null };
  if (!prenom || !nom) return { ok: false, erreur: "nom_incomplet", message: tu ? "Écris ton prénom et ton nom." : "Écrivez votre prénom et votre nom." };
  return { ok: true, email, identite: { prenom, nom } };
}

/** Le renommage par le responsable ou l'atelier : prénom ET nom, 80 caractères chacun. */
export function lireRenommage(corps: Record<string, unknown>): { ok: true; identite: Identite } | { ok: false; message: string } {
  const prenom = typeof corps.prenom === "string" ? nettoyerMorceau(corps.prenom) : "";
  const nom = typeof corps.nom === "string" ? nettoyerMorceau(corps.nom) : "";
  if (!prenom || !nom) return { ok: false, message: "Écrire le prénom et le nom." };
  if (prenom.length > NOM_MAX || nom.length > NOM_MAX) return { ok: false, message: `${NOM_MAX} caractères au plus pour le prénom comme pour le nom.` };
  return { ok: true, identite: { prenom, nom } };
}

/* ─────────────────────────── désigner une personne ─────────────────────────── */

/**
 * Une personne désignée par l'écran : `p:<uuid>` (elle s'est présentée par son
 * adresse) ou `n:<nom comparé>` (une personne d'avant, connue par son seul
 * nom, `clePersonne`). Jamais un libellé affiché : un nom affiché se
 * réécrit, la référence ne bouge pas.
 */
export type RefPersonne = { genre: "participant"; id: string } | { genre: "nom"; cle: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lireRefPersonne(v: unknown): RefPersonne | null {
  if (typeof v !== "string" || v.length > 210) return null;
  if (v.startsWith("p:")) {
    const id = v.slice(2);
    return UUID.test(id) ? { genre: "participant", id: id.toLowerCase() } : null;
  }
  if (v.startsWith("n:")) {
    const cle = clePersonne(v.slice(2));
    return cle && cle !== clePersonne(null) ? { genre: "nom", cle } : null;
  }
  return null;
}

export function ecrireRefPersonne(r: RefPersonne): string {
  return r.genre === "participant" ? `p:${r.id}` : `n:${r.cle}`;
}

export const memeRef = (a: RefPersonne, b: RefPersonne) => ecrireRefPersonne(a) === ecrireRefPersonne(b);

/* ─────────────────────────── suivre une fusion ─────────────────────────── */

export type LigneParticipant = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  premier_lien_id: string | null;
  created_at: string;
  vu_le: string;
  renomme_le: string | null;
  fusionne_dans: string | null;
  fusionne_le: string | null;
};

export const COLONNES_PARTICIPANT = "id, email, prenom, nom, premier_lien_id, created_at, vu_le, renomme_le, fusionne_dans, fusionne_le";

/** Une chaîne de fusions plus longue est une donnée abîmée : on s'arrête. */
export const FUSIONS_MAX = 10;

/**
 * La personne qui reste au bout des fusions (« Lea » fusionnée dans « Léa
 * Martin » : taper l'adresse de Lea retrouve Léa Martin). `null` pour une
 * boucle ou une chaîne trop longue : on ne devine pas.
 */
export function auBoutDesFusions(depart: LigneParticipant, parId: ReadonlyMap<string, LigneParticipant>): LigneParticipant | null {
  let p: LigneParticipant | undefined = depart;
  const vus = new Set<string>();
  for (let i = 0; i <= FUSIONS_MAX && p; i++) {
    if (!p.fusionne_dans) return p;
    if (vus.has(p.id)) return null;
    vus.add(p.id);
    p = parId.get(p.fusionne_dans);
  }
  return null;
}

/* ─────────────────────────── la liste des personnes ─────────────────────────── */

/** Une ligne du résumé (vue `collectif_photos_resume`) telle que la liste la lit. */
export type LigneResumePersonne = {
  role_deposant: string;
  provenance_id: string | null;
  deposant: string | null;
  appareil_id: string | null;
  participant_id?: string | null;
  n: number;
  derniere: string;
};

export type LienDePersonne = { cle: string; n: number };

export type Personne = {
  /** `p:<uuid>` ou `n:<nom comparé>` : ce que l'écran renvoie pour renommer ou fusionner. */
  ref: string;
  participant: boolean;
  /** Le nom affiché (« Léa Martin »), celui que portent ses photos. */
  nom: string;
  prenom: string | null;
  nomDeFamille: string | null;
  /** La clé du filtre « une personne » de la grille (`qui:<clé>`, dossiers.ts). */
  cle: string;
  /** L'adresse : entière pour l'atelier, masquée pour le responsable, absente pour l'équipe et pour une personne d'avant. */
  email: string | null;
  /** Ses photos visibles (hors corbeille). */
  n: number;
  /** Par lien : `lien:<id>` ou `participants` (la clé de `cleDuLien`, grille.ts). */
  liens: LienDePersonne[];
  /** Les téléphones qui se sont présentés pour elle (une personne d'avant : ceux de ses photos). */
  telephones: number;
  /** Sa dernière arrivée, telle que la base l'a rendue. */
  derniere: string | null;
  /** Quand elle s'est présentée la première fois (une personne d'avant : `null`). */
  depuis: string | null;
  /**
   * Le dernier AUTRE nom tapé avec son adresse (audit du 20/10, S5/C4) : quelqu'un
   * s'est présenté sous son adresse avec un prénom ou un nom différent (une faute
   * de frappe, ou quelqu'un qui squatte l'adresse). Le responsable et l'atelier le
   * voient pour pouvoir corriger ; jamais l'équipe. `null` : rien, ou déjà réglé
   * par un renommage plus récent.
   */
  nomPropose: NomPropose | null;
};

/** Un nom tapé avec une adresse connue, différent du sien, et quand (`participant_nom_different`). */
export type NomPropose = { nom: string; le: string };

const cleLien = (provenanceId: string | null) => (provenanceId ? `lien:${provenanceId}` : "participants");

/**
 * Les personnes d'une édition : celles qui se sont présentées (la table), puis
 * les personnes d'avant (des photos de participant sans personne, un nom
 * comparé chacune). Une personne fusionnée n'apparaît plus : ses photos sont
 * chez celle qui reste. Les photos du responsable et de l'atelier ne font pas
 * de personne. La plus fournie d'abord, puis par nom. `proposes` : les autres
 * noms tapés avec une adresse connue (`nomsProposes`), montrés seulement à qui
 * voit l'adresse (le responsable, l'atelier : jamais l'équipe).
 */
export function listerPersonnes(
  participants: readonly LigneParticipant[],
  resume: readonly LigneResumePersonne[],
  telephones: ReadonlyMap<string, number>,
  vue: VueEmail,
  proposes: ReadonlyMap<string, NomPropose> = new Map()
): Personne[] {
  const parId = new Map<string, Personne>();
  for (const p of participants) {
    if (p.fusionne_dans) continue;
    const nom = nomAffiche(p);
    parId.set(p.id, {
      nomPropose: vue === "aucun" ? null : proposes.get(p.id) ?? null,
      ref: `p:${p.id}`,
      participant: true,
      nom,
      prenom: p.prenom,
      nomDeFamille: p.nom,
      cle: clePersonne(nom),
      email: emailPour(p.email, vue),
      n: 0,
      liens: [],
      telephones: telephones.get(p.id) ?? 0,
      derniere: null,
      depuis: p.created_at,
    });
  }
  const anciennes = new Map<string, Personne & { graphies: Map<string, number>; appareils: Set<string> }>();
  const ajouterLien = (x: Personne, provenanceId: string | null, n: number) => {
    const cle = cleLien(provenanceId);
    const l = x.liens.find((y) => y.cle === cle);
    if (l) l.n += n;
    else x.liens.push({ cle, n });
  };
  const plusTard = (a: string | null, b: string) => (a === null || b > a ? b : a);
  for (const g of resume) {
    if (!estParticipant(g)) continue;
    const pid = g.participant_id ?? null;
    const connue = pid ? parId.get(pid) : undefined;
    if (connue) {
      connue.n += g.n;
      connue.derniere = plusTard(connue.derniere, g.derniere);
      ajouterLien(connue, g.provenance_id, g.n);
      continue;
    }
    /* Une photo dont la personne a disparu de la table (fusionnée sans que la photo suive,
       ce qui ne doit pas arriver) se range par son nom, comme une photo d'avant. */
    const nom = nomDePersonne(g.deposant);
    const cle = clePersonne(nom);
    let a = anciennes.get(cle);
    if (!a) {
      a = { ref: `n:${cle}`, participant: false, nom, prenom: null, nomDeFamille: null, cle, email: null, n: 0, liens: [], telephones: 0, derniere: null, depuis: null, nomPropose: null, graphies: new Map(), appareils: new Set() };
      anciennes.set(cle, a);
    }
    a.n += g.n;
    a.derniere = plusTard(a.derniere, g.derniere);
    a.graphies.set(nom, (a.graphies.get(nom) ?? 0) + g.n);
    if (g.appareil_id) a.appareils.add(g.appareil_id);
    ajouterLien(a, g.provenance_id, g.n);
  }
  const vieilles: Personne[] = [...anciennes.values()].map(({ graphies, appareils, ...x }) => ({
    ...x,
    nom: [...graphies].sort((m, o) => o[1] - m[1])[0]?.[0] ?? x.nom,
    telephones: appareils.size,
  }));
  return [...parId.values(), ...vieilles]
    .map((x) => ({ ...x, liens: [...x.liens].sort((m, o) => o.n - m.n || (m.cle < o.cle ? -1 : 1)) }))
    .sort((m, o) => o.n - m.n || m.nom.localeCompare(o.nom, "fr"));
}

/* ─────────────────────────── proposer des fusions ─────────────────────────── */

export type RaisonFusion = "meme_nom" | "meme_prenom";

export type FusionProposee = { a: string; b: string; raison: RaisonFusion };

/** Au-delà, la liste des propositions ne sert plus à rien : on s'arrête (une édition de 80 personnes en propose quelques-unes). */
export const PROPOSITIONS_MAX = 200;

/**
 * Les paires qui SONT PEUT-ÊTRE la même personne (planche 4A), jamais
 * fusionnées d'office :
 * - `meme_nom` : le même nom, sans les accents ni la casse (« Léa Martin » et
 *   « Lea Martin ») ;
 * - `meme_prenom` : l'une ne porte qu'un prénom, l'autre commence par ce
 *   prénom, et elles ont au moins un lien en commun (« Léa » et « Léa
 *   Martin » sur le bateau 1).
 * « Sans nom » ne se propose jamais. `a` est la plus fournie.
 */
export function proposerFusions(personnes: readonly Personne[]): FusionProposee[] {
  const out: FusionProposee[] = [];
  const vues = new Set<string>();
  const garder = (x: Personne, y: Personne, raison: RaisonFusion) => {
    const [a, b] = x.n >= y.n ? [x, y] : [y, x];
    const cle = [a.ref, b.ref].sort().join("|");
    if (vues.has(cle) || out.length >= PROPOSITIONS_MAX) return;
    vues.add(cle);
    out.push({ a: a.ref, b: b.ref, raison });
  };
  const nommees = personnes.filter((p) => nomDePersonne(p.nom) !== SANS_NOM);
  const parCle = new Map<string, Personne[]>();
  for (const p of nommees) {
    const k = cleSansAccents(p.nom);
    parCle.set(k, [...(parCle.get(k) ?? []), p]);
  }
  for (const groupe of parCle.values()) {
    for (let i = 0; i < groupe.length; i++) for (let j = i + 1; j < groupe.length; j++) garder(groupe[i], groupe[j], "meme_nom");
  }
  const seuls = nommees.filter((p) => !cleSansAccents(p.nom).includes(" "));
  for (const s of seuls) {
    const prenom = cleSansAccents(s.nom);
    const liensS = new Set(s.liens.map((l) => l.cle));
    for (const p of nommees) {
      if (p === s) continue;
      const k = cleSansAccents(p.nom);
      if (!k.startsWith(`${prenom} `)) continue;
      if (p.liens.some((l) => liensS.has(l.cle))) garder(s, p, "meme_prenom");
    }
  }
  return out;
}

/* ─────────────────────────── fusionner, et défaire ─────────────────────────── */

/**
 * Qui reste et qui part. La personne qui RESTE est la cible, sauf si seule la
 * source a une adresse : on garde alors celle qui a une adresse (elle seule se
 * retrouve sur un autre téléphone), et le nom choisi suit. `garder` dit quel
 * NOM reste (planche 4B, « Le nom gardé »).
 */
export type PlanFusion =
  | { ok: true; reste: RefPersonne; part: RefPersonne; nomDe: "reste" | "part" }
  | { ok: false; message: string };

export function planFusion(source: RefPersonne | null, cible: RefPersonne | null, garder: unknown): PlanFusion {
  if (!source || !cible) return { ok: false, message: "Choisir les deux personnes à fusionner." };
  if (memeRef(source, cible)) return { ok: false, message: "Une personne ne se fusionne pas avec elle-même." };
  const nomDeLaSource = garder === "source";
  if (source.genre === "participant" && cible.genre === "nom") {
    return { ok: true, reste: source, part: cible, nomDe: nomDeLaSource ? "reste" : "part" };
  }
  return { ok: true, reste: cible, part: source, nomDe: nomDeLaSource ? "part" : "reste" };
}

/**
 * Un nom d'avant (une seule chaîne, « Léa Martin ») en prénom et nom, quand la
 * personne qui reste a une adresse et qu'on garde ce nom-là : le premier mot,
 * puis le reste. `null` pour un seul mot (« Léa ») : la table exige un nom, et
 * on n'en invente pas.
 */
export function decouperNom(nom: string): Identite | null {
  const n = nomDePersonne(nom);
  if (n === SANS_NOM) return null;
  const i = n.indexOf(" ");
  if (i < 1) return null;
  return { prenom: n.slice(0, i), nom: n.slice(i + 1) };
}

/** Une photo déplacée par une fusion, et ce qu'elle était avant (la défaire la remet ainsi). */
export type AvantFusion = { deposant: string | null; participant_id: string | null; ids: string[] };

/** Ce que le journal garde d'une fusion (`personnes_fusionnees`), pour la défaire. */
export type FusionJournal = {
  reste: string;
  part: string;
  /** Le nom de la personne qui reste, avant la fusion (le choix « garder le nom de l'autre » le change). */
  resteAvant: Identite | null;
  /** Le nom écrit sur ses photos après la fusion. */
  nomApres: string;
  /** Les photos déplacées, regroupées par ce qu'elles portaient avant. */
  photos: AvantFusion[];
  n: number;
};

export function lireFusionJournal(payload: unknown): FusionJournal | null {
  const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const reste = lireRefPersonne(p.reste);
  const part = lireRefPersonne(p.part);
  if (!reste || !part || typeof p.nomApres !== "string" || !Array.isArray(p.photos)) return null;
  const photos: AvantFusion[] = [];
  for (const brut of p.photos) {
    const g = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
    if (!Array.isArray(g.ids) || !g.ids.every((x) => typeof x === "string" && UUID.test(x))) return null;
    const pid = g.participant_id;
    if (pid !== null && !(typeof pid === "string" && UUID.test(pid))) return null;
    if (g.deposant !== null && typeof g.deposant !== "string") return null;
    photos.push({ deposant: g.deposant as string | null, participant_id: pid as string | null, ids: g.ids as string[] });
  }
  const ra = p.resteAvant as Record<string, unknown> | null | undefined;
  const resteAvant = ra && typeof ra.prenom === "string" && typeof ra.nom === "string" ? { prenom: ra.prenom, nom: ra.nom } : null;
  return { reste: ecrireRefPersonne(reste), part: ecrireRefPersonne(part), resteAvant, nomApres: p.nomApres, photos, n: photos.reduce((s, g) => s + g.ids.length, 0) };
}

/** Regrouper les photos déplacées par ce qu'elles portaient avant (le journal reste court). */
export function grouperAvantFusion(photos: readonly { id: string; deposant: string | null; participant_id: string | null }[]): AvantFusion[] {
  const m = new Map<string, AvantFusion>();
  for (const ph of photos) {
    const cle = JSON.stringify([ph.deposant, ph.participant_id]);
    const g = m.get(cle) ?? { deposant: ph.deposant, participant_id: ph.participant_id, ids: [] };
    g.ids.push(ph.id);
    m.set(cle, g);
  }
  return [...m.values()];
}

/** Les types du journal (recit.ts les dit en français). */
export const EVT_PRESENTE = "participant_presente";
export const EVT_RENOMME = "personne_renommee";
export const EVT_FUSION = "personnes_fusionnees";
export const EVT_FUSION_DEFAITE = "fusion_defaite";
/** Une fusion écrite en partie (une écriture a échoué APRÈS son journal) : défaire la remet d'aplomb. */
export const EVT_FUSION_INTERROMPUE = "fusion_interrompue";
/** Une adresse CONNUE présentée de nouveau (n'importe quel téléphone) : adresse masquée, ni token ni téléphone. */
export const EVT_RETROUVE = "participant_retrouve";
/** …avec un prénom ou un nom DIFFÉRENT du sien : les deux noms, l'adresse masquée (S5). */
export const EVT_NOM_DIFFERENT = "participant_nom_different";

/* ─────────────────────── un autre nom tapé avec une adresse connue ─────────────────────── */

/**
 * Le nom tapé diffère-t-il de celui de la personne ? Comparé comme la grille
 * compare deux noms (`clePersonne` : sans la casse ni les espaces) ; une simple
 * majuscule n'est pas un autre nom.
 */
export function nomDifferent(tape: Identite, personne: { prenom: string; nom: string }): boolean {
  return clePersonne(nomAffiche(tape)) !== clePersonne(nomAffiche(personne));
}

/** Une ligne du journal telle que `nomsProposes` la lit. */
export type EvenementNom = { type: string; payload: Record<string, unknown> | null; created_at: string };

/**
 * Le DERNIER autre nom tapé pour chaque personne (`participant_nom_different`,
 * payload `{ personne: "p:<uuid>", propose }`), tant qu'il vaut d'être montré :
 * - plus récent que son dernier renommage (après, le responsable a tranché) ;
 * - encore différent de son nom d'aujourd'hui.
 * Une personne fusionnée ailleurs n'a plus de ligne dans la liste : rien.
 */
export function nomsProposes(evenements: readonly EvenementNom[], participants: readonly LigneParticipant[]): Map<string, NomPropose> {
  const parId = new Map(participants.map((p) => [p.id, p]));
  const out = new Map<string, NomPropose>();
  for (const e of evenements) {
    if (e.type !== EVT_NOM_DIFFERENT) continue;
    const ref = lireRefPersonne(e.payload?.personne);
    const propose = typeof e.payload?.propose === "string" ? nettoyerMorceau(e.payload.propose).slice(0, NOM_MAX) : "";
    if (!ref || ref.genre !== "participant" || !propose) continue;
    const p = parId.get(ref.id);
    if (!p || p.fusionne_dans) continue;
    if (p.renomme_le && compareInstants(e.created_at, p.renomme_le) <= 0) continue;
    if (clePersonne(propose) === clePersonne(nomAffiche(p))) continue;
    const deja = out.get(p.id);
    if (!deja || compareInstants(e.created_at, deja.le) > 0) out.set(p.id, { nom: propose, le: e.created_at });
  }
  return out;
}
