/**
 * Les champs du questionnaire, et ce qui les rend valides. Module PUR.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * Le 27/08, un dossier est arrivé dans l'atelier sans titre et sans une seule
 * photo. Rien n'était cassé : les écrans 1, 2 et 3 laissaient passer un champ
 * vide, l'écran 3 proposait même explicitement de sauter la question, et
 * `/api/atelier/numero` n'exigeait que le prénom et l'email. Un dossier
 * incomplet n'était donc pas un accident, c'était le comportement normal.
 *
 * La règle vit ICI, une seule fois, et les deux côtés la lisent :
 *   — le questionnaire, pour barrer la route AVANT le clic (écran par écran) ;
 *   — la route POST, parce qu'un navigateur n'est jamais une garantie. Un
 *     brouillon d'une version antérieure, un onglet resté ouvert pendant un
 *     déploiement, un appel direct : tout cela arrive, et c'est le serveur qui
 *     décide de ce qui entre en base.
 *
 * Deux copies de la règle auraient divergé au premier ajustement, et la
 * divergence se serait vue au pire endroit : un écran qui dit « c'est bon »
 * suivi d'un serveur qui répond « non ».
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Assez pour exclure une frappe accidentelle, pas assez pour brimer. */
export const MIN_OCCASION = 2;

/**
 * « Racontez » — vingt caractères.
 *
 * Le seuil est calé sur un dossier RÉEL : la cliente du 25/08 a écrit
 * « On doit ressentir les 9 ans d'amour » (35 caractères). C'est court, et
 * c'est un vrai brief. Un seuil plus haut l'aurait renvoyée à son clavier
 * pour rien. Vingt caractères écartent « ok », « voir photos » et le mot
 * jeté ; ils laissent passer une phrase courte mais dite.
 */
export const MIN_HISTOIRE = 20;

/** Un titre de couverture. Deux caractères, un mot suffit. */
export const MIN_TITRE = 2;

export const MIN_PRENOM = 2;

/* Un numéro de téléphone français en fait 10, un international jusqu'à 15
   (norme E.164). En dessous de 8 chiffres, ce n'est pas un numéro joignable. */
export const MIN_TELEPHONE_CHIFFRES = 8;
export const MAX_TELEPHONE_CHIFFRES = 15;

/* La même expression des deux côtés. Volontairement permissive : refuser une
   adresse valide coûte une cliente, accepter une adresse morte coûte un mail
   qui rebondit. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ChampQuestionnaire =
  | "occasion"
  | "histoire"
  | "titre"
  | "prenom"
  | "email"
  | "telephone";

/** Tous les champs, dans l'ordre où la cliente les rencontre. */
export const CHAMPS_QUESTIONNAIRE: ChampQuestionnaire[] = [
  "occasion",
  "histoire",
  "titre",
  "prenom",
  "email",
  "telephone",
];

/**
 * Quel écran porte quel champ.
 *
 * Sert aux DEUX sens : le questionnaire valide l'écran qu'il quitte, et la
 * route renvoie le champ fautif — le navigateur sait alors sur quel écran
 * reposer la cliente au lieu de lui dire « réessayez » devant un formulaire
 * qui a l'air complet.
 */
export const CHAMPS_PAR_ECRAN: Record<number, ChampQuestionnaire[]> = {
  1: ["occasion"],
  2: ["histoire"],
  3: ["titre"],
  4: ["prenom", "email", "telephone"],
};

export function ecranDuChamp(champ: ChampQuestionnaire): number {
  for (const [ecran, champs] of Object.entries(CHAMPS_PAR_ECRAN)) {
    if (champs.includes(champ)) return Number(ecran);
  }
  return 1;
}

/**
 * Ce que la cliente lit quand elle est bloquée.
 *
 * Jamais « champ obligatoire » : une étiquette de formulaire administratif au
 * milieu d'un parcours qui, partout ailleurs, lui parle. On dit ce qu'on
 * attend, pas ce qui manque.
 */
export const MESSAGE_DU_CHAMP: Record<ChampQuestionnaire, string> = {
  occasion: "Dites-nous en quelques mots ce que c’était.",
  histoire: "Racontez-nous ce moment, en une phrase au moins. C’est là-dessus que l’atelier compose.",
  titre: "Donnez-lui un titre. Vous pourrez le changer plus tard.",
  prenom: "Il nous faut votre prénom pour vous écrire.",
  email: "Cette adresse email ne semble pas valide.",
  telephone: "Il nous faut un numéro pour la livraison.",
};

/**
 * Le téléphone, réduit à ce qui compte : un « + » de tête et des chiffres.
 *
 * Espaces, points, tirets et parenthèses sont des habitudes d'écriture, pas
 * des erreurs. « 07 69 71 06 86 » et « +33 7 69 71 06 86 » sont le même
 * numéro et doivent passer tous les deux.
 */
export function normaliserTelephone(valeur: string): string {
  const brut = valeur.trim().replace(/[\s.\-()/]/g, "");
  const plus = brut.startsWith("+");
  return (plus ? "+" : "") + brut.replace(/\D/g, "");
}

export function telephoneValide(valeur: string): boolean {
  const chiffres = normaliserTelephone(valeur).replace(/\D/g, "");
  return (
    chiffres.length >= MIN_TELEPHONE_CHIFFRES && chiffres.length <= MAX_TELEPHONE_CHIFFRES
  );
}

/** Une réponse est-elle recevable ? Une seule règle par champ, ici et nulle part ailleurs. */
export function reponseValide(champ: ChampQuestionnaire, valeur: unknown): boolean {
  const v = typeof valeur === "string" ? valeur.trim() : "";
  switch (champ) {
    case "occasion":
      return v.length >= MIN_OCCASION;
    case "histoire":
      return v.length >= MIN_HISTOIRE;
    case "titre":
      return v.length >= MIN_TITRE;
    case "prenom":
      return v.length >= MIN_PRENOM;
    case "email":
      return EMAIL_PATTERN.test(v);
    case "telephone":
      return telephoneValide(v);
  }
}

/**
 * Le PREMIER champ qui bloque, ou null si tout est là.
 *
 * Le premier, et pas la liste : on renvoie la cliente à un endroit, pas à un
 * bilan. Le suivant se présentera de lui-même.
 */
export function premierManquant(
  champs: ChampQuestionnaire[],
  lire: (champ: ChampQuestionnaire) => unknown,
): ChampQuestionnaire | null {
  for (const champ of champs) {
    if (!reponseValide(champ, lire(champ))) return champ;
  }
  return null;
}
