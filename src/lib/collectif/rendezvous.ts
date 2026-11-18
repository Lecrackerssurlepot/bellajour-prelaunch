/**
 * Les rendez-vous de l'Édition collective, côté base (D23, T-148).
 * Module À EFFETS (Supabase, Google Agenda, Brevo) : serveur uniquement.
 * Une seule façon de prendre, déplacer, annuler, pour le client et l'atelier.
 *
 * L'ordre de chaque geste est voulu :
 * 1. la RÈGLE (créneau des règles, à venir, pas plus de trois à venir) ;
 * 2. l'agenda (« free/busy ») : le créneau est-il encore libre ?
 * 3. la BASE, qui sert de verrou : l'index unique refuse deux rendez-vous sur
 *    le même créneau du même interlocuteur, même à la même seconde ;
 * 4. l'événement Google ; s'il échoue, la ligne est défaite (annulée ou
 *    remise à son ancien créneau) : jamais un rendez-vous affiché qui n'est
 *    pas dans l'agenda de l'atelier ;
 * 5. le journal, puis le mail.
 *
 * ⚠️ LES MAILS sont de vrais mails à de vrais clients : ils ne partent que si
 * `COLLECTIF_MAILS_RDV` est ouvert (une valeur incomprise FERME), et jamais
 * quand `ATELIER_MAILS_COUPES` coupe tout. Verrou dans `collectif_mails`
 * (inséré AVANT Brevo, retiré si Brevo refuse), code par rendez-vous, version
 * et genre : un même mail ne part qu'une fois.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { envoisCoupes, VAR_MAILS_COUPES } from "@/lib/envois";
import { compteAgenda, dechiffrerJeton, deplacerEvenement, plagesOccupees, poserEvenement, retirerEvenement, type EvenementAPoser, type Raison } from "./agenda";
import { chevauche, libelleCreneau, RDV_A_VENIR_MAX, REGLES_RDV, type Creneau } from "./creneaux";
import { ETAPES_CLIENT, etapeClient } from "./espace";
import { etatEffectif } from "./etats";
import { invitationIcs } from "./ics";
import { lireInterrupteur } from "./interrupteur";
import { journaliser } from "./journal";
import { mailRendezVous, type GenreMailRdv } from "./mailsRdv";
import { MESSAGE_RDV_ABSENTE, rdvAbsent } from "./migration";
import type { EditionLigne } from "./types";

export const VAR_MAILS_RDV = "COLLECTIF_MAILS_RDV";

/** L'expéditeur vérifié chez Brevo (le seul, vu le 14/10/2026). */
const EXPEDITEUR = { email: "contact@bellajour.com", name: "Bellajour" };
const BREVO_SMTP_URL = "https://api.brevo.com/v3/smtp/email";

export type Interlocuteur = { cle: string; prenom: string; agenda_id: string | null; meet_url: string | null; actif: boolean };

export type RendezVous = {
  id: string;
  edition_id: string;
  interlocuteur_cle: string;
  debut: string;
  fin: string;
  motif: string | null;
  statut: "pris" | "annule";
  google_event_id: string | null;
  sequence: number;
  annule_le: string | null;
  created_at: string;
};

export type Lu<T> = { ok: true; valeur: T } | { ok: false; absent: boolean; code: string | null };

export type EtatMail = "envoye" | "coupe" | "deja" | "echec";
export type Echec = { statut: number; error: string; message: string };
export type Issue<T> = { ok: true; valeur: T; mail: EtatMail; avertissement: string | null } | { ok: false; echec: Echec };

const COLONNES_RDV = "id, edition_id, interlocuteur_cle, debut, fin, motif, statut, google_event_id, sequence, annule_le, created_at";

function lu<T>(data: T, error: { code?: string } | null): Lu<T> {
  if (error) return { ok: false, absent: rdvAbsent(error.code), code: error.code ?? null };
  return { ok: true, valeur: data };
}

