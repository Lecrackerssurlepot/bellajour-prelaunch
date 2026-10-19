---
id: T-190
titre: Dans le formulaire d'une édition, on ne retire que le dernier magazine, les chiffres ont les flèches du navigateur, et rien ne montre où va le message d'accueil
etat: nouveau
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Euh, pour les magazines, retirer le dernier... Euh, Juste une, une poubelle à droite qui permet
de le supprimer sera amplement suffisante, parce que si j'en crée trois, du coup, je peux retirer
que le dernier. Alors, je comprends bien que ça sert à rien, mais si, euh, au final, je change,
je, je me rends compte que je me suis trompé de titre ou quoi, euh, juste une poubelle, en fait.
Même si ça change rien, pour le coup, c'est juste un détail. Voilà, aussi les petites flèches,
plus, moins, euh, c'est bien, mais est-ce qu'il y a pas moyen de faire un truc un peu plus clean
euh, Ou au pire, bon, peu importe, en vrai, c'est voilà. Euh, message d'accueil du lien des
participants, j'aimerais bien savoir où se met son, ce lien, en fait, parce que... Voilà. »
(19/10/2026, soir)

## Ce que j'ai vérifié (19/10)
- Magazines : « Retirer le dernier » (`FormulaireEdition.tsx:572`), règle `planMagazines`
  (`saisie.ts`) : on ne retire que le dernier, et seulement s'il est vide, parce que la base
  refuse deux magazines au même rang (`collectif_magazines_rang_unique`) et que le client lit
  « magazine 2 ». À la CRÉATION, rien n'existe encore : retirer n'importe quelle ligne est sans
  risque. En RÉGLAGES, un magazine que le client a commencé (brief, tour) ne doit pas disparaître.
- Chiffres : des `<input type="number">` (flèches du navigateur).
- Message d'accueil (`invitation_texte`) : il s'affiche sur la page des participants (le lien et
  le QR), sous le nom de l'événement (`depot/[token]/page.tsx:78`) ; vide, « Déposez ici vos
  photos de l'événement. » Vérifié en production le 19/10 : « SALUT SALUT » sous « BOUGNOUL ».
  Le formulaire ne le dit pas.

## Ce que je propose
Planches 10 et 11 du canevas du 19/10 au soir (https://claude.ai/artifact/DK9igxYPaw7C4cJmtwbe6K) :
- une poubelle sur CHAQUE magazine à la création ; en réglages, sur chaque magazine encore vide
  (les suivants prennent le numéro libéré), grisée avec la raison sur un magazine commencé ;
- les chiffres en « − 30 photos par personne + », l'unité dans le champ, la saisie au clavier
  toujours possible ;
- sous le message d'accueil, un aperçu de la page des participants qui se met à jour en tapant.

## Ce qui a été fait
Rien encore (maquettes seulement).
