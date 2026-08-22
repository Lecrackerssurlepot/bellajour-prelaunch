/**
 * Les dates que la cliente lit sur sa page d'état.
 *
 * Toujours en heure de Paris, jamais en UTC : le serveur Vercel tourne en UTC
 * et un « nous lançons l'impression le 3 septembre » calculé à Greenwich se
 * décale d'un jour pour toute échéance tombant après 22 h en été. Une date
 * fausse sur une échéance d'auto-validation, c'est une réclamation.
 */

const FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

export function ajouterJours(depuis: string | Date, jours: number): Date {
  const d = new Date(depuis);
  d.setDate(d.getDate() + jours);
  return d;
}

/**
 * « 3 septembre », et « 1er septembre » le premier du mois — Intl écrit « 1 »,
 * ce qu'aucun francophone n'écrit. Le détail se voit d'autant plus qu'il tombe
 * dans une phrase qui engage une date de livraison.
 */
export function formaterJour(date: string | Date): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const rendu = FORMAT.format(d);
  return rendu.startsWith("1 ") ? `1er ${rendu.slice(2)}` : rendu;
}
