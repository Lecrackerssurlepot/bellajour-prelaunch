# La vue d'ensemble « en résumés » de la fiche d'une édition (14/10/2026 → 15/10/2026)

`page.tsx.txt`, `loading.tsx.txt` et `collectif-fiche.css.txt` tels qu'ils étaient au commit
de71c16 : sous un en-tête en texte, huit cartes de hauteurs inégales (les gestes, les liens du
client, Magazines, La collecte, Le dernier message, Documents et envois, Rendez-vous, Livraison),
chacune faite de lignes « clé · valeur » (`resume(...)`, classes `.eca-apercu`, `.eca-resume*`).

Remplacée le 15/10/2026 sur retour de Mathias : « des encarts qui sont perdus un peu partout ».
Il voulait la maquette validée « Atelier, la fiche d'une édition en cartes » : une carte
d'en-tête (initiales, la prochaine étape, « Répondre »), une bande d'étapes nette, et TROIS
cartes de même hauteur (Magazines avec les couvertures, La collecte avec le chiffre et une
mosaïque, Le dernier message avec le lien du responsable). Les gestes sont passés dans un menu
de l'en-tête ; les documents, les rendez-vous, la livraison et les trois liens vivent dans leur
onglet. Il manquait aussi un retour vers la liste des éditions (« ← Les éditions »).

Fichiers en `.txt` : hors du périmètre du build et du lint (aucun import).
