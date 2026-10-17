/**
 * À quel dossier l'écran 5 confie-t-il les photos ? (T-156, 17/10/2026)
 *
 * Le 06/10, 92 photos d'une cliente sont parties dans le dossier d'une autre,
 * par le parcours normal : l'écran 5 ne recevait que le token et ne nommait
 * rien. « Vos photos, maintenant. » se lisait pareil dans les deux dossiers.
 *
 * Le nom vient du SERVEUR (`GET /api/atelier/numero?token=…`), jamais du
 * brouillon local : c'est précisément le brouillon qui pouvait porter le
 * token d'un autre. Module pur, importable par le navigateur et par le
 * harnais.
 */

export type DossierServeur = {
  titre: string
  prenom: string
  /** Le navigateur porte un cookie `bj_admin` valide : c'est l'atelier qui
      dépose, pas le client. Dit par le serveur, le cookie est httpOnly. */
  atelier: boolean
}

/** Lit la réponse de la route GET. `null` si elle ne dit rien du dossier
 *  (réponse d'erreur, ou d'une version qui ne rendait que le compte). */
export function lireDossierServeur(data: unknown): DossierServeur | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.titre !== 'string' && typeof d.prenom !== 'string') return null
  return {
    titre: typeof d.titre === 'string' ? d.titre.trim() : '',
    prenom: typeof d.prenom === 'string' ? d.prenom.trim() : '',
    atelier: d.atelier === true,
  }
}

/* Espaces insécables dans les guillemets : un « collé à la fin d'une ligne
   et son titre au début de la suivante ne se lisent plus comme un nom. */
const guillemets = (t: string) => `« ${t} »`

/** « Dépôt pour « Malaysia », Justine », ou ce qu'on en sait. `null` quand
 *  le dossier n'a ni titre ni prénom : rien de vrai à afficher. */
export function ligneDepot(d: DossierServeur | null): string | null {
  if (!d) return null
  if (d.titre && d.prenom) return `Dépôt pour ${guillemets(d.titre)}, ${d.prenom}`
  if (d.titre) return `Dépôt pour ${guillemets(d.titre)}`
  if (d.prenom) return `Dépôt pour ${d.prenom}`
  return null
}

/** Le bandeau de l'atelier connecté : il ne reprend pas en silence le
 *  dossier d'un client, il dit dans lequel les photos vont partir. */
export function phraseAtelier(d: DossierServeur): string {
  const dossier =
    d.prenom && d.titre ? `de ${d.prenom}, ${guillemets(d.titre)}`
      : d.prenom ? `de ${d.prenom}`
        : d.titre ? guillemets(d.titre)
          : 'de ce lien'
  return `Vous êtes connecté en atelier : ce dépôt va dans le dossier ${dossier}.`
}
