# « Qui a déposé » en liste de sources (14/10/2026)

`sources.ts` rangeait les photos d'une édition en SOURCES à plat : un dossier par nom du
responsable, un par lien de contribution, le lien général, l'atelier. La page Photos et le
tableau de bord la lisaient depuis T-151 (retours du 14/10 au matin).

Remplacé le 14/10/2026 au soir par T-152 (maquettes « Photos rangées en dossiers » et « Les
liens ») : `src/lib/collectif/dossiers.ts` range les mêmes photos en ARBRE (un niveau de
sous-dossiers, une ligne par personne sous chaque lien), et le nom d'un dossier d'avant déposé
sous un type ne porte plus le préfixe « Autre source · ». Hors du périmètre du build (aucun
import) ; ses vérifications du harnais ont suivi dans le bloc T-152 de `verif-collectif.ts`.
