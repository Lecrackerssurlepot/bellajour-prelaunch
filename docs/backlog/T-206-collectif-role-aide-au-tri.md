---
id: T-206
titre: Il n'existe pas de rôle « aide au tri » : l'équipe ne voit qu'en lecture, et le responsable fait tout (Karim, PME)
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-26
---
## Ce que Mathias a dit
Rien de dit par Mathias sur ce point le 26/10. Constat de la campagne de tests : Karim (PME, 3 jours,
40 salariés) veut des collègues qui aident à trier, sans leur laisser la main sur la collecte.

## Ce que j'ai vérifié
- Constaté par la campagne de tests du 26/10 (profils B2B joués), pas un bug.
- `src/lib/collectif/droits.ts` : le lien d'équipe ne peut que voir l'espace (`voir_espace`). Il ne peut
  ni mettre un cœur (`preselectionner`, réservé à l'atelier et au responsable), ni gérer la corbeille
  (`gerer_corbeille`, atelier et responsable).
- Le responsable, lui, peut tout, y compris terminer la collecte (`terminer_collecte`), valider le BAT
  (`valider_bat`) et vider la corbeille.
- Conséquence : pour trier, Karim n'a que deux choix, lire seul ou donner son propre lien. La
  campagne note qu'il partagerait alors son lien responsable, ce qui contourne la règle.

## Ce que je propose
Un troisième lien, « aide au tri », avec seulement :
- voir l'espace et les photos ;
- mettre un cœur (présélection) ;
- mettre une photo à la corbeille et la restaurer, sans vider la corbeille définitivement.

Hors de ce rôle, toujours réservé au responsable : terminer la collecte, valider le BAT, choisir le
style, envoyer les contenus, régler les plafonds, ouvrir l'espace sur un nouvel appareil.

Autonomie avis-requis : c'est une décision de droits (qui peut quoi). Le lien doit aussi rester
distinct du lien responsable pour T-154 (reconnaissance d'appareil). Effort : petit à moyen.