export async function lireInterlocuteurs(supabase: SupabaseClient): Promise<Lu<Interlocuteur[]>> {
  const { data, error } = await supabase.from("collectif_interlocuteurs").select("cle, prenom, agenda_id, meet_url, actif").order("prenom");
  return lu((data ?? []) as Interlocuteur[], error);
}

export async function lireRendezVous(supabase: SupabaseClient, editionId: string): Promise<Lu<RendezVous[]>> {
  const { data, error } = await supabase.from("collectif_rendez_vous").select(COLONNES_RDV).eq("edition_id", editionId).order("debut");
  return lu((data ?? []) as RendezVous[], error);
}

/**
 * La connexion Google d'une personne de l'atelier (18/11) : son jeton de
 * renouvellement, déchiffré, pour agenda.ts. ⚠️ SERVEUR SEULEMENT : il ne
 * sort jamais dans une réponse ni dans une prop. `null` (pas connectée, pas
 * de migration 20261118, secret changé) = le compte de service, comme avant.
 */
export async function connexionDe(supabase: SupabaseClient, cle: string): Promise<string | null> {
  const { data, error } = await supabase.from("collectif_interlocuteurs").select("google_refresh").eq("cle", cle).maybeSingle<{ google_refresh: string | null }>();
  if (error || !data) return null;
  return dechiffrerJeton(data.google_refresh);
}

export type ConnexionGoogle = { cle: string; email: string | null; connecte_le: string | null };

/** Qui est connecté à Google, pour la page « Les agendas » : l'adresse, jamais le jeton. */
export async function lireConnexions(supabase: SupabaseClient): Promise<ConnexionGoogle[] | null> {
  const { data, error } = await supabase.from("collectif_interlocuteurs").select("cle, google_email, google_refresh, google_connecte_le");
  if (error) return null;
  return ((data ?? []) as { cle: string; google_email: string | null; google_refresh: string | null; google_connecte_le: string | null }[]).map((l) => ({
    cle: l.cle,
    email: l.google_refresh && dechiffrerJeton(l.google_refresh) ? l.google_email : null,
    connecte_le: l.google_connecte_le,
  }));
}

/**
 * Les personnes dont l'agenda peut servir : connectées à Google, ou toutes
 * celles qui ont un agenda quand le compte de service est posé. UNE règle pour
 * l'espace, la fiche et /partenaires.
 */
export async function clesAgendaPret(supabase: SupabaseClient, inters: readonly Interlocuteur[]): Promise<Set<string>> {
  const avecAgenda = inters.filter((i) => i.agenda_id);
  if (compteAgenda()) return new Set(avecAgenda.map((i) => i.cle));
  const connexions = (await lireConnexions(supabase)) ?? [];
  const connectees = new Set(connexions.filter((c) => c.email).map((c) => c.cle));
  return new Set(avecAgenda.filter((i) => connectees.has(i.cle)).map((i) => i.cle));
}

/**
 * L'étape du projet, dans le titre de l'événement (demande de Mathias du
 * 18/11 : « mettre le nom du cal suivant l'avancée du projet ») : le nom que
 * le client lit dans son espace (`ETAPES_CLIENT`), pour l'état EFFECTIF.
 */
export function titreRendezVous(edition: Pick<EditionLigne, "organisation" | "etat" | "cloture_le">, maintenant: Date): string {
  const etape = ETAPES_CLIENT[etapeClient(etatEffectif(edition.etat, edition.cloture_le, maintenant))]?.libelle;
  return etape ? `Bellajour · ${edition.organisation} · ${etape}` : `Bellajour · ${edition.organisation}`;
}

const absente = (): Echec => ({ statut: 503, error: "migration_rdv_absente", message: MESSAGE_RDV_ABSENTE });

function echecAgenda(raison: Raison, message: string): Echec {
  return { statut: raison === "non_configure" ? 503 : 502, error: `agenda_${raison}`, message };
}

