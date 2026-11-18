/**
 * Google Agenda, pour les rendez-vous de l'Édition collective (D23, T-148).
 * Module À EFFETS (réseau, `process.env`) : serveur uniquement.
 *
 * La connexion passe par un COMPTE DE SERVICE Google (`GOOGLE_AGENDA_COMPTE`,
 * le fichier JSON de sa clé, brut ou en base64) avec lequel Mathias et Louis
 * PARTAGENT leur agenda. Aucun mot de passe, aucun jeton qui expire : le
 * partage se retire dans Google Agenda, et c'est fini.
 *
 * ⚠️ VIE PRIVÉE : pour afficher des créneaux, on n'appelle QUE « free/busy »,
 * qui ne rend que des plages occupées (ni titre, ni lieu, ni invité). Aucune
 * fonction de ce module ne LIT un événement ; il n'écrit que ceux qu'il pose
 * lui-même (les rendez-vous pris dans l'espace) et ne retire que ceux-là.
 *
 * Un compte de service ne peut pas inviter le client hors Google Workspace :
 * l'événement est posé dans l'agenda de l'interlocuteur, et le client reçoit
 * notre mail avec l'invitation .ics (rendezvous.ts).
 *
 * DEPUIS LE 18/11/2026, LA CONNEXION DE CHACUN (choix de Mathias) : Mathias et
 * Louis cliquent une fois « Connecter Google » dans l'atelier (OAuth,
 * `GOOGLE_AGENDA_CLIENT_ID` + `GOOGLE_AGENDA_CLIENT_SECRET`). On garde leur
 * jeton de renouvellement CHIFFRÉ en base ; l'événement est alors posé EN
 * LEUR NOM, avec une visio Meet neuve, et Google invite lui-même le client.
 * Chaque fonction prend en dernier `connexion` (ce jeton, en clair, jamais
 * rendu à un navigateur) ; `null` = le compte de service, comme avant.
 * Les portées restent les mêmes : poser ses événements, lire libre / occupé.
 */

import { createCipheriv, createDecipheriv, createHash, createSign, randomBytes } from "node:crypto";
import type { Plage } from "./creneaux";

export const VAR_COMPTE_AGENDA = "GOOGLE_AGENDA_COMPTE";

const PORTEES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.freebusy"].join(" ");
const JETON_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";
const DELAI_MS = 10000;

export type CompteAgenda = { client_email: string; private_key: string };

export type Raison = "non_configure" | "acces_refuse" | "introuvable" | "reseau" | "google";
export type Resultat<T> = { ok: true; valeur: T } | { ok: false; raison: Raison; message: string };

/**
 * Le compte de service, lu dans la variable : le JSON tel que Google le
 * télécharge, ou le même en base64 (plus facile à coller sur une seule ligne).
 * `null` si absent ou illisible : la prise de rendez-vous reste éteinte.
 */
export function lireCompteAgenda(brut: string | undefined | null): CompteAgenda | null {
  const t = (brut ?? "").trim();
  if (!t) return null;
  const essais = [t];
  if (!t.startsWith("{")) {
    try {
      essais.push(Buffer.from(t, "base64").toString("utf8").trim());
    } catch {
      /* pas du base64 */
    }
  }
  for (const e of essais) {
    try {
      const j = JSON.parse(e) as Partial<CompteAgenda>;
      if (typeof j.client_email === "string" && typeof j.private_key === "string" && j.private_key.includes("PRIVATE KEY")) {
        return { client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, "\n") };
      }
    } catch {
      /* essai suivant */
    }
  }
  return null;
}

export function compteAgenda(): CompteAgenda | null {
  return lireCompteAgenda(process.env[VAR_COMPTE_AGENDA]);
}

