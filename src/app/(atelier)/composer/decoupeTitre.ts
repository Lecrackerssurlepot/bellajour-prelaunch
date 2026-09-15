/**
 * La découpe d'un titre de client sur une couverture composée pour un autre mot.
 *
 * Réfléchie le 15/09/2026 à la demande de Mathias, appliquée à partir du
 * 15/09 sur les deux modèles dont la police est connue (Aussie, 26).
 *
 * LE PROBLÈME. Ces compositions sont dessinées pour UN mot : « Aussie » (six
 * lettres), « 26 » (deux signes). Le client tapera « Nuits Sonores », « Le
 * mariage de Léa et Tom », « Papa » ou « Corse ». Une mise en page taillée
 * pour six lettres ne survit pas à vingt-quatre, et réduire la police jusqu'à
 * ce que ça rentre donne une couverture au titre minuscule : techniquement
 * juste, visuellement mort.
 *
 * Ce module ne fait QUE la découpe en lignes — le calcul de la taille vit
 * dans TitreSurCouverture.tsx, parce qu'il exige de MESURER le texte rendu,
 * donc un navigateur. La découpe, elle, est pure : elle se teste.
 *
 * ⚠️ ON NE TRONQUE JAMAIS LE TITRE DU CLIENT. Aucune fonction d'ici ne coupe
 * un mot ni ne pose d'ellipse : si ça ne tient pas, c'est la mise en page qui
 * cède, pas le mot. Le titre est déjà borné à 34 caractères à la saisie.
 */

/* Deux lignes au plus : une couverture n'est pas un paragraphe. */
export const LIGNES_MAX = 2

/* Ces mots-là ne finissent JAMAIS une ligne : ils restent collés au mot qui
   suit. Une ligne de couverture qui s'arrête sur « de » est l'erreur la plus
   visible qu'on puisse faire — l'œil la lit comme une coupure ratée.
   L'apostrophe typographique ET l'apostrophe droite : le client tape la
   seconde, l'écran affiche la première (`at-field` ne corrige rien). */
export const MOTS_OUTILS = [
  'de', 'des', 'du', "d'", 'd’',
  'la', 'le', 'les', "l'", 'l’',
  'à', 'au', 'aux', 'et', 'en', 'un', 'une', 'ma', 'mon', 'mes',
]

function estMotOutil(mot: string): boolean {
  return MOTS_OUTILS.includes(mot.toLocaleLowerCase('fr'))
}

/**
 * Les points où l'on a le droit de couper.
 *
 * Entre deux mots, SAUF juste après un mot-outil. « Le mariage de Léa » se
 * coupe donc après « Le mariage » ou après « de Léa » — jamais entre « de »
 * et « Léa ».
 *
 * ⚠️ Si TOUS les points sont interdits (« Le de la »), on rend quand même les
 * points bruts : mieux vaut une coupe laide qu'un titre qui déborde. Un cas
 * de cette forme n'arrivera sans doute jamais, mais « sans doute » n'est pas
 * une garantie, et une liste vide ferait retomber le titre sur une seule
 * ligne illisible.
 */
export function coupuresPossibles(mots: string[]): number[] {
  const brutes: number[] = []
  for (let i = 1; i < mots.length; i++) brutes.push(i)
  const bonnes = brutes.filter((i) => !estMotOutil(mots[i - 1]))
  return bonnes.length > 0 ? bonnes : brutes
}

/**
 * Découper un titre en lignes ÉQUILIBRÉES.
 *
 * `largeurDe` mesure une chaîne dans la police du modèle (Canvas
 * `measureText` côté navigateur ; la longueur en caractères suffit aux
 * tests). On cherche la coupure qui minimise l'écart entre la ligne la plus
 * large et la plus étroite.
 *
 * ⚠️ PAS DE DÉCOUPE GLOUTONNE. Remplir la première ligne puis passer à la
 * suivante — ce que fait un navigateur tout seul — donne « Le mariage de Léa
 * et / Tom » : une ligne pleine et un orphelin. L'équilibrage donne « Le
 * mariage / de Léa et Tom ». Sur un titre de couverture, c'est toute la
 * différence entre composé et débordé.
 *
 * Un titre d'un seul mot rend une seule ligne : il n'y a rien à équilibrer,
 * et on ne césure pas.
 */
export function decouperEnLignes(
  titre: string,
  largeurDe: (s: string) => number,
  lignesMax: number = LIGNES_MAX,
): string[] {
  const mots = titre.trim().split(/\s+/).filter(Boolean)
  if (mots.length <= 1) return mots.length === 1 ? mots : []
  if (lignesMax < 2) return [mots.join(' ')]

  let meilleur: string[] = [mots.join(' ')]
  let meilleurEcart = Infinity

  for (const i of coupuresPossibles(mots)) {
    const lignes = [mots.slice(0, i).join(' '), mots.slice(i).join(' ')]
    const largeurs = lignes.map(largeurDe)
    const ecart = Math.abs(largeurs[0] - largeurs[1])
    if (ecart < meilleurEcart) {
      meilleurEcart = ecart
      meilleur = lignes
    }
  }
  return meilleur
}
