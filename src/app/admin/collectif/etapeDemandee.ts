/* « Compléter », dans l'encart « À compléter » de la vue d'ensemble (planche 7B du 21/10), ouvre le BON
   réglage : l'onglet « Réglages et liens », et dans le formulaire l'étape où vit le champ (`data-etape`).
   Les onglets (`OngletsFiche`) et le formulaire (`FormulaireEdition`) sont deux composants qui ne se
   connaissent pas : ce petit module est leur seul point de rencontre, dans le navigateur.

   - L'onglet « Réglages » n'est monté qu'à sa première visite : si le formulaire n'existe pas encore, la
     demande reste ICI et il la lit à son montage (`etapeDemandee`) ; s'il existe, il l'entend aussitôt
     (`ecouterEtape`).
   - La lecture ne consomme rien : un montage rejoué (le mode strict de développement) lirait sinon `null`
     la seconde fois. Le formulaire efface la demande une fois montée (`oublierEtape`). */

const EVENEMENT = "bj-etape-edition";

let demandee: string | null = null;

/** Demande l'étape `cle` (« devis », « calendrier »…) au formulaire, monté ou non. */
export function demanderEtape(cle: string): void {
  demandee = cle;
  window.dispatchEvent(new Event(EVENEMENT));
}

/** L'étape demandée avant le montage du formulaire, sans la consommer. */
export function etapeDemandee(): string | null {
  return demandee;
}

export function oublierEtape(): void {
  demandee = null;
}

/** Le formulaire monté écoute les demandes suivantes ; rend la fonction qui arrête d'écouter. */
export function ecouterEtape(fn: (cle: string) => void): () => void {
  const quand = () => {
    const cle = demandee;
    demandee = null;
    if (cle) fn(cle);
  };
  window.addEventListener(EVENEMENT, quand);
  return () => window.removeEventListener(EVENEMENT, quand);
}
