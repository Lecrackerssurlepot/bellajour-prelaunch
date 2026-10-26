---
id: T-204
titre: On ne peut pas ranger les photos dans une double page précise depuis le BAT (Claire, école)
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-26
---
## Ce que Mathias a dit
Idée de Mathias du 26/10/2026, reprise ici en ses termes : depuis le BAT, cliquer sur une page ou une
double page, puis choisir un dossier ou un lien de photos à y mettre, ou sélectionner la photo à
remplacer. (Texte repris de la consigne de la campagne, pas une transcription mot à mot.)

## Ce que j'ai vérifié
- Constaté par la campagne de tests du 26/10 (profils B2B joués), pas un bug.
- Profil Claire (école, 4 promos) : une photo n'appartient à aucun magazine. Les liens nommés
  (« Promo 2 gala ») rangent les photos par lien, par personne et par jour, mais rien ne les rattache à
  une double page. L'atelier devrait trier à la main.
- `src/lib/collectif/bat.ts` compare les deux tours du BAT page par page. Je n'y ai pas trouvé de lien
  entre une photo et une page (lecture rapide, à confirmer avant de coder).
- Aucun autre ticket ne couvre ce geste : T-144 (relecture du BAT), T-152 (rangement en dossiers),
  T-183 (sélection) ne disent pas où va une photo.

## Ce que je propose
Sur le BAT en ligne, permettre à Claire de cliquer une page ou une double page, puis :
- y poser un dossier ou un lien de photos ;
- ou choisir une photo qui en remplace une autre.
Le BAT garde son sens : la validation reste celle du responsable, et l'atelier voit le même choix.

Question à Mathias avant tout code : ce geste refait-il la mise en page déjà composée, ou change-t-il
seulement le choix des photos ? La réponse décide de l'effort (moyen à gros, produit à dessiner).