/** L'adresse avec laquelle partager son agenda (la page « Agendas » de l'atelier l'affiche). */
export function adresseDuCompte(): string | null {
  return compteAgenda()?.client_email ?? null;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/* Un jeton d'accès vaut une heure ; on le garde 55 minutes par instance. */
let jeton: { valeur: string; expire: number; email: string } | null = null;

async function jetonAcces(compte: CompteAgenda): Promise<Resultat<string>> {
  const maintenant = Math.floor(Date.now() / 1000);
  if (jeton && jeton.email === compte.client_email && jeton.expire > maintenant + 60) return { ok: true, valeur: jeton.valeur };
  const entete = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corps = b64url(JSON.stringify({ iss: compte.client_email, scope: PORTEES, aud: JETON_URL, iat: maintenant, exp: maintenant + 3600 }));
  let signature: string;
  try {
    signature = createSign("RSA-SHA256").update(`${entete}.${corps}`).sign(compte.private_key, "base64url");
  } catch {
    return { ok: false, raison: "non_configure", message: "La clé du compte Google est illisible." };
  }
  try {
    const rep = await fetch(JETON_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${entete}.${corps}.${signature}` }),
      signal: AbortSignal.timeout(DELAI_MS),
    });
    const json = (await rep.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
    if (!rep.ok || !json.access_token) {
      console.error("[collectif] jeton Google refusé", rep.status, json.error_description ?? "");
      return { ok: false, raison: "non_configure", message: "Google refuse la clé du compte de service." };
    }
    jeton = { valeur: json.access_token, expire: maintenant + Math.min(json.expires_in ?? 3600, 3300), email: compte.client_email };
    return { ok: true, valeur: json.access_token };
  } catch {
    return { ok: false, raison: "reseau", message: "Google n'a pas répondu." };
  }
}

/* ─────────────────────── la connexion Google de chacun (18/11) ─────────────────────── */

export const VAR_OAUTH_ID = "GOOGLE_AGENDA_CLIENT_ID";
export const VAR_OAUTH_SECRET = "GOOGLE_AGENDA_CLIENT_SECRET";
const CONSENTEMENT_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const PORTEES_OAUTH = ["openid", "email", ...PORTEES.split(" ")].join(" ");

export type ClientOAuth = { id: string; secret: string };

/** Le client OAuth de l'atelier, ou `null` : « Connecter Google » reste éteint. */
export function clientOAuth(): ClientOAuth | null {
  const id = (process.env[VAR_OAUTH_ID] ?? "").trim();
  const secret = (process.env[VAR_OAUTH_SECRET] ?? "").trim();
  return id && secret ? { id, secret } : null;
}

/** L'adresse où Google ramène après l'accord : à déclarer telle quelle dans la console Google. */
export function cheminRetourOAuth(): string {
  return "/api/admin/collectif/agendas/google/retour";
}

/** La page d'accord de Google. `prompt=consent` : un jeton de renouvellement à CHAQUE connexion. */
export function urlConsentement(client: ClientOAuth, retour: string, etat: string): string {
  const q = new URLSearchParams({
    client_id: client.id,
    redirect_uri: retour,
    response_type: "code",
    scope: PORTEES_OAUTH,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state: etat,
  });
  return `${CONSENTEMENT_URL}?${q.toString()}`;
}

/** L'adresse du compte, lue dans le jeton d'identité que Google joint (aucun appel de plus). */
export function emailDuJetonIdentite(idToken: string | undefined): string | null {
  const milieu = (idToken ?? "").split(".")[1];
  if (!milieu) return null;
  try {
    const j = JSON.parse(Buffer.from(milieu, "base64url").toString("utf8")) as { email?: unknown };
    return typeof j.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(j.email) ? j.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Le code rendu par Google → le jeton de renouvellement et l'adresse du compte. */
export async function echangerCode(client: ClientOAuth, code: string, retour: string): Promise<Resultat<{ refresh: string; email: string }>> {
  try {
    const rep = await fetch(JETON_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: client.id, client_secret: client.secret, redirect_uri: retour }),
      signal: AbortSignal.timeout(DELAI_MS),
    });
    const json = (await rep.json().catch(() => ({}))) as { refresh_token?: string; id_token?: string; scope?: string; error?: string };
    if (!rep.ok || !json.refresh_token) {
      console.error("[collectif] échange OAuth refusé", rep.status, json.error ?? "");
      return { ok: false, raison: "google", message: "Google n'a pas donné l'accès. Recommencer la connexion." };
    }
    const accordees = (json.scope ?? "").split(" ");
    if (!PORTEES.split(" ").every((p) => accordees.includes(p))) {
      return { ok: false, raison: "acces_refuse", message: "Il faut cocher les deux accès à l'agenda sur la page de Google. Recommencer la connexion." };
    }
    const email = emailDuJetonIdentite(json.id_token);
    if (!email) return { ok: false, raison: "google", message: "Google n'a pas dit quel compte s'est connecté." };
    return { ok: true, valeur: { refresh: json.refresh_token, email } };
  } catch {
    return { ok: false, raison: "reseau", message: "Google n'a pas répondu." };
  }
}

/**
 * Le jeton de renouvellement ne dort jamais en clair en base : AES-256-GCM,
 * clé tirée du secret du client OAuth (changer ce secret oblige à se
 * reconnecter, ce qui est voulu). Illisible ou secret absent : `null`.
 */
function cleDeChiffrement(): Buffer | null {
  const c = clientOAuth();
  return c ? createHash("sha256").update(`bellajour-agenda:${c.secret}`).digest() : null;
}

export function chiffrerJeton(clair: string): string | null {
  const cle = cleDeChiffrement();
  if (!cle) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cle, iv);
  const corps = Buffer.concat([c.update(clair, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${corps.toString("base64url")}`;
}

export function dechiffrerJeton(chiffre: string | null | undefined): string | null {
  const cle = cleDeChiffrement();
  const parts = (chiffre ?? "").split(".");
  if (!cle || parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const d = createDecipheriv("aes-256-gcm", cle, Buffer.from(parts[1], "base64url"));
    d.setAuthTag(Buffer.from(parts[2], "base64url"));
    return Buffer.concat([d.update(Buffer.from(parts[3], "base64url")), d.final()]).toString("utf8") || null;
  } catch {
    return null;
  }
}

/* Un jeton d'accès par connexion, gardé 55 minutes par instance. */
const jetonsOAuth = new Map<string, { valeur: string; expire: number }>();

async function jetonOAuth(refresh: string): Promise<Resultat<string>> {
  const client = clientOAuth();
  if (!client) return { ok: false, raison: "non_configure", message: "La connexion Google de l'atelier n'est pas encore posée." };
  const maintenant = Math.floor(Date.now() / 1000);
  const garde = jetonsOAuth.get(refresh);
  if (garde && garde.expire > maintenant + 60) return { ok: true, valeur: garde.valeur };
  try {
    const rep = await fetch(JETON_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh, client_id: client.id, client_secret: client.secret }),
      signal: AbortSignal.timeout(DELAI_MS),
    });
    const json = (await rep.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
    if (!rep.ok || !json.access_token) {
      console.error("[collectif] jeton OAuth refusé", rep.status, json.error ?? "");
      /* `invalid_grant` : l'accès a été retiré chez Google, ou le jeton a expiré. */
      return { ok: false, raison: "acces_refuse", message: "La connexion Google a expiré ou a été retirée : la refaire dans « Les agendas »." };
    }
    jetonsOAuth.set(refresh, { valeur: json.access_token, expire: maintenant + Math.min(json.expires_in ?? 3600, 3300) });
    return { ok: true, valeur: json.access_token };
  } catch {
    return { ok: false, raison: "reseau", message: "Google n'a pas répondu." };
  }
}


async function appeler<T>(chemin: string, init: { method: string; body?: unknown }, connexion: string | null = null): Promise<Resultat<{ statut: number; json: T | null }>> {
  let j: Resultat<string>;
  if (connexion) {
    j = await jetonOAuth(connexion);
  } else {
    const compte = compteAgenda();
    if (!compte) return { ok: false, raison: "non_configure", message: "La prise de rendez-vous n'est pas encore branchée à l'agenda." };
    j = await jetonAcces(compte);
  }
  if (!j.ok) return j;
  try {
    const rep = await fetch(`${API}${chemin}`, {
      method: init.method,
      headers: { authorization: `Bearer ${j.valeur}`, ...(init.body ? { "content-type": "application/json" } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(DELAI_MS),
    });
    const json = rep.status === 204 ? null : ((await rep.json().catch(() => null)) as T | null);
    return { ok: true, valeur: { statut: rep.status, json } };
  } catch {
    return { ok: false, raison: "reseau", message: "Google Agenda n'a pas répondu." };
  }
}

const enc = (id: string) => encodeURIComponent(id);

/**
 * Les plages OCCUPÉES d'un agenda entre deux instants : rien d'autre ne sort
 * de Google (« free/busy »). Un agenda non partagé avec le compte de service
 * répond une erreur que l'on dit en clair.
 */
export async function plagesOccupees(agendaId: string, debut: string, fin: string, connexion: string | null = null): Promise<Resultat<Plage[]>> {
  type Rep = { calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: { reason: string }[] }> };
  const r = await appeler<Rep>("/freeBusy", { method: "POST", body: { timeMin: debut, timeMax: fin, items: [{ id: agendaId }] } }, connexion);
  if (!r.ok) return r;
  if (r.valeur.statut !== 200 || !r.valeur.json?.calendars) {
    console.error("[collectif] free/busy refusé", r.valeur.statut);
    return { ok: false, raison: "google", message: "Google Agenda a refusé la demande de disponibilités." };
  }
  const agenda = r.valeur.json.calendars[agendaId];
  if (!agenda || agenda.errors?.length) {
    return {
      ok: false,
      raison: "acces_refuse",
      message: connexion ? "Google refuse de lire cet agenda : refaire la connexion dans « Les agendas »." : "Cet agenda n'est pas partagé avec le compte de l'atelier (ou son adresse est fausse).",
    };
  }
  return { ok: true, valeur: (agenda.busy ?? []).map((b) => ({ debut: new Date(b.start).toISOString(), fin: new Date(b.end).toISOString() })) };
}

/**
 * `invites` et `visio` ne valent qu'avec la connexion de chacun (un compte de
 * service ne peut ni inviter ni créer de Meet hors Workspace) : Google envoie
 * alors LUI-MÊME l'invitation, ses mises à jour et son annulation.
 * `visioCle` : une clé stable par rendez-vous (son id), pour qu'un second
 * envoi ne crée pas une seconde visio.
 */
export type Invite = { email: string; nom?: string | null };
export type EvenementAPoser = { debut: string; fin: string; titre: string; description: string; lieu: string | null; invites?: Invite[]; visio?: boolean; visioCle?: string };
export type EvenementPose = { id: string; visio: string | null };

function corpsEvenement(e: EvenementAPoser, connexion: string | null, creation: boolean) {
  const riche = Boolean(connexion);
  return {
    summary: e.titre,
    description: e.description,
    ...(e.lieu ? { location: e.lieu } : {}),
    start: { dateTime: e.debut, timeZone: "Europe/Paris" },
    end: { dateTime: e.fin, timeZone: "Europe/Paris" },
    reminders: { useDefault: true },
    ...(riche && e.invites?.length ? { attendees: e.invites.map((i) => ({ email: i.email, ...(i.nom ? { displayName: i.nom } : {}) })), guestsCanModify: false } : {}),
    ...(riche && creation && e.visio ? { conferenceData: { createRequest: { requestId: (e.visioCle ?? `bj-${Date.parse(e.debut)}`).slice(0, 60), conferenceSolutionKey: { type: "hangoutsMeet" } } } } : {}),
  };
}

/* Les options d'écriture, hors du chemin : visio à la création, invitations envoyées par Google. */
function options(connexion: string | null, creation: boolean): string {
  if (!connexion) return "";
  const q = new URLSearchParams({ sendUpdates: "all" });
  if (creation) q.set("conferenceDataVersion", "1");
  return `?${q.toString()}`;
}

/** Pose le rendez-vous ; rend l'identifiant de l'événement et le lien de la visio créée, s'il y en a une. */
export async function poserEvenementComplet(agendaId: string, e: EvenementAPoser, connexion: string | null = null): Promise<Resultat<EvenementPose>> {
  const base = `/calendars/${enc(agendaId)}/events`;
  const r = await appeler<{ id?: string; hangoutLink?: string }>(`${base}${options(connexion, true)}`, { method: "POST", body: corpsEvenement(e, connexion, true) }, connexion);
  if (!r.ok) return r;
  if ((r.valeur.statut === 200 || r.valeur.statut === 201) && r.valeur.json?.id) {
    const visio = typeof r.valeur.json.hangoutLink === "string" && r.valeur.json.hangoutLink.startsWith("https://") ? r.valeur.json.hangoutLink : null;
    return { ok: true, valeur: { id: r.valeur.json.id, visio } };
  }
  if (r.valeur.statut === 403 || r.valeur.statut === 404) {
    return { ok: false, raison: "acces_refuse", message: connexion ? "Google refuse d'écrire dans cet agenda : refaire la connexion dans « Les agendas »." : "L'agenda n'est pas partagé en écriture avec le compte de l'atelier." };
  }
  console.error("[collectif] événement non posé", r.valeur.statut);
  return { ok: false, raison: "google", message: "Google Agenda n'a pas enregistré le rendez-vous." };
}

/** Pose le rendez-vous dans l'agenda de l'interlocuteur ; rend l'identifiant de l'événement. */
export async function poserEvenement(agendaId: string, e: EvenementAPoser, connexion: string | null = null): Promise<Resultat<string>> {
  const r = await poserEvenementComplet(agendaId, e, connexion);
  return r.ok ? { ok: true, valeur: r.valeur.id } : r;
}

/** Déplace un événement que NOUS avons posé. */
export async function deplacerEvenement(agendaId: string, eventId: string, e: EvenementAPoser, connexion: string | null = null): Promise<Resultat<true>> {
  const r = await appeler(`/calendars/${enc(agendaId)}/events/${enc(eventId)}${options(connexion, false)}`, { method: "PATCH", body: corpsEvenement(e, connexion, false) }, connexion);
  if (!r.ok) return r;
  if (r.valeur.statut === 200) return { ok: true, valeur: true };
  if (r.valeur.statut === 404 || r.valeur.statut === 410) return { ok: false, raison: "introuvable", message: "L'événement n'est plus dans l'agenda." };
  console.error("[collectif] événement non déplacé", r.valeur.statut);
  return { ok: false, raison: "google", message: "Google Agenda n'a pas déplacé le rendez-vous." };
}

/** Retire un événement que NOUS avons posé. Déjà retiré (404, 410) = fait. */
export async function retirerEvenement(agendaId: string, eventId: string, connexion: string | null = null): Promise<Resultat<true>> {
  const r = await appeler(`/calendars/${enc(agendaId)}/events/${enc(eventId)}${options(connexion, false)}`, { method: "DELETE" }, connexion);
  if (!r.ok) return r;
  if (r.valeur.statut === 204 || r.valeur.statut === 200 || r.valeur.statut === 404 || r.valeur.statut === 410) return { ok: true, valeur: true };
  console.error("[collectif] événement non retiré", r.valeur.statut);
  return { ok: false, raison: "google", message: "Google Agenda n'a pas retiré le rendez-vous." };
}
