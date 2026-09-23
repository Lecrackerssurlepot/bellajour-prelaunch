---
id: T-135
titre: L'écran de confirmation promet M5 sans vérifier que le mail précédent est parti
etat: nouveau
domaine: admin
gravite: confort
autonomie: libre
ouvert: 2026-09-23
---
## Ce que Mathias a dit

Rien. Défaut relevé par moi le 23/09/2026 en livrant T-134, et signalé à
Mathias avant qu'il ne republie la maquette de Marjorie.

## Ce que j'ai vérifié

Relevé à l'écriture, pas encore reproduit à l'écran.

`PanneauAction.tsx` : quand la case « j'ai corrigé » est cochée, la ligne
« Mail » de la confirmation est **écrite en dur** (`corrigeMaintenant`), au lieu
d'être dérivée de la projection serveur `choisie.mail`. Elle affirme donc « Le
mail M5 partira maintenant, dans sa version "vos corrections sont faites" »
**sans vérifier que M4 est parti**.

C'était le prix à payer pour corriger un mensonge PLUS grave : la projection est
calculée sur le serveur, donc avant que l'atelier n'ait coché quoi que ce soit.
Elle aurait annoncé « aucun mail » pendant que M5 repart. Le choix reste bon, la
mise en oeuvre est trop brutale.

Sur un dossier où M4 aurait échoué (cas réel, T-098), `codesPour` ne rendrait
PAS M5 : aucun mail ne partirait, et l'écran aurait promis le contraire.

⚠️ N'a PAS touché Marjorie le 23/09 : son M4 était parti le 19/09, vérifié en
base avant le clic.

## Ce que je propose

Ne pas recalculer la chaîne dans le navigateur : la projection serveur sait déjà
le faire. Lui faire rendre les DEUX réponses pour `publier_maquette` (avec et
sans le verrou M5), et laisser l'écran choisir selon la case. La règle reste au
même endroit, l'écran ne fait que lire.

## Ce qui a été fait

Rien. Ticket ouvert le 23/09/2026.
