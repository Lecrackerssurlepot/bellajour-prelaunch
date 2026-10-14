/**
 * L'invitation d'agenda (.ics) jointe aux mails de rendez-vous (T-148).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Une seule invitation par rendez-vous, reconnue par son `UID` : un
 * déplacement la RÉÉCRIT (même UID, `SEQUENCE` + 1) et une annulation la
 * retire (`METHOD:CANCEL`), au lieu d'ajouter un second événement dans
 * l'agenda du client. Format RFC 5545 : lignes CRLF, repliées à 75 octets,
 * texte échappé.
 */

export type EvenementIcs = {
  uid: string;
  sequence: number;
  debut: string;
  fin: string;
  titre: string;
  description: string;
  lieu: string | null;
  annule: boolean;
  maintenant: Date;
};

/** 2026-10-15T08:30:00.000Z → 20261015T083000Z */
export function dateIcs(iso: string): string {
  return new Date(Date.parse(iso)).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Le texte d'un champ : antislash, point-virgule, virgule et retour à la ligne échappés. */
export function echapperIcs(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Replie une ligne à 75 octets UTF-8 (jamais au milieu d'un caractère). */
export function replier(ligne: string): string {
  const morceaux: string[] = [];
  let courant = "";
  let octets = 0;
  for (const c of ligne) {
    const n = Buffer.byteLength(c, "utf8");
    const limite = morceaux.length === 0 ? 75 : 74;
    if (octets + n > limite) {
      morceaux.push(courant);
      courant = "";
      octets = 0;
    }
    courant += c;
    octets += n;
  }
  morceaux.push(courant);
  return morceaux.join("\r\n ");
}

export function invitationIcs(e: EvenementIcs): string {
  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bellajour//Edition collective//FR",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.annule ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `SEQUENCE:${e.sequence}`,
    `DTSTAMP:${dateIcs(e.maintenant.toISOString())}`,
    `DTSTART:${dateIcs(e.debut)}`,
    `DTEND:${dateIcs(e.fin)}`,
    `SUMMARY:${echapperIcs(e.titre)}`,
    `DESCRIPTION:${echapperIcs(e.description)}`,
    ...(e.lieu ? [`LOCATION:${echapperIcs(e.lieu)}`, `URL:${e.lieu}`] : []),
    `STATUS:${e.annule ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lignes.map(replier).join("\r\n") + "\r\n";
}
