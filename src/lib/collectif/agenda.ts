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
 */

import { createSign } from "node:crypto";
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

async function appeler<T>(chemin: string, init: { method: string; body?: unknown }): Promise<Resultat<{ statut: number; json: T | null }>> {
  const compte = compteAgenda();
  if (!compte) return { ok: false, raison: "non_configure", message: "La prise de rendez-vous n'est pas encore branchée à l'agenda." };
  const j = await jetonAcces(compte);
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
export async function plagesOccupees(agendaId: string, debut: string, fin: string): Promise<Resultat<Plage[]>> {
  type Rep = { calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: { reason: string }[] }> };
  const r = await appeler<Rep>("/freeBusy", { method: "POST", body: { timeMin: debut, timeMax: fin, items: [{ id: agendaId }] } });
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
      message: "Cet agenda n'est pas partagé avec le compte de l'atelier (ou son adresse est fausse).",
    };
  }
  return { ok: true, valeur: (agenda.busy ?? []).map((b) => ({ debut: new Date(b.start).toISOString(), fin: new Date(b.end).toISOString() })) };
}

export type EvenementAPoser = { debut: string; fin: string; titre: string; description: string; lieu: string | null };

function corpsEvenement(e: EvenementAPoser) {
  return {
    summary: e.titre,
    description: e.description,
    ...(e.lieu ? { location: e.lieu } : {}),
    start: { dateTime: e.debut, timeZone: "Europe/Paris" },
    end: { dateTime: e.fin, timeZone: "Europe/Paris" },
    reminders: { useDefault: true },
  };
}

/** Pose le rendez-vous dans l'agenda de l'interlocuteur ; rend l'identifiant de l'événement. */
export async function poserEvenement(agendaId: string, e: EvenementAPoser): Promise<Resultat<string>> {
  const r = await appeler<{ id?: string }>(`/calendars/${enc(agendaId)}/events`, { method: "POST", body: corpsEvenement(e) });
  if (!r.ok) return r;
  if ((r.valeur.statut === 200 || r.valeur.statut === 201) && r.valeur.json?.id) return { ok: true, valeur: r.valeur.json.id };
  if (r.valeur.statut === 403 || r.valeur.statut === 404) {
    return { ok: false, raison: "acces_refuse", message: "L'agenda n'est pas partagé en écriture avec le compte de l'atelier." };
  }
  console.error("[collectif] événement non posé", r.valeur.statut);
  return { ok: false, raison: "google", message: "Google Agenda n'a pas enregistré le rendez-vous." };
}

/** Déplace un événement que NOUS avons posé. */
export async function deplacerEvenement(agendaId: string, eventId: string, e: EvenementAPoser): Promise<Resultat<true>> {
  const r = await appeler(`/calendars/${enc(agendaId)}/events/${enc(eventId)}`, { method: "PATCH", body: corpsEvenement(e) });
  if (!r.ok) return r;
  if (r.valeur.statut === 200) return { ok: true, valeur: true };
  if (r.valeur.statut === 404 || r.valeur.statut === 410) return { ok: false, raison: "introuvable", message: "L'événement n'est plus dans l'agenda." };
  console.error("[collectif] événement non déplacé", r.valeur.statut);
  return { ok: false, raison: "google", message: "Google Agenda n'a pas déplacé le rendez-vous." };
}

/** Retire un événement que NOUS avons posé. Déjà retiré (404, 410) = fait. */
export async function retirerEvenement(agendaId: string, eventId: string): Promise<Resultat<true>> {
  const r = await appeler(`/calendars/${enc(agendaId)}/events/${enc(eventId)}`, { method: "DELETE" });
  if (!r.ok) return r;
  if (r.valeur.statut === 204 || r.valeur.statut === 200 || r.valeur.statut === 404 || r.valeur.statut === 410) return { ok: true, valeur: true };
  console.error("[collectif] événement non retiré", r.valeur.statut);
  return { ok: false, raison: "google", message: "Google Agenda n'a pas retiré le rendez-vous." };
}
