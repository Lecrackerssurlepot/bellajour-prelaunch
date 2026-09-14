# Le flux entrant de la table de travail (août–septembre 2026)

Archivé le 11/09/2026, depuis `src/app/admin/atelier/Flux.tsx`. Remplacé par la boîte du jour
(`Arrivees.tsx` + `src/lib/atelier/arrivees.ts`).

Ce composant affichait quatre nombres en tête de `/admin/atelier` : « jamais ouverts »,
« arrivées aujourd'hui », « sur 7 jours », « dépôt non terminé », plus une frise de quatorze
jours et le bouton « Tout marquer vu ». Mathias, le 11/09 : « les nouvelles demandes de la
journée ne sont pas claires ». Trois définitions de « nouveau » côte à côte, et aucune liste.

Ce qui a survécu, ailleurs :
- le point bleu « jamais ouvert », le filtre et le compteur : inchangés (`Liste.tsx`) ;
- « Tout marquer vu » : dans la barre de filtres (`MarquerVu.tsx`) ;
- la note « marqueur de lecture non installé » : sous la boîte du jour.

Ce qui n'a pas survécu : les compteurs « arrivées aujourd'hui » et « sur 7 jours » (comptés sur
la date du questionnaire, pas sur celle du dépôt, ce qui était faux), « dépôt non terminé »
(devenu le groupe gris « Questionnaire sans photos » de la boîte, et le tag de la ligne), et la
frise. Le calcul `mesurerFlux` d'origine est dans l'historique git de `donnees.ts` (commit
parent de l'archivage). Une frise des arrivées aurait sa place sur `/admin/atelier/metriques`.

Revient par un `git mv` inverse et le rétablissement de `FluxVue` dans `types.ts`.