/** L'interlocuteur d'une édition, prêt pour un rendez-vous (choisi, actif, agenda relié). */
export async function interlocuteurPret(supabase: SupabaseClient, edition: EditionLigne): Promise<{ ok: true; inter: Interlocuteur } | { ok: false; echec: Echec }> {
  if (edition.interlocuteur_cle === undefined) return { ok: false, echec: absente() };
  if (!edition.interlocuteur_cle) {
    return { ok: false, echec: { statut: 409, error: "pas_d_interlocuteur", message: "L'atelier n'a pas encore choisi votre interlocuteur." } };
  }
  const { data, error } = await supabase
    .from("collectif_interlocuteurs")
    .select("cle, prenom, agenda_id, meet_url, actif")
    .eq("cle", edition.interlocuteur_cle)
    .maybeSingle<Interlocuteur>();
  if (error) return { ok: false, echec: rdvAbsent(error.code) ? absente() : { statut: 500, error: "lecture_impossible", message: "Lecture impossible." } };
  if (!data || !data.actif || !data.agenda_id) {
    return { ok: false, echec: { statut: 409, error: "agenda_non_relie", message: "L'agenda de votre interlocuteur n'est pas encore relié." } };
  }
  return { ok: true, inter: data };
}

/* Avec la connexion de l'interlocuteur (`rdvId` donné), Google invite le
   responsable et crée la visio ; sans elle, ni invité ni visio (agenda.ts). */
