---
id: T-212
titre: Les titres proposés restent la ville : il faudrait le plat, le lieu précis (Mario World, Mont Fuji), des titres qui s'accordent entre eux, et des textes ajoutés proprement
etat: en cours
domaine: atelier
gravite: confort
autonomie: libre
ouvert: 2026-11-16
---
## Ce que Mathias a dit
« Après, il y avait des détails, je ne sais pas si tu les as enregistrés correspondant le fait qu'on pourrait avoir des informations de titre, comme étant le plat, par exemple, le lieu, mais un peu plus... pas que le lieu dans la localisation, aussi le lieu genre la Mario, World, trucs comme ça. Ça pourrait être plus spécifique. On pourrait avoir des titres un peu plus logiques, donc Mont Fuji, des titres voilà, qui ont plus de sens, et qui pourraient aussi venir s'adapter entre eux suivant l'un ou l'autre, ce qui est marqué. Et venir ajouter des textes aussi de manière très propre, par contre, pas que ça passe le bordel. »

Retours du 16/11/2026, après la démo du premier jet et la vitrine Merisa. Mathias, sur l'ensemble : « Je te donne les détails qui pour moi sont des détails à modifier actuellement, mais bon, c'est pas encore très grave. » et « Après, tu vas aussi enregistrer ces modifications-là, on les mettra ou pas. Tu définiras quand. »

## Ce que j'ai vérifié
Le 16/11, sur main (048c10c9) :
- Le titre proposé est le lieu nommé sûr de la lecture IA, sinon la ville, sinon le pays (`lieuxTextes.ts`, ligne 22, depuis #363). Rien ne reconnaît un plat ni un objet.
- Les lieux précis (« BMW Welt », « Mont Fuji ») ne viennent que de la lecture IA. Aujourd'hui, elle est simulée pour les six magazines de la démo : sur un vrai dossier, il n'y a encore que la ville.
- Les titres ne se répondent pas d'une double à l'autre.
- Constat confirmé.

## Ce que je propose
Des propositions de titres plus précises : lieu nommé (lecture IA, GPS et Geoapify), plat ou objet reconnu, avec les règles du « jamais inventé ». Des titres qui se répondent d'une double à l'autre (même forme, pas de répétition). Ajouter un texte dans une zone libre et calme de la page, aligné sur la grille, jamais par-dessus le reste.

**Quand : vague 3**, avec le vrai branchement (OpenAI et GPS/Geoapify, clés à venir). La reconnaissance du plat et du lieu précis en dépend. La partie « ajouter un texte proprement », dans une zone libre alignée sur la grille, peut venir en vague 1 avec T-213. Moyen.

## Ce qui a été fait
**Premier temps, le 16/11, vague 1 : ajouter un texte proprement**, branche `feat/mise-en-page-vague-1` (pas encore fusionnée).
- Vérifié d'abord : jusqu'ici, aucun geste n'ajoutait un texte ; un texte ne venait qu'avec un gabarit qui en avait un.
- « Texte », dans le tiroir de la page ou de la double (à côté de « Fond »), pose un TITRE d'un seul geste : une entrée
  d'historique « Ajouter un texte », Annuler le défait ; le survol montre où il ira. Module pur `editeur/texteAjoute.ts`.
- Où : dans la plus grande zone LIBRE de la page, faite de cases entières de la grille affichée (6 × 6 par défaut, ou 8 × 8),
  de la largeur de la zone, en haut de la zone ; le corps convient à la place (14 à 28 pt). À défaut, sur l'endroit le plus
  calme d'une photo LUE (carte de chaleur), jamais sur un visage ni sur la zone importante, jamais sur une autre photo, en blanc
  sur une photo sombre. Sinon rien, et l'écran dit « Pas de place calme ». Une page sans photo : « Page vide ». Toujours dans les
  marges. Il dit « Titre » jusqu'à ce qu'on l'écrive (le lieu le remplace s'il est connu ; jamais imprimé vide).
- Réglages de départ nommés (`reglages.ts`, `texte_*`, R159) : largeur minimale 50 mm, 3 mm autour du sujet, chaleur au plus
  4 sur 9, blanc sous un gris moyen de 150 (mesuré sur la photo entière : aucune mesure locale de la clarté n'existe).
- Harnais : `scripts/verif-mep-vague-1.ts` (bloc T-212 : place, grille 8, photo, visage, refus, Annuler, export, et aucune pose
  hors des marges ni sur un cadre sur tous les gabarits dessinés) ; le geste entre dans les 600 séquences aléatoires.
- Recette locale : `13` (le survol montre où), `14` (deux photos pleine page : le titre en blanc sur le bas calme de la photo,
  loin du visage), `15` (Annuler), `17` (au-dessus du photomaton, de marge à marge, sur la grille).

**Reste (vague 3)** : des titres précis (le plat, le lieu nommé), qui se répondent d'une double à l'autre, avec le vrai
branchement (OpenAI, GPS et Geoapify). Ajouter un texte sur une page sans photo (une disposition sans photo n'existe pas
aujourd'hui, invariant I8).