function evenement(edition: EditionLigne, inter: Interlocuteur, c: Creneau, motif: string | null, maintenant: Date, rdvId: string | null = null): EvenementAPoser {
  return {
    ...(rdvId ? { invites: [{ email: edition.responsable_email, nom: edition.responsable_nom }], visio: !inter.meet_url, visioCle: `bj-${rdvId}` } : {}),
    debut: c.debut,
    fin: c.fin,
    titre: titreRendezVous(edition, maintenant),
    description: [
      "Rendez-vous pris depuis l'espace client de l'Édition collective.",
      `Édition : ${edition.organisation} · ${edition.evenement}`,
      `Responsable : ${edition.responsable_nom ?? "non renseigné"} · ${edition.responsable_email}`,
      motif ? `Sujet : ${motif}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    lieu: inter.meet_url,
  };
}

type Geste = { supabase: SupabaseClient; edition: EditionLigne; par: string; origine: string; maintenant: Date; qui: string | null };

/** Prendre un rendez-vous sur un créneau DÉJÀ validé par `lireCreneau`. */
export async function prendre(g: Geste & { creneau: Creneau; motif: string | null }): Promise<Issue<RendezVous>> {
  const pret = await interlocuteurPret(g.supabase, g.edition);
  if (!pret.ok) return pret;
  const { inter } = pret;

  const tous = await lireRendezVous(g.supabase, g.edition.id);
  if (!tous.ok) return { ok: false, echec: tous.absent ? absente() : { statut: 500, error: "lecture_impossible", message: "Lecture impossible." } };
  const aVenir = tous.valeur.filter((r) => r.statut === "pris" && Date.parse(r.debut) > g.maintenant.getTime());
  if (aVenir.length >= RDV_A_VENIR_MAX) {
    return { ok: false, echec: { statut: 409, error: "trop_de_rdv", message: `${RDV_A_VENIR_MAX} rendez-vous à venir au plus : déplacez ou annulez d'abord l'un d'eux.` } };
  }

  const connexion = await connexionDe(g.supabase, inter.cle);
  const occ = await plagesOccupees(inter.agenda_id as string, g.creneau.debut, g.creneau.fin, connexion);
  if (!occ.ok) return { ok: false, echec: echecAgenda(occ.raison, occ.message) };
  if (occ.valeur.some((o) => chevauche(o, g.creneau))) {
    return { ok: false, echec: { statut: 409, error: "creneau_pris", message: "Ce créneau vient d'être pris. Choisissez-en un autre." } };
  }

  const { data: ligne, error } = await g.supabase
    .from("collectif_rendez_vous")
    .insert({ edition_id: g.edition.id, interlocuteur_cle: inter.cle, debut: g.creneau.debut, fin: g.creneau.fin, motif: g.motif })
    .select(COLONNES_RDV)
    .single<RendezVous>();
  if (error) {
    if (error.code === "23505") return { ok: false, echec: { statut: 409, error: "creneau_pris", message: "Ce créneau vient d'être pris. Choisissez-en un autre." } };
    return { ok: false, echec: rdvAbsent(error.code) ? absente() : { statut: 500, error: "ecriture_impossible", message: "Le rendez-vous n'a pas été enregistré." } };
  }

  const ev = await poserEvenement(inter.agenda_id as string, evenement(g.edition, inter, g.creneau, g.motif, g.maintenant, connexion ? ligne.id : null), connexion);
  if (!ev.ok) {
    /* Défait : le créneau se libère, rien ne s'affiche côté client. */
    await g.supabase.from("collectif_rendez_vous").update({ statut: "annule", annule_le: new Date().toISOString() }).eq("id", ligne.id);
    return { ok: false, echec: echecAgenda(ev.raison, `${ev.message} Rien n'est réservé.`) };
  }
  const rdv: RendezVous = { ...ligne, google_event_id: ev.valeur };
  const { error: errId } = await g.supabase.from("collectif_rendez_vous").update({ google_event_id: ev.valeur }).eq("id", ligne.id);
  if (errId) console.error("[collectif] identifiant d'événement non gardé", errId.code);

  await journaliser(g.supabase, { editionId: g.edition.id }, "rdv_pris", { par: g.par, quand: libelleCreneau(rdv.debut), avec: inter.prenom }, g.qui);
  /* Connecté : Google a déjà invité le responsable, notre mail ferait doublon. */
  const mail = connexion ? "coupe" : await envoyerMailRdv(g.supabase, g.edition, rdv, inter, "pris", null, g.origine);
  return { ok: true, valeur: rdv, mail, avertissement: null };
}

async function lireUn(g: Geste, rdvId: string): Promise<{ ok: true; rdv: RendezVous } | { ok: false; echec: Echec }> {
  const { data, error } = await g.supabase
    .from("collectif_rendez_vous")
    .select(COLONNES_RDV)
    .eq("id", rdvId)
    .eq("edition_id", g.edition.id)
    .maybeSingle<RendezVous>();
  if (error) return { ok: false, echec: rdvAbsent(error.code) ? absente() : { statut: 500, error: "lecture_impossible", message: "Lecture impossible." } };
  if (!data || data.statut !== "pris") return { ok: false, echec: { statut: 404, error: "introuvable", message: "Ce rendez-vous n'existe plus." } };
  if (Date.parse(data.debut) <= g.maintenant.getTime()) {
    return { ok: false, echec: { statut: 409, error: "passe", message: "Ce rendez-vous a déjà commencé." } };
  }
  return { ok: true, rdv: data };
}

export async function deplacer(g: Geste & { rdvId: string; creneau: Creneau }): Promise<Issue<RendezVous>> {
  const lu1 = await lireUn(g, g.rdvId);
  if (!lu1.ok) return lu1;
  const ancien = lu1.rdv;
  if (ancien.debut === g.creneau.debut) return { ok: false, echec: { statut: 422, error: "meme_creneau", message: "C'est déjà le créneau de ce rendez-vous." } };
  const pret = await interlocuteurPret(g.supabase, g.edition);
  if (!pret.ok) return pret;
  const { inter } = pret;
  /* On reste avec l'interlocuteur du rendez-vous : changer d'interlocuteur,
     c'est annuler puis reprendre. */
  if (inter.cle !== ancien.interlocuteur_cle) {
    return { ok: false, echec: { statut: 409, error: "interlocuteur_change", message: "Votre interlocuteur a changé : annulez ce rendez-vous puis prenez-en un nouveau." } };
  }

  const connexion = await connexionDe(g.supabase, inter.cle);
  const occ = await plagesOccupees(inter.agenda_id as string, g.creneau.debut, g.creneau.fin, connexion);
  if (!occ.ok) return { ok: false, echec: echecAgenda(occ.raison, occ.message) };
  /* Le rendez-vous déplacé occupe encore SON créneau : il ne se bloque pas lui-même. */
  if (occ.valeur.some((o) => chevauche(o, g.creneau) && !chevauche(o, ancien))) {
    return { ok: false, echec: { statut: 409, error: "creneau_pris", message: "Ce créneau vient d'être pris. Choisissez-en un autre." } };
  }

  const { data: ligne, error } = await g.supabase
    .from("collectif_rendez_vous")
    .update({ debut: g.creneau.debut, fin: g.creneau.fin, sequence: ancien.sequence + 1 })
    .eq("id", ancien.id)
    .eq("statut", "pris")
    .eq("debut", ancien.debut)
    .select(COLONNES_RDV)
    .maybeSingle<RendezVous>();
  if (error) {
    if (error.code === "23505") return { ok: false, echec: { statut: 409, error: "creneau_pris", message: "Ce créneau vient d'être pris. Choisissez-en un autre." } };
    return { ok: false, echec: { statut: 500, error: "ecriture_impossible", message: "Le rendez-vous n'a pas été déplacé." } };
  }
  if (!ligne) return { ok: false, echec: { statut: 409, error: "change_entre_temps", message: "Ce rendez-vous a changé entre-temps : rechargez la page." } };

  if (ancien.google_event_id) {
    const ev = await deplacerEvenement(inter.agenda_id as string, ancien.google_event_id, evenement(g.edition, inter, g.creneau, ancien.motif, g.maintenant, connexion ? ancien.id : null), connexion);
    if (!ev.ok) {
      await g.supabase.from("collectif_rendez_vous").update({ debut: ancien.debut, fin: ancien.fin, sequence: ancien.sequence }).eq("id", ancien.id);
      return { ok: false, echec: echecAgenda(ev.raison, `${ev.message} Le rendez-vous reste à son créneau.`) };
    }
  }

  await journaliser(
    g.supabase,
    { editionId: g.edition.id },
    "rdv_deplace",
    { par: g.par, avant: libelleCreneau(ancien.debut), quand: libelleCreneau(ligne.debut), avec: inter.prenom },
    g.qui
  );
  const mail = connexion ? "coupe" : await envoyerMailRdv(g.supabase, g.edition, ligne, inter, "deplace", ancien.debut, g.origine);
  return { ok: true, valeur: ligne, mail, avertissement: null };
}

export async function annuler(g: Geste & { rdvId: string }): Promise<Issue<RendezVous>> {
  const lu1 = await lireUn(g, g.rdvId);
  if (!lu1.ok) return lu1;
  const rdv = lu1.rdv;
  const { data: ligne, error } = await g.supabase
    .from("collectif_rendez_vous")
    .update({ statut: "annule", annule_le: new Date().toISOString(), sequence: rdv.sequence + 1 })
    .eq("id", rdv.id)
    .eq("statut", "pris")
    .select(COLONNES_RDV)
    .maybeSingle<RendezVous>();
  if (error) return { ok: false, echec: { statut: 500, error: "ecriture_impossible", message: "Le rendez-vous n'a pas été annulé." } };
  if (!ligne) return { ok: false, echec: { statut: 409, error: "change_entre_temps", message: "Ce rendez-vous a changé entre-temps : rechargez la page." } };

  /* L'interlocuteur du RENDEZ-VOUS (il a pu changer depuis sur l'édition). */
  const { data: inter } = await g.supabase
    .from("collectif_interlocuteurs")
    .select("cle, prenom, agenda_id, meet_url, actif")
    .eq("cle", rdv.interlocuteur_cle)
    .maybeSingle<Interlocuteur>();
  let avertissement: string | null = null;
  const connexion = inter ? await connexionDe(g.supabase, inter.cle) : null;
  if (rdv.google_event_id && inter?.agenda_id) {
    const ev = await retirerEvenement(inter.agenda_id, rdv.google_event_id, connexion);
    if (!ev.ok) avertissement = `Annulé ici, mais l'événement reste dans l'agenda de ${inter.prenom} : à retirer à la main.`;
  }
  await journaliser(g.supabase, { editionId: g.edition.id }, "rdv_annule", { par: g.par, quand: libelleCreneau(rdv.debut), avec: inter?.prenom ?? rdv.interlocuteur_cle }, g.qui);
  const mail = !inter ? "echec" : connexion ? "coupe" : await envoyerMailRdv(g.supabase, g.edition, ligne, inter, "annule", null, g.origine);
  return { ok: true, valeur: ligne, mail, avertissement };
}

/** Le lien de l'espace dans un mail : la page « Parler à l'atelier » du responsable. */
export function lienEspace(origine: string, edition: Pick<EditionLigne, "token_responsable">): string {
  return `${origine}/edition/${edition.token_responsable}/atelier`;
}

export async function envoyerMailRdv(
  supabase: SupabaseClient,
  edition: EditionLigne,
  rdv: RendezVous,
  inter: Interlocuteur,
  genre: GenreMailRdv,
  ancienDebut: string | null,
  origine: string
): Promise<EtatMail> {
  const tag = `[collectif] mail rdv ${genre}`;
  if (!lireInterrupteur(process.env[VAR_MAILS_RDV]).ouvert) {
    console.info(`${tag} non envoyé : ${VAR_MAILS_RDV} fermé`);
    return "coupe";
  }
  if (envoisCoupes(process.env[VAR_MAILS_COUPES])) {
    console.warn(`${tag} COUPÉ par ${VAR_MAILS_COUPES}`);
    return "coupe";
  }
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return "echec";

  const code = `RDV-${rdv.id}-${rdv.sequence}-${genre}`;
  const verrou = await supabase.from("collectif_mails").insert({ edition_id: edition.id, code }).select("id").single<{ id: string }>();
  if (verrou.error) return verrou.error.code === "23505" ? "deja" : "echec";

  const mail = mailRendezVous({
    genre,
    tu: edition.registre === "ecole_tu",
    interlocuteur: inter.prenom,
    /* « Bonjour Camille, » : le mail ne part qu'à l'adresse du responsable (plus bas). */
    responsable: edition.responsable_nom,
    debut: rdv.debut,
    ancienDebut,
    dureeMinutes: REGLES_RDV.dureeMinutes,
    meetUrl: inter.meet_url,
    motif: rdv.motif,
    lienEspace: lienEspace(origine, edition),
  });
  const ics = invitationIcs({
    uid: `${rdv.id}@bellajour.fr`,
    sequence: rdv.sequence,
    debut: rdv.debut,
    fin: rdv.fin,
    titre: `Rendez-vous Bellajour avec ${inter.prenom}`,
    description: `Rendez-vous avec l'atelier Bellajour.${inter.meet_url ? ` Visio : ${inter.meet_url}` : ""}`,
    lieu: inter.meet_url,
    annule: genre === "annule",
    maintenant: new Date(),
  });
  try {
    const rep = await fetch(BREVO_SMTP_URL, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: EXPEDITEUR,
        to: [{ email: edition.responsable_email, name: edition.responsable_nom || edition.responsable_email }],
        subject: mail.sujet,
        htmlContent: mail.html,
        textContent: mail.texte,
        attachment: [{ name: "rendez-vous-bellajour.ics", content: Buffer.from(ics, "utf8").toString("base64") }],
        tags: ["collectif-rdv"],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!rep.ok) {
      console.error(`${tag} refusé par Brevo`, rep.status);
      await supabase.from("collectif_mails").delete().eq("id", verrou.data.id);
      return "echec";
    }
    return "envoye";
  } catch {
    await supabase.from("collectif_mails").delete().eq("id", verrou.data.id);
    return "echec";
  }
}
